var mongoose = require('mongoose');

var EventsSchema = new mongoose.Schema({
  RowKey: String,
  EventType: String,
  EventDescription: String,
  Status: String,
  Val: Number
});

module.exports = mongoose.model('Events', EventsSchema, 'Events');
