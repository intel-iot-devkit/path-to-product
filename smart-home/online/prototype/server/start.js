var express = require('express');
var app = express();
var port = 3000;
var ip   = '10.1.10.153'; // Empirical
var ip   = '192.168.1.15'; // Home
var ip   = ''; // Distro

app.use(express.static(__dirname + '/dist'));

// start express webserver
app.listen(port,ip);
console.log('Express Listening on http://' +ip+':'+port);
