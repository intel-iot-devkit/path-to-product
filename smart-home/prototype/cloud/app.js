//Date: 10/6/2015
/*
    Description:
    A sample nodejs app for Bluemix that leverages MongDB for data storage and reveals REST API routes for inserting, and getting data related to sensors and conditions.
    Web Sockets are also leveraged for real-time updates to client applications.
*/
var date, requestedId, iotDeviceSocket;

//Cloud Foundry environment variables
var port = process.env.VCAP_APP_PORT || process.env.PORT || 3000;
var services = JSON.parse(process.env.VCAP_SERVICES);
var mongoAddress = services.mongolab[0].credentials.uri;

var express = require('express');
var morgan = require("morgan");
var bodyParser = require('body-parser');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

app.use(morgan('dev')); // log every request to the console
//Configuration
// configure app to use bodyParser() this will let us get the data from a POST
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json()) // parse application/json

// Mongo client
var MongoClient = require('mongodb').MongoClient;

//Configure header for all requests
var setCustomHeaderFunc = function(req, res, next) {
    res.set("Access-Control-Allow-Origin", "*");
    next();
};

//Apply CustomHeader to all routes of the server
app.all('*', setCustomHeaderFunc);

var router = express.Router(); // get an instance of the express Router
// middleware triggered for all requests
router.use(function(req, res, next) {
    // do logging
    console.log('Something is happening.');
    next(); // make sure we go to the next routes and don't stop here
});
// on routes that end in /smarthome
// ----------------------------------------------------
router.route('/smarthome')
    // insert new data (accessed at POST http:_____/api/smarthome)
    // Sample payload: {"name":"door","status":"open"} in REST client tool
    //req.body is the payload
    .post(function(req, res) {
        MongoClient.connect(mongoAddress, function(err, db) {
            if (err) throw err;
            var collection = db.collection('Sensorslog');
            date = new Date();
            collection.insert({
                name: req.body.name,
                status: req.body.status,
                timestamp: date.toLocaleDateString() + "_" + date.toLocaleTimeString()
            }, function(err, docs) {
                if (err) res.send(err);
                else {
                    res.json({
                        message: 'New Sensor data added!'
                    });
                }
                db.close();
            });
        });
    })
    // get all the sensor data in the database (MongoDB) (accessed at GET http://_______/api/smarthome)
    .get(function(req, res) {
        MongoClient.connect(mongoAddress, function(err, db) {
            if (err) throw err;
            var collection = db.collection('Sensorslog');
            collection.find({}).toArray(function(err, docs) {
                if (err) res.send(err);
                else {
                    console.log("Found the all records");
                    console.log(docs);
                    res.json(docs);
                    db.close();
                }
            });
        });
    });

// on routes that end in /smarthome/deleteAll
// ----------------------------------------------------
router.route('/smarthome/deleteAll')
    // delete all entries in MongoDB (accessed at POST http:_____/api/smarthome/deleteAll)
    .post(function(req, res) {
        MongoClient.connect(mongoAddress, function(err, db) {
            if (err) throw err;
            var collection = db.collection('Sensorslog');
            //TODO Remove all documents from the collection
            collection.remove({}, function(err, result) {
                if (err) res.send(err);
                else {
                    console.log("All records deleted.");
                    res.json({
                        message: 'All data entries have been deleted.'
                    });
                    db.close();
                }
            });
        });
    });

// standard route  (accessed at GET http://_______/api)
router.get('/', function(req, res) {
    res.json({
        message: 'hooray! welcome to our api!'
    });
});
// more routes for our API will happen here
// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);

server.listen(port);
console.log('Server is Listening..');

//Real-time communication
//Socket.io  (Web Sockets) Event listeners
io.on('connection', function (socket) {
    socket.emit('message', { hello: 'world' });
  
    //Send messages received from a client to the IoT platform to trigger a Garage Door state change
    socket.on('request', function (data) {
        if (data.request === "refresh") { //Send message to companion app
            socket.broadcast.emit("message", {action:"refresh"});
        }
        else if (data.request === "openGarageDoor") { //Send message to IoT platform
            console.log("send 'openGarageDoor' message to client");
            if(iotDeviceSocket)
                iotDeviceSocket.emit("message", {action: "openGarageDoor"});
        }
        else if (data.request === "closeGarageDoor") { //Send message to IoT platform
            console.log("send 'closeGarageDoor' message to client");
            if(iotDeviceSocket)
                iotDeviceSocket.emit("message", {action: "closeGarageDoor"});
        }
    });

    //Save the IoT platform's socket info
    socket.on('save', function (data) {
        if (data.device === "iotDevice"){
            iotDeviceSocket = socket;
        }
    })
});