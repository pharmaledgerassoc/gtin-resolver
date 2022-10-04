const constants = require('../constants/constants');

module.exports = class LogService {

  constructor(logsTable) {
    if (typeof logsTable === "undefined") {
      this.logsTable = constants.LOGS_TABLE;
    } else {
      this.logsTable = logsTable;
    }
  }

  log(logDetails, callback) {
    if (logDetails === null || logDetails === undefined) {
      return;
    }

    let log = {
      ...logDetails,
      timestamp: logDetails.timestamp || new Date().getTime()
    };

    try {
      log.itemCode = logDetails.itemCode || logDetails.metadata.gtin || "unknown";
    } catch (e) {
      log.itemCode = "unknown"
    }

    this.getSharedStorage((err, storageService)=>{
      if (err) {
        return callback(err);
      }

      const crypto = require("opendsu").loadAPI("crypto");
      storageService.insertRecord(this.logsTable, crypto.generateRandom(32).toString("hex"), log, (err) => {
        if (err) {
          return callback(err);
        }
        callback(undefined, true);
      });
    })
  }

  getLogs(callback) {
    this.getSharedStorage((err, storageService)=> {
      if (err) {
        return callback(err);
      }
      storageService.filter(this.logsTable, "__timestamp > 0", callback);
    });
  }

  getSharedStorage(callback){
    if (typeof this.storageService !== "undefined") {
      return callback(undefined, this.storageService);
    }
    const openDSU = require("opendsu");
    const scAPI = openDSU.loadAPI("sc");
    scAPI.getSharedEnclave((err, sharedEnclave)=>{
      if (err) {
        return callback(err);
      }

      sharedEnclave.addIndex(this.logsTable, "__timestamp", (error) => {
        if (error) {
          return callback(error);
        }
        sharedEnclave.addIndex(this.logsTable, "auditId", (error) => {
          if (error) {
            return callback(error);
          }
          this.storageService = sharedEnclave;
          callback(undefined, this.storageService)
        });
      });
    });
  }
}
