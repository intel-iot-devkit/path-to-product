/*jslint node:true, vars:true, bitwise:true, unparam:true */
/*jshint unused:true */

/*
When using for scenarios including a gateway and Arduino 101, add 512 to the pin number. For example, 2 becomes 514.
*/

var mraa = require("mraa");
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
console.log("OfflineSensorData.db exists: "+exists);

if(!exists) {
    console.log("Creating DB file.");
    fs.openSync(filePath, "w");
    exists = fs.existsSync(filePath);
    console.log("OfflineSensorData.db exists: "+exists);
}

//SQLite 3 - asynchronous execution always
var sqlite3 = require("sqlite3").verbose(); //append stack trace
var db = new sqlite3.Database(filePath);

//Socket.io Client
// Connect to server
var io = require('socket.io-client');
var deviceSocket = io.connect('http://inteliotstorage.mybluemix.net/', {reconnect: true});

//Socket.io Server
var httpServer = null;
var serverIO;

//RGB backlight LCD
// Load lcd module on I2C
var LCD = require('jsupm_i2clcd');

// Initialize Jhd1313m1 at 0x62 (RGB_ADDRESS) and 0x3E (LCD_ADDRESS) 
//var myLcd = new LCD.Jhd1313m1 (0, 0x3E, 0x62); //Prototype (Galileo)
var myLcd = new LCD.Jhd1313m1 (512, 0x3E, 0x62); //Prototype (Arduino 101 + Gateway)

myLcd.setCursor(0, 0);
// RGB Blue
//myLcd.setColor(53, 39, 249);
myLcd.write('Smart Home   ');  
myLcd.setCursor(1, 0);
myLcd.write('Connecting... ');

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
    myLcd.setCursor(0, 0);
    myLcd.write('Smart Home        ');  
    myLcd.setCursor(1, 0);
    myLcd.write('Connected         ');
    deviceSocket.emit('save', {"device":"iotDevice"});
    //var tempRes;//necessary for function
    uploadOfflineData();
    closeLocalWebSocketServer();
});

//When device becomes disconnected from cloud
deviceSocket.on("disconnect", function () {
    connectionStatus = "disconnected";
    console.log("Board Disconnected from server!");
    myLcd.setCursor(0, 0);
    myLcd.write('Smart Home        ');  
    myLcd.setCursor(1, 0);
    myLcd.write('Not Connected     ');

    setupLocalWebSocketServer();
});
    
//When a web socket request 'message' is received from cloud
deviceSocket.on('message', function(message) {
    console.log("message received: "+JSON.stringify(message));
    if(message.action === "openGarageDoor") {
        garageDoorOpenStatus = false;
        triggerStateChange();
    }
    else if(message.action === "closeGarageDoor") {
        garageDoorOpenStatus =true;
        triggerStateChange();
    }
});

//Wait 2 secs and check if the application was able to establish a connection
setTimeout(function(){
    if(connectionStatus != "connected") {
        console.log('Not Connected!');
        myLcd.setCursor(0,0);
        myLcd.write('Smart Home      ');  
        myLcd.setCursor(1,0);
        myLcd.write('Not Connected   ');
        
        setupLocalWebSocketServer();
    }
}, 2000);

var groveSensor = require('jsupm_grove');
//Door bell
var doorBellRinging = false;
//Door bell - Buzzer - D7
//var doorBellBuzzer = new mraa.Gpio(7); //Prototype (Galileo)
var doorBellBuzzer = new mraa.Gpio(519); //Prototype (Arduino 101 + Gateway)
doorBellBuzzer.dir(mraa.DIR_OUT);
doorBellBuzzer.write(0);
//Door bell - Touch sensor - D6
//var touchSensor = new mraa.Gpio(6); //Prototype (Galileo)
var touchSensor = new mraa.Gpio(518); //Prototype (Arduino 101 + Gateway)
touchSensor.dir(mraa.DIR_IN);
var touchSensorValue = 0;
var previousTouchSensorValue = 0;

//Front Door - Button - D5
//var frontDoorButton = new mraa.Gpio(5); //Prototype (Galileo)
var frontDoorButton = new mraa.Gpio(517); //Prototype (Arduino 101 + Gateway)
frontDoorButton.dir(mraa.DIR_IN);
var frontDoorButtonValue = 0;
var frontDoorOpenStatus = false;

// Garage Door
// Red LED - D3
//var redLED = new groveSensor.GroveLed(3); //Prototype (Galileo)
var redLED = new groveSensor.GroveLed(515); //Prototype (Arduino 101 + Gateway)
redLED.off();


//Light Sensor - A0
// Create the light sensor object using AIO pin 0
//var lightSensor = new groveSensor.GroveLight(0); //Prototype (Galileo)
var lightSensor = new groveSensor.GroveLight(512); //Prototype (Arduino 101 + Gateway)

/** Read the input and print both the raw value and a rough lux value
*/
function readLightSensorValue() {
    console.log(lightSensor.name() + " raw value is " + lightSensor.raw_value() +
            ", which is roughly " + lightSensor.value() + " lux");
}

//Rotary Sensor - A1
//var rotaryAngleSensor = new groveSensor.GroveRotary(1); //Prototype (Galileo)
var rotaryAngleSensor = new groveSensor.GroveRotary(513); //(Arduino 101 + Gateway)
var previousAbs = 0;

/** Read the input and print both the absolute and relative value from Rotary Angle Sensor
*/
function readRotaryAngleSensorValue() {
    date = new Date();
    var abs = rotaryAngleSensor.abs_value();

    //write the knob value to the console in different formats
    //console.log("Abs: " + abs);
    if(abs == 0 && previousAbs > 1021) { //Door unlock
        console.log("Door Lock");
        myLcd.setCursor(0,0);
        myLcd.write("Door Lock      ");
        myLcd.setCursor(1,1);
        myLcd.write("               ");
        collectFrontDoorData(date.toJSON(), "front_door_lock", "locked");
        
        previousAbs = abs;
    }
    else if (abs > 1021 && previousAbs < 5) { //Door lock
        console.log("Door Unlock");
        myLcd.setCursor(0,0);
        myLcd.write("Door Unlock    ");
        myLcd.setCursor(1,1);
        myLcd.write("               ");
        collectFrontDoorData(date.toJSON(), "front_door_lock", "unlocked");
        
        previousAbs = abs;
    }
    
    //wait 2 s and call function again
    setTimeout(readRotaryAngleSensorValue, 3000);
}

var garageDoorOpenStatus = false;

var openGarageDoor = function(data) {
    //Stepper Motor
    var Uln200xa_lib = require('jsupm_uln200xa');
    // Instantiate a Stepper motor on a ULN200XA Darlington Motor Driver
    // This was tested with the Grove Geared Step Motor with Driver

    // Instantiate a ULN2003XA stepper object
    //var myUln200xa_obj = new Uln200xa_lib.ULN200XA(4096, 9, 10, 11, 12); //Prototype (Galileo)
    var myUln200xa_obj = new Uln200xa_lib.ULN200XA(4096, 521, 522, 523, 524); //Prototype (Arduino 101 + Gateway)
    
    console.log("stepper motor - open Garage Door");
    myUln200xa_obj.setSpeed(5); // 5 RPMs
    myUln200xa_obj.setDirection(Uln200xa_lib.ULN200XA.DIR_CW);
    console.log("Rotating clockwise.");
    myUln200xa_obj.stepperSteps(4096);
    myUln200xa_obj.release();
    return null;
}

var closeGarageDoor = function(data) {
    //Stepper Motor
    var Uln200xa_lib = require('jsupm_uln200xa');
    // Instantiate a Stepper motor on a ULN200XA Darlington Motor Driver
    // This was tested with the Grove Geared Step Motor with Driver

    // Instantiate a ULN2003XA stepper object
    //var myUln200xa_obj = new Uln200xa_lib.ULN200XA(4096, 9, 10, 11, 12);
    var myUln200xa_obj = new Uln200xa_lib.ULN200XA(4096, 521, 522, 523, 524); //Prototype
    console.log("stepper motor - close Garage Door");
    myUln200xa_obj.setSpeed(5); // 5 RPMs
    myUln200xa_obj.setDirection(Uln200xa_lib.ULN200XA.DIR_CCW);
    console.log("Rotating counter clockwise.");
    myUln200xa_obj.stepperSteps(4096);
    myUln200xa_obj.release();
    return null;
}

var Parallel = require("paralleljs");
var pGarageDoorCW;
var pGarageDoorCCW;
var pOfflineData;

setInterval(function () {
    frontDoorButtonValue = frontDoorButton.read();
    var date = new Date();
    touchSensorValue = touchSensor.read();

    //Check touch Sensor
    if((touchSensorValue === 1 && previousTouchSensorValue === 0) || (touchSensorValue === 1 && previousTouchSensorValue === 1)) {
        //Ring buzzer
        doorBellBuzzer.write(1);
        if (doorBellRinging === false) {
            myLcd.setCursor(0,0);
            myLcd.write("((((Ringing))))");
            myLcd.setCursor(1,1);
            myLcd.write("((((Ringing))))");
            console.log(date.toLocaleTimeString() + " Front Doorbell is ringing!!");
            doorBellRinging = true;
            collectFrontDoorData(date.toJSON(), "front_doorbell", "ring");
        }
        else if(doorBellRinging = true) {
            //do Nothing
        }
    }

    else if(touchSensorValue === 0 && previousTouchSensorValue === 1) {
        doorBellBuzzer.write(0);
        myLcd.setCursor(0,0);
        myLcd.write(date.toLocaleTimeString()+ "        ");
        myLcd.setCursor(1,0);
        myLcd.write("Doorbell Rang   ");
        doorBellRinging = false;
    }

    //Check button
    if (frontDoorButtonValue == 1) {
        frontDoorOpenStatus = !frontDoorOpenStatus;
        myLcd.setCursor(0,0);
        myLcd.write(date.toLocaleTimeString() + "           ");
        myLcd.setCursor(1,0);
        if (frontDoorOpenStatus === true) {
            myLcd.write('Front Door Open ');
            console.log(date.toLocaleTimeString() + " Front Door Open");
            collectFrontDoorData(date.toJSON(), "front_door", "open")
        }
        else {
            myLcd.write('Front Door Close');
            console.log(date.toLocaleTimeString() + " Front Door Close");
            collectFrontDoorData(date.toJSON(), "front_door", "close")
        }
    }
    previousTouchSensorValue = touchSensorValue;
    
    //readLightSensorValue() 
}, 100);

readRotaryAngleSensorValue();

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

/** change the state of the sensors and devices for Garage door */
function triggerStateChange () {
	date = new Date();
    garageDoorOpenStatus = !garageDoorOpenStatus;
    myLcd.setCursor(0,0);
    myLcd.write(date.toLocaleTimeString() + "           ");
    myLcd.setCursor(1,0);
    if (garageDoorOpenStatus === true) {
        myLcd.write('Garage Door Open');
        console.log("\n"+date.toJSON() + " Garage Door Open");
        redLED.off();
        if (connectionStatus === "connected"){
            uploadData([date.toJSON(), "garage_door", "open"]);
        }
        else if (connectionStatus === "disconnected"){
            console.log("store data locally");
            offlineDataArray.push({"timestamp":date.toJSON(), "name":"garage_door", "status":"open"});
            addToOfflineDatabase({"timestamp":date.toJSON(), "name":"garage_door", "status":"open"});
        }
        pGarageDoorCW = new Parallel([]);
        pGarageDoorCW.spawn(openGarageDoor).then(function () {
            console.log("open garage door-stepper motor CW done");
        });
    }
    else {
        myLcd.write('Garage DoorClose');
        console.log("\n"+date.toJSON() + " Garage Door Close");
        redLED.on();
        if (connectionStatus === "connected"){
            uploadData([date.toJSON(), "garage_door", "close"])
        }
        else if (connectionStatus === "disconnected"){
            console.log("store data locally");
            offlineDataArray.push({"timestamp":date.toJSON(), "name":"garage_door", "status":"close"});
            addToOfflineDatabase({"timestamp":date.toJSON(), "name":"garage_door", "status":"close"});
        }
        pGarageDoorCCW = new Parallel([]);
        pGarageDoorCCW.spawn(closeGarageDoor).then(function () {
            console.log("close garage door-stepper motor CCW done");
        });
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
var closeLocalWebSocketServer = function() {
    if(httpServer != null) {
        httpServer.close(function () {
            console.log('Server closed!');
        });
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


/**********************************************
Application Exit                              *
**********************************************/
// When exiting: clear interval and print message
var cleanExit = function() {
	doorBellBuzzer.write(0)
    redLED.off
    myLcd.setCursor(0,0);
    myLcd.write("Application Exited   ");
    myLcd.setCursor(1,0);
    myLcd.write("                     ");
    console.log("Exiting Smart Home Mobile Apps...");
    mobileAppsProcess.kill()
	console.log("Exiting Board Application...");
	process.exit();
};

process.on('SIGINT', cleanExit); // catch ctrl-c
process.on('SIGTERM', cleanExit); // catch kill
process.on('uncaughtException', cleanExit); //catch exception


