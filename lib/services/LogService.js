const constants = require('../constants/constants');
const getSharedStorageInstance = require("./SharedDBStorageService.js").getSharedStorageInstance;

module.exports = class LogService {

  constructor(dsuStorage, logsTable) {
    this.storageService = getSharedStorageInstance(dsuStorage);
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

    if (logDetails.source !== "demiurge") {
      log.itemCode = logDetails.itemCode || logDetails.metadata.itemCode || ""
    }

    this.storageService.addIndex(this.logsTable, "__timestamp", (error) => {
      if (error) {
        return callback(error);
      }
      this.storageService.insertRecord(this.logsTable, log.timestamp, log, (err) => {
        if (err) {
          return callback(err);
        }
        callback(undefined, true);
      });
    })

  }

  getLogs(callback) {
    this.storageService.filter(this.logsTable, "__timestamp > 0", callback);
  }
}
