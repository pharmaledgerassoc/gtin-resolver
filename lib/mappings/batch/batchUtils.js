const constants = require("../../constants/constants.js");
const GTIN_SSI = require("../../GTIN_SSI");
const productUtils = require("../product/productUtils");
const errUtils = require("../errors/errorUtils");
errUtils.addMappingError("BATCH_DSU_LOAD_FAIL");
errUtils.addMappingError("BATCH_MISSING_PRODUCT");
errUtils.addMappingError("EXISTING_BATCH_ID");
const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();

async function getBatchDSURecovery(message, productCode, batchId, create) {

  let seedSSI = await this.createPathSSI(this.options.holderInfo.subdomain, `0/${productCode}/${batchId}`);
  let sreadSSI = await $$.promisify(seedSSI.derive)();

  async function recoveryBatchConstDSU (dsu, callback){
    let error;

    try{
      await $$.promisify(dsu.mount)(constants.BATCH_DSU_MOUNT_POINT, sreadSSI.getIdentifier());
    }catch(err){
      error = err;
    }

    callback(error, dsu);
  }

  return new Promise((resolve, reject)=>{
    const gtinSSI = GTIN_SSI.createGTIN_SSI(this.options.holderInfo.domain, this.options.holderInfo.subdomain, productCode, batchId);
    this.recoverDSU(gtinSSI, recoveryBatchConstDSU, async(err, batchConstDSU)=>{
      if(err){
        return reject(err);
      }

      let batchDSU = await this.loadDSU(sreadSSI);

      resolve( {batchConstDSU: batchConstDSU,
          batchDSU: batchDSU,
          alreadyExists: true,
          gtinSSI: gtinSSI});
    });
  });
}

async function getBatchDSU(message, productCode, batchId, create = false) {

  if(message.force){
    return await getBatchDSURecovery.call(this, message, productCode, batchId, create);
  }

  let err;
  let productDSUObj;

  try {
    productDSUObj = await productUtils.getProductDSU.call(this, message, productCode);
  } catch (e) {
    throw errMap.newCustomError(errMap.errorTypes.PRODUCT_DSU_LOAD_FAIL, "productCode");
  }

  if (!productDSUObj) {
    let errorMessage = err && err.message ? err.message : constants.DSU_LOAD_FAIL
    throw errMap.newCustomError(errMap.errorTypes.PRODUCT_DSU_LOAD_FAIL, "productCode");
  }

  const {constDSU, productDSU} = productDSUObj;

  const gtinSSI = GTIN_SSI.createGTIN_SSI(this.options.holderInfo.domain, this.options.holderInfo.subdomain, productCode, batchId);
  const {dsu: batchConstDSU, alreadyExists: batchExists} = await this.loadConstSSIDSU(gtinSSI);
  let batchDSU;

  if (!batchExists) {
    batchDSU = await this.createPathSSIDSU(this.options.holderInfo.subdomain, `0/${productCode}/${batchId}`);
    let sreadSSI = await batchDSU.getKeySSIAsString("sread");
    await batchConstDSU.mount(constants.BATCH_DSU_MOUNT_POINT, sreadSSI);
  } else {
    try {
      let getSSIForMount = $$.promisify(batchConstDSU.getSSIForMount, batchConstDSU);
      //we read the ssi from the mounting point instead of the sharedDB. is more reliable
      let ssi = await getSSIForMount(constants.BATCH_DSU_MOUNT_POINT);
      batchDSU = await this.loadDSU(ssi);
    } catch (err) {
      throw errMap.newCustomError(errMap.errorTypes.BATCH_DSU_LOAD_FAIL, "batchId");
    }
  }

  return {
    batchConstDSU: batchConstDSU,
    batchDSU: batchDSU,
    alreadyExists: batchExists,
    gtinSSI: gtinSSI
  };
}

async function getBatchMetadata(message, batchId, shouldExist = true) {
  let metadata = {};
  try {
    metadata = await $$.promisify(this.storageService.getRecord, this.storageService)(constants.BATCHES_STORAGE_TABLE, batchId);
/*    if (!shouldExist && metadata) {
      throw errMap.newCustomError(errMap.errorTypes.EXISTING_BATCH_ID, "batch");
    }*/

  } catch (e) {
    if (shouldExist) {
      throw errMap.newCustomError(errMap.errorTypes.DB_OPERATION_FAIL, "productCode");
    }
  }
  return metadata;
}

module.exports = {
  getBatchDSU,
  getBatchMetadata
}
