'use strict';

angular.module('myApp.home', ['ngRoute'])

.controller('HomeCtrl', [function() {
  console.log('Home module controller function.');
}])

.controller('HomeCtrl2', [function() {
  console.log('Home module controller 2 function');
}]);