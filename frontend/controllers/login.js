'use strict';

angular.module('myApp.login', ['ngRoute'])

.controller('LoginCtrl', ['$scope', 'verifier', '$route', function($scope, verifier, $route) {
  console.log('Login controller function.');
  
  var onSuccessfulLogin = function(name) {
    console.log("Successfully logged in: " + name);
    alert("Successfully logged in: " + name);
  }
  
  var onUnsuccessfulLogin = function() {
    console.log("Login attempt failed");
    alert("Login attempt failed");
    $route.reload();
  }
  
  $scope.verifyUser = function(user) {
    console.log("before verify, user: " + user.name + " password: " + user.password);
    verifier.verify(user).then(onSuccessfulLogin, onUnsuccessfulLogin);
  }
  
  $scope.logout = function() {
    alert("Logged out");
    $route.reload();
  }
}]);