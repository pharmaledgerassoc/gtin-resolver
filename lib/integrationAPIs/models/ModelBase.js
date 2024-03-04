const {EventRecorder, EVENTS} = require("../utils/Events");
const {sanitize} = require("../../utils/htmlSanitize");
const {base64ToArrayBuffer, arrayBufferToBase64, getImageAsBase64, getJSONfromXML} = require("../../utils/CommonUtils");

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

    this.getLeafletStoragePath = (language, type) => {
        throw new Error("Not implemented! Needs to be implemented in the wrapper class");
    }

    this.getLeafletFilePath = (language, type) => {
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

    let mutableDSU;

    this.createMutableDSUInstance = async () => {
        const keySSI = await this.getMutableSeedSSI();
        if (mutableDSU) {
            return mutableDSU;
        }
        mutableDSU = await this.createDSUInstanceForSSI(keySSI);
        return mutableDSU;
    }

    this.loadMutableDSUInstance = async () => {
        const keySSI = await this.getMutableSeedSSI();
        if (mutableDSU) {
            return mutableDSU;
        }
        mutableDSU = await this.loadDSUInstance(keySSI);
        return mutableDSU;
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

        const batchId = await immutableDSU.startOrAttachBatchAsync();
        await $$.promisify(immutableDSU.mount)(mutableMountingPoint, sreadSSI);
        await immutableDSU.commitBatchAsync(batchId);

        return mutableDSU;
    }

    let getImageNamesFromXml = function (xml) {
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
    this.addEPI = async (language, epiType, xmlFileContent, otherFilesContent) => {

        const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();

        let base64XMLFileContent = xmlFileContent;
        try {
            base64XMLFileContent = sanitize(base64XMLFileContent);
        } catch (e) {
            e.invalidXML = true;
            throw e;
        }

        if (base64XMLFileContent.substring(0, 4) === '77u/') {
            base64XMLFileContent = base64XMLFileContent.substring(4)
        }
        let XMLStringContent = atob(base64XMLFileContent);

        let xmlImageNames = getImageNamesFromXml(XMLStringContent);

        let uploadedImageNames = otherFilesContent.map(fileObj => {
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

        let eventRecorder = await this.getEventRecorderInstance(this.getGTINSSI());
        let arrayBufferXMLFileContent = base64ToArrayBuffer(base64XMLFileContent);

        // if already exists should be replaced, so try to delete first
        eventRecorder.register(EVENTS.DELETE, this.getLeafletStoragePath(language, epiType));

        eventRecorder.register(EVENTS.WRITE, this.getLeafletFilePath(language, epiType), $$.Buffer.from(arrayBufferXMLFileContent));

        for (let i = 0; i < otherFilesContent.length; i++) {
            let file = otherFilesContent[i];
            let differentCaseFileName = differentCaseImgFiles.find(item => file.filename.toLowerCase() === item.toLowerCase());
            if (differentCaseFileName) {
                file.filename = differentCaseFileName;
            }
            let filePath = `${this.getLeafletStoragePath(language, epiType)}/${file.filename}`;
            eventRecorder.register(EVENTS.WRITE, filePath, $$.Buffer.from(base64ToArrayBuffer(file.fileContent)));
        }
    }

    this.getEpi = async (language, epiType) => {
        const epiPath = this.getLeafletStoragePath(language, epiType)
        const dsu = await this.loadMutableDSUInstance();
        let files = await $$.promisify(dsu.listFiles)(epiPath);
        let epiResult;
        if (files && files.length > 0) {
            epiResult = {otherFilesContent: []}
            for (let file of files) {
                let fileContent = await dsu.readFileAsync(`${epiPath}/${file}`);
                if (file.endsWith("xml")) {
                    epiResult.xmlFileContent = arrayBufferToBase64(fileContent);
                } else {
                    epiResult.otherFilesContent.push({filename: file, fileContent: getImageAsBase64(fileContent)})
                }
            }
        }

        return epiResult;
    }

    this.deleteEPI = async (language, epiType) => {
        let eventRecorder = await this.getEventRecorderInstance(this.getGTINSSI());
        eventRecorder.register(EVENTS.DELETE, this.getLeafletStoragePath(language, epiType));
    }

    this.listLanguages = async (epiType, batchNumber) => {
        const constants = require("../utils/constants");
        const XMLDisplayService = require("../../services/XMLDisplayService/XMLDisplayService.js");
        const simulatedModel = {networkName: domain, product: {gtin}};
        let xmlDisplayService = new XMLDisplayService(undefined, this.getGTINSSI(), simulatedModel, epiType, undefined);
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
        this.version++;
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
            const anchoringAPI = openDSU.loadAPI("anchoring").getAnchoringX();
            let lastVersion;
            try {
                lastVersion = await $$.promisify(anchoringAPI.getLastVersion)(gtinSSI);
            } catch (e) {
                return false;
            }

            if (!lastVersion) {
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
