const utils = require("../../utils/CommonUtils");
const validationUtils = require("../../utils/ValidationUtils");
const constants = require("../../constants/constants.js");
const batchUtils = require("./batchUtils");
const ModelMessageService = require('../../services/ModelMessageService');
const logUtils = require("../../utils/LogUtils");
const schema = require("./batchSchema");
const dbUtils = require("../../utils/DBUtils");
const productUtils = require("../product/productUtils");

function verifyIfBatchMessage(message) {
  return message.messageType === "Batch";
}

async function processBatchMessage(message) {

  this.mappingLogService = logUtils.createInstance(this.storageService, this.options.logService);

  await validationUtils.validateMessageOnSchema.call(this, message, schema);

  const batchId = message.batch.batch;
  const productCode = message.batch.productCode;

  const {
    batchDSU,
    alreadyExists,
    gtinSSI
  } = await batchUtils.getBatchDSU.call(this, message, productCode, batchId, true);

  let batchMetadata = await batchUtils.getBatchMetadata.call(this, message, batchId, alreadyExists);

  /*
* extension of the file will contain epi version. Used format is epi_+epiVersion;
* Ex: for version 1 - batch.epi_v1
*  */
  const indication = {batch: `${constants.BATCH_STORAGE_FILE}${message.messageTypeVersion}`};

  await this.loadJSONS(batchDSU, indication);

  if (typeof this.batch === "undefined") {
    this.batch = JSON.parse(JSON.stringify(batchMetadata));
  }

  let modelMsgService = new ModelMessageService("batch");
  //this line is similar to Object.assign, we try to get all the props from the message and assign to our batch model
  this.batch = {...this.batch, ...modelMsgService.getModelFromMessage(message.batch)};

  let {productDSU} = await productUtils.getProductDSU.call(this, message, productCode);

  const productIndication = {product: `${constants.PRODUCT_STORAGE_FILE}${message.messageTypeVersion}`};

  await this.loadJSONS(productDSU, productIndication);

  this.batch.productName = this.product.name;
  this.batch.productDescription = this.product.description;
  let diffs = this.mappingLogService.getDiffsForAudit(this.batch, batchMetadata);

  if (this.batch.creationTime) {
    this.batch.creationTime = utils.convertDateTOGMTFormat(new Date());
  }

  this.batch.messageTime = message.messageDateTime;

  if (!this.batch.bloomFilterSerialisations) {
    this.batch.bloomFilterSerialisations = [];
  }

  manageSerialNumbers(this.batch);

  this.batch.version = batchMetadata.version ? batchMetadata.version + 1 : 1;
  const batchClone = JSON.parse(JSON.stringify(this.batch));

  //we delete the arrays because they contain sensitive serial numbers, and we don't want them stored in "clear" in DSU.
  delete this.batch.serialNumbers;
  delete this.batch.recalledSerialNumbers;
  delete this.batch.decommissionedSerialNumbers;

  this.batch.epiProtocol = `v${message.messageTypeVersion}`;

  await this.saveJSONS(batchDSU, indication);
  let logData = await this.mappingLogService.logSuccessAction(message, this.batch, alreadyExists, diffs, batchDSU);

  //from this line all the modifications will be only in sharedDB and not DSU

  // this.batch.keySSI = await batchDSU.getKeySSIAsString();

  this.batch.consKeySSI = gtinSSI;
  batchClone.keySSI = this.batch.keySSI;

  await dbUtils.createOrUpdateRecord(this.storageService, logData, batchClone);
}

function removeAllBloomFiltersOfType(bfList, type) {
  return bfList.filter((bfObj) => bfObj.type !== type);
}

function manageSerialNumbers(batch) {

  if (batch.snValidReset) {
    batch.bloomFilterSerialisations = removeAllBloomFiltersOfType(batch.bloomFilterSerialisations, constants.VALID_SERIAL_NUMBER_TYPE)
    batch.defaultSerialNumber = "";
    batch.snValidReset = false;
  }

  if (batch.snRecalledReset) {
    batch.bloomFilterSerialisations = removeAllBloomFiltersOfType(batch.bloomFilterSerialisations, constants.RECALLED_SERIAL_NUMBER_TYPE)
    batch.defaultRecalledSerialNumber = "";
    batch.snRecalledReset = false;
  }

  if (batch.snDecomReset) {
    batch.bloomFilterSerialisations = removeAllBloomFiltersOfType(batch.bloomFilterSerialisations, constants.DECOMMISSIONED_SERIAL_NUMBER_TYPE)
    batch.defaultDecommissionedSerialNumber = "";
    batch.snDecomReset = false;
  }

  let bf;
  if (batch.serialNumbers && batch.serialNumbers.length > 0) {
    bf = utils.getBloomFilterSerialisation(batch.serialNumbers);
    // batch.bloomFilterSerialisations.push(bf.bloomFilterSerialisation());
    batch.bloomFilterSerialisations.push({
      serialisation: bf.bloomFilterSerialisation(),
      type: constants.VALID_SERIAL_NUMBER_TYPE
    });
    batch.defaultSerialNumber = batch.serialNumbers[0];
  }

  if (batch.recalledSerialNumbers && batch.recalledSerialNumbers.length > 0) {
    bf = utils.getBloomFilterSerialisation(batch.recalledSerialNumbers);
    // batch.bloomFilterRecalledSerialisations.push(bf.bloomFilterSerialisation());
    batch.bloomFilterSerialisations.push({
      serialisation: bf.bloomFilterSerialisation(),
      type: constants.RECALLED_SERIAL_NUMBER_TYPE
    });
    batch.defaultRecalledSerialNumber = batch.recalledSerialNumbers[0];
  }
  if (batch.decommissionedSerialNumbers && batch.decommissionedSerialNumbers.length > 0) {
    bf = utils.getBloomFilterSerialisation(batch.decommissionedSerialNumbers);
    // batch.bloomFilterDecommissionedSerialisations.push(bf.bloomFilterSerialisation());
    batch.bloomFilterSerialisations.push({
      serialisation: bf.bloomFilterSerialisation(),
      type: constants.DECOMMISSIONED_SERIAL_NUMBER_TYPE
    });
    batch.defaultDecommissionedSerialNumber = batch.decommissionedSerialNumbers[0];
  }
}

require("opendsu").loadApi("m2dsu").defineMapping(verifyIfBatchMessage, processBatchMessage);
