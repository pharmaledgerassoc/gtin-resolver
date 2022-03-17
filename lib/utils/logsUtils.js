const constants = require("../constants");

let instance;

function MappingLogService(storageService, logService) {
  this.storageService = storageService;

  this.getMappingLogs = (callback) => {
    this.storageService.filter(constants.IMPORT_LOGS, "__timestamp > 0", callback);
  }

  this.logSuccessMapping = async (message, action, status) => {
    return await logMapping(message, action, status ? status : constants.SUCCESS_MAPPING_STATUS);
  }

  this.logFailedMapping = async (message, action, status) => {
    return await logMapping(message, action, status ? status : constants.FAILED_MAPPING_STATUS);
  }

  let logMapping = async (message, action, status) => {
    const currentDate = new Date().getTime();

    let itemCode;
    let itemType;

    switch (true) {
      case typeof message.product === "object":
        itemCode = message.product.productCode;
        itemType = "product";
        break;
      case typeof message.batch === "object":
        itemCode = message.batch.batch;
        itemType = "batch";
        break;
      case  message.messageType === "ProductPhoto":
        itemCode = message.productCode;
        itemType = "product-image";
        break;
      case  ["leaflet", "smpc"].indexOf(message.messageType) !== -1:
        itemCode = message.productCode ? message.productCode : message.batchCode;
        itemType = message.messageType;
        break;
      case   message.messageType === "VideoSource":
        itemCode = message.videos.batch ? message.videos.batch : message.videos.productCode;
        itemType = message.messageType;
        break;
      default:
        if (message.product && message.product.productCode) {
          itemCode = message.product.productCode;
        } else {
          itemCode = "unknown"
        }
        if (message.messageType) {
          itemType = message.messageType;
        } else {
          itemType = "unknown"
        }

    }

    let logData = {
      itemCode: itemCode,
      itemType: itemType,
      timestamp: currentDate,
      action: action,
      status: status,
      message: message
    }
    try {
      await this.storageService.insertRecord(constants.IMPORT_LOGS, logData.itemCode + "|" + currentDate, logData);
    } catch (e) {
      console.log(e);
    }

  }

  this.logAndUpdateDb = async (message, data, alreadyExists, type, logMessageObj) => {

    let dbTable, pk, metadata = {};
    if (!logMessageObj) {
      logMessageObj = {}
    }
    switch (type) {
      case constants.LOG_TYPES.BATCH:
        logMessageObj.action = alreadyExists ? "Edited batch" : "Created batch";
        logMessageObj.mappingLogMessage = alreadyExists ? "updated" : "created";
        await createOrUpdateRecord(this.storageService, constants.BATCHES_STORAGE_TABLE, data.batchNumber, data);
        break;
      case constants.LOG_TYPES.PRODUCT:
        logMessageObj.action = alreadyExists ? "Edited product" : "Created product";
        logMessageObj.mappingLogMessage = alreadyExists ? "updated" : "created";
        await createOrUpdateRecord(this.storageService, constants.PRODUCTS_TABLE, data.gtin, data);
        break;
      case constants.LOG_TYPES.PROD_PHOTO:
        logMessageObj.action = alreadyExists ? "Updated Product Photo" : "Edited Product Photo";
        logMessageObj.mappingLogMessage = alreadyExists ? "updated photo" : "created photo";
        metadata = {
          attachedTo: "PRODUCT",
          itemCode: data.gtin
        }
        await createOrUpdateRecord(this.storageService, constants.PRODUCTS_TABLE, data.gtin, data);
        break;
      case constants.LOG_TYPES.LEAFLET_LOG:
        metadata = {
          attachedTo: message.productCode ? "PRODUCT" : "BATCH",
          itemCode: message.productCode || message.batchCode
        }
        break;
    }

    if (typeof logService !== "undefined") {
      await $$.promisify(logService.log.bind(logService))({
        logInfo: data || message,
        username: message.senderId,
        action: logMessageObj.action,
        logType: type,
        metadata: metadata
      });
    }

    await this.logSuccessMapping(message, logMessageObj.mappingLogMessage);
  }

}

async function createOrUpdateRecord(storageService, dbTable, pk, data) {
  let dbRecord;
  try {
    dbRecord = await storageService.getRecord(dbTable, pk);
  } catch (e) {
    //possible issue on db.
  }

  if (dbRecord) {
    await storageService.updateRecord(dbTable, pk, data);
  } else {
    await storageService.insertRecord(dbTable, pk, data)
  }
}

module.exports = {
  createInstance: function (storageService) {
    if (!instance) {
      instance = new MappingLogService(storageService);
    }
    return instance;
  }
}
