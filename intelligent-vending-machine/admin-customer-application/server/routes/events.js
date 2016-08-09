var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
var Events = require('../models/events.js');

/* GET /events listing. */
router.get('/', function(req, res, next) {
  Events.find(function (err, events) {
    if (err) return next(err);
    res.json(events);
  });
});

/* GET /events/temperature listing. */
router.get('/temperature', function(req, res, next) {
  Events.find({ EventType: /^temperature/ }, function (err, events) {
    if (err) return next(err);
    res.json(events);
  });
});

/* GET /events/dispense listing. */
router.get('/dispense', function(req, res, next) {
  Events.find({ EventType: /^dispense/ }, function (err, events) {
    if (err) return next(err);
    res.json(events);
  });
});

/* GET /events/failure listing. */
router.get('/failure', function(req, res, next) {
  Events.find({ EventType: /^failure/ }, function (err, events) {
    if (err) return next(err);
    res.json(events);
  });
});

/* POST /events */
router.post('/', function(req, res, next) {
  console.log('POST Events', req.body);
  Events.create(req.body, function (err, post) {
    if (err) return next(err);
    //console.log('POST res', res);
    //console.log('POST post', post);
    res.json(post);
  });
});

/* POST /events/:id */
router.post('/:id', function(req, res, next) {
  Events.findByIdAndUpdate(req.params.id, req.body, function (err, post) {
    if (err) return next(err);
    res.json(post);
  });
});

/* GET /events/id 
router.get('/:id', function(req, res, next) {
  Events.findById(req.params.id, function (err, post) {
    if (err) return next(err);
    res.json(post);
  });
});
*/
/* DELETE /events/:id 
router.delete('/:id', function(req, res, next) {
  Events.findByIdAndRemove(req.params.id, req.body, function (err, post) {
    if (err) return next(err);
    res.json(post);
  });
});
*/

/* PUT /events/:id 
router.put('/:id', function(req, res, next) {
  Events.findByIdAndUpdate(req.params.id, req.body, function (err, post) {
    if (err) return next(err);
    res.json(post);
  });
});
*/

/* PUT /events/:id 
router.put('/', function(req, res, next) {
  console.log('PUT Events', req.body);
  Events.findByIdAndUpdate(req.params.id, req.body, function (err, post) {
    if (err) return next(err);
    res.json(post);
  });
});
*/

/* GET /events listing. 
router.get('/temperature/:id', function(req, res, next) {

  console.log('temp', req.params.id);

  var id = req.params.id;

  //var filter = 'EventType: /^temperature/ , $where : "this.Val > 30"';
  var filter = '$where : "this.Val > 30"';
  var filter2 = { 
    EventType: /^temperature/ , 
    $where : "this.Val > 30" 
  };

  //var filtered = angular.extend({}, filter, options);
  //console.log('filtered',filtered);

  //$where: function(id) { return this.Val > 30 }
  Events.find({ $where: function() { return this.Val > 30 } }, function (err, events) { // $where : "this.Val > 30"
    if (err) return next(err);
    res.json(events);
  });

});
*/

module.exports = router;
