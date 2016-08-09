'use strict';

var services = angular.module('intelligentVendingApp.services', []);

services.factory('poller', function poller($http, $timeout) {

  poller.hasInternet = 0;

  var PartitionKey = '98:4f:ee:05:5d:26';

  poller.data = { calls: 0 };
  
  poller.unixTime = Math.floor((new Date()).getTime());

  poller.getUTCTime = function () {
      return (new Date()).toUTCString();
  };

  /*
  * check if we are in offlinbe mode
   */
  poller.isOffline = function(){

    //console.log('isOffline()');

    if(navigator.onLine) {
      poller.hasInternet = 1;
    }else{
      poller.hasInternet = 0;
    } 

    //poller.hasInternet = 0;

    //console.log('hasInternet', poller.hasInternet);

  }

  poller.isOffline();

  poller.makeUrlString = function (tableName,filterExpression,selectKeys) {

    if(poller.hasInternet){

      if (filterExpression.substring(0, 12) === "PartitionKey") { // filter by specific partitionKey and RowKey

        var url = 'https://iotvendingmachine.table.core.windows.net/'+tableName+'('+filterExpression+')';

      }else{ // filter by query-expression

        var url = 'https://iotvendingmachine.table.core.windows.net/'+tableName+'()?'+filterExpression+'&';
        if(selectKeys){ url = url + selectKeys; }

      }

    }else{

      if (tableName==='Inventory'){

        var url = 'http://0.0.0.0:3000/inventory';

      }else if (tableName==='Events'){

        if(filterExpression.indexOf('temperature') >= 0){
          var url = 'http://0.0.0.0:3000/events/temperature'; //'+'m'+(poller.unixTime-86400000);
        }else if(filterExpression.indexOf('dispense') >= 0){
          var url = 'http://0.0.0.0:3000/events/dispense/'; //;+'u'+(poller.unixTime-86400000);
        }else if(filterExpression.indexOf('failure') >= 0){
          var url = 'http://0.0.0.0:3000/events/failure/'; //+'m'+(poller.unixTime-86400000);
        }else if (filterExpression.substring(0, 12) === "PartitionKey") {
          var url = 'http://0.0.0.0:3000/events/'; 
        }

      }

    }

    return url;

  };

  poller.makeAuthString = function (table,keys) {

    if(typeof keys == "undefined"){ keys = ""; }

    var CanonicalizedResource = '/iotvendingmachine/'+table+'('+keys+')';
    //console.log('CanonicalizedResource',CanonicalizedResource);

    var StringToSign = 
              poller.getUTCTime() + "\n" +
              CanonicalizedResource;
    var secretKey = '+bL2CajfZIi0K/DGql0ZGf9vbNWCvkKhVU2l8QlhH9Oprr283DCmrnwUG5MbsRFaBmDk9Q5AwbzkXckOe4KOkQ==';

    var signature = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(CryptoJS.enc.Utf8.parse(StringToSign), 
      CryptoJS.enc.Base64.parse(secretKey)));

    var accountName = 'Insert your Azure account here';

    return "SharedKeyLite " + accountName + ":" + signature

  };


  poller.getData = function() {

    var getDispenseEvents = function () {

      var config = {
        headers:  {
              'Authorization': poller.makeAuthString('Events'),
              'x-ms-date': poller.getUTCTime(),
              "x-ms-version" : "2013-08-15",
              "Accept" : "application/json;odata=nometadata"
          }
      };

      if(!poller.hasInternet){ config = {}; };

      $http.get(
        poller.makeUrlString('Events',"$filter=(EventType%20eq%20'dispense')%20and%20(PartitionKey%20eq%20'"+PartitionKey+"')%20and%20(RowKey%20gt%20'u"+(poller.unixTime-86400000)+"')",'$select=PartitionKey,RowKey,EventType,EventDescription,Status,Val,Alert'),config)
          .then(
            function(response) {
              //console.log('getDispenseEvents GET Success',response);
              if(poller.hasInternet){ poller.data.getDispenseEvents = response.data.value; }
              else{ poller.data.getDispenseEvents = response.data; }
            }, 
            function(err){
              console.log('ERROR: getDispenseEvents GET',err);
            }
      );

    };

    var getTemperatureEvents = function () {

      var config = {
        headers:  {
              'Authorization': poller.makeAuthString('Events'),
              'x-ms-date': poller.getUTCTime(),
              "x-ms-version" : "2013-08-15",
              "Accept" : "application/json;odata=nometadata"
          }
      };

      if(!poller.hasInternet){ config = {}; };

      $http.get(
        poller.makeUrlString('Events',"$filter=(EventType%20eq%20'temperature')%20and%20(PartitionKey%20eq%20'"+PartitionKey+"')%20and%20(RowKey%20gt%20'm"+(poller.unixTime-86400000)+"')",'$select=PartitionKey,RowKey,EventType,EventDescription,Status,Val,Alert'),config)
          .then(
            function(response) {
              //console.log('getTemperatureEvents GET Success',response);
              if(poller.hasInternet){ poller.data.getTemperatureEvents = response.data.value; }
              else{ poller.data.getTemperatureEvents = response.data; }
           }, 
            function(err){
              console.log('ERROR: getTemperatureEvents GET',err);
            }
      );

    };

    var getFailureEvents = function () {

      var config = {
        headers:  {
              'Authorization': poller.makeAuthString('Events'),
              'x-ms-date': poller.getUTCTime(),
              "x-ms-version" : "2013-08-15",
              "Accept" : "application/json;odata=nometadata"
          }
      };

      if(!poller.hasInternet){ config = {}; };

      $http.get(
        poller.makeUrlString('Events',"$filter=(EventType%20eq%20'failure')%20and%20(PartitionKey%20eq%20'"+PartitionKey+"')%20and%20(RowKey%20gt%20'm"+(poller.unixTime-86400000)+"')",'$select=PartitionKey,RowKey,EventType,EventDescription,Status,Val,Alert'),config)
          .then(
            function(response) {
              //console.log('getFailureEvents GET Success',response);
              if(poller.hasInternet){ poller.data.getFailureEvents = response.data.value; }
              else{ poller.data.getFailureEvents = response.data; }
            }, 
            function(err){
              console.log('ERROR: getFailureEvents GET',err);
            }
      );

    };

    var getProductData = function () {

      var config = {
        headers:  {
              'Authorization': poller.makeAuthString('Inventory'),
              'x-ms-date': poller.getUTCTime(),
              "x-ms-version" : "2013-08-15",
              "Accept" : "application/json;odata=nometadata"
          }
      };

      if(!poller.hasInternet){ config = {}; };

      $http.get(
        poller.makeUrlString('Inventory',"$filter=(Available%20ge%201)%20and%20(PartitionKey%20eq%20'"+PartitionKey+"')",'$select=PartitionKey,RowKey,Available,Price,Products,Tray'),config)
          .then(
            function(response) {
              //console.log('getProductData GET Success',response);
              if(poller.hasInternet){ poller.data.getProductData = response.data.value; }
              else{ poller.data.getProductData = response.data; }
            }, 
            function(err){
              console.log('ERROR: getProductData GET',err);
            }
      );

    };

    poller.data.calls++;

    getProductData();
    getDispenseEvents();
    getTemperatureEvents();
    getFailureEvents();

    //console.log('poller.data',poller.data);

    $timeout(poller.getData, 3000);

  };

  poller.getData(); // starts Poller on load

  return {
      data: poller.data,

      updateProductData: function(PartitionKey,RowKey,putObj){

        console.log('updateProductData',putObj);

        var obj = {

          Available: putObj.Available,
          PartitionKey: putObj.PartitionKey,
          Price: putObj.Price,
          Products: putObj.Products, 
          RowKey: putObj.RowKey,
          Tray: putObj.Tray
          
        }

        if(poller.hasInternet){

          console.log('Doing a PUT');

          var config = {
            headers:  {
                  'Authorization': poller.makeAuthString('Inventory',"PartitionKey='"+PartitionKey+"',RowKey='"+RowKey+"'"),
                  'x-ms-date': poller.getUTCTime(),
                  "x-ms-version" : "2013-08-15",
                  "Content-Type" : "application/json"
              }
          };

          $http.put(
            poller.makeUrlString('Inventory',"PartitionKey='"+PartitionKey+"',RowKey='"+RowKey+"'"), JSON.stringify(obj), config)
          .then(
            function(response) {
              //console.log('updateProductData PUT Success',response);
            }, 
            function(err){
              console.log('ERROR: updateProductData PUT',err);
            }
          );

        }else{

          obj._id = putObj._id;

          console.log('Doing a POST', obj);

          $http.post(
            poller.makeUrlString('Inventory','PartitionKey')+'/'+obj._id, obj)
            .then(
              function(response) {
                console.log('updateProductData POST Success',response);
              }, 
              function(err){
                console.log('ERROR: updateProductData POST',err);
              }
          );

        }

      },

      updateEventsData: function(PartitionKey,RowKey,putObj){

        //console.clear();
        console.log('updateEventsData',putObj);

        if(poller.hasInternet){

          var config = {
            headers:  {
                  'Authorization': poller.makeAuthString('Events',"PartitionKey='"+PartitionKey+"',RowKey='"+RowKey+"'"),
                  'x-ms-date': poller.getUTCTime(),
                  "x-ms-version" : "2013-08-15",
                  "Content-Type" : "application/json"
              }
          };

          $http.put(
            poller.makeUrlString('Events',"PartitionKey='"+PartitionKey+"',RowKey='"+RowKey+"'"), JSON.stringify(putObj), config)
            .then(
              function(response) {
                //console.log('updateEventsData PUT Success',response);
              }, 
              function(err){
                console.log('ERROR: updateEventsData PUT',err);
              }
          );

        }else{

          $http.post(
            poller.makeUrlString('Events','PartitionKey')+'/'+putObj._id, putObj)
            .then(
              function(response) {
                console.log('updateEventsData POST Success',response);
              }, 
              function(err){
                console.log('ERROR: updateEventsData POST',err);
              }
          );

        }

      }

  };

});