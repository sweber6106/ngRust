(function() {
  var updater = function($http) {
    
    var updateRustomer = function(rustomer) {
      return $http.put("http://localhost:8888/rustomers/" + rustomer._id, rustomer)
                  .then(function(response) {
                    return response.data;
                  });
    };
    
    return {
      updateRustomer: updateRustomer
    };
  };
  
  var module = angular.module("myApp.detail");
  module.service("updater", updater);
}());
