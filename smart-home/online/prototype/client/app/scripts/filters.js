'use strict';

var filters = angular.module('smartHomeApp.filters', []);
filters.filter('sampleDate', function ($filter) {
	
  return function (datestr, format) {
    return $filter('date')(Date.parse(datestr) || datestr, format);
  };

});
 