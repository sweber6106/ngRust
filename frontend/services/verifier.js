(function() {
  var verifier = function($http) {
    
    var verify = function(user) {
      return $http.post("http://localhost:8888/login", user)
                  .then(function(response) {
                    return response.data;
                  });
    };
    
    return {
      verify: verify
    };
  };
  
  var module = angular.module("myApp.login");
  module.service("verifier", verifier);
}());