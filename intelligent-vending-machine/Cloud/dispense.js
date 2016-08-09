var azure = require("azure-storage");

// initialize azure table service, create table
var table_service = azure.createTableService();

var partition_key = process.env.PARTITION_KEY;

table_service.createTableIfNotExists('Events', function(error, result, response){
  if (error) {
    console.log("Error creating events table: " + error.stack);
  } else {
    // Table exists or created
    console.log("events table created successfully");

    var event_entity_generator = azure.TableUtilities.entityGenerator;
    var event_entity = {
      PartitionKey: event_entity_generator.String(partition_key),
      RowKey: event_entity_generator.String("u" + Date.now()),
      EventType: event_entity_generator.String("dispense"),
      EventDescription: event_entity_generator.String("tray3"),
      Val: event_entity_generator.Int32(150),
      Status: event_entity_generator.String("pending"),
    };
    table_service.insertOrReplaceEntity('Events', event_entity, function (error, result, response) {
      if (error) {
        console.log("Error inserting entity: " + error.stack);
      } else {
        console.log("Entity inserted successfully");
      }
    });
  }
});
