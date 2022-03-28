function verifyIfLeafletMessage(message) {
  return ["leaflet", "smpc"].includes(message.messageType)
    && Object.keys(message).some(key => ['productCode', 'batchCode'].includes(key))
    && typeof message.delete === "undefined"
}

const acceptedFileExtensions = ["xml", "apng", "avif", "gif", "jpg", "jpeg", "jfif", "pjpeg", "pjp", "png", "svg", "webp", "bmp", "ico", "cur"];

async function processLeafletMessage(message) {
  const leafletUtils = require("./leafletUtils");
  const logUtils = require("../../utils/logsUtils");
  this.mappingLogService = logUtils.createInstance(this.storageService, this.options.logService);
  const hostDSU = await leafletUtils.getHostDSU.bind(this)(message);
  const constants = require("../../constants/constants");

  message.otherFilesContent.forEach(fileObj => {
    const splitFileName = fileObj.filename.split(".");
    const fileExtension = splitFileName[splitFileName.length - 1];
    const index = acceptedFileExtensions.findIndex(acceptedExtension => acceptedExtension === fileExtension);
    if (index === -1) {
      throw Error("Trying to upload an unsupported file format");
    }
  });
  let language = message.language;
  let type = message.messageType

  let basePath = `/${type}/${language}`
  let xmlFilePath = `${basePath}/${type}.xml`;
  let base64ToArrayBuffer = require("../../utils/commonUtils").base64ToArrayBuffer;
  let base64XMLFileContent = base64ToArrayBuffer(message.xmlFileContent);

  try {
    await hostDSU.writeFile(xmlFilePath, $$.Buffer.from(base64XMLFileContent));

    for (let i = 0; i < message.otherFilesContent.length; i++) {
      let file = message.otherFilesContent[i];
      let filePath = `${basePath}/${file.filename}`;
      await hostDSU.writeFile(filePath, $$.Buffer.from(base64ToArrayBuffer(file.fileContent)));
    }

    let logMessageObj = {
      action: message.messageType === "leaflet" ? "Updated Leaflet" : "Updated SMPC",
      mappingLogMessage: message.messageType === "leaflet" ? "updated leaflet" : "updated SMPC"
    }
    await this.mappingLogService.logAndUpdateDb(message, null, logMessageObj, constants.LOG_TYPES.LEAFLET_LOG);

  } catch (e) {
    console.log("Error writing files in DSU", e);
  }
}

require("opendsu").loadApi("m2dsu").defineMapping(verifyIfLeafletMessage, processLeafletMessage);
