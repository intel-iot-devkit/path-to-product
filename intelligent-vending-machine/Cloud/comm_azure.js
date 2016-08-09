// Author: Sergey Kiselev <sergey.kiselev@intel.com>
// Copyright (c) 2015 Intel Corporation.
//
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// requires
var path = require("path");
var sqlite3 = require("sqlite3").verbose();
var azure = require("azure-storage");

// defines the location of the database files
var home_dir = (process.platform === 'win32') ? process.env.HOMEPATH : process.env.HOME;
var events_file = process.env.SQLITE3_EVENTS_FILE;
var events_table = "Events";

var partition_key = process.env.PARTITION_KEY;

// log level (0 = no debug, 1 = normal, 2 = verbose)
var log_level = 1;

// defines database poll interval in milliseconds
var poll_interval = 1000;

// initializes azure table service
var table_service = azure.createTableService();

// opens events sqlite database
var events_db = new sqlite3.Database(events_file);

// max timestamp for receive_events()
var max_timestamp = 0;

// array of events row keys being send
var send_queue = [];

// setups cleanup on the exit
process.on('exit', exit_handler.bind(null,{cleanup:true}));

// setups SIGINT handler (Ctrl+C)
process.on('SIGINT', exit_handler.bind(null, {exit:true}));

// catches uncaught exceptions
process.on('uncaughtException', exit_handler.bind(null, {exit:true}));

log(1, "Starting communication with Azure cloud.");
table_service.createTableIfNotExists(events_table, function(error) {
  if(error){
    log(0, "Error creating " + events_table + " table in Azure storage: " + error.stack);
    process.exit();
  }
  log(1, "Partition key: " + partition_key + ", Polling interval " + (poll_interval / 1000) + " seconds.");

  // setup callback for receiving dispense events
  var receive_dispense_events_id = setTimeout(receive_dispense_events, poll_interval, table_service, events_db, partition_key);

  // setup callback for sending events
  var send_events_id = setTimeout(send_events, poll_interval, table_service, events_db, partition_key);
});

// reads products table from the Azure cloud, and updates prices in the local sqlite DB.
function receive_dispense_events(table_service, events_db, partition_key) {
  log(2, "receive_dispense_events()");
  // find maximal timestamp
  events_db.each("SELECT MAX(timestamp) AS max_timestamp FROM events WHERE type='dispense'", function (err, row) {
    max_timestamp = row.max_timestamp;
    log(2, "receive_dispense_events(): max_timestamp=" + max_timestamp);

    var query = new azure.TableQuery()
      .where('PartitionKey eq ?', partition_key)
      .and('EventType eq ?', 'dispense')
      .and('Status eq ?', 'pending');
    table_service.queryEntities(events_table, query, null, function(error, result, response) {
      if (error) {
        log(0, "Error executing query: " + error.stack);
      } else {
        result.entries.forEach(function(event) {
          var source = event.RowKey._.substring(0, 1);
          var timestamp = parseInt(event.RowKey._.substring(1));
          var description = event.EventDescription._;
          var type = event.EventType._;
          var status = event.Status._;
          var value = event.Val._;
          if (source == "u" && timestamp > max_timestamp) {
            log(1, "receive_dispense_events(): received: timestamp=" + timestamp + ", type=" + type + ", description=" + description + ", value=" + value + ", status=" + status);
            events_db.run("INSERT OR REPLACE INTO events (timestamp, type, description, value, status) VALUES (" + timestamp + ", '" + type + "', '" + description + "', " + value + ", '" + status + "')");
          }
        });
      }
    });
  });
  // run this function again in poll_interval milliseconds
  receive_dispense_events_id = setTimeout(receive_dispense_events, poll_interval, table_service, events_db, partition_key);
}

// reads events from the local sqlite database and sends them to the Azure cloud
function send_events(table_service, events_db, partition_key) {
  log(2, "send_events()");
  // update events to the Azure events table
  events_db.each("SELECT timestamp,type,description,value,status FROM events WHERE NOT (type = 'dispense' AND status = 'pending')", function (err, row) {

    var row_key = "m" + row.timestamp;
      if (row.type == "dispense") {
      row_key = "u" + row.timestamp;
    }

    // look for the event timestamp in send queue
    if (send_queue.indexOf(row_key) == -1) {
      log(1, "send_events(): sending event " + row_key + ": timestamp=" + row.timestamp + ", type=" + row.type + ", description=" + row.description + ", value=" + row.value + ", status=" + row.status);
      send_event(row_key, row);
    } else {
      log(1, "send_events(): event " + row_key + " is already being send");
    }
  });

  // run this function again in poll_interval milliseconds
  send_events_id = setTimeout(send_events, poll_interval, table_service, events_db, partition_key);
}

function send_event(row_key, row) {
  // add event's row_key to the queue
  send_queue.push(row_key);
  var event_entity_generator = azure.TableUtilities.entityGenerator;

  var event_entity = {
    PartitionKey: event_entity_generator.String(partition_key),
    RowKey: event_entity_generator.String(row_key),
    EventType: event_entity_generator.String(row.type),
    EventDescription: event_entity_generator.String(row.description),
    Val: event_entity_generator.Int32(row.value),
    Status: event_entity_generator.String(row.status),
  };

  table_service.insertOrReplaceEntity(events_table, event_entity, function (error, result, response) {
    if (error) {
      log(0, "Error inserting entity: " + error.stack);
    } else {
      log(2, "Entity inserted successfully");
      events_db.run("DELETE FROM events WHERE timestamp=" + row.timestamp, function(error, result) {
        if (error) {
          log(0, "Error deleting entry timestamp=" + row.timestamp + " from local database: " + error.stack);
        } else {
          // remove the event's row_key from the queue
          send_queue.splice(send_queue.indexOf(row_key), 1);
        }
      });
    }
  });
}

// handles various exit conditions
function exit_handler(options, err) {
  if (options.cleanup) {
    log(1, 'Closing database...');
    events_db.close();
  }
  if (err) console.log(err.stack);
  if (options.exit) process.exit();
}

// prints log message on the console if log level greater or equal to log_level
function log(level, message) {
  if (level <= log_level) {
    console.log(message);
  }
}
