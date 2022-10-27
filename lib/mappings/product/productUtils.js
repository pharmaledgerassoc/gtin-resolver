const constants = require("../../constants/constants.js");
const GTIN_SSI = require("../../GTIN_SSI");
const openDSU = require("opendsu");
const keySSISpace = openDSU.loadAPI("keyssi");
const errMap = openDSU.loadAPI("m2dsu").getErrorsMap();
const errorUtils = require("../errors/errorUtils");
const validationUtils = require("../../utils/ValidationUtils");
errorUtils.addMappingError("PRODUCT_DSU_LOAD_FAIL");
errorUtils.addMappingError("GTIN_VALIDATION_FAIL");

async function getProductDSU(message, productCode, create = false) {
    let productDSU = {};
    const gtinSSI = GTIN_SSI.createGTIN_SSI(this.options.holderInfo.domain, this.options.holderInfo.subdomain, productCode);
    const {dsu, alreadyExists} = await this.loadConstSSIDSU(gtinSSI);

    if (create && !alreadyExists) {
        productDSU = await this.createPathSSIDSU(this.options.holderInfo.subdomain, `0/${productCode}`);
        let sreadSSI = await productDSU.getKeySSIAsString("sread");
        await dsu.mount(constants.PRODUCT_DSU_MOUNT_POINT, sreadSSI);

        return {constDSU: dsu, productDSU: productDSU, alreadyExists: alreadyExists};
    }

    try {
        let getSSIForMount = $$.promisify(dsu.getSSIForMount);
        //we read the ssi from the mounting point instead of the sharedDB. is more reliable
        let ssi = await getSSIForMount(constants.PRODUCT_DSU_MOUNT_POINT);
        productDSU = await this.loadDSU(ssi);
    } catch (err) {
        throw errMap.newCustomError(errMap.errorTypes.PRODUCT_DSU_LOAD_FAIL, "productCode");
    }
    return {constDSU: dsu, productDSU: productDSU, alreadyExists: alreadyExists};
}

async function validateGTIN(message) {
    let gtinValidationResult = validationUtils.validateGTIN(message.product.productCode);
    if (!gtinValidationResult.isValid) {
        errMap.setErrorMessage("GTIN_VALIDATION_FAIL", gtinValidationResult.message);
        throw errMap.newCustomError(errMap.errorTypes.GTIN_VALIDATION_FAIL, "productCode");
    }
}

async function getProductMetadata(message, productCode, shouldExist= true) {
  let productMetadata = {};
    try {
        productMetadata = await $$.promisify(this.storageService.getRecord, this.storageService)(constants.PRODUCTS_TABLE, productCode);
    } catch (e) {
        if(shouldExist){
            throw errMap.newCustomError(errMap.errorTypes.DB_OPERATION_FAIL, "productCode");
        }
    }
    return productMetadata;
}

module.exports = {
    getProductDSU,
    getProductMetadata,
    validateGTIN
}
