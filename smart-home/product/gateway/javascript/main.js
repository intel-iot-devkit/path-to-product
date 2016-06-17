/*jslint node:true, vars:true, bitwise:true, unparam:true */
/*jshint unused:true */

/*
When using for scenarios including a gateway and Arduino 101, add 512 to the pin number. For example, 2 becomes 514.
*/

var command = child_process.exec('chrt -f -p 99 ' + process.pid);
var command = child_process.exec('renice -20 ' + process.pid);

//var command = child_process.exec('systemctl stop systemd-timesyncd.service');
//var command = child_process.exec('systemctl stop nginx.service');
//var command = child_process.exec('systemctl stop iot-dev-hub.service');
//var command = child_process.exec('systemctl stop mosquitto.service');
//var command = child_process.exec('systemctl stop wr-iot-agent.service');
//var command = child_process.exec('systemctl stop node-red-experience.service');
//var command = child_process.exec('systemctl stop scsrvc.service');

console.log("Smart Home Application");
console.log("Connecting...");

var date, connectionStatus = "disconnected";
var offlineDataArray = [];

//Offline Initialization
var fs = require("fs");
var databaseFile = "OfflineSensorData.db";
var filePath = __dirname + "/" + databaseFile;
//console.log("File Path: "+filePath)
var exists = fs.existsSync(filePath);

if(!exists) {
    console.log("Creating DB file.");
    fs.openSync(filePath, "w");
}

var Parallel = require("paralleljs");
var pOfflineData;

//SQLite 3
var sqlite3 = require("sqlite3").verbose(); //append stack trace
var db = new sqlite3.Database(filePath);

//Socket.io Client
// Connect to server
var io = require('socket.io-client');
var deviceSocket = io.connect('http://inteliotstorage.mybluemix.net/', {reconnect: true});

//Socket.io Server
var httpServer = null;
var serverIO;

//Initialization of Child process for the admin & consumer app
var childProcess = require('child_process');
var mobileAppsProcess;

/**
    Invoke the mobile companion apps within this application
*/
function runScript(scriptPath, callback) {

    // keep track of whether callback has been invoked to prevent multiple invocations
    var invoked = false;

    mobileAppsProcess = childProcess.fork(scriptPath);

    // listen for errors as they may prevent the exit event from firing
    mobileAppsProcess.on('error', function (err) {
        if (invoked) return;
        invoked = true;
        callback(err);
    });

    // execute the callback once the mobileAppsProcess has finished running
    mobileAppsProcess.on('exit', function (code) {
        if (invoked) return;
        invoked = true;
        var err = code === 0 ? null : new Error('exit code ' + code);
        callback(err);
    });
}

// Now we can run a script and invoke a callback when complete, e.g.
runScript(__dirname + '/apps/start.js', function (err) {
    if (err) throw err;
    console.log('finished running start.js(companion apps)');
});

//Websocket on connected event from cloud
deviceSocket.on('connect', function() {
    connectionStatus = "connected";
    console.log('Board Connected to server!');
    deviceSocket.emit('save', {"device":"iotDevice"});
    //var tempRes;//necessary for function
    uploadOfflineData();
    closeLocalWebSocketServer();
});

//When device becomes disconnected from cloud
deviceSocket.on("disconnect", function () {
    connectionStatus = "disconnected";
    console.log("Board Disconnected from server!");
    setupLocalWebSocketServer();
});
    
//When a web socket request 'message' is received from cloud
deviceSocket.on('message', function(message) {
    console.log("message received: "+JSON.stringify(message));
    if(message.action === "openGarageDoor") {
        open_garage();

    }
    else if(message.action === "closeGarageDoor") {
        close_garage();
    }
});

//Wait 2 secs and check if the application was able to establish a connection
setTimeout(function(){
    if(connectionStatus != "connected") {
        console.log('Not Connected!');        
        setupLocalWebSocketServer();
    }
}, 2000);


/** Collect doorbell event data
*/
function collectFrontDoorData(time, name, status) {
    console.log("connection Status: "+connectionStatus)
    if (connectionStatus === "connected") {
        uploadData([time, name, status])
    }
    else if (connectionStatus === "disconnected") {
        console.log("store data locally");
        offlineDataArray.push({"timestamp":time, "name":name, "status":status});
        addToOfflineDatabase({"timestamp":time, "name":name, "status":status});
    }
}

/**********************************************
ONLINE                                        *
**********************************************/
/**
    Invoke an upload of data if there is data in the offline SQLite database
*/
var uploadOfflineData = function () {
    var tempArray = [];
    var tempRes;
    console.log("\nattempt to upload Offline Data");
    db.run("CREATE TABLE IF NOT EXISTS OfflineSensorData (info TEXT)", function() {
        db.all("SELECT rowid AS id, info FROM OfflineSensorData", function(err, rows) {
            if(err == null) {
                if(rows.length == 0) {
                    console.log("No data found.");
                }
                else {
                    rows.forEach(function (row) {
                        tempArray.push(JSON.parse(row.info));
                    });
                    //Add upload code to MongoDB Cloud storage here...
                    for(var i = 0; i < tempArray.length; i++) {
                        console.log("upload recorded Data");
                        pOfflineData = new Parallel([tempArray[i].timestamp, tempArray[i].name, tempArray[i].status]);
                        pOfflineData.spawn(uploadData).then(function () {
                                console.log("offline data upload done");
                            });
                    }
                    deleteOfflineData(tempRes);
                }
            }
            else {
                console.log("Unable to upload data.");
            }
        });
    });
};
/** insert into MongoDB - Online Cloud storage*/
var uploadData = function (data) {
    console.log("Upload to database started!");
    //HTTP
    var http = require('http');
    //HTTP POST Request
    var data = JSON.stringify({'name': data[1], 'status': data[2], 'timestamp': data[0]});

    var options = {
        host: 'inteliotstorage.mybluemix.net',
        port: 80,
        path: '/api/smarthome',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    var req = http.request(options, function(res) {
        res.on('data', function (chunk) {
            console.log("body: " + chunk);
            if(chunk.message == "New Sensor data added!") {
                //Trigger a refresh by the companion app to show latest data from database
                console.log("trigger companion app refresh");
                deviceSocket.emit('request', {"request":"refresh"});
            }
        });
    });
    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });

    req.write(data);
    req.end();
    
    return null;
}

/**********************************************
OFFLINE                                       *
**********************************************/

/**set up board as websocket server instead of client - Offline
*/
var setupLocalWebSocketServer = function() {
    console.log("set up board as websocket server");

    var express = require('express');
    var morgan = require("morgan");
    var bodyParser = require('body-parser');

    var app = express();
    httpServer = require('http').Server(app);
    serverIO = require('socket.io')(httpServer);
    var port = 3001;

    app.use(morgan('dev')); // log every request to the console
    //Configuration
    // configure app to use bodyParser() this will let us get the data from a POST
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json()) // parse application/json

    //Configure header for all requests
    var setCustomHeaderFunc = function(req, res, next) {
        res.set("Access-Control-Allow-Origin", "*");
        next();
    };
    
    //Apply CustomHeaderto all routes of the server 
    app.all('*', setCustomHeaderFunc);

    var router = express.Router(); // get an instance of the express Router
    // middleware triggered for all requests
    router.use(function(req, res, next) {
        // do logging
        console.log('Something is happening.');
        next(); // make sure we go to the next routes and don't stop here
    });


    router.route('/smarthome')
    // get all the sensor data in the database (MongoDB) (accessed at GET http://_______/api/smarthome)
    .get(function(req, res) {
        console.log("GET request received; sending response");
        var dataArray = getOfflineData(res);
    });

    // on routes that end in /smarthome/deleteAll
    // ----------------------------------------------------
    router.route('/smarthome/deleteAll')
        // delete all entries in SQLite (accessed at POST http:_____/api/smarthome/deleteAll)
        .post(function(req, res) {
            deleteOfflineData(res);
        });

    // standard route  (accessed at GET http://_______/api)
    router.get('/', function(req, res) {
        res.json({
            message: 'hooray! welcome to our local api!'
        });
    });

    // REGISTER OUR ROUTES -------------------------------
    // all of our routes will be prefixed with /api
    app.use('/api', router);

    httpServer.listen(port);
    console.log('board local http Server is Listening..');

    //Listen for socket.io events
    serverIO.on('connection', function (socket) {
        socket.emit('message', { hello: 'world from board' });
      
        //Send messages received from a client to the IoT platform to trigger a Garage Door state change
        socket.on('request', function (data) {
            
            if (data.request === "openGarageDoor") { //Send message to IoT platform
                console.log("OFFLINE - received 'openGarageDoor' message");
                triggerStateChange();
            }
            else if (data.request === "closeGarageDoor") { //Send message to IoT platform
                console.log("OFFLINE - received 'closeGarageDoor' message");
                triggerStateChange();
            }
        });
    });

};

//Close http server if the board is able to become connected to Cloud server
var closeLocalWebSocketServer = function(){
    if(httpServer != null || httpServer != undefined) {
        httpServer.close(function () {
            console.log('Local Server closed!');
        });
    }
    else {
        console.log("No local server running.");
    }
    httpServer = null;
    serverIO = null;
} 


//insert into SQLLite DB - Offline mode
var addToOfflineDatabase = function (data) {
    db.run("CREATE TABLE IF NOT EXISTS OfflineSensorData (info TEXT)", function() {
        db.run("INSERT INTO OfflineSensorData (info) VALUES (?)", JSON.stringify(data), function(){
            db.all("SELECT rowid AS id, info FROM OfflineSensorData", function(err, rows) {
                console.log("Error:"+err);
                if(err == null) {
                    if(rows.length == 0) {
                        console.log("Empty")
                    }
                }
            });
        });
    });
}

/**
    Get offline data stored in SQlite Database
*/
var getOfflineData = function (res) {
    var tempArray = [];
    console.log("\nget Offline Data");
    db.run("CREATE TABLE IF NOT EXISTS OfflineSensorData (info TEXT)", function() {
        db.all("SELECT rowid AS id, info FROM OfflineSensorData", function(err, rows) {
        if(err == null) {
                if(rows.length == 0) {
                console.log("No data found");
                    if(res != null || res != undefined) {
                        res.json([]);
                    }
                    return [];
                }
                else {
                    rows.forEach(function (row) {
                        tempArray.push(JSON.parse(row.info));
                    });
                    if(res != null || res != undefined) {
                        res.json(tempArray);
                    }
                    return tempArray;
                }
            }
        });
    });
}

/**
    Delete all offline data in SQLite Database
*/
var deleteOfflineData = function (res) {
    console.log("\ndelete offline data");
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='OfflineSensorData'", function(error, row) {
        if (row == undefined) {
            console.log("creating table")
            db.run("CREATE TABLE IF NOT EXISTS OfflineSensorData (data TEXT)", function(error) {
                if(res != null || res != undefined) {
                    res.json({message:'No available data entries to deleted.'});
                }  
                if (error.message.indexOf("already exists") != -1) {
                    console.log(error);
                }
            });
        }
        else {
            console.log("table exists. cleaning existing records");
            db.run("DELETE FROM OfflineSensorData", function(error) {
                if(res != null || res != undefined) {
                    res.json({message:'All data entries have been deleted.'});
                }  
                if (error)
                    console.log(error);
            });
        }
    });
}


// ----
var upm = require('jsupm_stepmotor');
var mraa = require('mraa'); // MRAA always last

var running = 1;
var blocked = 0;
var open = 0;
var closed = 0;
var opening = 0;
var closing = 0;
//var step = 0;

// Initial state
var ir_value = 1;
var db_value = 1;
var door_value = 0;
var lock_value = 0;
var swo_value = 1;
var swc_value = 1;

// Stepper setup
var sm = new upm.StepMotor(516, 517);
sm.setSpeed(250);

var ir = new mraa.Gpio(518); // IR garage door sensor
var db = new mraa.Gpio(519); // Doorbell
var door = new mraa.Gpio(520); // Door open/closed
var lock = new mraa.Gpio(521); // Door lock
var swo = new mraa.Gpio(522); // Garage door open sensor
var swc = new mraa.Gpio(523); // Garage door closed sensor

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);
process.on('uncaughtException', cleanExit);

var date;

// Main loop
function main(){
    setInterval(function() {
        var data = ir.read();
        if(data != ir_value) {
            ir_value = data;
            ir_isr(data);
        }
        data = db.read();
        if(data != db_value) {
            db_value = data;
            db_isr(data);
        }
        data = door.read();
        if(data != door_value) {
            door_value = data;
            door_isr(data);
        }
        data = lock.read();
        if(data != lock_value) {
            lock_value = data;
            lock_isr(data);
        }
        data = swo.read();
        if(data != swo_value) {
            swo_value = data;
            swo_isr(data);
        }
        data = swc.read();
        if(data != swc_value) {
            swc_value = data;
            swc_isr(data);
        }
        if(opening && !open) {
            sm.stepBackward(5);
        } else {
            opening = 0;
        }
        if(closing && !closed) {
            if(!blocked) {
                sm.stepForward(5);
            }
        } else {
            closing = 0;
        }
    }, 0);
}

// IR Sensor
function ir_isr(data) {
    date = new Date();
    if(data) {
        console.log("Garage door clear!");
        uploadData([date.toJSON(), "garage_block", "unblocked"]);
        blocked = 0;
    } else {
        console.log("Garage door blocked!");
        uploadData([date.toJSON(), "garage_block", "blocked"]);
        blocked = 1;
    }
}

// Doorbell
function db_isr(data) {
    if(!data) {
        date = new Date();
        collectFrontDoorData(date.toJSON(), "front_doorbell", "ring");
    }
}

// Door
function door_isr(data) {
    date = new Date();
    if(data) {
        console.log("Door open.");
        collectFrontDoorData(date.toJSON(), "front_door", "open")
    }
    else {
        console.log("Door closed.");
        collectFrontDoorData(date.toJSON(), "front_door", "close")
    }
}

// Door lock
function lock_isr(data) {
    date = new Date();
    if(data){
        console.log("Door locked.");
        collectFrontDoorData(date.toJSON(), "front_door_lock", "locked");
    }
    else {
        console.log("Door unlocked.");
        collectFrontDoorData(date.toJSON(), "front_door_lock", "unlocked");
    }
}

// Garage door open
function swo_isr(data) {
    date = new Date();
    if(!data) {
        console.log("Garage door open.");
        if (connectionStatus === "connected"){
            uploadData([date.toJSON(), "garage_door", "open"]);
        }
        else if (connectionStatus === "disconnected"){
            console.log("store data locally");
            offlineDataArray.push({"timestamp":date.toJSON(), "name":"garage_door", "status":"open"});
            addToOfflineDatabase({"timestamp":date.toJSON(), "name":"garage_door", "status":"open"});
        }
        open = 1;
    } else {
        open = 0;
    }
}

// Garage door closed
function swc_isr(data) {
    date = new Date();
    if(!data) {
        console.log("Garage door closed.");
        if (connectionStatus === "connected"){
            uploadData([date.toJSON(), "garage_door", "close"])
        }
        else if (connectionStatus === "disconnected"){
            console.log("store data locally");
            offlineDataArray.push({"timestamp":date.toJSON(), "name":"garage_door", "status":"close"});
            addToOfflineDatabase({"timestamp":date.toJSON(), "name":"garage_door", "status":"close"});
        }
        closed = 1;
    } else {
        closed = 0;
    }
}

function open_garage(){
    opening = 1;
}

function close_garage(){
    closing = 1;
}


/**********************************************
Application Exit                              *
**********************************************/
// When exiting: clear interval and print message
var cleanExit = function() {
    doorBellBuzzer.write(0)
    redLED.off    console.log("Exiting Smart Home Mobile Apps...");
    mobileAppsProcess.kill()
    console.log("Exiting Board Application...");
    process.exit();
};

process.on('SIGINT', cleanExit); // catch ctrl-c
process.on('SIGTERM', cleanExit); // catch kill
process.on('uncaughtException', cleanExit); //catch exception