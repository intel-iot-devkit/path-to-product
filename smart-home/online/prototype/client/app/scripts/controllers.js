'use strict';

var ctrls = angular.module('smartHomeApp.controllers', ['smartHomeApp.services']);

ctrls.controller('AdminController', ['$scope', 'poller', '$http', '$timeout', function ($scope, poller, $http, $timeout) {

 	var smartApps = {

		front_doorbell: {
			name: "front_doorbell", 
			ring_again: { desc: "Doorbell Rang", descSm: "Rang", image: "images/door-bell-on2.gif", color: "orange" },
			ring:   	{ desc: "Doorbell Rang", descSm: "Rang", image: "images/door-bell-on.gif", color: "orange" },
			sensor:     { img: "images/Buzzer.png", name: "Buzzer" }
		},

		front_door: {
			name: "front_door", 
			open:   	{ desc: "Door Opened", descSm: "Open", image: "images/door-open.gif", color: "green" },
			close: 		{ desc: "Door Closed", descSm: "Closed", image: "images/door-closed.gif", color: "dark-orange" }, 
			sensor:     { img: "images/Touch.png", name: "Touch" }
		},

		front_door_lock: {
			name: "front_door_lock", 
			locked:   	{ desc: "Door Locked", descSm: "Locked", image: "images/door-lock-on.gif", color: "dark-orange" },
			unlocked: 	{ desc: "Door Unlocked", descSm: "Unlocked", image: "images/door-lock-off.gif", color: "green" },
			sensor:     { img: "images/Rotary_Sensor.png", name: "Rotary Angle" }
		},

		garage_door: {
			name: "garage_door", 
			open:   	{ desc: "Garage Open", descSm: "Open", image: "images/Garage_Door_Open.gif", color: "orange" },
			close: 		{ desc: "Garage Closed", descSm: "Closed", image: "images/Garage_Door_Close.gif", color: "dark-orange" }, 
			//blocked:    { desc: "Garage Blocked", descSm: "Blocked", image: "images/Garage_Door_Blocked.gif", color: "red" },
			sensor:     { img: "images/Motor.png", name: "Step Motor" }
		},

		garage_block: {
			name: "garage_block", 
			unblocked:  { desc: "Garage Unblocked", descSm: "Unblocked", image: "images/Garage_Door_Open.jpg", color: "green" }, 
			blocked:    { desc: "Garage Blocked", descSm: "Blocked", image: "images/Garage_Door_Blocked.gif", color: "red" },
			sensor:     { img: "images/Light_Sensor.png", name: "Light Sensor" }
		},

		mobile_garage_door: {
			name: "mobile_garage_door", 
			open:   	{ desc: "Garage Open", descSm: "Open", image: "images/Remote_window_open.gif", color: "Button Sensor" },
			close: 		{ desc: "Garage Closed", descSm: "Closed", image: "images/Remote_window_closed.gif", color: "Button Sensor" }, 
			blocked:    { desc: "Garage Blocked", descSm: "Blocked", image: "images/Remote_window_blocked.gif", color: "Button Sensor" }
		}

	}; 

    $scope.logObj = [];
	$scope.smartApps = smartApps;
    $scope.data = poller.data;
   	$scope.eventLogs = [];
	$scope.cloudDataHold = [];

	$scope.sortColumn = 'timestamp';
    $scope.quantity = 10;
    $scope.date = new Date();

    $scope.reverseSort = true;
    $scope.showAboutModal = false;
    $scope.showLogModal = false;
    $scope.showSetupModal = false;
    $scope.slideSensor = false;
    $scope.animate = true;

    $scope.front_door = '';
    $scope.garage_door = '';

    if (location.href.split(location.host)[1] === '/#/mobile'){
	    $scope.mobile_garage_door = '<img class="img-responsive" src="images/clear-mobile-middle.png">';
	}

    $scope.lastAction = '';
    $scope.lastAction2 = '';
    $scope.sensor_type_0 = '';
    $scope.sensor_type_1 = '';
    $scope.sensor_image_0 = '';
    $scope.sensor_image_1 = '';
    $scope.lastAction_0 = '';
    $scope.lastAction_1 = '';
    $scope.color_0 = '';
    $scope.color_1 = '';


    /*
    Watch for poller data as it changes
     */
	$scope.$watch(

		function() { //call
			return $scope.data.response;

		},function(newVal, oldVal) { //callback // 

			if (typeof newVal !== 'undefined') {
				if(!angular.equals(oldVal, newVal)) {

					$scope.appReact(poller.data.response);
				}
			}

		}

	);

 	/*
	*
	 */
    $scope.buildLog = function(){

		angular.forEach(smartApps, function(value, key) {

			if(key !== 'mobile_garage_door'){

				angular.forEach(value, function(value2, key2) {

					if (key2 !== 'name' && key2 !== 'sensor' && key2 !== 'ring_again' && key2 !== 'unblocked'){
						var obj = {};
						obj.name = key;
						obj.status = key2;
						$scope.logObj.push(obj);
					}

				});

			}

		});

		sortByProperty( $scope.logObj, 'name' );

    };
    $scope.buildLog();


	function sortByProperty( arr, property, descending ){
		arr.sort( function( a, b ) {
			var c = a[property].toString();
			var d = b[property].toString();

			if ( c === d ) { return 0; }
				return Boolean( descending ) ? d > c ? 1 : -1 : d < c ? 1 : -1;
		} );
	}

    /*
    This is called via a button that represents a sensor, or the model data has changed.
    -- modelReact() called from mobile buttons
     */
	$scope.modelReact = function(status,doSave){ // reacts via button push.

		//update most recent action
		var sensor = 'mobile_garage_door';

		angular.forEach($scope.data.response, function(value) {//, key
			if(value.name === 'garage_block' && value.status === 'blocked'){ 
				status = "blocked";
				doSave = 1;
				$scope.overlayNotification('Remove block to continue.');
			}
		});

		$scope.mobile_garage_door = '<img class="img-responsive" src="'+smartApps[sensor][status].image+'" alt="'+smartApps[sensor][status].desc+'"/>';

		if(doSave!==1){

			// set the garage status to open if a block was in place
			sensor = 'garage_door';
			//if(status === "blocked"){ status = 'open'; }

			// save data to cloud. only found her bacuase really, the mobile app should only be controlling.
			$scope.saveToJson(sensor);

		}
		
	};

    /*
    This is called via a button that represents a sensor, or the model data has changed.
    -- called ONLY from the poller watch function
    -- sets the Admin display to the current values.
    */
	$scope.appReact = function(cloudData){ // reacts via button push.

		if (cloudData[0]){

			// cehck to see if garge is blocked
			var garage_blocked = 0;
			angular.forEach(cloudData, function(value) {//, key
				if(value.name === 'garage_block' && value.status === 'blocked'){ 
					garage_blocked = 1;
				}
			});

			// this watches for the garage door state to activate the mobile version display
			if(cloudData[0].name==='garage_door'){
				$scope.modelReact(cloudData[0].status,1);		
			}

			var doors = {};
			var door = ["front_door", "front_door_lock"];
			var garage = ["garage_door", "garage_block"];//
			var bell = ["front_doorbell"];

		    // update pull tab status
		    this.updateStatusTab(cloudData);

		    var cloudData2 = [];

			// loop through cloud data and show the most recent of each door and garage status
		    angular.forEach($scope.data.response_by_time, function(value,key) {

		    	if(cloudData2.length < 2){

					cloudData2.push(value); 

			    	if(door.indexOf(value.name)>=0 && !doors.door) {

						//update most recent action
						doors.door = value.name;
						$scope.the_front_door = '<img class="img-responsive" src="'+smartApps[value.name][value.status].image+'" alt="'+smartApps[value.name][value.status].desc+'"/>';
			
			    	} else if(garage.indexOf(value.name)>=0 && !doors.garage) {

						//update most recent action
						doors.garage = value.name;

						if(value.status === 'close' && garage_blocked){ 
							$scope.the_garage_door = '<img class="img-responsive" src="'+smartApps.garage_block.blocked.image+'" alt="'+smartApps.garage_block.blocked.desc+'"/>';
						}else{
							$scope.the_garage_door = '<img class="img-responsive" src="'+smartApps[value.name][value.status].image+'" alt="'+smartApps[value.name][value.status].desc+'"/>';
						}    		


			    	} else if(bell.indexOf(value.name)>=0 && !doors.bell) {

			    		//only ring the doorbell if its the most recent item.
			    		if(key===0){

							//update most recent action
							doors.bell = value.name;
							//delete $scope.the_door_bell;
							$scope.the_door_bell = '<img class="img-responsive" src="'+smartApps[value.name][value.status].image+'" alt="'+smartApps[value.name][value.status].desc+'"/>';

						}
			    	}

			    }
		            
		    });

			// set the last action box content. this needs final completion after we see ajax response.
		    this.updateLastAction(cloudData2);

		}
			
	};

 	$scope.updateLastAction = function(cloudData) {

 		if(cloudData){ $scope.slideSensor = true; }

 		if(cloudData){

  			$scope.cloudDataHold = cloudData;

 			$scope.slideSensor = !$scope.slideSensor;

 			$timeout(function() {
 				$('.animate-last-action.slide-down').show(); //show the slider after init load.
 				angular.element('#animate-last-actions').triggerHandler('click');

 			}, 500);

 			 $scope['lastAction_0'] = "";
 			 $scope['lastAction_1'] = "";

		}else{

  			cloudData = $scope.cloudDataHold;

  			// set the dynamic content
	 		angular.forEach($scope.cloudDataHold, function(value, key) {

	 			if(smartApps[value.name]){
					$scope['lastAction_'+key] = smartApps[value.name][value.status].desc;
					$scope['sensor_image_'+key] = smartApps[value.name].sensor.img;
					$scope['sensor_type_'+key] = smartApps[value.name].sensor.name;
					$scope['color_'+key] = smartApps[value.name][value.status].color;

				}
			});


 			$scope.slideSensor = !$scope.slideSensor;
 			//$scope.$apply();

		}

	};

 	$scope.updateStatusTab = function(cloudData) {

 		var sensor_name = "";

		for(var key in cloudData){

			if(cloudData.hasOwnProperty(key)){

					sensor_name = cloudData[key].name;

				if(sensor_name){
					$scope[sensor_name] = smartApps[sensor_name][cloudData[key].status].descSm;
					var timestamp = cloudData[key].timestamp.substr(cloudData[key].timestamp.lastIndexOf("_")+1);

					if (timestamp.substring(0, 5).slice(-1)===":") {
						$scope[sensor_name+'_time'] = timestamp.substring(0, 4)+' '+timestamp.slice(-2);
					}else{
						$scope[sensor_name+'_time'] = timestamp.substring(0, 5)+' '+timestamp.slice(-2);
					}
				}
			}

		}

	};

 	$scope.saveToJson = function(sensorName) {//, data

 		// get the last polling reponse object containing all sensor statuses. place into temp object

		var newData = {};
		newData.name = sensorName;
		newData.timestamp = this.convertToISOString(this.getCurrentDatetime());

		angular.forEach($scope.data.response, function(value) {//, key

			// dont allower the block to go if  the garage door is down.
 			//if (value.name === 'garage_door' && value.status === 'closed'){ save = 0; }

 			if (value.name === sensorName){ newData.status = value.status; }

 		});

		if (sensorName==="front_doorbell"){

			if(newData.status === "ring"){
				newData.status = "ring_again";
			}else{
				newData.status = "ring";
			}

		} else if (sensorName==="front_door"){

			if(newData.status === "open"){
				newData.status = "close";
			}else{
				newData.status = "open";
			}

		} else if (sensorName==="garage_door"){

			if(newData.status === "open"){
				newData.status = "close";
			}else{
				newData.status = "open";
			}

		} else if (sensorName==="front_door_lock"){

			if(newData.status === "locked"){
				newData.status = "unlocked";
			}else{
				newData.status = "locked";
			}

		} else if (sensorName==="garage_block"){

			if(newData.status === "blocked" ){
				newData.status = "unblocked";
			}else{
				newData.status = "blocked";
			}

		}

		var save = 1;

		// dont allow save if garage door is clossed
		if( sensorName==="garage_block" &&
			!(objectFindByKey($scope.data.response,'name','garage_door') && objectFindByKey($scope.data.response,'status','open') )
			 ){ 
			save = 0;
			this.overlayNotification('The garage must be open to inject a block.');
		} else if( sensorName==="garage_door" &&
			(objectFindByKey($scope.data.response,'name','garage_block') && objectFindByKey($scope.data.response,'status','blocked') )
			 ){
			save = 0;
			this.overlayNotification('There is a block in the garge door. Remove it to continue.');
		} else if( sensorName==="front_door_lock" &&
			(objectFindByKey($scope.data.response,'name','front_door') && objectFindByKey($scope.data.response,'status','open') )
			 ){
			save = 0;
			this.overlayNotification('The front door is locked. Unlock it first.');
		} else if( sensorName==="front_door" &&
			(objectFindByKey($scope.data.response,'name','front_door_lock') && objectFindByKey($scope.data.response,'status','locked') )
			 ){
			save = 0;
			this.overlayNotification('The front door is locked. Unlock it first.');
		}

		if(save){

			var url = 'http://inteliotstorage.mybluemix.net/api/smarthome';
	        
			$.post( 
				url, newData, function( data ) {

				}, 'json')
				.fail(function( err ){

	        	}
	        );		

    	}else{
    		//console.log('POST Blocked for Sensor: ',newData);
    	}

	};

	/*
	Called form View
	 */
    $scope.sortData = function (column) {
        $scope.reverseSort = ($scope.sortColumn === column) ?
            !$scope.reverseSort : false;
        $scope.sortColumn = column;
    };

 	/*
	Called form View
	 */
    $scope.getSortClass = function (column) {

        if ($scope.sortColumn === column) {
            return $scope.reverseSort ? 'arrow-down' : 'arrow-up';
        }

        return '';
    };

 	/*
	Called form View
	 */
    $scope.toggleModal = function(whichModal){

	    switch(whichModal) {
	        case "about":
	             $scope.showAboutModal = !$scope.showAboutModal;
	             break;
	        case "log":
	             $scope.showLogModal = !$scope.showLogModal;
	             break;
	        case "setup":
	             $scope.showSetupModal = !$scope.showSetupModal;
	             break;
	    }     	

    };


	$scope.convertToISOString = function(serverDate) {

	    var dt = new Date(Date.parse(serverDate));
	    var localDate = dt;

	    var gmt = localDate;
	        var min = gmt.getTime() / 1000 / 60; // convert gmt date to minutes
	        var localNow = new Date().getTimezoneOffset(); // get the timezone
	        // offset in minutes
	        var localTime = min - localNow; // get the local time

	    var dateStr = new Date(localTime * 1000 * 60);
	    dateStr = dateStr.toISOString("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"); // this will return as just the server date format i.e., yyyy-MM-dd'T'HH:mm:ss.SSS'Z'
	    return dateStr;
	};

    $scope.getCurrentDatetime = function(){

		var now = new Date(); 
		var now_utc = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),  now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
		return now_utc;
    };

	$scope.fetchCloudData = function() {

		pollerService.getData().then(function(data){
			//console.log(data);
		}); 
	};

	/*
	* 
	 */
	$scope.overlayNotification = function(message){

	    // add the overlay with loading image to the page
	    var over = 
	    '<div id="overlay">' +

		    '<div id="confirmWrapper">' +

		    	'<div class="confirmText">'+message+'</div>' +
		    	'<div class="confirmCancel">Continue</div>' +
		    	'<br class="clear"/>' +

		   '</div>';
	   
	   '</div>';

	    $(over).appendTo('#content-container');

	    // click on the overlay to remove it
	    $('.confirmCancel').click(function() {
	        $('#overlay').remove();
	    });

	    // hit escape to close the overlay
	    $(document).keyup(function(e) {
	        if (e.which === 27) {
	            $('#overlay').remove();
	        }
	    });
	    
	};

	// array = [{key:value},{key:value}]
	function objectFindByKey(array, key, value) {
	    for (var i = 0; i < array.length; i++) {
	        if (array[i][key] === value) {
	            //return array[i];
	            return true;
	        }
	    }
	    return false;
	}

}]);

