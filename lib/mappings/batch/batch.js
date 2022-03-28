const utils = require("../../utils/commonUtils");
const schemaUtils = require("../../utils/schemaUtils");
const constants = require("../../constants/constants.js");
const batchUtils = require("./batchUtils");
const ModelMessageService = require('../../services/ModelMessageService');
const logUtils = require("../../utils/logsUtils");
const schema = require("./batchSchema");

function verifyIfBatchMessage(message) {
  return message.messageType === "Batch";
}

async function processBatchMessage(message) {

  this.mappingLogService = logUtils.createInstance(this.storageService, this.options.logService);

  await schemaUtils.validateMessage.bind(this)(message, schema);

  const batchId = message.batch.batch;
  const productCode = message.batch.productCode;

  const {
    batchConstDSU,
    batchDSU,
    batchMetadata,
    productMetadata,
    alreadyExists,
    gtinSSI
  } = await batchUtils.getBatchDSU.bind(this)(productCode, batchId, true);

  const indication = {batch: `${constants.BATCH_STORAGE_FILE}`};

  await this.loadJSONS(batchDSU, indication);

  if (typeof this.batch === "undefined") {
    this.batch = JSON.parse(JSON.stringify(batchMetadata));
  }

  this.batch = ModelMessageService.getModelFromMessage(message.batch, "batch");

  this.batch.product = productMetadata.keySSI;
  this.batch.productName = productMetadata.name;
  this.batch.productDescription = productMetadata.description;
  this.batch.creationTime = utils.convertDateTOGMTFormat(new Date());
  this.batch.msessageTime = message.messageDateTime;

  if (!this.batch.bloomFilterSerialisations) {
    this.batch.bloomFilterSerialisations = [];
  }

  manageSerialNumbers(this.batch);

  this.batch.version = batchMetadata.version ? batchMetadata.version + 1 : 1;
  const batchClone = JSON.parse(JSON.stringify(this.batch));

  delete this.batch.serialNumbers;
  delete this.batch.recalledSerialNumbers;
  delete this.batch.decommissionedSerialNumbers;

  this.batch.epiProtocol = constants.EPI_PROTOCOL_VERSION;

  await this.saveJSONS(batchDSU, indication);

  if (!alreadyExists) {
    batchDSU.getKeySSIAsString(async (err, batchKeySSI) => {
      if (err) {
        await this.mappingLogService.logFailedMapping(message, "internal error", "Database corrupted");
        throw new Error("get keySSIAsString  from batch DSU failed");
      }
      await batchConstDSU.mount(constants.BATCH_DSU_MOUNT_POINT, batchKeySSI);
    })

    let prodDSU = await this.loadDSU(productMetadata.keySSI);

    prodDSU.getKeySSIAsString(async (err, prodKeySSI) => {
      if (err) {
        await this.mappingLogService.logFailedMapping(message, "internal error", "Database corrupted");
        throw new Error("get keySSIAsString  from prod DSU failed");
      }
      await batchConstDSU.mount(constants.PRODUCT_DSU_MOUNT_POINT, prodKeySSI);
    })
  }

  this.batch.keySSI = await batchDSU.getKeySSIAsString();
  this.batch.consKeySSI = gtinSSI;
  batchClone.keySSI = this.batch.keySSI;

  await this.mappingLogService.logAndUpdateDb(message, batchClone, alreadyExists, constants.LOG_TYPES.BATCH)

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
