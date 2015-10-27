(function() {
  var testData = [                                  
    {                                                 
      'firstName': 'Charles',                        
      'lastName': 'Burns',
      'company': 'Springfield Nuclear Power Plant',
      'address': '100 Industrial Way',
      'city': 'Springfield',
      'state': 'Oregon',
      'zip': 97478,
      'phone': '541-555-1234',
      'email': 'cburns@snpp.net',
      'domain': 'snpp.net'
    },
    {
      'firstName': 'Waylon',
      'lastName': 'Smithers',
      'company': 'Springfield Nuclear Power Plant',
      'address': '100 Industrial Way',
      'city': 'Springfield',
      'state': 'Oregon',
      'zip': 97478,
      'phone': '541-555-1234',
      'email': 'wsmithers@snpp.net',
      'domain': 'snpp.net'
    },
    {
      'firstName': 'Homer',
      'lastName': 'Simpson',
      'company': 'Springfield Nuclear Power Plant',
      'address': '100 Industrial Way',
      'city': 'Springfield',
      'state': 'Oregon',
      'zip': 97478,
      'phone': '541-555-1234',
      'email': 'hsimpson@snpp.net',
      'domain': 'snpp.net'
    },
    {
      'firstName': 'Lenny',
      'lastName': 'Leonard',
      'company': 'Springfield Nuclear Power Plant',
      'address': '100 Industrial Way',
      'city': 'Springfield',
      'state': 'Oregon',
      'zip': 97478,
      'phone': '541-555-1234',
      'email': 'lleonard@snpp.net',
      'domain': 'snpp.net'
    },
    {
      'firstName': 'Carl',
      'lastName': 'Carlson',
      'company': 'Springfield Nuclear Power Plant',
      'address': '100 Industrial Way',
      'city': 'Springfield',
      'state': 'Oregon',
      'zip': 97478,
      'phone': '541-555-1234',
      'email': 'ccarlson@snpp.net',
      'domain': 'snpp.net'
    },
    {
      'firstName': 'Moe',
      'lastName': 'Szyslak',
      'company': 'Moe\'s Tavern',
      'address': '123 Fake Address Lane',
      'city': 'Springfield',
      'state': 'Oregon',
      'zip': 97478,
      'phone': '541-555-1235',
      'email': 'mszyslak@moes.net',
      'domain': 'moes.net'
    },
    {
      'firstName': 'Apu',
      'lastName': 'Nahasapeemapetilon',
      'company': 'Kwik-E-Mart',
      'address': '124 Fake Address Lane',
      'city': 'Springfield',
      'state': 'Oregon',
      'zip': 97478,
      'phone': '541-555-1236',
      'email': 'apu@kwikemart.com',
      'domain': 'kwikemart.com'
    },
    {
      'firstName': 'Seymour',
      'lastName': 'Skinner',
      'company': 'Springfield Elementary School',
      'address': '125 Fake Address Lane',
      'city': 'Springfield',
      'state': 'Oregon',
      'zip': 97478,
      'phone': '541-555-1237',
      'email': 'sskinner@ses.com',
      'domain': 'ses.com'
    },
    {
      'firstName': 'Edna',
      'lastName': 'Krabappel',
      'company': 'Springfield Elementary School',
      'address': '125 Fake Address Lane',
      'city': 'Springfield',
      'state': 'Oregon',
      'zip': 97478,
      'phone': '541-555-1237',
      'email': 'ekrabappel@ses.com',
      'domain': 'ses.com'
    },
    {
      'firstName': 'Gary',
      'lastName': 'Chalmers',
      'company': 'Springfield Elementary School',
      'address': '125 Fake Address Lane',
      'city': 'Springfield',
      'state': 'Oregon',
      'zip': 97478,
      'phone': '541-555-1237',
      'email': 'gchalmers@ses.com',
      'domain': 'ses.com'
    }
  ];

  var custList = function($http) {
    
    var getList = function() {
      //return $http.get("https://api.github.com/users/sweber6106")
      //return $http.get("http://10.3.1.6:59000/customers.json")
      return $http.get("http://localhost:8888/rustomers")
                  .then(function(response) {
                    return response.data;
                    //return testData;
                  });
    };
    
    return {
      getList: getList
    };
  };
  
  var module = angular.module("myApp.list");
  module.service("custList", custList);
}());