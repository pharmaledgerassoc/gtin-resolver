const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();
const utils = require("../../utils/CommonUtils.js");
const XMLDisplayService = require("../../services/XMLDisplayService/XMLDisplayService");

function getLeafletDirPath(type, language) {
  return `/${type}/${language}`;
}

function getLeafletPath(type, language) {
  return `${getLeafletDirPath(type, language)}/${type}.xml`;
}

function getLeafletTypes(){
  return {
    "SMPC": "smpc",
    "LEAFLET": "leaflet"
  }
}

function getService(dsu, gtin, leafletType){
  const gtinSSI = dsu.getCreationSSI();
  const XMLDisplayService = require("../../services/XMLDisplayService/XMLDisplayService.js");
  const keyssi = require("opendsu").loadApi("keyssi");
  const simulatedModel = {networkName:keyssi.parse(gtinSSI).getDLDomain(), product:{gtin}};
  const service = new XMLDisplayService(undefined, gtinSSI, simulatedModel, leafletType, undefined);
  return service;
}

function getBatchAvailableLanguages(dsu, gtin, leafletType, callback){
  const service = getService(dsu, gtin, leafletType);
  service.readLanguagesFromDSU(dsu, `/${leafletType}`, callback);
}

function getProductAvailableLanguages(dsu, gtin, leafletType, callback){
  const service = getService(dsu, gtin, leafletType);
  service.readLanguagesFromDSU(dsu, `/${leafletType}`, callback);
}

module.exports = {
  getLeafletPath, getLeafletDirPath,
  getBatchAvailableLanguages,
  getProductAvailableLanguages,
  getLeafletTypes,
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
        hostMetadata = await require("../batch/batchUtils").getBatchMetadata.call(this, message, utils.getBatchMetadataPK(message.productCode, message.batchCode), true);

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
