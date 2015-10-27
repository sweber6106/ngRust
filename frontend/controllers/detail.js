'use strict';

angular.module('myApp.detail', ['ngRoute'])

.controller('DetailCtrl', ['$scope', 'ipc', 'deleter', 'updater', '$route', function($scope, ipc, deleter, updater, $route) {
  console.log('Detail controller function.');
  
  $scope.customerDetail = ipc.getSharedObj();
  console.log("Retrieved customer object"); 
  console.log("First name: " + $scope.customerDetail.firstName);
  
  var goBack = function() {
    console.log("Going back");
    history.back();
  } 
  $scope.goBack = goBack;
    
  var deleteRustacean = function() {
    console.log("Deleting " + $scope.customerDetail._id);
    
    var result = deleter.deleteRustomer($scope.customerDetail._id);
    
    console.log("return from delete:" + result);
    goBack();
  }
  $scope.deleteRustacean = deleteRustacean;
  
  function onUpdateComplete() {
    alert("Update complete");
    history.back();
  }
  
  function onUpdateError() {
    alert("Update failed");
    history.back();
  }
  
  var updateRustacean = function() {
    console.log("Updating " + $scope.customerDetail._id);
    
    updater.updateRustomer($scope.customerDetail).then(onUpdateComplete, onUpdateError);
  }
  $scope.updateRustacean = updateRustacean;
}]);