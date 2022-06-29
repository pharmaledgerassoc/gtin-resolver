const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();

function getLeafletDirPath(type, language) {
    return `/${type}/${language}`;
}

function getLeafletPath(type, language) {
    return `${getLeafletDirPath(type, language)}/${type}.xml`;
}

module.exports = {
    getLeafletPath,
    getLeafletDirPath,
    getHostDSU: async function (message) {
        this.mappingLogService = require("../../utils/LogUtils").createInstance(this.storageService);

        let hostDSU;
        let errorType;
        let errorDetails;

        try {
            if (message.batchCode) {
                errorType = errMap.errorTypes.BATCH_DSU_LOAD_FAIL;
                errorDetails = `for batch ${message.batchCode}`;
                hostDSU = (await require("../batch/batchUtils").getBatchDSU.call(this, message, message.productCode, message.batchCode)).batchDSU;
            } else {
                errorType = errMap.errorTypes.PRODUCT_DSU_LOAD_FAIL;
                errorDetails = `for productCode ${message.productCode}`;
                hostDSU = (await require("../product/productUtils").getProductDSU.call(this, message, message.productCode)).productDSU;
            }
        } catch (err) {
            await this.mappingLogService.logFailAction(message, null, errorType.errMsg);
            throw errMap.newCustomError(errorType, errorDetails);
        }

        return hostDSU;
    }

}
