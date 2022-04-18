const errUtils = require("../errors/errorUtils");
const {base64ToArrayBuffer} = require("../../utils/CommonUtils");
const dbUtils = require("../../utils/DBUtils");


function verifyIfProductPhotoMessage(message) {
  return message.messageType === "ProductPhoto";
}

async function processProductPhotoMessage(message) {
  const productUtils = require("./productUtils");
  const LogUtils = require("../../utils/LogUtils");
  const constants = require("../../constants/constants");
  const errUtils = require("../errors/errorUtils");
  errUtils.addMappingError("PHOTO_MISSING_PRODUCT");
  const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();

  const productCode = message.productCode;
  this.mappingLogService = LogUtils.createInstance(this.storageService, this.options.logService);

  let previousVersionHasPhoto;
  try {
    const {
      constDSU,
      productDSU,
      productMetadata,
      alreadyExists
    } = await productUtils.getProductDSU.bind(this)(message, productCode);

    this.product = JSON.parse(JSON.stringify(productMetadata));

    let photoPath = `/image.png`
    let productPhotoStat = await productDSU.stat(photoPath);

    previousVersionHasPhoto = typeof productPhotoStat.type !== "undefined";

    await productDSU.writeFile(photoPath, $$.Buffer.from(base64ToArrayBuffer(message.imageData)));

  } catch (err) {
    throw errMap.newCustomError(errMap.errorTypes.PHOTO_MISSING_PRODUCT, "productCode");
  }

  let logData = await this.mappingLogService.logSuccessAction(message, this.product, previousVersionHasPhoto);
  await dbUtils.createOrUpdateRecord(this.storageService, logData, this.product);
}

require("opendsu").loadApi("m2dsu").defineMapping(verifyIfProductPhotoMessage, processProductPhotoMessage);
