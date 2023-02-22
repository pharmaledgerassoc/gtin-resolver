const utils = require("../utils");
const validationUtils = require("../../utils/ValidationUtils");
const schema = require("../leaflet/leafletDeleteSchema");
const constants = require("../../constants/constants");
const productUtils = require("./productUtils");
function verifyIfProductPhotoMessage(message) {
  return message.messageType === "ProductPhoto";
}

async function processProductPhotoMessage(message) {
  const schema = require("./productPhotoSchema");
  const validationUtils = require("../../utils/ValidationUtils");
  const productUtils = require("./productUtils");
  const LogUtils = require("../../utils/LogUtils");
  const constants = require("../../constants/constants");
  const errUtils = require("../errors/errorUtils");
  const {sanitize} = require("../../utils/htmlSanitize");

  errUtils.addMappingError("PHOTO_MISSING_PRODUCT");
  const {base64ToArrayBuffer, bytesToBase64} = require("../../utils/CommonUtils");
  const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();

  await validationUtils.validateMessageOnSchema.call(this, message, schema);

  try{
    message.imageData = sanitize(message.imageData);
  }catch (e) {
    errUtils.addMappingError("FILE_CONTAINS_FORBIDDEN_TAGS");
    throw errMap.newCustomError(errMap.errorTypes.FILE_CONTAINS_FORBIDDEN_TAGS, message.messageType);
  }

  const productCode = message.productCode;
  this.mappingLogService = LogUtils.createInstance(this.storageService, this.options.logService);



  let previousVersionHasPhoto, oldValue;
  try {
    const {
      constDSU,
      productDSU,
      alreadyExists
    } = await productUtils.getProductDSU.call(this, message, productCode);

    let productMetadata = await productUtils.getProductMetadata.call(this, message, productCode, alreadyExists);
    this.product = JSON.parse(JSON.stringify(productMetadata));

    const indication = require("../utils").getProductJSONIndication(message);
    indication.dsuProduct = indication.product;
    delete indication.product;
    await this.loadJSONS(productDSU, indication);

    let photoPath = constants.PRODUCT_IMAGE_FILE;
    let productPhotoStat = await productDSU.stat(photoPath);

    previousVersionHasPhoto = typeof productPhotoStat.type !== "undefined";
    try {
      oldValue = bytesToBase64(await productDSU.readFile(photoPath));
    } catch (e) {
      oldValue = "no photo";
    }

    this.product.version = await require("./../utils").getNextVersion(productDSU.getCreationSSI());
    this.dsuProduct.version = this.product.version;
    await this.saveJSONS(productDSU, indication);

    await productDSU.writeFile(photoPath, $$.Buffer.from(base64ToArrayBuffer(message.imageData)));
    let diffs = {oldValue: oldValue, newValue: message.imageData};
    await $$.promisify(this.storageService.updateRecord, this.storageService)(constants.PRODUCTS_TABLE, this.product.pk, this.product);
    let logData = await this.mappingLogService.logSuccessAction(message, this.product, previousVersionHasPhoto, diffs, productDSU);
    const dbUtils = require("../../utils/DBUtils");
    await dbUtils.createOrUpdateRecord(this.storageService, logData, this.product);
  } catch (err) {
    throw errMap.newCustomError(errMap.errorTypes.PHOTO_MISSING_PRODUCT, "productCode");
  }

}

require("opendsu").loadApi("m2dsu").defineMapping(verifyIfProductPhotoMessage, processProductPhotoMessage);
