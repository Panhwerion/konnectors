// Generated by CoffeeScript 1.9.1
var Konnector, americano, async, konnectorHash, log;

americano = require('americano-cozy');

async = require('async');

konnectorHash = require('../lib/konnector_hash');

log = require('printit')({
  prefix: null,
  date: true
});

module.exports = Konnector = americano.getModel('Konnector', {
  slug: String,
  fieldValues: Object,
  password: {
    type: String,
    "default": '{}'
  },
  lastImport: Date,
  lastAutoImport: Date,
  isImporting: {
    type: Boolean,
    "default": false
  },
  importInterval: {
    type: String,
    "default": 'none'
  },
  errorMessage: {
    type: String,
    "default": null
  }
});

Konnector.all = function(callback) {
  return Konnector.request('all', function(err, konnectors) {
    konnectors.forEach(function(konnector) {
      return konnector.injectEncryptedFields();
    });
    return callback(err, konnectors);
  });
};

Konnector.prototype.injectEncryptedFields = function() {
  var error, name, parsedPasswords, results, val;
  try {
    parsedPasswords = JSON.parse(this.password);
    results = [];
    for (name in parsedPasswords) {
      val = parsedPasswords[name];
      results.push(this.fieldValues[name] = val);
    }
    return results;
  } catch (_error) {
    error = _error;
    return log.info("Injecting encrypted fields : JSON.parse error : " + error);
  }
};

Konnector.prototype.removeEncryptedFields = function(fields) {
  var name, password, type;
  if (fields == null) {
    log.info("Removing encrypted fields : error : fields variable undefined");
  }
  password = {};
  for (name in fields) {
    type = fields[name];
    if (type === "password") {
      password[name] = this.fieldValues[name];
      delete this.fieldValues[name];
    }
  }
  return this.password = JSON.stringify(password);
};

Konnector.prototype.updateFieldValues = function(newValues, callback) {
  var fields;
  fields = konnectorHash[this.slug].fields;
  this.fieldValues = newValues.fieldValues;
  this.removeEncryptedFields(fields);
  this.importInterval = newValues.importInterval;
  return this.save(callback);
};

Konnector.prototype["import"] = function(callback) {
  return this.updateAttributes({
    isImporting: true
  }, (function(_this) {
    return function(err) {
      var data, konnectorModule;
      if (err != null) {
        data = {
          isImporting: false,
          lastImport: new Date()
        };
        return _this.updateAttributes(data, callback);
      } else {
        konnectorModule = require("../konnectors/" + _this.slug);
        _this.injectEncryptedFields();
        return konnectorModule.fetch(_this.fieldValues, function(err, notifContent) {
          var fields;
          fields = konnectorHash[_this.slug].fields;
          _this.removeEncryptedFields(fields);
          if (err != null) {
            data = {
              isImporting: false,
              errorMessage: err
            };
            return _this.updateAttributes(data, function() {
              return callback(err, notifContent);
            });
          } else {
            data = {
              isImporting: false,
              lastImport: new Date(),
              errorMessage: null
            };
            return _this.updateAttributes(data, function(err) {
              return callback(err, notifContent);
            });
          }
        });
      }
    };
  })(this));
};

Konnector.prototype.appendConfigData = function() {
  var key, konnectorData, modelNames, msg, name, ref, value;
  konnectorData = konnectorHash[this.slug];
  if (konnectorData == null) {
    msg = ("Config data cannot be appended for konnector " + this.slug + ": ") + "missing config file.";
    throw new Error(msg);
  }
  konnectorData = konnectorHash[this.slug];
  for (key in konnectorData) {
    this[key] = konnectorData[key];
  }
  modelNames = [];
  ref = this.models;
  for (key in ref) {
    value = ref[key];
    name = value.toString();
    name = name.substring('[Model '.length);
    name = name.substring(0, name.length - 1);
    modelNames.push(name);
  }
  this.modelNames = modelNames;
  return this;
};

Konnector.getKonnectorsToDisplay = function(callback) {
  return Konnector.all(function(err, konnectors) {
    var konnectorsToDisplay;
    if (err != null) {
      return callback(err);
    } else {
      try {
        konnectorsToDisplay = konnectors.filter(function(konnector) {
          return konnectorHash[konnector.slug] != null;
        }).map(function(konnector) {
          konnector.appendConfigData();
          return konnector;
        });
        return async.eachSeries(konnectorsToDisplay, function(konnector, next) {
          return konnector.addAmount(next);
        }, function(err) {
          return callback(null, konnectorsToDisplay);
        });
      } catch (_error) {
        err = _error;
        return callback(err);
      }
    }
  });
};

Konnector.prototype.addAmount = function(callback) {
  this.amounts = {};
  return async.eachSeries(Object.keys(this.models), (function(_this) {
    return function(modelName, next) {
      var model;
      model = _this.models[modelName];
      return model.all(function(err, instances) {
        _this.amounts[modelName] = instances.length;
        return next();
      });
    };
  })(this), function(err) {
    return callback();
  });
};
