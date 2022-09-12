const utils = require("../utils");

function verifyIfDeleteLeafletMessage(message) {
  return ["leaflet", "smpc"].includes(message.messageType) && Object.keys(message).some(key => ['productCode', 'batchCode'].includes(key)) && typeof message.delete !== "undefined"
}

async function processDeleteLeafletMessage(message) {
  const leafletUtils = require("./leafletUtils");
  const logUtils = require("../../utils/LogUtils");
  this.mappingLogService = logUtils.createInstance(this.storageService, this.options.logService);

  let language = message.language;
  let type = message.messageType;
  let leafletDir = leafletUtils.getLeafletDirPath(type, language);

  const hostDSU = await leafletUtils.getHostDSU.call(this, message);
  let diffs = {"type": type, "language": language, "action": "deleted"};
  try {
    await hostDSU.delete(leafletDir, {ignoreError: true});
  } catch (e) {
    console.log(e);
  }

  let logData = await this.mappingLogService.logSuccessAction(message, null, true, null, diffs, hostDSU);
  await utils.increaseVersion(this, message);
}

require("opendsu").loadApi("m2dsu").defineMapping(verifyIfDeleteLeafletMessage, processDeleteLeafletMessage);
