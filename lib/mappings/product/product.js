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

  await validationUtils.validateMessageOnSchema.call(this, message, schema);
  await validationUtils.validateMVP1Values.call(this, message, "product");
  await productUtils.validateGTIN.call(this, message);

  const productCode = message.product.productCode;

  const {
    constDSU,
    productDSU,
    alreadyExists
  } = await productUtils.getProductDSU.call(this, message, productCode, true);

  let productMetadata = await productUtils.getProductMetadata.call(this, message, productCode, alreadyExists);

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

  let diffs = this.mappingLogService.getDiffsForAudit(modelMsgService.getMessageFromModel(this.product), alreadyExists ? modelMsgService.getMessageFromModel(productMetadata) : null);
  let logData = await this.mappingLogService.logSuccessAction(message, this.product, alreadyExists, diffs, productDSU);
  await dbUtils.createOrUpdateRecord(this.storageService, logData, this.product);
}

require("opendsu").loadApi("m2dsu").defineMapping(verifyIfProductMessage, processProductMessage);
