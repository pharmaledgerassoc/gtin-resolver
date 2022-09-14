const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();

function getLeafletDirPath(type, language) {
  return `/${type}/${language}`;
}

function getLeafletPath(type, language) {
  return `${getLeafletDirPath(type, language)}/${type}.xml`;
}

module.exports = {
  getLeafletPath, getLeafletDirPath,
  getHostDSUData: async function (message) {
    let hostDSU;
    let errorType;
    let errorDetails;
    let hostMetadata;

    try {
      if (message.batchCode) {
        errorType = errMap.errorTypes.BATCH_DSU_LOAD_FAIL;
        errorDetails = `for batch ${message.batchCode}`;
        hostDSU = (await require("../batch/batchUtils").getBatchDSU.call(this, message, message.productCode, message.batchCode)).batchDSU;
        hostMetadata = await require("../batch/batchUtils").getBatchMetadata.call(this, message, message.batchCode, true);

      } else {
        errorType = errMap.errorTypes.PRODUCT_DSU_LOAD_FAIL;
        errorDetails = `for productCode ${message.productCode}`;
        hostDSU = (await require("../product/productUtils").getProductDSU.call(this, message, message.productCode)).productDSU;
        hostMetadata = await require("../product/productUtils").getProductMetadata.call(this, message, message.productCode, true);


      }
    } catch (err) {
      throw errMap.newCustomError(errorType, errorDetails);
    }

    return {hostDSU, hostMetadata}
  }

}
