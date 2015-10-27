#!/usr/bin/env node

/* jshint node: true */
'use strict';

/* jshint -W074 */

var async = require('async');
var bodyParser = require('body-parser');
var express = require('express');
var fs = require('fs');
var mongoose = require('mongoose');
var log4node = require('log4node');
var moment = require('moment');
var nopt = require('nopt');
var path = require('path');
var sprintf = require('sprintf');
var config = require('yaml-config');
var morgan = require('morgan');
var os = require('os');

var pkg = require('./package.json');

var db = null;
var log = null;
var statsLog = null;

var apiUriProxy = null;

var server;

var cfgProxyScheme = null;
var cfgProxyHost = null;
var cfgProxyPort = null;
var cfgMongoDbUrl = null;
var cfgLoggerLevel = null;
var cfgLoggerPath = null;
var cfgApiAccessLogPath = null;
var cfgStatsLoggerLevel = null;
var cfgStatsLoggerPath = null;
var cfgStatsLogSeconds = null;

var apiAccessLogStream;

var startTime = moment();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var apiRoutes = [];

function usage() {
  var exec = process.argv[0] + ' ' + path.basename(process.argv[1]);
  console.log('Usage:');
  console.log('  ' + exec + ' -c filename -p port');
  console.log('Options:');
  console.log('  -c, --config [filename]   app configuration file');
  console.log('  -p, --port [port]         server port');
  console.log('  -e, --endpoints           automation only');
  console.log('  -t, --trace               development only');
  console.log('  -v, --version             display app version');
  console.log('  -h, --help                display app usage');
  console.log('Examples:');
  console.log('  NODE_ENV=development ' + exec + ' -c config.yaml');
  console.log('  NODE_ENV=development ' + exec + ' -c config.yaml -t');
  console.log('  NODE_ENV=production  ' + exec + ' -c ./etc/config.yaml');
  console.log('  NODE_ENV=production  ' + exec + ' -c ./etc/config.yaml -p 10101');
  console.log('  NODE_ENV=production  ' + exec + ' -c ./etc/config.yaml -e');
  process.exit(0);
}

var longOptions = {
  'config':    String,
  'port':      Number,
  'endpoints': Boolean,
  'trace':     Boolean,
  'version':   Boolean,
  'help':      Boolean
};

var shortOptions = {
  'c': ['--config'],
  'p': ['--port'],
  'e': ['--endpoints'],
  't': ['--trace'],
  'v': ['--version'],
  'h': ['--help']
};

var argv = nopt(longOptions, shortOptions, process.argv, 2);

if (argv.help) {
  usage();
}

if (argv.version) {
  var json = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(json.version);
  process.exit(0);
}

if (argv.config === undefined) {
  usage();
}

if (argv.port !== undefined) {
  cfgProxyPort = argv.port;
}

(function startup() {
  loadConfig();

  installSignalHandlers();

  startLogger();

  log.info(pkg.description);
  log.info(pkg.name, pkg.version);
  log.info('pid', process.pid);
  log.info('port', cfgProxyPort);
  log.info('proxy:', apiUriProxy);

  if (isDevelopmentMode()) {
    log.info('configure: development');
  }
  if (isProductionMode()) {
    log.info('configure: production');
  }

  async.series(
    [
      function(callback) {
        log.info('Starting MongoDB');
        startMongoDb(callback);
      },
      function(callback) {
        log.info('Defining schema');
        defineSchema(callback);
      },
      function(callback) {
        log.info('Starting express');
        startExpress(callback);
      },
      function(callback) {
        checkEndpointDump(callback);
      },
      function(callback) {
        log.info('Starting periodic logging');
        startPeriodicLogging(callback);
      }
    ]
  );
})();

//******************************************************************************
// UTILITY FUNCTIONS
//******************************************************************************

function loadConfig() {
  var settings = config.readConfig(argv.config);

  if (Object.keys(settings).length === 0) {
    log.error('readConfig:', argv.config);
    process.exit(1);
  }

  function checkArg(arg, name) {
    if (typeof arg === 'undefined') {
      log.error(argv.config + ': not found:', name);
      process.exit(1);
    }
    return arg;
  }

  cfgProxyScheme = checkArg(settings.proxy.scheme);
  cfgProxyHost = checkArg(settings.proxy.host);
  cfgProxyPort = checkArg(settings.proxy.port);
  cfgMongoDbUrl = checkArg(settings.mongodb.url, 'mongodb.url');
  cfgLoggerLevel = checkArg(settings.logger.level, 'logger.level');
  cfgLoggerPath = checkArg(settings.logger.path, 'logger.path');
  cfgApiAccessLogPath = checkArg(settings.logger.apiAccessLogPath, 'logger.apiAccessLogPath');
  cfgStatsLoggerLevel = checkArg(settings.logger.statsLevel, 'logger.statsLevel');
  cfgStatsLoggerPath = checkArg(settings.logger.statsPath, 'logger.statsPath');
  cfgStatsLogSeconds = checkArg(settings.logger.statsLogSecs, 'logger.statsLogSecs');

  apiAccessLogStream = fs.createWriteStream(cfgApiAccessLogPath, { flags: 'a' });
}

function startLogger() {
  log = new log4node.Log4Node({level: cfgLoggerLevel, file: cfgLoggerPath});
  log.setPrefix(function(level) {
    var newLevel;

    switch (level) {
      case 'info':
        newLevel = 'INF';
        break;

      case 'warning':
        newLevel = 'WRN';
        break;

      case 'error':
        newLevel = 'ERR';
        break;

      case 'debug':
        newLevel = 'DBG';
        break;

      default:
        break;
    }

    return sprintf.sprintf('%s [%d] [%s] ',
                           moment().utc().format('YYYY-MM-DD HH:mm:ss.SS'),
                           cfgProxyPort,
                           newLevel);
  });

  process.on('uncaughtException', function(e) {
    logException('uncaughtException', e);
    setTimeout(function() {
      process.exit(1);
    }, 500);
  });

  statsLog = new log4node.Log4Node({level: cfgStatsLoggerLevel, file: cfgStatsLoggerPath});
  statsLog.setPrefix(function() {
    return '';
  });
}

function logException(context, exception) {
  log.error(context, exception);
  if (exception !== undefined && exception.stack !== undefined) {
    var textLines = exception.stack.split('\n');
    for (var i = 0; i < textLines.length; i++) {
      log.error(i + ': ' + textLines[i].trim());
    }
  }
}

function getServiceStatusObject() {
  var loadAverage = os.loadavg();
  var memoryUsage = process.memoryUsage();

  var serviceStatusObject = {
    'time'           : moment().utc().format('YYYY-MM-DD HH:mm:ss.SS'),
    'serviceName'    : pkg.name,
    'serviceVersion' : pkg.version,
    'nodeVersion'    : process.version,
    'platform'       : os.platform(),
    'arch'           : os.arch(),
    'release'        : os.release(),
    'loadAvg01Min'   : loadAverage[0].toFixed(3),
    'loadAvg05Min'   : loadAverage[1].toFixed(3),
    'loadAvg15Min'   : loadAverage[2].toFixed(3),
    'totalMem'       : os.totalmem(),
    'freeMem'        : os.freemem(),
    'rss'            : memoryUsage.rss,
    'heapTotal'      : memoryUsage.heapTotal,
    'heapUsed'       : memoryUsage.heapUsed,
    'startTime'      : startTime.utc().format('YYYY-MM-DD HH:mm:ss.SS'),
    'uptime'         : process.uptime(),
    'hostname'       : os.hostname(),
    'pid'            : process.pid,
    'port'           : cfgProxyPort
  };

  return serviceStatusObject;
}

function isDevelopmentMode() {
  return process.env.NODE_ENV === 'development';
}

function isProductionMode() {
  return process.env.NODE_ENV === 'production';
}

function installSignalHandlers() {
  ['SIGUSR1', 'SIGUSR2'].forEach(function(signal) {
    process.on(signal, function() {
      log.info('received signal', signal);
    });
  });

  var signals = ['SIGQUIT', 'SIGTRAP', 'SIGABRT', 'SIGBUS',
                 'SIGFPE', 'SIGSEGV', 'SIGTERM', 'SIGINT'];
  signals.forEach(function(signal) {
    process.on(signal, function() {
      log.error('received signal', signal);
      setTimeout(function() {
        process.exit(1);
      }, 250);
    });
  });

  process.on('SIGHUP', function() {
    log.info('received signal SIGHUP');
    server.close(function() {
      mongoose.disconnect();
    });
  });

  process.on('exit', function() {
    log.info('exiting');
  });
}

function getServiceEndpointsArray() {
  var serviceEndpoint;
  var serviceEndpoints = [];

  for (var key in apiRoutes) {
    if (apiRoutes.hasOwnProperty(key)) {
      var val = apiRoutes[key];
      if (val.route) {
        var route = val.route;
        serviceEndpoint = {};

        serviceEndpoint.method = route.stack[0].method;
        serviceEndpoint.path = route.path;

        serviceEndpoints.push(serviceEndpoint);
      }
    }
  }

  return serviceEndpoints;
}

function checkEndpointDump(callback) {
  if (argv.endpoints) {
    console.log(getServiceEndpointsArray());
    process.exit();
  }
  callback(null);
}

function startPeriodicLogging(callback) {
  var initialSeconds = 5;
  var intervalSeconds = 3600;
  setTimeout(function() {
    logUtilization();
  }, initialSeconds * 1000);

  setInterval(function() {
    logUtilization();
  }, intervalSeconds * 1000).unref();

  setInterval(function() {
    logStats();
  }, cfgStatsLogSeconds * 1000).unref();

  callback(null);

  function logUtilization() {
    var uptime = parseInt(process.uptime());
    log.info('uptime:', formatDuration(uptime));
    var memory = process.memoryUsage();
    var rss = numberWithCommas(memory.rss);
    var heapTotal = numberWithCommas(memory.heapTotal);
    var heapUsed = numberWithCommas(memory.heapUsed);
    log.info('memory:', 'rss:', rss, 'heapTotal:', heapTotal, 'heapUsed:', heapUsed);

    function formatDuration(seconds) {
      var duration = moment.duration(seconds * 1000);
      return sprintf.sprintf('%02u:%02u:%02u:%02u:%02u:%02u (yy:mm:dd:hh:mm:ss)',
        duration._data.years, duration._data.months, duration._data.days,
        duration._data.hours, duration._data.minutes, duration._data.seconds
      );
    }

    function numberWithCommas(x) {
      return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
  }

  function logStats() {
    statsLog.info(JSON.stringify(getServiceStatusObject()));
  }
}

function startMongoDb(callback) {
  var options = {
    server: {socketOptions: {keepalive: 1}},
    replset: {socketOptions: {keepalive: 1}}
  };

  log.info('db', cfgMongoDbUrl);

  var connectWithRetry = function() {
    return mongoose.connect(cfgMongoDbUrl, options, function(err) {
      if (err) {
        log.error('db error:', err);
        setTimeout(connectWithRetry, 5000);
      }
    });
  };

  db = connectWithRetry();
  db.connection.on('error', function(err) {
    log.error('db error:', err);
  });
  db.connection.on('connecting', function() {
    log.debug('db connecting');
  });
  db.connection.on('connected', function() {
    log.debug('db connected');
  });
  db.connection.on('open', function() {
    log.debug('db opened');
    callback(null);
  });
  db.connection.on('disconnected', function() {
    log.error('db disconnected');
  });
  db.connection.on('close', function() {
    log.error('db closed');
  });
  db.connection.on('reconnected', function() {
    log.debug('db reconnected');
  });
  db.connection.on('fullsetup', function() {
    log.debug('db fullsetup');
  });
}

var Rustomers;
var AppUsers;

function defineSchema(callback) {
  var rustomerSchema = new mongoose.Schema({
    firstName: String,
    lastName : String,
    company  : String,
    address  : String,
    city     : String,
    state    : String,
    zip      : Number,
    phone    : String,
    email    : String,
    domain   : String
  },
  {
    _id: false
  });

  Rustomers = mongoose.model('Rustomer', rustomerSchema);
  
  
  var userSchema = new mongoose.Schema({
    username: String,
    password : String
  },
  {
    _id: false
  });

  AppUsers = mongoose.model('AppUser', userSchema);
  
  callback(null);
}

function startExpress(callback) {
  var app = express();

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));

  app.use(express.static('./frontend'));
  
  morgan.token('customdate', function getCustomDate() {
    return moment().utc().format('YYYY-MM-DD HH:mm:ss.SSS');
  });

  app.use(morgan(':customdate :method :url :status :response-time ms - :res[content-length]',
                 { stream: apiAccessLogStream }));

  // error handler
  app.use(function(err, req, res, next) {
    void next;
    // Request includes invalid JSON.
    if (isDevelopmentMode()) {
      log.warning(req.url);
      log.warning(err.toString());
    }
    res.statusCode = 400;
    res.end(err.toString());
  });

  app.get('/service/status', function(req, res) {
    getServiceStatus(res);
  });

  app.get('/service/endpoints', function(req, res) {
    getServiceEndpoints(res);
  });

  app.get('/rustomers', function(req, res) {
    getRustomers(res);
  });

  app.get('/rustomers/:id', function(req, res) {
    getRustomer(req, res);
  });

  app.post('/rustomers', function(req, res) {
    createRustomer(req, res);
  });

  app.put('/rustomers/:id', function(req, res) {
    updateRustomer(req, res);
  });

  app.delete('/rustomers/:id', function(req, res) {
    deleteRustomer(req, res);
  });

  app.post('/login', function(req, res) {
    verifyUser(req, res);
  });

  // Add new route handlers above this line.

  // Catch-all route handler for invalid routes.
  // Must be positioned after valid route handlers.
  app.use(function(req, res) {
    if (isDevelopmentMode()) {
      log.warning('invalid resource', req.method, req.url);
    }
    res.statusCode = 404;
    res.end();
  });

  server = app.listen(cfgProxyPort, cfgProxyHost, function() {
    log.info('server started', cfgProxyHost + ':' + cfgProxyPort);
    apiRoutes = app._router.stack;
    console.log('server started on host:', cfgProxyHost + ', port:' + cfgProxyPort);
    callback(null);
  });
}

function getServiceStatus(res) {
  res.writeHead(200, { 'Content-Type' : 'application/json' });
  res.end(JSON.stringify(getServiceStatusObject()));
}

function getServiceEndpoints(res) {
  res.writeHead(200, { 'Content-Type' : 'application/json' });
  res.end(JSON.stringify(getServiceEndpointsArray()));
}

function getRustomers(res) {
  Rustomers.find({}).exec(function(err, rustomers) { 
    if (err) {
      res.writeHead(500, { 'Content-Type' : 'application/json' });
      res.end();
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rustomers));
    }
  });
}

// implement
function getRustomer(res) {
  res.writeHead(200, { 'Content-Type' : 'application/json' });
  res.end();
}

function createRustomer(req, res) {
  var rustomer = new Rustomers();

  rustomer.firstName = req.body.firstName;
  rustomer.lastName = req.body.lastName;
  rustomer.company = req.body.company;
  rustomer.address = req.body.address;
  rustomer.city = req.body.city;
  rustomer.state = req.body.state;
  rustomer.zip = req.body.zip;
  rustomer.phone = req.body.phone;
  rustomer.email = req.body.email;
  rustomer.domain = req.body.domain;
  rustomer._id = mongoose.Types.ObjectId();
  
  console.log(req.body);

  Rustomers.update({ _id: rustomer._id }, rustomer, { upsert: true }, function(err) {
    if (err) {
      log.error('Rustomer creation error: ', err);
      res.statusCode = 500;
    } else {
      log.info('Rustomer created');
      res.statusCode = 200;
    }
    return res.end();
  });
}

function deleteRustomer(req, res) {
  log.info('deleteRustomer(' + req.params.id + ');');
  Rustomers.findOne({
    _id: mongoose.Types.ObjectId(req.params.id),
  }).exec(function(err, result) {
    if (err) {
      log.error('deleteRustomer:', err);
      res.statusCode = 500;
    } else {
      if (result === undefined || result === null) {
        log.error('invalid Rustomer - no record found for ' + req.params.id);
        res.set('Warning', 'rustomer ' + req.params.id + ' does not exist');
        res.statusCode = 400;
        return res.end();
      } else {
        result.remove();
        res.statusCode = 200;
        return res.end();
      }
    }
  });
}

function updateRustomer(req, res) {
  log.info('updateRustomer(' + req.params.id + ');');
  Rustomers.findOneAndUpdate(
    { _id: mongoose.Types.ObjectId(req.params.id) },
    req.body,
    { upsert: true },
    function(err, result) {
      if (err) {
        log.error('updateRustomer:', err);
        res.statusCode = 500;
        return res.end();
      } else {
        if (result === undefined || result === null) {
          log.error('invalid Rustomer - no record found for ' + req.params.id);
          res.set('Warning', 'rustomer ' + req.params.id + ' does not exist');
          res.statusCode = 400;
          return res.end();
        } else {
          res.statusCode = 200;
          return res.end();
        }
      }
    }
  );
}

function verifyUser(req, res) {
  log.info('verifyUser(' + req.body.name + ',' + req.body.password + ');');
  AppUsers.findOne({
    username: req.body.name, 
    password: req.body.password
  }).exec(function(err, result) {
    if (err) {
      log.error('verifyUser:', err);
      res.statusCode = 500;
    } else {
      if (result === undefined || result === null) {
        log.error('invalid User');
        res.set('Warning', 'invalid login');
        res.statusCode = 400;
        return res.end();
      } else {
        res.statusCode = 200;
        return res.end();
      }
    }
  });
}