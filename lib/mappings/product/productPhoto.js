const errUtils = require("../errors/errorUtils");
const {base64ToArrayBuffer} = require("../../utils/commonUtils");


function verifyIfProductPhotoMessage(message) {
  return message.messageType === "ProductPhoto";
}

async function processProductPhotoMessage(message) {
  const productUtils = require("./productUtils");
  const logsUtils = require("../../utils/logsUtils");
  const constants = require("../../constants/constants");
  const errUtils = require("../errors/errorUtils");
  errUtils.addMappingError("PHOTO_MISSING_PRODUCT");
  const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();

  const productCode = message.productCode;
  this.mappingLogService = logsUtils.createInstance(this.storageService, this.options.logService);

  let previousVersionHasPhoto;
  try {
    const {
      constDSU,
      productDSU,
      productMetadata,
      alreadyExists
    } = await productUtils.getProductDSU.bind(this)(productCode);

    this.product = JSON.parse(JSON.stringify(productMetadata));

    let photoPath = `/image.png`
    let productPhotoStat = await productDSU.stat(photoPath);

    previousVersionHasPhoto = typeof productPhotoStat.type !== "undefined";

    await productDSU.writeFile(photoPath, $$.Buffer.from(base64ToArrayBuffer(message.imageData)));

  } catch (err) {
    throw errMap.newCustomError(errMap.errorTypes.PHOTO_MISSING_PRODUCT, "productCode");
  }
  await this.mappingLogService.logAndUpdateDb.bind(this)(message, this.product, previousVersionHasPhoto, constants.LOG_TYPES.PROD_PHOTO);
}

require("opendsu").loadApi("m2dsu").defineMapping(verifyIfProductPhotoMessage, processProductPhotoMessage);
