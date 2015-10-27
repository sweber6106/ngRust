'use strict';

angular.module('myApp', [
  'ngRoute',
  'myApp.home',
  'myApp.login',
  'myApp.list',
  'myApp.detail',
  'myApp.contact',
  'myApp.version'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/home', {
    templateUrl: 'views/home.html'
  });
  $routeProvider.when('/login', {
    templateUrl: 'views/login.html'
  });
  $routeProvider.when('/list', {
    templateUrl: 'views/list.html'
  });
  $routeProvider.when('/detail', {
    templateUrl: 'views/detail.html'
  });
  $routeProvider.when('/contact', {
    templateUrl: 'views/contact.html'
  });
  $routeProvider.otherwise({redirectTo: '/home'});
}]);