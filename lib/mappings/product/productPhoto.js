const productUtils = require("./productUtils");

function verifyIfProductPhotoMessage(message) {
    return message.messageType === "ProductPhoto";
}

async function processProductPhotoMessage(message) {
    const productUtils = require("./productUtils");
    const LogUtils = require("../../utils/LogUtils");
    const constants = require("../../constants/constants");
    const errUtils = require("../errors/errorUtils");
    errUtils.addMappingError("PHOTO_MISSING_PRODUCT");
    const {base64ToArrayBuffer} = require("../../utils/CommonUtils");
    const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();

    const productCode = message.productCode;
    this.mappingLogService = LogUtils.createInstance(this.storageService, this.options.logService);

    let previousVersionHasPhoto;
    try {
        const {
            constDSU,
            productDSU,
            alreadyExists
        } = await productUtils.getProductDSU.call(this, message, productCode);

        let productMetadata = await productUtils.getProductMetadata.call(this, message, productCode, alreadyExists);

        this.product = JSON.parse(JSON.stringify(productMetadata));

        let photoPath = constants.PRODUCT_IMAGE_FILE;
        let productPhotoStat = await productDSU.stat(photoPath);

        previousVersionHasPhoto = typeof productPhotoStat.type !== "undefined";

        await productDSU.writeFile(photoPath, $$.Buffer.from(base64ToArrayBuffer(message.imageData)));

    } catch (err) {
        throw errMap.newCustomError(errMap.errorTypes.PHOTO_MISSING_PRODUCT, "productCode");
    }

    let logData = await this.mappingLogService.logSuccessAction(message, this.product, previousVersionHasPhoto);
    const dbUtils = require("../../utils/DBUtils");
    await dbUtils.createOrUpdateRecord(this.storageService, logData, this.product);
}

require("opendsu").loadApi("m2dsu").defineMapping(verifyIfProductPhotoMessage, processProductPhotoMessage);
