'use strict';

angular.module('myApp.list', ['ngRoute'])

.controller(
  'ListGetCtrl', 
  [
    '$scope', 
    'custList', 
    '$route', 
    function($scope, custList, $route) {
      console.log("ListGetCtrl()");
      
      function onComplete(data) {
        $scope.customerList = data;
      };
      
      function onError(data) {
        // add display indication here
        $scope.customerList = data;
      };
      
      custList.getList().then(onComplete, onError);
    }
  ]
)

.controller(
  'ListDisplayCtrl', 
  [
    '$scope', 
    '$location', 
    'ipc', 
    function($scope, $location, ipc) {
      console.log("ListDisplayCtrl()");
      
      $scope.displayDetails = function(customer) {
        console.log("displayDetails()");
        ipc.setSharedObj(customer);        
        $location.url("/detail");
      }
    }
  ]
)


.controller(
  'ListAddCtrl', 
  [
    '$scope', 
    'adder',
    '$route', 
    function($scope, adder, $route) {
      console.log("ListAddCtrl()");
      
      $scope.newGuy = {};
      
      function onAddComplete() {
        console.log("Successfully added customer");
        $route.reload();
      }
      
      function onAddError() {
        console.log("Error adding customer");  
      }
      
      $scope.addRustacean = function() {
        adder.addRustomer($scope.newGuy).then(onAddComplete, onAddError);
      }      
    }
  ]
);