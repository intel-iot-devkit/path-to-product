var mongoose = require('mongoose');

var InventorySchema = new mongoose.Schema({
  RowKey: String,
  Products: String,
  Tray: String,
  Price: Number,
  Available: Number
});

module.exports = mongoose.model('Inventory', InventorySchema, 'Inventory');
