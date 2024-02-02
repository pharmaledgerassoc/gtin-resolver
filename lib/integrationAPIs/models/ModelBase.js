const {EventRecorder, EVENTS} = require("../utils/Events");
const {sanitize} = require("../../utils/htmlSanitize");

function ModelBase(enclave, domain, subdomain, gtin) {
    let eventRecorder;
    this.getEventRecorderInstance = async  () => {
        if (!eventRecorder) {
            let mutableDSU = await this.ensureDSUStructure();
            eventRecorder = new EventRecorder(mutableDSU);
        }
        return eventRecorder;
    }

    this.getGTINSSI = function () {
        throw new Error("Not implemented! Needs to be implemented in the wrapper class");
    }

    this.getLeafletStoragePath = function () {
        throw new Error("Not implemented! Needs to be implemented in the wrapper class");
    }

    this.getJSONStoragePath = function () {
        throw new Error("Not implemented! Needs to be implemented in the wrapper class");
    }

    this.getMutableMountingPoint = function () {
        throw new Error("Not implemented! Needs to be implemented in the wrapper class");
    }

    this.getPathOfPathSSI = function () {
        throw new Error("Not implemented! Needs to be implemented in the wrapper class");
    }

    let immutableDSU;
    this.loadImmutableDSUInstance = async function () {
        if (immutableDSU) {
            return immutableDSU;
        }
        const keySSI = this.getGTINSSI();
        return await this.loadDSUInstance(keySSI);
    }

    let pathKeySSI;
    this.getPathKeySSI = async function () {
        if (!pathKeySSI) {
            const {domain, path} = this.getPathOfPathSSI();
            pathKeySSI = await $$.promisify(enclave.createPathKeySSI)($$.SYSTEM_IDENTIFIER, domain, path);
        }
        return pathKeySSI;
    }
    this.getMutableSeedSSI = async function () {
        let pathKeySSI = await this.getPathKeySSI();
        const seedSSI = await $$.promisify(pathKeySSI.derive)();

        return seedSSI;
    }

    this.createImmutableDSUInstance = async function () {
        const keySSI = this.getGTINSSI();
        return this.createDSUInstanceForSSI(keySSI);
    }

    this.createMutableDSUInstance = async function () {
        const keySSI = await this.getMutableSeedSSI();
        return await this.createDSUInstanceForSSI(keySSI);
    }

    this.loadMutableDSUInstance = async function () {
        const keySSI = await this.getMutableSeedSSI();
        return await this.loadDSUInstance(keySSI);
    }

    this.loadDSUInstance = async function (keySSI) {
        const loadDSU = $$.promisify(enclave.loadDSU, enclave);
        let dsuInstance = await loadDSU($$.SYSTEM_IDENTIFIER, keySSI);
        return dsuInstance;
    }

    this.createDSUInstanceForSSI = async function (keySSI) {
        const createDSUForExistingSSI = $$.promisify(enclave.createDSUForExistingSSI, enclave);
        let dsuInstance = await createDSUForExistingSSI(keySSI);
        return dsuInstance;
    }

    this.ensureDSUStructure = async function () {
        let immutableDSU;
        try {
            immutableDSU = await this.loadImmutableDSUInstance();
        } catch (e) {
            immutableDSU = await this.createImmutableDSUInstance();
        }

        let mutableDSU;
        try {
            mutableDSU = await this.loadMutableDSUInstance();
            return mutableDSU;
        } catch (e) {
            mutableDSU = await this.createMutableDSUInstance();
        }

        let sreadSSI = await $$.promisify(mutableDSU.getKeySSIAsString)("sread");
        const mutableMountingPoint = this.getMutableMountingPoint();

        const batchNumber = await immutableDSU.startOrAttachBatchAsync();
        await $$.promisify(immutableDSU.mount)(mutableMountingPoint, sreadSSI);
        await immutableDSU.commitBatchAsync(batchNumber);

        return mutableDSU;
    }

    this.addEPI = async function (leafletMessage) {
        if (leafletMessage.action === "update") {
            await this.deleteEPI(leafletMessage.language);
        }

        let {messageType} = leafletMessage;
        const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();
        let base64ToArrayBuffer = require("../../utils/CommonUtils").base64ToArrayBuffer;
        let base64XMLFileContent = leafletMessage.payload.xmlFileContent;
        base64XMLFileContent = sanitize(base64XMLFileContent);

        let leafletHtmlContent, htmlXMLContent;
        try {
            const XMLDisplayService = require("../../services/XMLDisplayService/XMLDisplayService.js");
            const simulatedModel = {networkName: domain, product: {gtin}};
            let xmlDisplayService = new XMLDisplayService(undefined, undefined, simulatedModel, messageType, undefined);

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

        let differentCaseImgFiles = [];
        if (!leafletHtmlContent) {
            throw errMap.newCustomError(errMap.errorTypes.WRONG_XML_FORMAT, messageType);
        }

        let htmlImageNames = Array.from(htmlXMLContent.querySelectorAll("img")).map(img => img.getAttribute("src"))
        //removing from validation image src that are data URLs ("data:....")
        htmlImageNames = htmlImageNames.filter((imageSrc) => {
            let dataUrlRegex = new RegExp(/^\s*data:([a-z]+\/[a-z]+(;[a-z\-]+\=[a-z\-]+)?)?(;base64)?,[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*$/i);
            if (!!imageSrc.match(dataUrlRegex) || imageSrc.startsWith("data:")) {
                return false;
            }
            return true;
        });

        let uploadedImageNames = payload.otherFilesContent.map(fileObj => {
            return fileObj.filename
        })

        let arrayBufferXMLFileContent = base64ToArrayBuffer(base64XMLFileContent);
        eventRecorder.register(EVENTS.WRITE, this.getLeafletFilePath(messageType, language), $$.Buffer.from(arrayBufferXMLFileContent));

        htmlImageNames.forEach(htmlImgName => {
            let differentImg = uploadedImageNames.find((item) => item.toLowerCase() === htmlImgName.toLowerCase())
            if (differentImg) {
                if (htmlImgName !== differentImg) {
                    differentCaseImgFiles.push(htmlImgName)
                }
            }
        });

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

    this.deleteEPI = async function (language) {
        let eventRecorder = await this.getEventRecorderInstance(this.getGTINSSI());
        eventRecorder.register(EVENTS.DELETE, this.getLeafletStoragePath(language));
    }

    //check version before doing any deserialization
    this.loadData = async function () {
        let dsu = await this.loadImmutableDSUInstance(this.getGTINSSI());
        let jsonSerialization = await dsu.readFile(this.getJSONStoragePath());
        Object.assign(this, JSON.parse(jsonSerialization));
    }

    //check version before doing any serialization
    this.update = function (data) {
        Object.assign(this, data);
        let content = JSON.stringify(this);
        eventRecorder.register(EVENTS.WRITE, this.getJSONStoragePath(), content);
    }

    this.immutableDSUIsCorrupted = async function () {
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

    this.persist = async function () {
        if (eventRecorder) {
            // try {
            //     await this.loadImmutableDSUInstance();
            // } catch (err) {
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