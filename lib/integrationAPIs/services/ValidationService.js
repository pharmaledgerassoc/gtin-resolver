const {sanitize} = require("../../utils/htmlSanitize");
const errorUtils = require("../../mappings/errors/errorUtils");
const leafletUtils = require("../../mappings/leaflet/leafletUtils");
const XMLDisplayService = require("../../services/XMLDisplayService/XMLDisplayService");
const validationUtils = require("../../utils/ValidationUtils");
const schema = require("../../mappings/leaflet/leafletDeleteSchema");

function ValidationService() {
    this.validateProductMessage = async function validateProductMessage(payload) {
        const schema = require("../../mappings/product/productSchema.js");
        const validationUtils = require("../../utils/ValidationUtils.js");
        await validationUtils.validateMessageOnSchema(payload, schema);
        let gtinValidation = validationUtils.validateGTIN(payload.payload.productCode);
        if (!gtinValidation.isValid) {
            throw new Error(gtinValidation.message);
        }
        //await validationUtils.validateMVP1Values(payload, "product");
    }

    this.validateBatchMessage = async function validateBatchMessage(payload) {
        const schema = require("../../mappings/batch/batchSchema.js");
        const validationUtils = require("../../utils/ValidationUtils.js");
        await validationUtils.validateMessageOnSchema(payload, schema);
        let gtinValidation = validationUtils.validateGTIN(payload.payload.productCode);
        if (!gtinValidation.isValid) {
            throw new Error(gtinValidation.message);
        }
        // await validationUtils.validateMVP1Values(payload, "product");
    }
    let isValidImageBase64 = function (base64String) {
        const fs = require('fs');
        const path = require('path');
        const imageData = base64String.split(';base64,').pop();

        // Generate a random file name with .png extension
        const tempFilePath = path.join(__dirname, 'temp_image.png');

        try {
            // Write the Base64 data to a temporary file
            fs.writeFileSync(tempFilePath, imageData, 'base64');

            // Read the temporary file to verify if it's a valid image
            const imageBuffer = fs.readFileSync(tempFilePath);
            // Check if the file starts with the expected image headers
            return (
                imageBuffer.toString('hex', 0, 2) === '8950' || // PNG header
                imageBuffer.toString('hex', 0, 2) === 'ffd8' || // JPEG header
                imageBuffer.toString('hex', 0, 6) === '474946')   // GIF header
        } catch (error) {
            return false; // Return false if any error occurs
        } finally {
            // Cleanup: Delete the temporary file
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
        }
    }
    this.validatePhotoMessage = async function validatePhotoMessage(payload) {
        const schema = require("../../mappings/product/productPhotoSchema.js");
        const validationUtils = require("../../utils/ValidationUtils.js");
        await validationUtils.validateMessageOnSchema(payload, schema);
        let gtinValidation = validationUtils.validateGTIN(payload.payload.productCode);
        if (!gtinValidation.isValid) {
            throw new Error(gtinValidation.message);
        }
        let imageData = payload.payload.imageData;
        if (!(imageData.startsWith('data:image/jpeg;base64,') ||
            imageData.startsWith('data:image/png;base64,') ||
            imageData.startsWith('data:image/gif;base64,')) || !isValidImageBase64(imageData)) {
            throw new Error("Invalid base64 image");
        }
    }

    let getImageNamesFromXml = function (base64XMLFileContent) {
        let xml = atob(base64XMLFileContent);
        const lines = xml.split('\n').filter(line => line.trim() !== '');
        let xmlImages = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Search for 'mediaType="image/"' in the line
            if (line.includes('mediaType="image/')) {
                let imgSrc = lines[i + 1].substring(lines[i + 1].indexOf('value="') + 7);
                if (!imgSrc.startsWith("data:")) {
                    xmlImages.push(imgSrc.substring(0, imgSrc.indexOf('"')))
                }
            }

            // Search for '<img src=' in the line
            if (line.includes('<img src=')) {
                let imgSrc = line.substring(line.indexOf('src="') + 5);
                if (!imgSrc.startsWith("data:")) {
                    xmlImages.push(imgSrc.substring(0, imgSrc.indexOf('"')))
                }
            }
        }
        return xmlImages;
    }

    let healDifferentCaseImgFiles = function (base64XMLFileContent, leafletMessage) {
        let xmlImageNames = getImageNamesFromXml(base64XMLFileContent);

        let uploadedImageNames = leafletMessage.payload.otherFilesContent.map(fileObj => {
            return fileObj.filename
        })

        let differentCaseImgFiles = [];
        xmlImageNames.forEach(xmlImgName => {
            let differentImg = uploadedImageNames.find((item) => item.toLowerCase() === xmlImgName.toLowerCase())
            if (differentImg) {
                if (xmlImgName !== differentImg) {
                    differentCaseImgFiles.push(xmlImgName)
                }
            }
        });

        for (let i = 0; i < leafletMessage.payload.otherFilesContent.length; i++) {
            let differentCaseFileName = differentCaseImgFiles.find(item => leafletMessage.payload.otherFilesContent[i].filename.toLowerCase() === item.toLowerCase());
            if (differentCaseFileName) {
                leafletMessage.payload.otherFilesContent[i].filename = differentCaseFileName;
            }
        }
    }

    this.validateLeafletMessage = async function validateLeafletMessage(leafletMessage) {
        const schema = require("../../mappings/leaflet/leafletSchema.js");
        const validationUtils = require("../../utils/ValidationUtils.js");
        await validationUtils.validateMessageOnSchema(leafletMessage, schema);
        let gtinValidation = validationUtils.validateGTIN(leafletMessage.payload.productCode);
        if (!gtinValidation.isValid) {
            throw new Error(gtinValidation.message);
        }

        const leafletUtils = require("../../mappings/leaflet/leafletUtils");

        const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();

        if (leafletMessage.messageType === "smpc") {
            errorUtils.addMappingError("MVP1_RESTRICTED");
            throw errMap.newCustomError(errMap.errorTypes.MVP1_RESTRICTED, "smpc");
        }

        let base64XMLFileContent = leafletMessage.payload.xmlFileContent;
        try {
            base64XMLFileContent = sanitize(base64XMLFileContent);
        } catch (e) {
            errorUtils.addMappingError("FILE_CONTAINS_FORBIDDEN_TAGS");
            throw errMap.newCustomError(errMap.errorTypes.FILE_CONTAINS_FORBIDDEN_TAGS, leafletMessage.messageType);
        }
        //remove BOM-utf8 chars from the beginning of the xml
        if (base64XMLFileContent.substring(0, 4) === '77u/') {
            base64XMLFileContent = base64XMLFileContent.substring(4)
        }

        let xmlImageNames = getImageNamesFromXml(base64XMLFileContent);

        let uploadedImageNames = leafletMessage.payload.otherFilesContent.map(fileObj => {
            return fileObj.filename
        })

        let missingImgFiles = [];
        xmlImageNames.forEach(htmlImgName => {
            let differentImg = uploadedImageNames.find((item) => item.toLowerCase() === htmlImgName.toLowerCase())

            if (!differentImg) {
                missingImgFiles.push({
                    field: htmlImgName,
                    message: `does not exist`
                });
            }
        })
        if (missingImgFiles.length > 0) {
            leafletMessage.invalidFields = missingImgFiles;
            throw errMap.newCustomError(errMap.errorTypes.WRONG_XML_IMG_SRC_TO_FILES_MAPPING, missingImgFiles);
        }
        healDifferentCaseImgFiles(base64XMLFileContent, leafletMessage);
        return base64XMLFileContent;
    }

    /*  this.validateLeafletDeleteMessage = async function validateLeafletDeleteMessage(payload){
        const schema = require("../../mappings/leaflet/leafletDeleteSchema.js");
        const validationUtils = require("../../utils/ValidationUtils.js");
        await validationUtils.validateMessageOnSchema(payload, schema);
      }*/

    this.validateLeafletDeleteMessage = async function validateLeafletDeleteMessage(payload) {
        const schema = require("../../mappings/leaflet/leafletDeleteSchema.js");
        const validationUtils = require("../../utils/ValidationUtils.js");
        await validationUtils.validateMessageOnSchema(payload, schema);
        // await validationUtils.validateMVP1Values(payload, "product");
    }

    this.validateAuditUserActionMessage = async function validateAuditMessage(payload) {
        const schema = require("../schemas/AuditUserActionSchema.js");
        const validationUtils = require("../../utils/ValidationUtils.js");
        await validationUtils.validateMessageOnSchema(payload, schema);
    }

    this.validateAuditUserAccessMessage = async function validateAuditMessage(payload) {
        const schema = require("../schemas/AuditUserAccessSchema.js");
        const validationUtils = require("../../utils/ValidationUtils.js");
        await validationUtils.validateMessageOnSchema(payload, schema);
    }

}


let serviceInstance;

function getInstance() {
    if (!serviceInstance) {
        serviceInstance = new ValidationService();
    }
    return serviceInstance;
}

module.exports = {
    getInstance
};
