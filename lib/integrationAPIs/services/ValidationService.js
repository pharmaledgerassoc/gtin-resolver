
const {sanitize} = require("../../utils/htmlSanitize");
const errorUtils = require("../../mappings/errors/errorUtils");
const leafletUtils = require("../../mappings/leaflet/leafletUtils");
const XMLDisplayService = require("../../services/XMLDisplayService/XMLDisplayService");

function ValidationService(){
  this.validateProductMessage = async function validateProductMessage(payload){
    const schema = require("../../mappings/product/productSchema.js");
    const validationUtils = require("../../utils/ValidationUtils.js");
    await validationUtils.validateMessageOnSchema(payload, schema);
    await validationUtils.validateMVP1Values(payload, "product");
  }

  this.validateBatchMessage = async function validateBatchMessage(payload){
    const schema = require("../../mappings/batch/batchSchema.js");
    const validationUtils = require("../../utils/ValidationUtils.js");
    await validationUtils.validateMessageOnSchema(payload, schema);
    await validationUtils.validateMVP1Values(payload, "product");
  }

  this.validatePhotoMessage = async function validatePhotoMessage(payload){
    const schema = require("../../mappings/product/productPhoto.js");
    const validationUtils = require("../../utils/ValidationUtils.js");
    await validationUtils.validateMessageOnSchema(payload, schema);
  }

  this.validateLeafletMessage = async function validateLeafletMessage(domain, payload){
    const schema = require("../../mappings/leaflet/leafletSchema.js");
    const validationUtils = require("../../utils/ValidationUtils.js");
    await validationUtils.validateMessageOnSchema(payload, schema);
    const leafletUtils = require("../../mappings/leaflet/leafletUtils");

    const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();

    let {language, messageType:type, productCode:gtin} = payload;

    if (type === "smpc") {
      errorUtils.addMappingError("MVP1_RESTRICTED");
      throw errMap.newCustomError(errMap.errorTypes.MVP1_RESTRICTED, "smpc");
    }

    let base64XMLFileContent = payload.xmlFileContent;
    try {
      base64XMLFileContent = sanitize(base64XMLFileContent);
    } catch (e) {
      errorUtils.addMappingError("FILE_CONTAINS_FORBIDDEN_TAGS");
      throw errMap.newCustomError(errMap.errorTypes.FILE_CONTAINS_FORBIDDEN_TAGS, payload.messageType);
    }

    let leafletHtmlContent, htmlXMLContent;
    try {
      const XMLDisplayService = require("../../services/XMLDisplayService/XMLDisplayService.js");
      const simulatedModel = {networkName:domain, product:{gtin}};
      let xmlDisplayService = new XMLDisplayService(undefined, undefined, simulatedModel, type, undefined);

      //remove BOM-utf8 chars from the beginning of the xml
      if (base64XMLFileContent.substring(0, 4) === '77u/') {
        base64XMLFileContent = base64XMLFileContent.substring(4)
      }
      htmlXMLContent = xmlDisplayService.getHTMLFromXML("", atob(base64XMLFileContent));

      leafletHtmlContent = xmlDisplayService.buildLeafletHTMLSections(htmlXMLContent);
    } catch (e) {
      console.log(e);
      leafletHtmlContent = null;
    }

    if (!leafletHtmlContent) {
      throw errMap.newCustomError(errMap.errorTypes.WRONG_XML_FORMAT, type);
    } else {
      let htmlImageNames = Array.from(htmlXMLContent.querySelectorAll("img")).map(img => img.getAttribute("src"))
      //removing from validation image src that are data URLs ("data:....")
      htmlImageNames = htmlImageNames.filter((imageSrc)=>{
        let dataUrlRegex = new RegExp(/^\s*data:([a-z]+\/[a-z]+(;[a-z\-]+\=[a-z\-]+)?)?(;base64)?,[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*$/i);
        if(!!imageSrc.match(dataUrlRegex) || imageSrc.startsWith("data:")){
          return false;
        }
        return true;
      });

      let uploadedImageNames = payload.otherFilesContent.map(fileObj => {
        return fileObj.filename
      })

      let missingImgFiles = [];
      htmlImageNames.forEach(htmlImgName => {
        let differentImg = uploadedImageNames.find((item) => item.toLowerCase() === htmlImgName.toLowerCase())

        if (!differentImg) {
          missingImgFiles.push({
            field: htmlImgName,
            message: `does not exist`
          });
        }
      })
      if (missingImgFiles.length > 0) {
        payload.invalidFields = missingImgFiles;
        throw errMap.newCustomError(errMap.errorTypes.WRONG_XML_IMG_SRC_TO_FILES_MAPPING, missingImgFiles);
      }
    }

  }

/*  this.validateLeafletDeleteMessage = async function validateLeafletDeleteMessage(payload){
    const schema = require("../../mappings/leaflet/leafletDeleteSchema.js");
    const validationUtils = require("../../utils/ValidationUtils.js");
    await validationUtils.validateMessageOnSchema(payload, schema);
  }*/

  this.validateLeafletDeleteMessage = async function validateLeafletDeleteMessage(payload){
    const schema = require("../../mappings/leaflet/leafletDeleteSchema.js");
    const validationUtils = require("../../utils/ValidationUtils.js");
    await validationUtils.validateMessageOnSchema(payload, schema);
    await validationUtils.validateMVP1Values(payload, "product");
  }

}


let serviceInstance;
function getInstance(){
  if(!serviceInstance){
    serviceInstance = new ValidationService();
  }
  return serviceInstance;
}

module.exports = {
  getInstance
};