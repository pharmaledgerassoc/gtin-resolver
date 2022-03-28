const constants = require("../../constants/constants.js");
const GTIN_SSI = require("../../GTIN_SSI");
const productUtils = require("../product/productUtils");
const errUtils = require("../errors/errorUtils");
errUtils.addMappingError("BATCH_DSU_LOAD_FAIL");
errUtils.addMappingError("BATCH_MISSING_PRODUCT");
const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();

async function getBatchDSU(productCode, batchId, create = false) {

  const {constDSU, productDSU, productMetadata} = await productUtils.getProductDSU.bind(this)(productCode);

  if (!productDSU) {
    await this.mappingLogService.logFailedMapping(message, "lookup", `${err.message}` || `${constants.DSU_LOAD_FAIL}`);
    throw errMap.newCustomError(errMap.errorTypes.BATCH_MISSING_PRODUCT, "productCode");
  }

  const gtinSSI = GTIN_SSI.createGTIN_SSI(this.options.holderInfo.domain, this.options.holderInfo.subdomain, productCode, batchId);
  const {dsu: batchConstDSU, alreadyExists: batchExists} = await this.loadConstSSIDSU(gtinSSI);
  let batchDSU;
  let batchMetadata = {};

  if (!productMetadata) {
    throw errMap.newCustomError(errMap.errorTypes.DB_OPERATION_FAIL, "productCode");
  }

  if (!batchExists) {
    batchDSU = await this.createDSU(this.options.holderInfo.subdomain, "seed");

  } else {
    try {
      batchMetadata = await this.storageService.getRecord(constants.BATCHES_STORAGE_TABLE, batchId);
    } catch (e) {
      await this.mappingLogService.logFailedMapping(message, "lookup", "Database corrupted");
      throw errMap.newCustomError(errMap.errorTypes.DB_OPERATION_FAIL, "batchId");
    }
    try {
      batchDSU = await this.loadDSU(batchMetadata.keySSI);
    } catch (e) {
      await this.mappingLogService.logFailedMapping(message, "lookup", `${err.message}` || `${constants.DSU_LOAD_FAIL}`);
      throw errMap.newCustomError(errMap.errorTypes.BATCH_DSU_LOAD_FAIL, "batchId");
    }

  }

  return {
    batchConstDSU: batchConstDSU,
    batchDSU: batchDSU,
    batchMetadata: batchMetadata,
    productMetadata: productMetadata,
    alreadyExists: batchExists,
    gtinSSI: gtinSSI
  };
}

module.exports = {
  getBatchDSU
}
