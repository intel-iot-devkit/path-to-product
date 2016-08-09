"use strict";

var app = angular.module('intelligentVendingApp', [
    'intelligentVendingApp.controllers',
    'intelligentVendingApp.filters',
    'intelligentVendingApp.directives',
    'intelligentVendingApp.services',
    'ngSanitize',
    'ngRoute',
    'ngAnimate',
    'ngResource'
     
]);

app.config(["$routeProvider", function ($routeProvider) {

    $routeProvider

        .when("/admin", {controller: 'AdminController', templateUrl: "views/admin.html"})
        .when("/mobile", {controller: 'AdminController', templateUrl: "views/mobile.html"})
        .otherwise({redirectTo: "/"});

}]);