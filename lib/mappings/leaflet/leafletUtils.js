const constants = require("../../constants/constants");
const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();

module.exports = {

  getHostDSU: async function (message) {
    const tablesMappings = {
      "product": {
        tableName: constants.PRODUCTS_TABLE,
        missingDSUMessage: errMap.errorTypes.PRODUCT_DSU_LOAD_FAIL
      },
      "batch": {
        tableName: constants.BATCHES_STORAGE_TABLE,
        missingDSUMessage: errMap.errorTypes.BATCH_DSU_LOAD_FAIL
      }
    };
    const databaseRecordIdentifier = message.productCode ? message.productCode : message.batchCode;
    this.mappingLogService = require("../../utils/LogUtils").createInstance(this.storageService);

    let hostDSU;
    let dsuMetadata;
    let type = message.messageType

    let dsuMapping = tablesMappings["product"];
    if (message.batchCode) {
      dsuMapping = tablesMappings["batch"];
      dsuMapping.errDetails = `for batch ${message.batchCode}`
    } else {
      dsuMapping.errDetails = `for productCode ${message.productCode}`
    }

    try {
      dsuMetadata = await this.storageService.getRecord(dsuMapping.tableName, databaseRecordIdentifier);
      hostDSU = await this.loadDSU(dsuMetadata.keySSI);
    } catch (err) {
      await this.mappingLogService.logFailAction(message, null, dsuMapping.missingDSUMessage.errMsg);
      throw errMap.newCustomError(dsuMapping.missingDSUMessage, dsuMapping.errDetails);
    }

    if (!hostDSU) {
      await this.mappingLogService.logFailAction(message, null, dsuMapping.missingDSUMessage.errMsg);
      throw errMap.newCustomError(dsuMapping.missingDSUMessage, dsuMapping.errDetails);
    }
    return hostDSU;
  }

}
