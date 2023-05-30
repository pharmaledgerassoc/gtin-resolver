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
    return this.persistLog(log, callback)

  }

  loginLog(logDetails, callback) {
    let log = {
      ...logDetails,
      logISODate: new Date().toISOString()
    };
    this.getSharedStorage((err, storageService) => {
        if (err) {
            return callback(err);
        }

        storageService.safeBeginBatch(async err => {
            if (err) {
                return callback(err);
            }
            let syncError = true;
            try{
                this.persistLog(log, (err) => {
                    syncError = false;
                    if (err) {
                        return callback(err);
                    }
                    storageService.commitBatch(err => {
                        if (err) {
                            return callback(err);
                        }
                        callback(undefined, log);
                    })
                 })
            }catch(err){
                if(syncError){
                    const persistSyncError = createOpenDSUErrorWrapper(`Failed to persist log. Sync error thrown`, err);
                    try{
                        await storageService.cancelBatchAsync();
                    } catch (e) {
                        return callback(createOpenDSUErrorWrapper(`Failed to cancel batch`, e, persistSyncError));
                    }

                    return callback(persistSyncError);
                }

                callback(err);
            }
        })
    })
  }

  getLogs(callback) {
    this.getSharedStorage((err, storageService) => {
      if (err) {
        return callback(err);
      }
      storageService.filter(this.logsTable, "__timestamp > 0", callback);
    });
  }

  persistLog(log, callback) {
    this.getSharedStorage((err, storageService) => {
      if (err) {
        return callback(err);
      }

      const crypto = require("opendsu").loadAPI("crypto");
      storageService.insertRecord(this.logsTable, crypto.encodeBase58(crypto.generateRandom(32)), log, (err) => {
        if (err) {
          return callback(err);
        }
        callback(undefined, log);
      })
    })
  }

  getSharedStorage(callback) {
    if (typeof this.storageService !== "undefined") {
      return callback(undefined, this.storageService);
    }
    const openDSU = require("opendsu");
    const scAPI = openDSU.loadAPI("sc");
    scAPI.getSharedEnclave((err, sharedEnclave) => {
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
      })
    });
  }
}
