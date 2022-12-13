const constants = require("../constants/constants");
const utils = require("../utils/CommonUtils.js");
let instance;
const dbMessageFields = ["pk", "meta", "did", "__timestamp", "$loki", "context", "keySSI", "epiProtocol", "version"];

function MappingLogService(storageService, logService) {
  this.storageService = storageService;
  this.logService = logService;

  this.getMappingLogs = (callback) => {
    this.storageService.filter(constants.IMPORT_LOGS, "__timestamp > 0", callback);
  }

  this.logSuccessAction = async (message, data, alreadyExists, diffs, DSU) => {
    let logData = getLogData(message, data, alreadyExists);
    logData.status = constants.SUCCESS_MAPPING_STATUS;
    logData.auditLogData.diffs = diffs;
    let keySSIObj = await $$.promisify(DSU.getKeySSIAsObject)();
    logData.auditLogData.anchorId = await $$.promisify(keySSIObj.getAnchorId)();
    const latestHashLink = await $$.promisify(DSU.getLatestAnchoredHashLink)();
    logData.auditLogData.hashLink = latestHashLink.getIdentifier();
    await logAction(logData);
    return logData;
  }

  this.logFailAction = async (message, data, status) => {
    let logData = getLogData(message, data || status, true, status);
    let logStatus = status ? status : constants.FAILED_MAPPING_STATUS;
    logData.status = logStatus;
    logData.auditLogData.logType = constants.LOG_TYPES.FAILED_ACTION;
    logData.auditLogData.status = logStatus;
    logData.auditLogData.reason = "Failed - See details";

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

  let cleanMessage = (message) => {
    let cleanMessage = JSON.parse(JSON.stringify(message));
    dbMessageFields.forEach(field => {
      if (field in cleanMessage) {
        delete cleanMessage[field]
      }
    })
    return cleanMessage;
  }

  this.getDiffsForAudit = (data, prevData) => {
    if (prevData && Object.keys(prevData).length > 0) {
      prevData = cleanMessage(prevData);
      data = cleanMessage(data);

      let diffs = Object.keys(data).reduce((diffs, key) => {
        if (JSON.stringify(prevData[key]) === JSON.stringify(data[key])) return diffs
        return {
          ...diffs, [key]: {oldValue: prevData[key], newValue: data[key]}
        }
      }, {})
      return diffs;
    }
  }

  let getLogData = (message, data, alreadyExists) => {
    message = cleanMessage(message);
    let resultObj = {
      itemCode: "unknown",
      itemType: "unknown",
      timestamp: new Date().getTime(),
      message: message,
      auditLogData: {
        username: message.senderId,
        auditId: message.messageId + "|" + message.senderId + "|" + message.messageDateTime
      },
      metadata: {}
    };
    let auditLogType = "";

    try {
      switch (message.messageType) {
        case constants.MESSAGE_TYPES.BATCH:
          resultObj.reason = alreadyExists ? "Edited batch" : "Created batch";
          resultObj.mappingLogMessage = alreadyExists ? "updated" : "created";
          resultObj.pk = utils.getBatchMetadataPK(message.batch.productCode, message.batch.batch);
          resultObj.itemCode = message.batch.batch || resultObj.itemCode;
          resultObj.itemType = message.messageType;
          resultObj.table = constants.BATCHES_STORAGE_TABLE;
          auditLogType = constants.LOG_TYPES.BATCH;
          resultObj.metadata.gtin = message.batch.productCode;
          break;
        case constants.MESSAGE_TYPES.PRODUCT:
          resultObj.reason = alreadyExists ? "Edited product" : "Created product";
          resultObj.mappingLogMessage = alreadyExists ? "updated" : "created";
          resultObj.pk = message.product.productCode;
          resultObj.itemCode = message.product.productCode || resultObj.itemCode;
          resultObj.itemType = message.messageType;
          resultObj.table = constants.PRODUCTS_TABLE;
          auditLogType = constants.LOG_TYPES.PRODUCT
          resultObj.metadata.gtin = message.product.productCode;
          break;
        case constants.MESSAGE_TYPES.PRODUCT_PHOTO:
          resultObj.reason = alreadyExists ? "Updated Product Photo" : "Edited Product Photo";
          resultObj.mappingLogMessage = alreadyExists ? "updated photo" : "created photo";
          resultObj.pk = message.productCode;
          resultObj.itemCode = message.productCode || resultObj.itemCode;
          resultObj.itemType = message.messageType;
          resultObj.table = constants.PRODUCTS_TABLE;
          auditLogType = constants.LOG_TYPES.PRODUCT_PHOTO;
          resultObj.metadata.attachedTo = "PRODUCT";
          resultObj.metadata.gtin = message.productCode;
          break;
        case constants.MESSAGE_TYPES.LEAFLET:
        case constants.MESSAGE_TYPES.SMPC:
          let leafletStatus = message.action.charAt(0).toUpperCase() + message.action.slice(1) + "ed";
          resultObj.reason = message.messageType === constants.MESSAGE_TYPES.LEAFLET ? `${leafletStatus} Leaflet` : `${leafletStatus} SMPC`;
          resultObj.mappingLogMessage = message.messageType === constants.MESSAGE_TYPES.LEAFLET ? `${leafletStatus} leaflet` : `${leafletStatus} SMPC`;
          resultObj.itemType = message.messageType;
          if (message.batchCode) {
            resultObj.metadata.attachedTo = "BATCH";
            resultObj.metadata.batch = message.batchCode;
            resultObj.itemCode = message.batchCode;
          } else {
            resultObj.metadata.attachedTo = "PRODUCT";
            resultObj.itemCode = message.productCode;
          }
          resultObj.metadata.gtin = message.productCode;
          auditLogType = constants.LOG_TYPES.LEAFLET_LOG;
          break;
        case constants.MESSAGE_TYPES.VIDEO_SOURCE:
          resultObj.reason = "Updated Video Source";
          resultObj.mappingLogMessage = "updated";
          resultObj.itemType = message.messageType;
          auditLogType = constants.LOG_TYPES.VIDEO_SOURCE;
          if (message.videos.batch) {
            resultObj.pk = message.videos.batch;
            resultObj.metadata.attachedTo = "BATCH";
            resultObj.metadata.batch = message.videos.batch;
            resultObj.itemCode = message.videos.batch;
            resultObj.table = constants.BATCHES_STORAGE_TABLE;
          } else {
            resultObj.pk = message.videos.productCode;
            resultObj.metadata.attachedTo = "PRODUCT";
            resultObj.itemCode = message.videos.productCode;
            resultObj.table = constants.PRODUCTS_TABLE;
          }
          resultObj.metadata.gtin = message.videos.productCode;
          break;
        default:
          throw new Error("Unknown message type");
      }
    } catch (err) {
      resultObj.reason = "Edit action";
      resultObj.mappingLogMessage = "failed";
      resultObj.itemCode = resultObj.itemCode || "unknown";
      resultObj.itemType = message.messageType || "unknown";
      resultObj.metadata.failReason = err.message;
      auditLogType = constants.LOG_TYPES.FAILED_ACTION;
    }

    resultObj.auditLogData.reason = resultObj.reason;
    resultObj.auditLogData.itemCode = resultObj.itemCode;
    resultObj.auditLogData.logType = auditLogType;
    resultObj.auditLogData.metadata = resultObj.metadata;
    resultObj.auditLogData.logInfo = message;
    resultObj.auditLogData.gtin = resultObj.metadata.gtin;
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
