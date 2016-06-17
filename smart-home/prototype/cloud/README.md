Smart Home Cloud (IBM Bluemix*) Node.js* Application
============================

An application that acts as the central node of communication between the Smart Home companion mobile apps and the Intel® Galileo board or gateway applications. This application also creates REST APIs for the companion apps to access data from the MongoDB* database, as well as a WebSockets connection for real-time updates.


###Initialization and declaration of variables
```javascript
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
```

###Creation of API routes and related functionality
```javascript
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
```

###Setup Websocket functionality
```javascript
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
```



Important App Files
---------------------------
The Node.js* starter application has files as below:

* app.js

	This file contains the server side JavaScript* code for your application
	written using the express server package.

* public/

	This directory contains public resources of the application, that will be served up by this server.

* package.json

	This file contains metadata about your application, that is used by both
	the `npm` program to install packages, but also Bluemix* when it's
	staging your application.  For more information, see:
	<https://docs.npmjs.com/files/package.json>

express
--------------------------------------------
* source: https://github.com/strongloop/express
* license: https://github.com/strongloop/express/blob/master/LICENSE

cfenv
--------------------------------------------
* source: https://github.com/cloudfoundry-community/node-cfenv
* license: https://github.com/cloudfoundry-community/node-cfenv/blob/master/LICENSE.txt

mongodb
--------------------------------------------
* source: https://github.com/mongodb/node-mongodb-native
* license: https://github.com/mongodb/node-mongodb-native/blob/2.0/LICENSE

morgan
--------------------------------------------
* source: https://github.com/expressjs/morgan
* license: https://github.com/expressjs/morgan/blob/master/LICENSE

body-parser
--------------------------------------------
* source: https://github.com/expressjs/body-parser
* license: https://github.com/expressjs/body-parser/blob/master/LICENSE

socket.io
--------------------------------------------
* source: https://github.com/socketio/socket.io
* license: https://github.com/socketio/socket.io/blob/master/LICENSE
