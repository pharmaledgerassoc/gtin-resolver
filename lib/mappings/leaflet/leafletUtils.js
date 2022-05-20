const constants = require("../../constants/constants");

module.exports = {

  getHostDSU: async function (message) {
    const tablesMappings = {
      "product": {
        tableName: constants.PRODUCTS_TABLE,
        missingDSUMessage: constants.MISSING_PRODUCT_DSU,
      },
      "batch": {
        tableName: constants.BATCHES_STORAGE_TABLE,
        missingDSUMessage: constants.MISSING_BATCH_DSU,
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
    }

    try {
      dsuMetadata = await this.storageService.getRecord(dsuMapping.tableName, databaseRecordIdentifier);
      hostDSU = await this.loadDSU(dsuMetadata.keySSI);
    } catch (err) {
      await this.mappingLogService.logFailAction(message, null, dsuMapping.missingDSUMessage);
      const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();
      throw errMap.newCustomError(dsuMapping.missingDSUMessage);
    }

    if (!hostDSU) {
      await this.mappingLogService.logFailAction(message, null, dsuMapping.missingDSUMessage);
      const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();
      throw errMap.newCustomError(`Fail to create a ${type} for a missing ${message.productCode ? "product" : "batch"}`);
    }
    return hostDSU;
  }

}
