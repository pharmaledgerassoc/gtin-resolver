function verifyIfVideoMessage(message) {
  return message.messageType === "VideoSource";
}

async function processVideoMessage(message) {
  const schema = require("./videoSchema");
  const schemaUtils = require("../../utils/schemaUtils");
  const productUtils = require("../product/productUtils");
  const constants = require("../../constants/constants.js");
  const errorUtils = require("../errors/errorUtils");
  errorUtils.addMappingError("VIDEO_SOURCE_MISSING_PRODUCT");
  const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();
  this.mappingLogService = require("../../utils/logsUtils").createInstance(this.storageService, this.options.logService);

  await schemaUtils.validateMessage.bind(this)(message, schema);

  const productCode = message.videos.productCode;

  /*  let productDSU;
    let productMetadata;
    try {
      productMetadata = await this.storageService.getRecord(constants.PRODUCTS_TABLE, productCode);
      productDSU = await this.loadDSU(productMetadata.keySSI);
    } catch (err) {
      await mappingLogService.logFailedMapping(message, "lookup", `${err.message}` || `${constants.DSU_LOAD_FAIL}`);
      throw errMap.newCustomError(errMap.errorTypes.VIDEO_SOURCE_MISSING_PRODUCT, "productCode");
    }*/

  try {
    const {
      constDSU,
      productDSU,
      productMetadata,
      alreadyExists
    } = await productUtils.getProductDSU.bind(this)(message, productCode);
    if (message.videos.batch) {
      //batch id means its saved on batch
      const batchId = message.videos.batch;
      if (!productMetadata) {
        throw errMap.newCustomError(errMap.errorTypes.DB_OPERATION_FAIL, "productCode");
      }
      let batchMetadata = await this.storageService.getRecord(constants.BATCHES_STORAGE_TABLE, batchId);
      let batchDSU = await this.loadDSU(batchMetadata.keySSI);
      const indication = {batch: `${constants.BATCH_STORAGE_FILE}${message.messageTypeVersion}`};

      await this.loadJSONS(batchDSU, indication);
      if (typeof this.batch === "undefined") {
        this.batch = JSON.parse(JSON.stringify(batchMetadata));
      }

      prepareVideoSources(this.batch, message);

      await this.saveJSONS(batchDSU, indication);
      this.batch.keySSI = await batchDSU.getKeySSIAsString();

      await this.mappingLogService.logAndUpdateDb(message, this.batch, true, constants.LOG_TYPES.BATCH);

    } else {
      //it's saved on product
      const indication = {product: `${constants.PRODUCT_STORAGE_FILE}${message.messageTypeVersion}`};
      await this.loadJSONS(productDSU, indication);

      if (typeof this.product === "undefined") {
        this.product = JSON.parse(JSON.stringify(productMetadata));
      }

      prepareVideoSources(this.product, message);

      await this.saveJSONS(productDSU, indication);
      this.product.keySSI = await productDSU.getKeySSIAsString();
      await this.mappingLogService.logAndUpdateDb(message, this.product, true, constants.LOG_TYPES.PRODUCT)

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
