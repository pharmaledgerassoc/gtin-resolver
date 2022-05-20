const errorUtils = require("../errors/errorUtils");

function verifyIfLeafletMessage(message) {
  return ["leaflet", "smpc"].includes(message.messageType)
    && Object.keys(message).some(key => ['productCode', 'batchCode'].includes(key))
    && typeof message.delete === "undefined"
}

const acceptedFileExtensions = ["xml", "apng", "avif", "gif", "jpg", "jpeg", "jfif", "pjpeg", "pjp", "png", "svg", "webp", "bmp", "ico", "cur"];

async function processLeafletMessage(message) {
  const leafletUtils = require("./leafletUtils");
  const logUtils = require("../../utils/LogUtils");
  this.mappingLogService = logUtils.createInstance(this.storageService, this.options.logService);
  const hostDSU = await leafletUtils.getHostDSU.bind(this)(message);
  const constants = require("../../constants/constants");
  const dbUtils = require("../../utils/DBUtils");

  message.otherFilesContent.forEach(fileObj => {
    const splitFileName = fileObj.filename.split(".");
    const fileExtension = splitFileName[splitFileName.length - 1];
    const index = acceptedFileExtensions.findIndex(acceptedExtension => acceptedExtension === fileExtension);
    if (index === -1) {
      const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();
      const errorUtils = require("../errors/errorUtils");
      errorUtils.addMappingError("UNSUPPORTED_FILE_FORMAT");
      throw errMap.newCustomError(errMap.errorTypes.UNSUPPORTED_FILE_FORMAT, message.messageType);
    }
  });
  let language = message.language;
  let type = message.messageType

  let basePath = `/${type}/${language}`
  let xmlFilePath = `${basePath}/${type}.xml`;
  let base64ToArrayBuffer = require("../../utils/CommonUtils").base64ToArrayBuffer;
  let base64XMLFileContent = base64ToArrayBuffer(message.xmlFileContent);

  try {
    await hostDSU.writeFile(xmlFilePath, $$.Buffer.from(base64XMLFileContent));

    for (let i = 0; i < message.otherFilesContent.length; i++) {
      let file = message.otherFilesContent[i];
      let filePath = `${basePath}/${file.filename}`;
      await hostDSU.writeFile(filePath, $$.Buffer.from(base64ToArrayBuffer(file.fileContent)));
    }

    let logData = await this.mappingLogService.logSuccessAction(message, null, true);

  } catch (e) {
    console.log("Error writing files in DSU", e);
  }
}

require("opendsu").loadApi("m2dsu").defineMapping(verifyIfLeafletMessage, processLeafletMessage);
