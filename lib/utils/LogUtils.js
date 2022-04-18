const constants = require("../constants/constants");
let instance;

function MappingLogService(storageService, logService) {
  this.storageService = storageService;
  this.logService = logService;

  this.getMappingLogs = (callback) => {
    this.storageService.filter(constants.IMPORT_LOGS, "__timestamp > 0", callback);
  }

  this.logSuccessAction = async (message, data, alreadyExists, status) => {
    let logData = getLogData(message, data, alreadyExists);
    logData.status = status ? status : constants.SUCCESS_MAPPING_STATUS;
    await logAction(logData);
    return logData;
  }

  this.logFailAction = async (message, data, status) => {
    let logData = getLogData(message, data, true, status);
    let logStatus = status ? status : constants.FAILED_MAPPING_STATUS;
    logData.status = logStatus;
    logData.auditLogData.logType = constants.LOG_TYPES.FAILED_ACTION;
    logData.auditLogData.status = logStatus;
    logData.auditLogData.action = logData.auditLogData.action + " - fail";
    await logAction(logData);
    return logData;
  }

  let logAction = async (logData, message) => {
    if (typeof this.logService !== "undefined") {
      await $$.promisify(this.logService.log, this.logService)(logData.auditLogData);
    }
    try {
      await $$.promisify(this.storageService.addIndex, this.storageService)(constants.IMPORT_LOGS, "__timestamp");
      await $$.promisify(this.storageService.insertRecord, this.storageService)(constants.IMPORT_LOGS, logData.itemCode + "|" + logData.timestamp, logData);

    } catch (e) {
      console.log(e);
    }
  }

  let getLogData = (message, data, alreadyExists) => {

    let resultObj = {
      itemCode: "unknown",
      itemType: "unknown",
      timestamp: new Date().getTime(),
      message: message
    };
    let auditLogType = "";
    let logInfo = {};
    try {
      switch (message.messageType) {
        case constants.MESSAGE_TYPES.BATCH:
          resultObj.action = alreadyExists ? "Edited batch" : "Created batch";
          resultObj.mappingLogMessage = alreadyExists ? "updated" : "created";
          resultObj.pk = message.batch.batch;
          resultObj.itemCode = message.batch.batch;
          resultObj.itemType = message.messageType;
          resultObj.table = constants.BATCHES_STORAGE_TABLE;
          logInfo = message.batch;
          auditLogType = constants.LOG_TYPES.BATCH;
          break;
        case constants.MESSAGE_TYPES.PRODUCT:
          resultObj.action = alreadyExists ? "Edited product" : "Created product";
          resultObj.mappingLogMessage = alreadyExists ? "updated" : "created";
          resultObj.pk = message.product.productCode;
          resultObj.itemCode = message.product.productCode;
          resultObj.itemType = message.messageType;
          resultObj.table = constants.PRODUCTS_TABLE;
          logInfo = message.product;
          auditLogType = constants.LOG_TYPES.PRODUCT
          break;
        case constants.MESSAGE_TYPES.PRODUCT_PHOTO:
          resultObj.action = alreadyExists ? "Updated Product Photo" : "Edited Product Photo";
          resultObj.mappingLogMessage = alreadyExists ? "updated photo" : "created photo";
          resultObj.pk = message.productCode;
          resultObj.itemCode = message.productCode;
          resultObj.itemType = message.messageType;
          resultObj.table = constants.PRODUCTS_TABLE;
          auditLogType = constants.LOG_TYPES.PRODUCT_PHOTO;
          resultObj.metadata = {
            attachedTo: "PRODUCT",
            itemCode: message.productCode
          }
          break;
        case constants.MESSAGE_TYPES.LEAFLET:
        case constants.MESSAGE_TYPES.SMPC:
          let leafletStatus = message.status === "delete" ? "Deleted" : "Updated";
          resultObj.action = message.messageType === constants.MESSAGE_TYPES.LEAFLET ? `${leafletStatus} Leaflet` : `${leafletStatus} SMPC`;
          resultObj.mappingLogMessage = message.messageType === constants.MESSAGE_TYPES.LEAFLET ? `${leafletStatus} leaflet` : `${leafletStatus} SMPC`;
          resultObj.itemCode = message.productCode ? message.productCode : message.batchCode;
          resultObj.itemType = message.messageType;
          resultObj.metadata = {
            attachedTo: message.productCode ? "PRODUCT" : "BATCH",
            itemCode: message.productCode || message.batchCode
          }
          auditLogType = constants.LOG_TYPES.LEAFLET_LOG;
          break;
        case constants.MESSAGE_TYPES.VIDEO_SOURCE:
          resultObj.action = "Updated Video Source";
          resultObj.mappingLogMessage = "updated";
          resultObj.pk = message.videos.batch ? message.videos.batch : message.videos.productCode;
          resultObj.itemCode = message.videos.batch ? message.videos.batch : message.videos.productCode;
          resultObj.itemType = message.messageType;
          resultObj.table = message.videos.batch ? constants.BATCHES_STORAGE_TABLE : constants.PRODUCTS_TABLE;
          auditLogType = constants.LOG_TYPES.VIDEO_SOURCE;
          resultObj.metadata = {
            attachedTo: message.videos.batch ? "BATCH" : "PRODUCT",
            itemCode: message.videos.batch ? message.videos.batch : message.videos.productCode
          }
          break;
      }
    } catch (err) {
      resultObj.action = "Failed action";
      resultObj.mappingLogMessage = "failed";
      resultObj.itemCode = itemCode || "unknown";
      resultObj.itemType = message.messageType || "unknown";
      auditLogType = constants.LOG_TYPES.FAILED_ACTION;
    }


    resultObj.auditLogData = {
      logInfo: data || message,
      username: message.senderId,
      action: resultObj.action,
      itemCode: resultObj.itemCode,
      logType: auditLogType,
      metadata: resultObj.metadata
    }
    
    return resultObj;
  }
}

module.exports = {
  createInstance: function (storageService, logService) {
    if (!instance) {
      instance = new MappingLogService(storageService, logService);
    }
    return instance;
  }
}
