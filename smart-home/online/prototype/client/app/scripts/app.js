'use strict';

var app = angular.module('smartHomeApp', [
    'smartHomeApp.controllers',
    'smartHomeApp.filters',
    'smartHomeApp.directives',
    'smartHomeApp.services',
    'ngRoute',
    'ngAnimate',
    'ngResource',
    'ngSanitize'
    
]); 

app.config(["$routeProvider", function ($routeProvider) {

  	$routeProvider

	    .when("/admin", {controller: "AdminController", templateUrl: "views/admin.html"})
	    .when("/mobile", {controller: "AdminController", templateUrl: "views/mobile.html"})
	    .otherwise({redirectTo: "/"});  

}]);