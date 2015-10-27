(function() {
  var adder = function($http) {
    
    var addRustomer = function(rustomer) {
      return $http.post("http://localhost:8888/rustomers", rustomer)
                  .then(function(response) {
                    return response.data;
                  });
    };
    
    return {
      addRustomer: addRustomer
    };
  };
  
  var module = angular.module("myApp.list");
  module.service("adder", adder);
}());