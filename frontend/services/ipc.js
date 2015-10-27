(function() {

  var sharedObj = {};

  var ipc = function($http) {
    
    var getSharedObj = function() {
      return sharedObj;
    };
    
    var setSharedObj = function(obj) {
      sharedObj = obj;
    };
    
    return {
      getSharedObj: getSharedObj,
      setSharedObj: setSharedObj
    };
  };
  
  var module; 
  
  module = angular.module("myApp.list");
  module.service("ipc", ipc);
  
  module = angular.module("myApp.detail");
  module.service("ipc", ipc);
}());