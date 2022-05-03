function verifyIfProductMessage(message) {
  return message.messageType === "Product";
}

async function processProductMessage(message) {
  const constants = require("../../constants/constants");
  const validationUtils = require("../../utils/ValidationUtils");
  const logUtils = require("../../utils/LogUtils");
  const ModelMessageService = require('../../services/ModelMessageService');
  const schema = require("./productSchema");
  const productUtils = require("./productUtils");
  const dbUtils = require("../../utils/DBUtils");
  this.mappingLogService = logUtils.createInstance(this.storageService, this.options.logService);

  await validationUtils.validateMessageOnSchema.bind(this)(message, schema);
  await productUtils.validateGTIN.bind(this)(message);

  const productCode = message.product.productCode;

  const {
    constDSU,
    productDSU,
    productMetadata,
    alreadyExists
  } = await productUtils.getProductDSU.bind(this)(message, productCode, true);

  /*
  * extension of the file will contain epi version. Used format is epi_+epiVersion;
  * Ex: for version 1 - product.epi_v1
  *  */
  const indication = {product: `${constants.PRODUCT_STORAGE_FILE}${message.messageTypeVersion}`};
  await this.loadJSONS(productDSU, indication);

  if (typeof this.product === "undefined") {
    this.product = JSON.parse(JSON.stringify(productMetadata));
  }

  let modelMsgService = new ModelMessageService("product");
  this.product = {...this.product, ...modelMsgService.getModelFromMessage(message.product)};
  this.product.version = productMetadata.version ? productMetadata.version + 1 : 1;
  this.product.epiProtocol = `v${message.messageTypeVersion}`;

  await this.saveJSONS(productDSU, indication);
  this.product.keySSI = await productDSU.getKeySSIAsString();

  if (!alreadyExists) {
    await constDSU.mount(constants.PRODUCT_DSU_MOUNT_POINT, this.product.keySSI);
  }


  let logData = await this.mappingLogService.logSuccessAction(message, this.product, alreadyExists);
  await dbUtils.createOrUpdateRecord(this.storageService, logData, this.product);

}

require("opendsu").loadApi("m2dsu").defineMapping(verifyIfProductMessage, processProductMessage);
