Smart Home Node.js* IoT Application
============================
A Node.js* app for running on your Intel® NUC (gateway) connected to an Arduino 101* that enables interactions with sensors and peripherals as well as sends data to the IBM Bluemix* cloud application for storing sensor data. WebSockets are the primary communication protocol that allows the client (Intel® NUC + Arduino 101) to communicate with the IBM Bluemix cloud application. In Offline mode, the application leverages SQLite for data storage and sends the data to the cloud when a connection is established again. Also, the application communicates with the mobile apps when offline.

This application allows a user to interact with a touch sensor and buzzer for simulating a doorbell, a light sensor for capturing the presence of objects, a servo motor for simulating the movement of a garage door, and a rotary sensor for simulating door open or close actions.


Intel(R) XDK IoT Edition
-------------------------------------------
This project was developed with the Intel(R) XDK IoT Edition. Download the Intel(R) XDK IoT Edition at https://software.intel.com/en-us/html5/xdk-iot.
Intel(R) Editon & Intel(R) NUC + Arduino 101.

###Requirements
The items required for this project are:
* (1) LEDs (Red)
* LCD module
* Rotary Sensor
* Buzzer
* Touch Sensor
* Light Sensor
* Servo Motor
* Button

**Note:** All of these items are provided in the Grove Starter kit for Intel Edison.

**Note:** You will need to run the following command in the terminal if sqlite3 is not located in your node modules directory after uploading your project.

```javascript    
npm install sqlite3
```

####Getting Started
In order to access the GPIO pins on your board, you are required to declare the mraa library. Mraa is a C/C++ library with bindings to JavaScript* & Python* to interface with the IO on Intel® Galileo and Edison boards, as well as other platforms, with a structured API where port names/numbering matches the board that you are developing on.

```javascript    
var mraa = require("mraa");
```
For more information, visit https://github.com/intel-iot-devkit/mraa.

This project relies on the paralleljs node module to allow for seamless asynchronous execution throughout since the underlying functionality of the stepper motor is synchronous.

```javascript    

```

Important App Files
---------------------------
* main.js
* package.json
* icon.png
* README.md

mraa
--------------------------------------------
* Included on the IoTDevkit Linux Image

* source:  https://github.com/intel-iot-devkit/mraa
* license:  https://github.com/intel-iot-devkit/mraa/blob/9d488c8e869e59e1dff2c68218a8f38e9b959cd7/cmake/modules/LICENSE_1_0.txt

upm
--------------------------------------------
* Included on the IoTDevkit Linux Image

* source:  https://github.com/intel-iot-devkit/upm
* license:  https://github.com/intel-iot-devkit/upm/blob/master/LICENSE

socket.io-client
--------------------------------------------
* source:  https://github.com/socketio/socket.io-client
* license:  https://github.com/socketio/socket.io-client/blob/master/LICENSE

socket.io
--------------------------------------------
* source:  https://github.com/socketio/socket.io
* license:  https://github.com/socketio/socket.io/blob/master/LICENSE

Paralleljs
--------------------------------------------
* source:  https://github.com/adambom/parallel.js
* license:  https://github.com/adambom/parallel.js/blob/master/LICENSE

express
--------------------------------------------
* source:  https://github.com/expressjs/express
* license: https://github.com/expressjs/express/blob/master/LICENSE

morgan
--------------------------------------------
* source:  https://github.com/expressjs/morgan
* license: https://github.com/expressjs/morgan/blob/master/LICENSE

body-parser
--------------------------------------------
* source:  https://github.com/expressjs/body-parser
* license: https://github.com/expressjs/body-parser/blob/master/LICENSE
