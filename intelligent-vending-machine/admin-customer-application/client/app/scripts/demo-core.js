var DEMO_CORE = (function(my) {
  my.routes = {
  };
  my.pollFrequency = 2000;
  my.shouldPollSensors = false;
  my.switchNames = ['demo'];
  my.settings = {};
  my.currentReadings = {};

  /*
   * Construct Server URL.
   */
  my.buildServerUrl = function(pathAndQuery) {
    var loc = window.document.location;
    return loc.protocol + "//" + loc.host + pathAndQuery;
  };

  /*
   * Return current temperature reading.
   */
  my.currentTemperature = function() {
    if (my.currentReadings.temperature != null) {
      return my.currentReadings.temperature;
    } else {
      return null;
    }
  };

  /*
   * Convert Fahrenheit temperature to Celsius.
   */
  my.fahrenheitToCelsius = function(fahrenheit) {
    return (fahrenheit - 32) * 5 / 9;
  };

  /*
   * Convert Fahrenheit temperature to the preferred temperature units, with the
   * specified number of places after the decimal point.
   */
  my.fahrenheitTempToPreferredUnit = function(temp, decimalPoints) {
    if (decimalPoints == null) {
      decimalPoints = 1;
    }
    if (my.settings.temperature_units === "Celsius") {
      return my.fahrenheitToCelsius(temp).toFixed(decimalPoints);
    } else {
      return temp.toFixed(decimalPoints);
    }
  };

  /*
   * Set up timer to trigger next poll
   */
  my.scheduleNextPoll = function(pollFunction) {

    return setTimeout(pollFunction, my.pollFrequency);
  };

  /*
   * Fetch the current sensor readings and update the #data container with them
   */
  my.updateCurrentSensorReadings = function() {

    console.log('my.updateCurrentSensorReadings');

    if (my.shouldPollSensors) {

      if(navigator.onLine) {

        console.log('onLine');

        var utctime = (new Date()).toUTCString();
        var CanonicalizedResource = '/iotvendingmachine/Events()';
        var StringToSign = 
                  utctime + "\n" +
                  CanonicalizedResource;

        var secretKey = '+bL2CajfZIi0K/DGql0ZGf9vbNWCvkKhVU2l8QlhH9Oprr283DCmrnwUG5MbsRFaBmDk9Q5AwbzkXckOe4KOkQ==';

        var signature = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(CryptoJS.enc.Utf8.parse(StringToSign), 
          CryptoJS.enc.Base64.parse(secretKey)));

        var urlPath = "https://iotvendingmachine.table.core.windows.net/Events()?$filter=EventType%20eq%20'temperature'&$select=PartitionKey,RowKey,EventType,EventDescription,Status,Val";
        var accountName = 'Insert your Azure account here';

        return $.ajax({
          url: urlPath,
          type: 'GET',
          success: function (data) {

            var key = Math.floor((Math.random() * data.value.length) - 1);

            //data[0].temp = data.value[0].Val;
            var obj = data.value[key];
            obj.temp = obj.Val;

            //data[0].threshold = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;

            jQuery(document).trigger('DEMO_CORE.sensors.current', [obj]);

            //my.scheduleNextPoll(my.updateCurrentSensorReadings);

            //return data;

          },
          beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', "SharedKeyLite " + accountName + ":" + signature);
            xhr.setRequestHeader('x-ms-date', utctime);
            xhr.setRequestHeader('x-ms-version', ' 2013-08-15');
            xhr.setRequestHeader('Accept', 'application/json;odata=nometadata');
          },
          error: function (rcvData) {
            //console.log(rcvData);
            //console.log("Error fetching current sensor readings: " + textStatus + " / " + errorThrown);

          },
          always: function (){
            // Schedule poll only after AJAX call finishes (success or failure)
            my.scheduleNextPoll(my.updateCurrentSensorReadings);
          }
        });

      }else{

        console.log('offLine');

        return $.ajax({
          url: 'http://0.0.0.0:3000/events/temperature',
          type: 'GET',
          success: function (data) {

            var key = Math.floor((Math.random() * data.value.length) - 1);

            //data[0].temp = data.value[0].Val;
            var obj = data.value[key];
            obj.temp = obj.Val;

            //data[0].threshold = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;

            jQuery(document).trigger('DEMO_CORE.sensors.current', [obj]);

            //my.scheduleNextPoll(my.updateCurrentSensorReadings);

            //return data;

          },
          error: function (rcvData) {
            console.log("Error fetching current sensor readings: " + textStatus + " / " + rcvData);

          },
          always: function (){
            // Schedule poll only after AJAX call finishes (success or failure)
            my.scheduleNextPoll(my.updateCurrentSensorReadings);
          }

        });

      }

    } else {
    	//console.log('shouldPollSensors was NO, -> scheduleNextPoll()');
      // Set timer for next check
      my.scheduleNextPoll(my.updateCurrentSensorReadings);

    }

  };

  /*
   * Parse time from text in HH:mm format
   */
  my.parseTime = function(stampText) {
    return moment(stampText, 'HH:mm');
  };

  /*
   * Parse time from text in ISO 8601 formats
   */
  my.parseTimestamp = function(stampText) {
    return moment(stampText);
  };

  /*
   * Returns a format string for the preferred time format, optionally including
   * seconds.
   */
  my.getHourFormat = function(includeSeconds) {
    var seconds = includeSeconds ? ':ss' : '';
    if (my.settings.time_format === 12 || my.settings.time_format === "12") {
      return "h:mm" + seconds + " A";
    } else {
      return "HH:mm" + seconds;
    }
  };

  /*
   * Formats a timestamp as a string, according to the preferred hour format.
   */
  my.formatDateTime = function(date) {
    return date.format('YYYY-MM-DD ' + my.getHourFormat(true));
  };

  /*
   * Formats a time as a string, according to the preferred hour format.
   */
  my.formatTime = function(time) {
    return time.format(getHourFormat());
  };

  /*
   * Returns true if the value is true, 1, "1", "true", "yes", or "on", false
   * otherwise.
   */
  my.isTruthy = function(value) {
    return value === true || value === 1 || value === "1" || value === "true" || value === "yes" || value === "on";
  };

  /*
   * Convert timestamp format from mm/dd/[yy]yy/ to [yy]yy-mm-dd, which matches
   * ISO 8601 (though 2-digit years are only allowed in 8601:2000, but not the
   * newer 8601:2004 spec).
   */
  my.fixupTimestamp = function(stampText) {
    return stampText.replace(/([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{2,4})(.*)/, "$3-$1-$2$4");
  };

  /*
   * Adjust format of switch data value
   */
  my.formatSwitchData = function(newSwitchStatus) {
    var switchName, i, data = {};

    /*
     * Special case: when you switch the demo off, it returns DemoisOff not DemoOff
     * Special case: when you switch the demo on, it returns DemoStating not DemoOn
     */
    if (newSwitchStatus === "DemoisOff") {
      newSwitchStatus = "DemoOff";
    }
    if (newSwitchStatus === "DemoStarting") {
      newSwitchStatus = "DemoOn";
    }

    var switchValueMatch = newSwitchStatus.match(/^(.*?)_?(On|Off)$/);
    var newSwitchName = switchValueMatch[1].toLowerCase();
    var newSwitchValue = switchValueMatch[2];

    for (i = 0; i < my.switchNames.length; i++) {
      switchName = my.switchNames[i];
      if (switchName === newSwitchName) {
        data[switchName] = my.isTruthy(newSwitchValue.toLowerCase());
      } else {
        if (my.switches != null) {
          data[switchName] = my.switches[switchName];
        }
      }
    }
    return data;
  };

  /*
   * Clean up data formatting to make it javascript-friendly.
   */
  my.formatData = function(data) {
    return {
      timestamp: my.fixupTimestamp(data.timestamp),
      temperature: parseInt(data.temp, 10),
      threshold: parseFloat(data.threshold)
    };
  };

  return my;
}(DEMO_CORE || {}));
