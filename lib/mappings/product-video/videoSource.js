const dbUtils = require("../../utils/DBUtils");
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

  const productCode = message.videos.productCode;

  try {
    if (message.videos.batch) {
      //batch id means its saved on batch
      const batchId = message.videos.batch;

      let batchMetadata = await batchUtils.getBatchMetadata.call(this, message, batchId);
      let { batchDSU } = await batchUtils.getBatchDSU.call(this, message, productCode, batchId);
      const indication = {batch: `${constants.BATCH_STORAGE_FILE}${message.messageTypeVersion}`};

      await this.loadJSONS(batchDSU, indication);
      if (typeof this.batch === "undefined") {
        this.batch = JSON.parse(JSON.stringify(batchMetadata));
      }

      prepareVideoSources(this.batch, message);

      await this.saveJSONS(batchDSU, indication);
      this.batch.keySSI = await batchDSU.getKeySSIAsString();

      let logData = await this.mappingLogService.logSuccessAction(message, this.batch, true);
      await dbUtils.createOrUpdateRecord(this.storageService, logData, this.batch);

    } else {
      //it's saved on product

      const { productDSU,  alreadyExists} = await productUtils.getProductDSU.call(this, message, productCode);

      const indication = {product: `${constants.PRODUCT_STORAGE_FILE}${message.messageTypeVersion}`};
      await this.loadJSONS(productDSU, indication);

      if (typeof this.product === "undefined") {
        let productMetadata = await productUtils.getProductMetadata.call(this, message, productCode, alreadyExists);
        this.product = JSON.parse(JSON.stringify(productMetadata));
      }

      prepareVideoSources(this.product, message);

      await this.saveJSONS(productDSU, indication);

      //this save may generate strange behavior....
      this.product.keySSI = await productDSU.getKeySSIAsString();

      let logData = await this.mappingLogService.logSuccessAction(message, this.product, true);
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
