function verifyIfDeleteLeafletMessage(message) {
    return ["leaflet", "smpc"].includes(message.messageType)
        && Object.keys(message).some(key => ['productCode', 'batchCode'].includes(key))
        && typeof message.delete !== "undefined"
}

async function processDeleteLeafletMessage(message) {
    const leafletUtils = require("./leafletUtils");
    const logUtils = require("../../utils/LogUtils");
    this.mappingLogService = logUtils.createInstance(this.storageService, this.options.logService);
    const hostDSU = await leafletUtils.getHostDSU.call(this, message);
    let language = message.language;
    let type = message.messageType;
    let leafletDir = leafletUtils.getLeafletDirPath(type, language);

    try {
        await hostDSU.delete(leafletDir, {ignoreError: true});
    } catch (e) {
        console.log(e);
    }

    let logData = await this.mappingLogService.logSuccessAction(message, null, true);
}

require("opendsu").loadApi("m2dsu").defineMapping(verifyIfDeleteLeafletMessage, processDeleteLeafletMessage);
