const {EventRecorder, EVENTS} = require("../utils/Events");
const {sanitize} = require("../../utils/htmlSanitize");

function ModelBase(enclave, domain, subdomain, gtin) {
    let eventRecorder;
    this.getEventRecorderInstance = async () => {
        if (!eventRecorder) {
            let mutableDSU = await this.ensureDSUStructure();
            eventRecorder = new EventRecorder(mutableDSU);
        }
        return eventRecorder;
    }

    this.getGTINSSI = () => {
        throw new Error("Not implemented! Needs to be implemented in the wrapper class");
    }

    this.getLeafletStoragePath = () => {
        throw new Error("Not implemented! Needs to be implemented in the wrapper class");
    }

    this.getJSONStoragePath = () => {
        throw new Error("Not implemented! Needs to be implemented in the wrapper class");
    }

    this.getMutableMountingPoint = () => {
        throw new Error("Not implemented! Needs to be implemented in the wrapper class");
    }

    this.getPathOfPathSSI = () => {
        throw new Error("Not implemented! Needs to be implemented in the wrapper class");
    }

    let immutableDSU;
    this.loadImmutableDSUInstance = async () => {
        if (immutableDSU) {
            return immutableDSU;
        }
        const keySSI = this.getGTINSSI();
        return await this.loadDSUInstance(keySSI);
    }

    let pathKeySSI;
    this.getPathKeySSI = async () => {
        if (!pathKeySSI) {
            const {domain, path} = this.getPathOfPathSSI();
            pathKeySSI = await $$.promisify(enclave.createPathKeySSI)($$.SYSTEM_IDENTIFIER, domain, path);
        }
        return pathKeySSI;
    }
    this.getMutableSeedSSI = async () => {
        let pathKeySSI = await this.getPathKeySSI();
        const seedSSI = await $$.promisify(pathKeySSI.derive)();

        return seedSSI;
    }

    this.createImmutableDSUInstance = async () => {
        const keySSI = this.getGTINSSI();
        return this.createDSUInstanceForSSI(keySSI);
    }

    this.createMutableDSUInstance = async () => {
        const keySSI = await this.getMutableSeedSSI();
        return await this.createDSUInstanceForSSI(keySSI);
    }

    this.loadMutableDSUInstance = async () => {
        const keySSI = await this.getMutableSeedSSI();
        return await this.loadDSUInstance(keySSI);
    }

    this.loadDSUInstance = async (keySSI) => {
        const loadDSU = $$.promisify(enclave.loadDSU, enclave);
        let dsuInstance = await loadDSU($$.SYSTEM_IDENTIFIER, keySSI);
        return dsuInstance;
    }

    this.createDSUInstanceForSSI = async (keySSI) => {
        const createDSUForExistingSSI = $$.promisify(enclave.createDSUForExistingSSI, enclave);
        let dsuInstance = await createDSUForExistingSSI(keySSI);
        return dsuInstance;
    }

    this.ensureDSUStructure = async () => {
        let immutableDSU;
        try {
            immutableDSU = await this.loadImmutableDSUInstance();
        } catch (e) {
            //TODO: CODE-REVIEW - we should handle different the network errors in order to prevent any anchoring conflict, if possible
            immutableDSU = await this.createImmutableDSUInstance();
        }

        let mutableDSU;
        try {
            mutableDSU = await this.loadMutableDSUInstance();
            return mutableDSU;
        } catch (e) {
            //TODO: CODE-REVIEW - we should handle different the network errors in order to prevent any anchoring conflict, if possible
            mutableDSU = await this.createMutableDSUInstance();
        }

        let sreadSSI = await $$.promisify(mutableDSU.getKeySSIAsString)("sread");
        const mutableMountingPoint = this.getMutableMountingPoint();

        const batchNumber = await immutableDSU.startOrAttachBatchAsync();
        await $$.promisify(immutableDSU.mount)(mutableMountingPoint, sreadSSI);
        await immutableDSU.commitBatchAsync(batchNumber);

        return mutableDSU;
    }

    this.addEPI = async (leafletMessage) => {
        if (leafletMessage.action === "update") {
            await this.deleteEPI(leafletMessage.language);
        }

        let {messageType} = leafletMessage;
        let {language} = leafletMessage.payload;

        const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();
        let base64ToArrayBuffer = require("../../utils/CommonUtils").base64ToArrayBuffer;
        let base64XMLFileContent = leafletMessage.payload.xmlFileContent;
        base64XMLFileContent = sanitize(base64XMLFileContent);

        let leafletHtmlContent, htmlXMLContent;
        // TODO: Validate XML structure
        // try {
        //     const XMLDisplayService = require("../../services/XMLDisplayService/XMLDisplayService.js");
        //     const simulatedModel = {networkName: domain, product: {gtin}};
        //     let xmlDisplayService = new XMLDisplayService(undefined, undefined, simulatedModel, messageType, undefined);
        //
        //     //remove BOM-utf8 chars from the beginning of the xml
        //     if (base64XMLFileContent.substring(0, 4) === '77u/') {
        //         base64XMLFileContent = base64XMLFileContent.substring(4)
        //     }
        // } catch (e) {
        //     console.log(e);
        //     leafletHtmlContent = null;
        // }
        //
        // if (!leafletHtmlContent) {
        //     throw errMap.newCustomError(errMap.errorTypes.WRONG_XML_FORMAT, messageType);
        // }


        // TODO: extract images from XML without parsing the XML
        // let htmlImageNames = Array.from(htmlXMLContent.querySelectorAll("img")).map(img => img.getAttribute("src"))
        // //removing from validation image src that are data URLs ("data:....")
        // htmlImageNames = htmlImageNames.filter((imageSrc) => {
        //     let dataUrlRegex = new RegExp(/^\s*data:([a-z]+\/[a-z]+(;[a-z\-]+\=[a-z\-]+)?)?(;base64)?,[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*$/i);
        //     if (!!imageSrc.match(dataUrlRegex) || imageSrc.startsWith("data:")) {
        //         return false;
        //     }
        //     return true;
        // });
        //
        // let uploadedImageNames = leafletMessage.payload.otherFilesContent.map(fileObj => {
        //     return fileObj.filename
        // })
        //
        // let arrayBufferXMLFileContent = base64ToArrayBuffer(base64XMLFileContent);
        // eventRecorder.register(EVENTS.WRITE, this.getLeafletFilePath(messageType, language), $$.Buffer.from(arrayBufferXMLFileContent));
        //
        // htmlImageNames.forEach(htmlImgName => {
        //     let differentImg = uploadedImageNames.find((item) => item.toLowerCase() === htmlImgName.toLowerCase())
        //     if (differentImg) {
        //         if (htmlImgName !== differentImg) {
        //             differentCaseImgFiles.push(htmlImgName)
        //         }
        //     }
        // });

        let differentCaseImgFiles = [];
        for (let i = 0; i < leafletMessage.otherFilesContent.length; i++) {
            let file = leafletMessage.otherFilesContent[i];
            let differentCaseFileName = differentCaseImgFiles.find(item => file.filename.toLowerCase() === item.toLowerCase());
            if (differentCaseFileName) {
                file.filename = differentCaseFileName;
            }
            let filePath = `${this.getLeafletStoragePath(messageType, language)}/${file.filename}`;
            eventRecorder.register(EVENTS.WRITE, filePath, $$.Buffer.from(base64ToArrayBuffer(file.fileContent)));
        }

    }

    this.deleteEPI = async (language) => {
        let eventRecorder = await this.getEventRecorderInstance(this.getGTINSSI());
        eventRecorder.register(EVENTS.DELETE, this.getLeafletStoragePath(language));
    }

    this.listLanguages = async (batchNumber) => {
        const constants = require("../utils/constants");
        const XMLDisplayService = require("../../services/XMLDisplayService/XMLDisplayService.js");
        const simulatedModel = {networkName: domain, product: {gtin}};
        let xmlDisplayService = new XMLDisplayService(undefined, undefined, simulatedModel, constants.MESSAGE_TYPES.LEAFLET, undefined);
        if (batchNumber) {
            return $$.promisify(xmlDisplayService.getAvailableLanguagesForBatch, xmlDisplayService)();
        }
        return $$.promisify(xmlDisplayService.getAvailableLanguagesForProduct, xmlDisplayService)();
    }

    //check version before doing any deserialization
    this.loadMetadata = async () => {
        let dsu = await this.loadImmutableDSUInstance(this.getGTINSSI());
        let jsonSerialization = await dsu.readFileAsync(`${this.getMutableMountingPoint()}${this.getJSONStoragePath()}`);
        Object.assign(this, JSON.parse(jsonSerialization));
    }

    //check version before doing any serialization
    this.update = (data) => {
        Object.assign(this, data);
        let content = JSON.stringify(this);
        eventRecorder.register(EVENTS.WRITE, this.getJSONStoragePath(), content);
    }

    this.immutableDSUIsCorrupted = async () => {
        try {
            await this.loadImmutableDSUInstance();
        } catch (err) {
            const gtinSSI = await this.getGTINSSI();
            const openDSU = require("opendsu");
            const brickingAPI = openDSU.loadAPI("bricking");
            const anchoringAPI = openDSU.loadAPI("anchoring");
            let lastVersion;
            try {
                lastVersion = await anchoringAPI.getLastVersion(gtinSSI);
            } catch (e) {
                return false;
            }
            try {
                await $$.promisify(brickingAPI.getBrick)(lastVersion);
            } catch (e) {
                return true;
            }
            return false;
        }
    }

    this.persist = async () => {
        if (eventRecorder) {
            // try {
            //     await this.loadImmutableDSUInstance();
            // } catch (err) => {
            //     //how to know that the Immutable DSU exists or not ??!
            //     await this.ensureDSUStructure();
            // }
            //let version = await require("opendsu").loadApi("anchoring").getNextVersionNumberAsync(this.get.getCreationSSI());
            // this.update({});
            return await eventRecorder.execute();

            //at this point we should end batch on dsu...?!
        }
        throw new Error("Nothing to persist");
    }

}

module.exports = ModelBase;
