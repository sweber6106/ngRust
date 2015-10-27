(function() {
  var deleter = function($http) {
    
    var deleteRustomer = function(id) {
      var temp = "http://localhost:8888/rustomers/" + id;
      return $http.delete(temp)
                  .then(function(response) {
                    return response.data;
                  });
    };
    
    return {
      deleteRustomer: deleteRustomer
    };
  };
  
  var module = angular.module("myApp.detail");
  module.service("deleter", deleter);
}());
