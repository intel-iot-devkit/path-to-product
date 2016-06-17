'use strict';

var services = angular.module('smartHomeApp.services', []);

services.factory('poller', ['$http', '$timeout', '$filter', '$q', function ($http, $timeout, $filter, $q) {

  	var poller = {};

  	poller.data = { response: {}, calls: 0 };

	poller.init = function(){ 

		var url = 'http://inteliotstorage.mybluemix.net/api/smarthome/deleteAll';
		var postData = '';

		$.post( 
			url, postData, function( data ) {

			}, 'json')
			.fail(function(jqXHR, textStatus, err){

        	}
        );		

	};

  	poller.getData = function() {

    	var deferred = $q.defer();

	  	/*
	  	local: mock/data.json 
	  	prod: http://inteliotstorage.mybluemix.net/api/smarthome
	  	 */
	    $http.get('http://inteliotstorage.mybluemix.net/api/smarthome').then(function(r) {

			poller.data.response = r.data;
			poller.data.calls++;

			// sort response data by "timestamp" DESC
			sortByProperty( poller.data.response, 'timestamp', true );

			// get log responces by timestamp.
			poller.data.response_by_time = poller.data.response;

			//loop through all poller data, pull out unique sensor and status only.
			var log_response = [];
			var log_times = {};
			var strs = [];
		    angular.forEach(poller.data.response, function(value, key) {
		    	
		    	//if (value.name==='garage_block'){ value.name = 'garage_door'; }

		    	// only push() those that are unique name and status
		    	var str = value.name+':'+value.status;

		    	// add uniue status unless value is default (doorbell ring)
		    	if(strs.indexOf(str)<0) { 

		    		// add unique proprerty and value
		    		strs.push(str);

		    		// load the value to the log_response array
		    		log_response.push(value);

		    	}
    
		    });	

		    // get order of sensors by timestamp before sortingmy name
		    var v=0;
		    angular.forEach(log_response, function(value, key) {

		    	if (value.status!=='unblocked'){
		    	
		    		log_times[value.name+'_'+value.status] = v;

		    		v++;

		    	}
	    
		    });	

			// sort log_response data by "name" DESC
			sortByProperty( log_response, 'name' );

			// provide all data for the log.
			poller.data.log_response = log_response;

			poller.data.log_times = log_times;

			// clean the event log so that we only get a singe recent event per sensor
			poller.data.response = poller.recentActions(poller.data.response);

			$timeout(poller.getData, 2000);
	    });

	    return deferred.promise;
    
  	};

  	poller.recentActions = function(cloudData) {
	// reverse the array so we get the most current actions

		// get only the most recent values for each sensor.
		var unique = {};
		var distinct = [];
		for( var i in cloudData ){

			//TEMP fix to correct cloud data
			if(cloudData[i].name==='front_door' && cloudData[i].status==='unlock'){
				cloudData[i].name ='front_door_lock';
				cloudData[i].status ='unlocked';
			}else if(cloudData[i].name==='front_door' && cloudData[i].status==='lock'){
				cloudData[i].name ='front_door_lock';
				cloudData[i].status ='locked';
			}
			//END TEMP fix to correct cloud data

			if( typeof(unique[cloudData[i].name]) === "undefined"){
				distinct.push(cloudData[i]);
			}
			unique[cloudData[i].name] = 0;
		}

		return distinct;
    
	};

	function sortByProperty( arr, property, descending ){
		arr.sort( function( a, b ) {
			var c = a[property].toString();
			var d = b[property].toString();

			if ( c === d ) { return 0; }
				return Boolean( descending ) ? d > c ? 1 : -1 : d < c ? 1 : -1;
		} );
	}

	if (location.href.split(location.host)[1] === '/#/admin'){

		poller.init();
	}

	setTimeout(function() { poller.getData(); }, 1000);

	return {
		data: poller.data
	};

}]);