'use strict';

var ctrls = angular.module('intelligentVendingApp.controllers', ['intelligentVendingApp.services']);

ctrls.controller('AdminController', function ($scope, poller, $http, $timeout, $route) {

	$scope.data = poller.data;
  $scope.productChoice = [];
  $scope.productChoiceEach = [];
  $scope.basketTotal = 0;
  $scope.isSmall = null;
  $scope.importantAlerts = false;
	$scope.alertCount = null;
	$scope.productData = null;
	$scope.alertData = null;
	$scope.alertDataHistory = null;
	$scope.configData = configData;
  $scope.showAboutModal = false;
  $scope.showActivityLog = false;
  $scope.showSetupModal = false;
	$scope.sale_message = '';
	$scope.sale_anime = '';
	$scope.machine_status = '';
	$scope.PartitionKey = '98:4f:ee:05:5d:26';
	$scope.checkoutLoop = 0;
	$scope.chargedTotal = 0;
	$scope.curMachineState = 'closed';
  $scope.reducedProducts = [];
  $scope.hasInternet = 0;

	// the current Epoch time in millisecond
	$scope.unixTime = Math.floor((new Date()).getTime());
	//console.log('$scope.unixTime',$scope.unixTime);

	//console.log('Poller.data',poller.data);

  /*
  Watch for poller data as it changes
   */
	$scope.$watch(

		function() { return $scope.data.getProductData;},

		function(newVal, oldVal) {

			if (typeof newVal !== 'undefined') {

				$scope.alertEvents = [];
				$scope.logEvents = {};
				$scope.logEvents.dispense = [];
				$scope.logEvents.temperature = [];
				$scope.logEvents.coil = [];
				$scope.logEvents.door = [];
    		$scope.productData = poller.data.getProductData;
    		$scope.dispenseEvents = poller.data.getDispenseEvents;
    		$scope.temperatureEvents = poller.data.getTemperatureEvents;
    		$scope.failureEvents = poller.data.getFailureEvents;
    		//$scope.chargedTotal = 0;
    		//console.log('productData',$scope.productData);
	    		
	    	// sort response data by "timestamp" DESC
				if($scope.failureEvents){ sortByProperty( $scope.failureEvents, 'RowKey', true ); }
				if($scope.temperatureEvents){ sortByProperty( $scope.temperatureEvents, 'RowKey', true ); }
				if($scope.dispenseEvents){ sortByProperty( $scope.dispenseEvents, 'RowKey', true ); }

				//console.log('$scope.chargedTotal',$scope.chargedTotal);
				
				//if($scope.chargedTotal === 0){

					//console.log('$scope.chargedTotal',$scope.chargedTotal);
				
		    	// get an array of only those still in error status
		    	var found = 0;
		    	
					angular.forEach($scope.dispenseEvents, function(value,key) {

						// trim product despense event extra digit
						if(value.RowKey.length > 14){
							value.timestamp = parseInt(value.RowKey.substring(1,14));
						}else{
							value.timestamp = parseInt(value.RowKey.substring(1));
						}

						//console.log('value.timestamp',value.timestamp);

						// only add alertEvents if within 5 minute period
						if(value.Status === 'error' && $scope.withinTime(value.timestamp,300000) && !found){
								$scope.alertEvents.push(value);
								found++;
								configData.coilError = true;
						}

						//24 hour dispense
						if ($scope.withinTime(value.timestamp,86400000)){

							value.percentOfDay = $scope.eventHourPercentage(value.timestamp);

							if(value.Status === 'error'){
								$scope.logEvents.coil.push(value);
							}else if(value.Status === 'dispensed'){
								$scope.logEvents.dispense.push(value);

							}

						}

						// search for cart item with a RowKey that has the unixtime in it.
						//if(value.RowKey.search($scope.unixTime)>0 && $scope.reducedProducts.indexOf(value.RowKey) === -1){
						if(
							value.Status === 'dispensed' 
							&& value.RowKey.search($scope.unixTime) > 0 
							//&& $scope.reducedProducts.length <= $scope.productChoiceEach.length
							&& $scope.reducedProducts.indexOf(value.RowKey) === -1
						){

							//console.log('c',c++);

							//console.log('value', value);
							$scope.chargedTotal += value.Val;
							$scope.reducedProducts.push(value.RowKey);

							var x=0;

							angular.forEach($scope.productChoiceEach, function(value2) {
								
								if (value2.timestamp === value.RowKey){ 
									//console.log('reduceProductCount', value2);
									$scope.reduceProductCount(value2);

								}

								$scope.productChoiceEach[x].Status = value.Status;

								x++;

							});

							// set the alert display timestamp
							//$scope.alertEvents.push(value);

						}

					});

				//}
				
	    	// get an array of only those still in error status
	    	var found = 0;
				angular.forEach($scope.temperatureEvents, function(value) {


					value.timestamp = parseInt(value.RowKey.substring(1));

					//console.log('value.timestamp', $scope.withinTime(value.timestamp,300000));

					if(value.Status === 'error' && $scope.withinTime(value.timestamp,300000) && !found){
					  //console.log('$scope.temperatureEvents', value);
						$scope.alertEvents.push(value);
						found++;
					}

					//24 hour temps
					if (value.Status === 'error' && $scope.withinTime(value.timestamp,86400000)){

						value.percentOfDay = $scope.eventHourPercentage(value.timestamp);
						$scope.logEvents.temperature.push(value);

					}

				});
				
	    		// get an array of only those still in error status
	    	var found = 0;
	    	var doorClosedTime = 0;
				angular.forEach($scope.failureEvents, function(value) {

					value.timestamp = parseInt(value.RowKey.substring(1));

					if(value.Status === 'ok' && !found){ 
						doorClosedTime = value.RowKey;
						found++;
					}

					if(value.Status === 'error' && $scope.withinTime(value.timestamp,300000) && !found){
						$scope.alertEvents.push(value);
						found++;
					}

					//24 hour failures
					if (value.Status === 'error' && $scope.withinTime(value.timestamp,86400000)){

						value.percentOfDay = $scope.eventHourPercentage(value.timestamp);
						$scope.logEvents.door.push(value);

					}

				});

	    		// sort response data by "timestamp" DESC
				sortByProperty( $scope.alertEvents, 'RowKey', true );

				//console.log('$scope.failureEvents', $scope.failureEvents);

				var state = '';

				if($scope.alertEvents.length > 0 ){ 

					if(doorClosedTime > $scope.alertEvents[0].RowKey){
							$scope.alertEvents = [];
							state = 'closed';
							configData.coilError = false;
					}

					$scope.machineState(state);

					$scope.alertNotice();

				}
				
				//console.log('$scope.alertEvents', $scope.alertEvents);
				//console.log('$scope.dispenseEvents', $scope.dispenseEvents);
				//console.log('$scope.temperatureEvents', $scope.temperatureEvents);

			}

		},

		false // make the array check either at main level or deeper.

	);
		
  $scope.init = function() {
		//console.log('init Poller.data',poller.data);
		
		$scope.isOffline();
  	$scope.machineState('load');

  };

  /*
  * check if we are in offlinbe mode
   */
  $scope.isOffline = function(){

    //console.log('isOffline()');

    if(navigator.onLine) {
      $scope.hasInternet = 1;
    }else{
      $scope.hasInternet = 0;
    } 

    //console.log('hasInternet', poller.hasInternet);

  }

	/*
	* check if date is within 24 hours
	 */
	$scope.withinTime = function(unixtime,milliseconds){

		//console.log(($scope.unixTime-unixtime) <= 86400000);

		// is it within 24 hours via milliseconds
		if (($scope.unixTime-unixtime) <= milliseconds) {
			return true;
		}else{
			return false;
		}

	}

	/*
	* check percentage of day the vent was in
	 */
	$scope.eventHourPercentage = function(timestamp){

		//console.log('$scope.unixTime',$scope.unixTime);
		//console.log('timestamp',timestamp);
		//console.log('$scope.unixTime - timestamp',$scope.unixTime - timestamp);
		//console.log('($scope.unixTime - timestamp) * .001',($scope.unixTime - timestamp) * .001);
		//console.log('(($scope.unixTime - timestamp) * .001)/86400',(($scope.unixTime - timestamp) * .001)/86400);

		// seconds since 24 hours
		timestamp = ((($scope.unixTime - timestamp) * .001)/86400)*100;

		//console.log('withinTime',timestamp);

	    return timestamp;

	}

	/*
	* checks to see if important alerts are availabe.
	 */
	$scope.alertNotice = function(){

		//console.log('$scope.isSmall',$scope.isSmall);

	    //if($scope.failureEvents[0].Status === 'error'){//} && $scope.failureEvents[0].RowKey < $scope.alertEvents[0].RowKey){

	    if($scope.alertEvents.length > 2){ $scope.importantAlerts = true; }
	    else if($scope.isSmall === false){ $scope.importantAlerts = false; }

	    if($scope.importantAlerts === true || $scope.isSmall === true){ $scope.isSmall = true; }
	    else if($scope.importantAlerts === false){ $scope.isSmall = false; }

		//}

	}

	/*
	* load first machine state
	 */
	$scope.machineState = function(state){

		if(typeof state == "undefined"){ state = 0; }

		var found = 0;		

		if(!state){

			//console.log('have NO state');

			angular.forEach($scope.alertEvents, function(value) {//, key

				if(!found){

					if(value.EventType === 'dispense'){
						state = 'coilError';
						found++;
					} else if(value.EventDescription === 'low'){
						state = 'temperatureError';
						found++;
					} else if(value.EventDescription === 'high'){
						state = 'temperatureError2';
						found++;
					} else if(value.EventDescription === 'machine_opened'){
						state = 'open';
						found++;
					} else if(value.EventDescription === 'machine_closed'){
						state = 'closed';
						found++;
					}

					//console.log('State is ',state);
				}

			});

		}

		if($scope.configData.inventoryError === true){ 
			state = "inventoryError";
		}

		if($scope.curMachineState !== state){
			//console.log('state',state);
			//console.log('$scope.curMachineState',$scope.curMachineState);
			$scope.curMachineState = state;
			//$scope.machine_status = '';

			//angular.element( document.getElementById('machine_status') ).scope().$destroy();
			//angular.element(document.getElementById('machine_status')).unbind();
			//delete $scope.machine_status;
			//console.log($scope.machine_status);
			$scope.machine_status = '<img src="images/'+$scope.configData.machineStates[state]+'"/>';


			//console.log('machine_status',machine_status);
		}

	};

	/*
	* MOBILE: search to see if a similair item is in cart currenlty
	 */
	$scope.foundInCart = function(tray){

		var found = false;

		angular.forEach($scope.productChoice, function(value) {

			//console.log('value in',value);

			if(value.Tray === tray){
				value.Qty++; 
				found = true;
			}

			//console.log('value out',value);

		});

		return found;

	};

	/*
	* checks to see if important alerts are availabe.
	$scope.eventViewed = function(eventObj){

		//console.log('eventViewed',eventObj);

		eventObj.Alert = 0;

		//function(obj, EventType, EventDescription, Status, timestamp)
		$scope.eventUpdate(eventObj, eventObj.EventType, eventObj.EventDescription, eventObj.Status);

	}
	 */

	/*
	* MOBILE: PUT event to cloud
	 */
	$scope.eventUpdate = function(obj, EventType, EventDescription, Status, timestamp){
		
		//console.log('eventUpdate',obj);

		var RowKey = "m" + (Math.floor((new Date()).getTime()));//-100000

		if(obj === 'high-temp'){

			var postObj = {
				"PartitionKey": "98:4f:ee:05:5d:26",
				"EventType": "temperature",
				"RowKey": RowKey,
				"Val": (Math.floor(Math.random() * (35 - 31 + 1) + 31)),
				"Status": "error", 
				"EventDescription": "high"
			}

		}else if(obj === 'low-temp'){

			var postObj = {
				"PartitionKey": "98:4f:ee:05:5d:26",
				"EventType": "temperature",
				"RowKey": RowKey,
				"Val": (Math.floor(Math.random() * (17 - 13 + 1) + 13)),
				"Status": "error", 
				"EventDescription": "low"
			}

		}else if(obj === 'normal-temp'){

			var postObj = {
				"PartitionKey": "98:4f:ee:05:5d:26",
				"EventType": "temperature",
				"RowKey": RowKey,
				"Val": (Math.floor(Math.random() * (30 - 18 + 1) + 18)),
				"Status": "ok", 
				"EventDescription": "normal"
			}

		}else if(obj === 'door-open'){

			var postObj = {
				"PartitionKey": "98:4f:ee:05:5d:26",
				"EventType": "failure",
				"RowKey": RowKey,
				"Val": 0,
				"Status": "error", 
				"EventDescription": "machine_opened"
			}

		}else if(obj === 'door-closed'){

			var postObj = {
				"PartitionKey": "98:4f:ee:05:5d:26",
				"EventType": "failure",
				"RowKey": RowKey,
				"Val": 0,
				"Status": "ok", 
				"EventDescription": "machine_closed"
			}

		}else if(obj === 'dispense-error'){

			var postObj = {
				"PartitionKey": "98:4f:ee:05:5d:26",
				"EventType": "dispense",
				"RowKey": RowKey,
				"Val": 33,
				"Status": "error", 
				"EventDescription": "tray1"
			}

		}else{
		
			// if this is a dispense event, grab the RowKey from the "timestamp" paramater
			if(timestamp){ var RowKey = timestamp; }else{ var RowKey = obj.RowKey; }

	    var postObj = {

	      PartitionKey: $scope.PartitionKey,
	      EventType: EventType,
	      Val: obj.Price, // Event Val accepting Inventory Price
	      Status: Status, 
	      EventDescription: EventDescription,
	      RowKey: RowKey

	    }

			if(!$scope.hasInternet){
				postObj._id = obj._id;
			}

	    //if(EventType == 'dispense'){
			//postObj.Unixtime = obj.unixtime;
	    //}
	    
	    if(obj.Alert === 0){ postObj.Alert = obj.Alert; }

  	}

    //console.log('postObj',postObj);

    // push to local event record.
    //$scope.liveEvents.push(postObj);

    // post to cloud with event data
    poller.updateEventsData($scope.PartitionKey,RowKey,postObj);
	    
	};

	/*
	* MOBILE: PUT product change to cloud
	 */
	$scope.productUpdate = function(obj){

		//console.log('productUpdate',obj);

    // push the update
    poller.updateProductData(obj.PartitionKey,obj.RowKey,obj);
	    
	};

	/*
	* MOBILE: calculat the total of the current cart items
	 */
	$scope.calcTotal = function(){

		$scope.basketTotal = 0;

		angular.forEach($scope.productChoiceEach, function(value) {
			$scope.basketTotal += value.Price;
		});
	    
	};

	/*
	* NOT USED :: MOBILE: remove inventory from local count
	*/
	$scope.reduceInventory = function(obj){

		console.log('reduceInventory',obj);

		angular.forEach($scope.productData, function(value) {

			if(value.Tray === obj.Tray){
				value.Available--; 
			}

		});

	};
	 

	/*
	* MOBILE: make a rowy key for NEW dispense actions ONLY
	 */
	$scope.makeRowKey = function(identity){

		var obj = {};
		// add unix times for tracking.
		//obj.timestamp = identity + $scope.unixTime;
		obj.unixtime = $scope.unixTime;

		//if($scope.productChoiceEach[$scope.productChoiceEach.length]){
			obj.timestamp = identity + $scope.unixTime + ($scope.productChoiceEach.length+1);
		//}
		//console.log('obj.timestamp',obj.timestamp);

		return obj;

	};

	/*
	* MOBILE: add an item to the cart. triggered from mobile.html
	 */
	$scope.addItem = function(obj){

		//console.log('addItem obj',obj);

		// add unix times for tracking.
		var time = this.makeRowKey('u');
		/*
		obj.timestamp = time.timestamp;
		obj.unixtime = time.unixtime;
		obj.Status = 'pending';
		//obj.RowKey = time.timestamp;
		*/

		var pushObj = {}
		pushObj.timestamp = time.timestamp;
		pushObj.unixtime = time.unixtime;
		pushObj.Status = 'pending';
		pushObj.RowKey = obj.RowKey;
		pushObj.PartitionKey = obj.PartitionKey;
		pushObj.Available = obj.Available;
		pushObj.Price = obj.Price;
		pushObj.Products = obj.Products;
		pushObj.Tray = obj.Tray;
	
		// add the mongo "_id" if in offline version
		if(obj._id){
			pushObj._id = obj._id;
		}

		// add the item to an array of non-grouped items.
		$scope.productChoiceEach.push(pushObj);
		//console.log('addItem $scope.productChoiceEach',$scope.productChoiceEach);

		// check for item in basket already
		if(!this.foundInCart(pushObj.Tray)){

			pushObj.Qty = 1
			$scope.productChoice.push(pushObj);
				
		}

    // remove inventory from local values to show levels on display
    // this seem to be done by the cloud currently
    //this.reduceInventory(pushObj.Tray);

		// calculat new grand total
		this.calcTotal();

		//console.log('AddItem obj',obj);

		// PUT event to database
		//this.eventUpdate(obj, 'dispense', obj.Tray, 'pending', obj.timestamp);

	};

	/*
	* MOBILE: Remove all of an item from cart
	 */
	$scope.removeItem = function(productObj){

		//console.log('productChoice',$scope.productChoice);

		// loop through all chosen products and remove matching objects
		angular.forEach($scope.productChoice, function(value,key) {

			if(value.Tray === productObj.Tray){

				//console.log('DELETED',$scope.productChoice[key]);
				delete $scope.productChoice[key];

				// calculat new grand total
				$scope.calcTotal();

			}

		});

		// reset key order of array
		$scope.productChoice = array_values($scope.productChoice);

		// loop through all chosen products and remove matching objects
		angular.forEach($scope.productChoiceEach, function(value,key) {

			if(value.Tray === productObj.Tray){

				//console.log('DELETED Each',$scope.productChoiceEach[key]);
				delete $scope.productChoiceEach[key];

			}

		});

		// reset key order of array
		$scope.productChoiceEach = array_values($scope.productChoiceEach);

		this.calcTotal();

	};

	/*
	* MOBILE: Purchase Item Confirmation Overlay
	 */
	$scope.buyNow = function(){

	    // add the overlay with loading image to the page
	    var over = 
	    '<div id="overlay">' +

		    '<div id="confirmWrapper">' +

		    	'<div class="confirmText">Complete Purchase?</div>' +
		    	'<div class="confirmCancel">Cancel</div>' +
		    	'<div class="confirmYes">Yes</div>' +
		    	'<br class="clear"/>' +

		   '</div>';
	   
	   '</div>';

	    $(over).appendTo('#content-container');

	    // click on the overlay to remove it
	    $('.confirmCancel').click(function() {
	        $('#overlay').remove();
	    });

	    // click on the overlay to remove it
	    $('.confirmYes').click(function() {

	    	$('#overlay').remove();	

	    	angular.element('#AdminController').scope().initSale();
	    	angular.element('#AdminController').scope().$apply();


	    });

	    // hit escape to close the overlay
	    $(document).keyup(function(e) {
	        if (e.which === 27) {
	            $('#overlay').remove();
	        }
	    });
	    
	};

	/*
	* MOBILE: clear and reset after despensing OR error.
	 */
	$scope.clearReset = function(duration){

		if(typeof duration == "undefined"){ duration = 1000; }

		$timeout(function() {

			console.log('clearReset');
	    $scope.productChoice = [];
	    $scope.productChoiceEach = [];
	    $scope.reducedProducts = [];
	    $scope.chargedTotal = 0;

			//$('#sale_container').toggleClass('hide','show');
			$('#content-container').toggleClass('hide show');
			$('#cart-container').toggleClass('show hide');

			// reset epoche time
			$scope.unixTime = Math.floor((new Date()).getTime());

		}, duration);

	};

	/*
	* MOBILE: Proces the mock payment. Just goes through serioes of video's
	 
	$scope.showSaleContainer = function(){
		//console.log('showing #sale_container');
		$('#anime-container').toggleClass('hide','show');
	};*/

	/*
	* MOBILE: start the sale process byb putting all orders into pending status
	 */
	$scope.initSale = function(){

		//console.log('initSale $scope.productChoiceEach',$scope.productChoiceEach);

		angular.forEach($scope.productChoiceEach, function(value) {		

			//console.log('initSale $scope.productChoiceEach',value);

			$scope.eventUpdate(value, 'dispense', value.Tray, 'pending', value.timestamp);

		});

		$scope.completeSale('authorizing');

	};

	/*
	* MOBILE: Proces the mock payment. Just goes through serioes of video's
	 */
	$scope.completeSale = function(step){

		//var obj = $scope.productChoiceEach[$scope.checkoutLoop];

	    switch(step) {

	        case "authorizing":

	        	//this.showSaleContainer();
	        	$('#anime-container').toggleClass('hide show');

	        	$('#content-container').toggleClass('show hide');

            $scope.sale_message = 'Authorizing Your Purchase...';
            $scope.sale_anime = '<img src="images/'+configData.mobile_images.authorizing+'"/>';

						$timeout(function() {
				        $scope.completeSale('dispensing');
				    }, 3000);

	          break;

	        case "dispensing":

            $scope.sale_message = 'Dispensing...';
            $scope.sale_anime = '<img src="images/'+configData.mobile_images.dispensing+'"/>';

						$timeout(function() {
							$scope.completeSale('receipt');
				    }, 4000);

	           break;
  	
	        case "receipt":

	        	$('#anime-container').toggleClass('show hide');
	        	$('#cart-container').toggleClass('hide show');

						$timeout(function() {

							angular.forEach($scope.productChoiceEach, function(value) {		

								console.log('PROCESSING TO DISPENESED',value);

								$scope.eventUpdate(value, 'dispense', value.Tray, 'dispensed', value.timestamp);

							});

				    }, 5000);

	        	//console.log('$scope.productChoiceEach',$scope.productChoiceEach);

	           break;

	    }	  

	};

	/*
	*	Removes one from the total available 
	 */
	$scope.reduceProductCount = function(obj) {

		//console.log('reduceProductCount',obj);

		// remove one from available.
	  obj.Available--;

    //send coil error alert
		this.productUpdate(obj);

	};

	/*
	*	Convert date to format "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
	 */
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

	/*
	*	 get today
	 */
    $scope.getCurrentDatetime = function(setInPast){

		var now = new Date(); 
		if(setInPast===1){ 
			var getUTCDate = now.getUTCDate()-7;
		}else{
			var getUTCDate = now.getUTCDate();
		}
		var now_utc = new Date(now.getUTCFullYear(), now.getUTCMonth(), getUTCDate,  now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
		return now_utc;
    };

 	/*
	*	call which modal to show.
	 */
    $scope.toggleModal = function(whichModal){

	    switch(whichModal) {
	        case "about":
	             $scope.showAboutModal = !$scope.showAboutModal;
	             break;
	        case "log":
	             $scope.showActivityLog = !$scope.showActivityLog;
	             break;
	        case "setup":
	             $scope.showSetupModal = !$scope.showSetupModal;
	             break;
	        case "inventory":
	             $scope.showInventoryModal = !$scope.showInventoryModal;
	             break;
	    }     	

    };

	/* 	*************************************************	*/

    $scope.init();

});

function is_int (mixed_var) {
  //  discuss at: http://phpjs.org/functions/is_int/
  // original by: Alex
  // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // improved by: WebDevHobo (http://webdevhobo.blogspot.com/)
  // improved by: Rafał Kukawski (http://blog.kukawski.pl)
  //  revised by: Matt Bradley
  // bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  //        note: 1.0 is simplified to 1 before it can be accessed by the function, this makes
  //        note: it different from the PHP implementation. We can't fix this unfortunately.
  //   example 1: is_int(23)
  //   returns 1: true
  //   example 2: is_int('23')
  //   returns 2: false
  //   example 3: is_int(23.5)
  //   returns 3: false
  //   example 4: is_int(true)
  //   returns 4: false

  return mixed_var === +mixed_var && isFinite(mixed_var) && !(mixed_var % 1)
}
function array_splice (arr, offst, lgth, replacement) {
  //  discuss at: http://phpjs.org/functions/array_splice/
  // original by: Brett Zamir (http://brett-zamir.me)
  //    input by: Theriault
  //        note: Order does get shifted in associative array input with numeric indices,
  //        note: since PHP behavior doesn't preserve keys, but I understand order is
  //        note: not reliable anyways
  //        note: Note also that IE retains information about property position even
  //        note: after being supposedly deleted, so use of this function may produce
  //        note: unexpected results in IE if you later attempt to add back properties
  //        note: with the same keys that had been deleted
  //  depends on: is_int
  //   example 1: input = {4: "red", 'abc': "green", 2: "blue", 'dud': "yellow"};
  //   example 1: array_splice(input, 2);
  //   returns 1: {0: "blue", 'dud': "yellow"}
  //   example 2: input = ["red", "green", "blue", "yellow"];
  //   example 2: array_splice(input, 3, 0, "purple");
  //   returns 2: []
  //   example 3: input = ["red", "green", "blue", "yellow"]
  //   example 3: array_splice(input, -1, 1, ["black", "maroon"]);
  //   returns 3: ["yellow"]

  var _checkToUpIndices = function (arr, ct, key) {
    // Deal with situation, e.g., if encounter index 4 and try to set it to 0, but 0 exists later in loop (need to
    // increment all subsequent (skipping current key, since we need its value below) until find unused)
    if (arr[ct] !== undefined) {
      var tmp = ct
      ct += 1
      if (ct === key) {
        ct += 1
      }
      ct = _checkToUpIndices(arr, ct, key)
      arr[ct] = arr[tmp]
      delete arr[tmp]
    }
    return ct
  }

  if (replacement && typeof replacement !== 'object') {
    replacement = [replacement]
  }
  if (lgth === undefined) {
    lgth = offst >= 0 ? arr.length - offst : -offst
  } else if (lgth < 0) {
    lgth = (offst >= 0 ? arr.length - offst : -offst) + lgth
  }

  if (Object.prototype.toString.call(arr) !== '[object Array]') {
    /* if (arr.length !== undefined) {
     // Deal with array-like objects as input
    delete arr.length;
    }*/
    var lgt = 0,
      ct = -1,
      rmvd = [],
      rmvdObj = {},
      repl_ct = -1,
      int_ct = -1
    var returnArr = true,
      rmvd_ct = 0,
      rmvd_lgth = 0,
      key = ''
    // rmvdObj.length = 0;
    for (key in arr) {
      // Can do arr.__count__ in some browsers
      lgt += 1
    }
    offst = (offst >= 0) ? offst : lgt + offst
    for (key in arr) {
      ct += 1
      if (ct < offst) {
        if (this.is_int(key)) {
          int_ct += 1
          if (parseInt(key, 10) === int_ct) {
            // Key is already numbered ok, so don't need to change key for value
            continue
          }
          // Deal with situation, e.g.,
          _checkToUpIndices(arr, int_ct, key)
          // if encounter index 4 and try to set it to 0, but 0 exists later in loop
          arr[int_ct] = arr[key]
          delete arr[key]
        }
        continue
      }
      if (returnArr && this.is_int(key)) {
        rmvd.push(arr[key])
        // PHP starts over here too
        rmvdObj[rmvd_ct++] = arr[key]
      } else {
        rmvdObj[key] = arr[key]
        returnArr = false
      }
      rmvd_lgth += 1
      // rmvdObj.length += 1;
      if (replacement && replacement[++repl_ct]) {
        arr[key] = replacement[repl_ct]
      } else {
        delete arr[key]
      }
    }
    // Make (back) into an array-like object
    // arr.length = lgt - rmvd_lgth + (replacement ? replacement.length : 0);
    return returnArr ? rmvd : rmvdObj
  }

  if (replacement) {
    replacement.unshift(offst, lgth)
    return Array.prototype.splice.apply(arr, replacement)
  }
  return arr.splice(offst, lgth)
}

function array_values (input) {
  //  discuss at: http://phpjs.org/functions/array_values/
  // original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // improved by: Brett Zamir (http://brett-zamir.me)
  //   example 1: array_values( {firstname: 'Kevin', surname: 'van Zonneveld'} );
  //   returns 1: {0: 'Kevin', 1: 'van Zonneveld'}

  var tmp_arr = [],
    key = ''

  if (input && typeof input === 'object' && input.change_key_case) {
    // Duck-type check for our own array()-created PHPJS_Array
    return input.values()
  }

  for (key in input) {
    tmp_arr[tmp_arr.length] = input[key]
  }

  return tmp_arr
}

function sortByProperty( arr, property, descending ){
	arr.sort( function( a, b ) {
		var c = a[property].toString();
		var d = b[property].toString();

		if ( c === d ) { return 0; }
			return Boolean( descending ) ? d > c ? 1 : -1 : d < c ? 1 : -1;
	} );
}

/* TESTING - PUT product
 
var tmpObj = {

  Available: 5,
  PartitionKey: '98:4f:ee:05:5d:26',
  Price: 150,
  Products: 'Coke', 
  RowKey: 1,
  Tray: 'tray1'
  
}

poller.updateProductData('98:4f:ee:05:5d:26',1,tmpObj);

var tmpObj = {

  PartitionKey: '98:4f:ee:05:5d:26',
  RowKey: 'u14564255699062',
  EventType: 'dispense',
  Val: 200,
  Status: 'pending', 
  EventDescription: 'tray1'
  
}

poller.updateEventsData('98:4f:ee:05:5d:26','u14564255699062',tmpObj);*/
/* END TESTING - PUT product */