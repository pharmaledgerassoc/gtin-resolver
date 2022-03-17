function verifyIfDeleteLeafletMessage(message) {
  return ["leaflet", "smpc"].includes(message.messageType)
    && Object.keys(message).some(key => ['productCode', 'batchCode'].includes(key))
    && typeof message.delete !== "undefined"
}

async function processDeleteLeafletMessage(message) {
  const leafletUtils = require("./leafletUtils");
  const logUtils = require("../../utils/logsUtils");
  this.mappingLogService = logUtils.createInstance(this.storageService, this.options.logService);
  const constants = require("../../constants");
  const hostDSU = await leafletUtils.getHostDSU.bind(this)(message);
  let language = message.language;
  let type = message.messageType;
  let basePath = `/${type}/${language}`

  try {
    await hostDSU.delete(basePath, {ignoreError: true});
  } catch (e) {
    console.log(e);
  }
  let logMessageObj = {
    action: message.messageType === "leaflet" ? "Deleted Leaflet" : "Deleted SMPC",
    mappingLogMessage: message.messageType === "leaflet" ? "deleted leaflet" : "deleted SMPC"
  }
  await this.mappingLogService.logAndUpdateDb(message, null, logMessageObj, constants.LOG_TYPES.LEAFLET_LOG);
}

require("opendsu").loadApi("m2dsu").defineMapping(verifyIfDeleteLeafletMessage, processDeleteLeafletMessage);
