const {sanitize} = require("../../utils/htmlSanitize");
const errorUtils = require("../../mappings/errors/errorUtils");
const validationUtils = require("../../utils/ValidationUtils");
const sax = require("../../saxjs/sax");
const schema = require("../schemas/AuditUserActionSchema");
const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();

function ValidationService() {
    this.validateProductMessage = async function validateProductMessage(payload) {
        const schema = require("../../mappings/product/productSchema.js");
        await validationUtils.validateMessageOnSchema(payload, schema);
        let gtinValidation = validationUtils.validateGTIN(payload.payload.productCode);
        if (!gtinValidation.isValid) {
            throw new Error(gtinValidation.message);
        }
        //await validationUtils.validateMVP1Values(payload, "product");
    }

    this.validateBatchMessage = async function validateBatchMessage(payload) {
        const schema = require("../../mappings/batch/batchSchema.js");
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
            return (imageBuffer.toString('hex', 0, 2) === '8950' || // PNG header
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
        await validationUtils.validateMessageOnSchema(payload, schema);
        let gtinValidation = validationUtils.validateGTIN(payload.payload.productCode);
        if (!gtinValidation.isValid) {
            throw new Error(gtinValidation.message);
        }
        let imageData = payload.payload.imageData;
        if (!(imageData.startsWith('data:image/jpeg;base64,') || imageData.startsWith('data:image/png;base64,') || imageData.startsWith('data:image/gif;base64,')) || !isValidImageBase64(imageData)) {
            throw new Error("Invalid base64 image");
        }
    }

    let validateXMLAndGetImageNames = async function (base64XMLFileContent) {
        return new Promise((resolve, reject) => {
            let xmlString = atob(base64XMLFileContent);
            let xmlImages = [];
            // Create a SAX parser
            const parser = sax.parser(true);
            // Function to handle errors
            parser.onerror = function () {
                this.resume();
                //Removed due to porse embeded image can throw error
                // reject(errMap.newCustomError(errMap.errorTypes.WRONG_XML_FORMAT));
            };
            let isFirstRootNode = true;
            let isValidXML = false;
            // Variables to track XML structure
            let openTags = []; // Stack to track open tags
            parser.onopentag = function (node) {
                openTags.push(node.name);
                if (isFirstRootNode && node.name === 'root') {
                    isValidXML = true;
                }
                if (node.name === 'document') {
                    if (node.attributes.type && node.attributes.type.startsWith("pharmaledger-")) {
                        isValidXML = true;
                    } else if (node.attributes["xsi:schemaLocation"] && node.attributes["xsi:schemaLocation"].includes("www.accessdata.fda.gov/spl/schema/spl.xsd")) {
                        isValidXML = true;
                    }
                }
                if (node.name === "img") {
                    if (node.attributes.src && !node.attributes.src.startsWith("data:")) {
                        xmlImages.push(node.attributes.src)
                    }
                }
                if (node.name === "reference") {
                    if (node.attributes.value && !node.attributes.value.startsWith("data:")) {
                        xmlImages.push(node.attributes.value)
                    }
                }
            }

            parser.onclosetag = function (tagName) {
                // Pop the top tag from the stack
                const lastOpenTag = openTags.pop();

                // Check if the closing tag matches the last open tag
                if (lastOpenTag !== tagName) {
                    reject(errMap.newCustomError(errMap.errorTypes.WRONG_XML_FORMAT));
                }
            };

            parser.onend = function () {
                if (isValidXML) {
                    resolve(xmlImages);
                } else {
                    reject(errMap.newCustomError(errMap.errorTypes.WRONG_XML_FORMAT));
                }
            };
            parser.write(xmlString).close();
        })
    }

    let healDifferentCaseImgFiles = function (xmlImageNames, leafletMessage) {
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
        await validationUtils.validateMessageOnSchema(leafletMessage, schema);
        let gtinValidation = validationUtils.validateGTIN(leafletMessage.payload.productCode);
        if (!gtinValidation.isValid) {
            throw new Error(gtinValidation.message);
        }

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

        let xmlImageNames = await validateXMLAndGetImageNames(base64XMLFileContent);
        if (xmlImageNames && xmlImageNames.length > 0) {
            let uploadedImageNames = leafletMessage.payload.otherFilesContent.map(fileObj => {
                return fileObj.filename
            })

            let missingImgFiles = [];
            xmlImageNames.forEach(htmlImgName => {
                let differentImg = uploadedImageNames.find((item) => item.toLowerCase() === htmlImgName.toLowerCase())

                if (!differentImg) {
                    missingImgFiles.push({
                        field: htmlImgName, message: `does not exist`
                    });
                }
            })
            if (missingImgFiles.length > 0) {
                leafletMessage.invalidFields = missingImgFiles;
                throw errMap.newCustomError(errMap.errorTypes.WRONG_XML_IMG_SRC_TO_FILES_MAPPING, missingImgFiles);
            }

            healDifferentCaseImgFiles(xmlImageNames, leafletMessage);
        }
        return base64XMLFileContent;
    }

    /*  this.validateLeafletDeleteMessage = async function validateLeafletDeleteMessage(payload){
        const schema = require("../../mappings/leaflet/leafletDeleteSchema.js");
        const validationUtils = require("../../utils/ValidationUtils.js");
        await validationUtils.validateMessageOnSchema(payload, schema);
      }*/

    this.validateLeafletDeleteMessage = async function validateLeafletDeleteMessage(payload) {
        const schema = require("../../mappings/leaflet/leafletDeleteSchema.js");
        await validationUtils.validateMessageOnSchema(payload, schema);
        // await validationUtils.validateMVP1Values(payload, "product");
    }

    this.validateAuditUserActionMessage = async function validateAuditMessage(payload) {
        const schema = require("../schemas/AuditUserActionSchema.js");
        await validationUtils.validateMessageOnSchema(payload, schema);
    }
    this.validateAuditDemiurgeUserActionMessage = async function validateAuditMessage(payload) {
        const schema = require("../schemas/AuditDemiurgeUserActionSchema.js");
        await validationUtils.validateMessageOnSchema(payload, schema);
    }
    this.validateAuditUserAccessMessage = async function validateAuditMessage(payload) {
        const schema = require("../schemas/AuditUserAccessSchema.js");
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
