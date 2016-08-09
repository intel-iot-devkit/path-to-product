'use strict';

var filters = angular.module('intelligentVendingApp.filters', []);

filters.filter('sampleDate', function ($filter) {
	
  return function (datestr, format) {
    return $filter('date')(Date.parse(datestr) || datestr, format);
  };

});

filters.filter("toPercentage", function() {

    return function(a) {
        return (Math.round (a*100) / 10)+'%';
    };

 });