var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
var Inventory = require('../models/inventory.js');

/* GET /inventory listing. */
router.get('/', function(req, res, next) {
  Inventory.find(function (err, inventory) {
    if (err) return next(err);
    res.json(inventory);
  });
});

/* POST /inventory */
router.post('/', function(req, res, next) {
  Inventory.create(req.body, function (err, post) {
    if (err) return next(err);
    res.json(post);
  });
});

/* POST /inventory/:id */
router.post('/:id', function(req, res, next) {
  //console.log('POST /inventory/'+req.params.id,req.body);
  Inventory.findByIdAndUpdate(req.params.id, req.body, function (err, post) {
    if (err) return next(err);
    res.json(post);
  });
});

module.exports = router;
