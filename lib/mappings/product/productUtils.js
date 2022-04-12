const constants = require("../../constants/constants.js");
const GTIN_SSI = require("../../GTIN_SSI");
const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();
const errorUtils = require("../errors/errorUtils");
const validationUtils = require("../../utils/validationUtils");
errorUtils.addMappingError("PRODUCT_DSU_LOAD_FAIL");
errorUtils.addMappingError("GTIN_VALIDATION_FAIL");

async function getProductDSU(message, productCode, create = false) {
  let productDSU, productMetadata = {};
  const gtinSSI = GTIN_SSI.createGTIN_SSI(this.options.holderInfo.domain, this.options.holderInfo.subdomain, productCode);
  const {dsu, alreadyExists} = await this.loadConstSSIDSU(gtinSSI);

  if (create && !alreadyExists) {
    productDSU = await this.createDSU(this.options.holderInfo.subdomain, "seed");
    return {constDSU: dsu, productDSU: productDSU, productMetadata: productMetadata, alreadyExists: alreadyExists};
  }

  try {
    productMetadata = await this.storageService.getRecord(constants.PRODUCTS_TABLE, productCode);
  } catch (e) {
    await this.mappingLogService.logFailedMapping(message, "lookup", "Database corrupted");
    throw errMap.newCustomError(errMap.errorTypes.DB_OPERATION_FAIL, "productCode");
  }

  try {
    productDSU = await this.loadDSU(productMetadata.keySSI);
  } catch (err) {
    await this.mappingLogService.logFailedMapping(message, "lookup", `${err.message}` || `${constants.DSU_LOAD_FAIL}`);
    throw errMap.newCustomError(errMap.errorTypes.PRODUCT_DSU_LOAD_FAIL, "productCode");
  }
  return {constDSU: dsu, productDSU: productDSU, productMetadata: productMetadata, alreadyExists: alreadyExists};
}

async function validateGTIN(message) {
  let gtinValidationResult = validationUtils.validateGTIN(message.product.productCode);
  if (!gtinValidationResult.isValid) {
    await this.mappingLogService.logFailedMapping(message, "lookup", gtinValidationResult.message);
    errMap.setErrorMessage("GTIN_VALIDATION_FAIL", gtinValidationResult.message);
    throw errMap.newCustomError(errMap.errorTypes.GTIN_VALIDATION_FAIL, "productCode");
  }
}

module.exports = {
  getProductDSU,
  validateGTIN
}
