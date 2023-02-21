const dbUtils = require("../../utils/DBUtils");
const utils = require("../../utils/CommonUtils.js");
const productUtils = require("../product/productUtils");
const batchUtils = require("../batch/batchUtils");

function verifyIfVideoMessage(message) {
  return message.messageType === "VideoSource";
}

async function processVideoMessage(message) {
  const schema = require("./videoSchema");
  const validationUtils = require("../../utils/ValidationUtils");
  const productUtils = require("../product/productUtils");
  const constants = require("../../constants/constants.js");
  const errorUtils = require("../errors/errorUtils");
  errorUtils.addMappingError("VIDEO_SOURCE_MISSING_PRODUCT");
  const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();
  this.mappingLogService = require("../../utils/LogUtils").createInstance(this.storageService, this.options.logService);

  await validationUtils.validateMessageOnSchema.call(this, message, schema);
  await validationUtils.validateMVP1Values.call(this, message, "videos");

  const productCode = message.videos.productCode;

  try {
    if (message.videos.batch) {
      //batch id means its saved on batch
      const batchId = message.videos.batch;

      let batchMetadata = await batchUtils.getBatchMetadata.call(this, message, utils.getBatchMetadataPK(productCode, batchId));
      let {batchDSU} = await batchUtils.getBatchDSU.call(this, message, productCode, batchId);
      const indication = {batch: `${constants.BATCH_STORAGE_FILE}${message.messageTypeVersion}`};

      await this.loadJSONS(batchDSU, indication);
      if (typeof this.batch === "undefined") {
        this.batch = JSON.parse(JSON.stringify(batchMetadata));
      }

      prepareVideoSources(this.batch, message);

      await this.saveJSONS(batchDSU, indication);
      let diffs = this.mappingLogService.getDiffsForAudit(this.batch, batchMetadata);
      this.batch.keySSI = await batchDSU.getKeySSIAsString();
      let logData = await this.mappingLogService.logSuccessAction(message, this.batch, true, diffs, batchDSU);
      await dbUtils.createOrUpdateRecord(this.storageService, logData, this.batch);

    } else {
      //it's saved on product

      const {productDSU, alreadyExists} = await productUtils.getProductDSU.call(this, message, productCode);
      let productMetadata;

      const indication = {product: `${constants.PRODUCT_STORAGE_FILE}${message.messageTypeVersion}`};
      await this.loadJSONS(productDSU, indication);

      if (typeof this.product === "undefined") {
        productMetadata = await productUtils.getProductMetadata.call(this, message, productCode, alreadyExists);
        this.product = JSON.parse(JSON.stringify(productMetadata));
      }

      prepareVideoSources(this.product, message);

      await this.saveJSONS(productDSU, indication);

      let diffs = this.mappingLogService.getDiffsForAudit(this.product, productMetadata);
      //this save may generate strange behavior....
      this.product.keySSI = await productDSU.getKeySSIAsString();

      let logData = await this.mappingLogService.logSuccessAction(message, this.product, true, diffs, productDSU);
      await dbUtils.createOrUpdateRecord(this.storageService, logData, this.product);
    }
  } catch (err) {
    throw errMap.newCustomError(errMap.errorTypes.VIDEO_SOURCE_MISSING_PRODUCT, "productCode");
  }

}

function prepareVideoSources(sourceObject, message) {
  if (!sourceObject.videos) {
    sourceObject.videos = {}
  }

  if (message.videos.sources) {
    sourceObject.videos = {
      defaultSource: sourceObject.videos.defaultSource
    }
    message.videos.sources.forEach(docSource => {
      let key = `${docSource.documentType}/${docSource.lang}`
      sourceObject.videos[key] = docSource.source;
    })
  }

  if (typeof message.videos.source !== "undefined") {
    sourceObject.videos.defaultSource = message.videos.source;
  }
}

require("opendsu").loadApi("m2dsu").defineMapping(verifyIfVideoMessage, processVideoMessage);
