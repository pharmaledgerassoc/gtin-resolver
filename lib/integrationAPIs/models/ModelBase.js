const {EventRecorder, EVENTS} = require("../utils/Events");
const {getImageAsBase64} = require("../../utils/CommonUtils");
const XMLDisplayService = require("../../services/XMLDisplayService/XMLDisplayService");

function ModelBase(enclave, domain, subdomain, gtin) {
    let eventRecorder;
    this.getEventRecorderInstance = async () => {
        if (!eventRecorder) {
            eventRecorder = new EventRecorder(this.ensureDSUStructure);
        }
        return eventRecorder;
    }

    this.refreshEventRecorder = () => {
        eventRecorder = new EventRecorder(this.ensureDSUStructure);
        return eventRecorder;
    }


    this.getEnclave = () => {
        return enclave;
    }

    this.getGTINSSI = () => {
        throw new Error("Not implemented! Needs to be implemented in the wrapper class");
    }

    this.getLeafletStoragePath = () => {
        throw new Error("Not implemented! Needs to be implemented in the wrapper class");
    }

    this.getLeafletFilePath = () => {
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

    this.loadMutableDSUInstance = async (dsuVersion) => {
        const keySSI = await this.getMutableSeedSSI();
        if (mutableDSU && !dsuVersion) {
            return mutableDSU;
        }
        if (dsuVersion) {
            keySSI.setDSUVersionHint(dsuVersion);
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
        let dsuInstance = await createDSUForExistingSSI(keySSI, {addLog: false});
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
            return {mutableDSU};
        } catch (e) {
            //TODO: CODE-REVIEW - we should handle different the network errors in order to prevent any anchoring conflict, if possible
            mutableDSU = await this.createMutableDSUInstance();
        }

        let sreadSSI = await $$.promisify(mutableDSU.getKeySSIAsString)("sread");
        const mutableMountingPoint = this.getMutableMountingPoint();
        const existingFilesAndFolders = await $$.promisify(immutableDSU.readDir)(mutableMountingPoint);
        let batchId;
        if (existingFilesAndFolders.length === 0) {
            batchId = await immutableDSU.startOrAttachBatchAsync();
            await $$.promisify(immutableDSU.mount)(mutableMountingPoint, sreadSSI);
        }
        return {mutableDSU, immutableDSU, batchId};
    }



    this.registerFixedUrl = async (language, epiType, epiMarket = undefined, ensureGtinOwner = true, ensureMetadata = true) => {
        try {
            let fixedUrlUtils = require("./../../mappings/utils.js");
            if(ensureGtinOwner){
                await fixedUrlUtils.registerGtinOwnerFixedUrlByDomainAsync(domain, gtin);
            }
            if(ensureMetadata){
                await fixedUrlUtils.registerLeafletMetadataFixedUrlByDomainAsync(domain, subdomain, gtin, this.batchNumber || undefined)
            }
            if (this.batchNumber) {
                await fixedUrlUtils.registerLeafletFixedUrlByDomainAsync(domain, subdomain, epiType, gtin, language, this.batchNumber, undefined, this.epiProtocol, undefined);
            }else{
                await fixedUrlUtils.registerLeafletFixedUrlByDomainAsync(domain, subdomain, epiType, gtin, language, undefined, this.expiryDate, this.epiProtocol, epiMarket);
            }
            // await fixedUrlUtils.deactivateLeafletFixedUrlAsync(undefined, domain, gtin);
        } catch (err) {
            //if cleanup fails mapping needs to fail...
            console.log("Failed to trigger FixedUrl", err);
            const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();
            const errorUtils = require("../../mappings/errors/errorUtils.js");
            errorUtils.addMappingError("NOT_ABLE_TO_ENSURE_DATA_CONSISTENCY_ON_SERVER");
            throw errMap.newCustomError(errMap.errorTypes.NOT_ABLE_TO_ENSURE_DATA_CONSISTENCY_ON_SERVER, epiType);
        }
    }

    this.addEPI = async (language, epiType, epiMarket, base64XMLFileContent, otherFilesContent) => {
        if (!otherFilesContent) {
            base64XMLFileContent = epiMarket;
            otherFilesContent = base64XMLFileContent;
            epiMarket = "";
        }

        await this.registerFixedUrl(language, epiType, epiMarket);
        const epiPath = this.getLeafletFilePath(language, epiType, epiMarket);
        const storagePath = this.getLeafletStoragePath(language, epiType, epiMarket);
        const eventRecorder = await this.getEventRecorderInstance(this.getGTINSSI());
        // if already exists should be replaced, so try to delete first
        eventRecorder.register(EVENTS.DELETE, storagePath);
        eventRecorder.register(EVENTS.WRITE, epiPath, $$.Buffer.from(base64XMLFileContent, "base64"));
        if (otherFilesContent) {
            for (let i = 0; i < otherFilesContent.length; i++) {
                let filePath = `${storagePath}/${otherFilesContent[i].filename}`;
                eventRecorder.register(EVENTS.WRITE, filePath, $$.Buffer.from(otherFilesContent[i].fileContent, "base64"));
            }
        }
    }

    this.createCache = async (language, leafletType, epiMarket, skipLeaflet = false) => {
        try {
            let fixedUrlUtils = require("./../../mappings/utils.js");

            if(!skipLeaflet){
                await fixedUrlUtils.deactivateLeafletFixedUrlAsync(undefined, "leaflet", domain, this.productCode, this.batchNumber, language, leafletType, epiMarket);
                await fixedUrlUtils.activateLeafletFixedUrl(undefined, "leaflet", domain, this.productCode, this.batchNumber, language, leafletType, epiMarket);
            }

            await fixedUrlUtils.deactivateGtinOwnerFixedUrlAsync(undefined, "gtinOwner", domain, this.productCode, this.batchNumber, undefined, undefined, undefined);
            await fixedUrlUtils.deactivateMetadataFixedUrl(undefined, "metadata", domain, this.productCode, this.batchNumber, undefined, undefined, undefined);

            await fixedUrlUtils.activateGtinOwnerFixedUrl(undefined, "gtinOwner", domain, this.productCode, this.batchNumber, undefined, undefined, undefined);
            await fixedUrlUtils.activateMetadataFixedUrl(undefined, "metadata", domain, this.productCode, this.batchNumber, undefined, undefined, undefined);
        } catch (err) {
            //if cleanup fails mapping needs to fail...
            console.log("Failed to trigger FixedUrl", err);
            // const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();
            // const errorUtils = require("../../mappings/errors/errorUtils.js");
            // errorUtils.addMappingError("NOT_ABLE_TO_ENSURE_DATA_CONSISTENCY_ON_SERVER");
            // throw errMap.newCustomError(errMap.errorTypes.NOT_ABLE_TO_ENSURE_DATA_CONSISTENCY_ON_SERVER, epiType);
        }
    }

    this.getEpi = async (language, epiType, epiMarket, dsuVersion) => {

        const epiPath = this.getLeafletStoragePath(language, epiType, epiMarket);
        const dsu = await this.loadMutableDSUInstance(dsuVersion);
        let files = await $$.promisify(dsu.listFiles)(epiPath);
        let epiResult;
        if (files && files.length > 0) {
            epiResult = {otherFilesContent: []}
            for (let file of files) {
                let fileContent = await dsu.readFileAsync(`${epiPath}/${file}`);
                if (file.endsWith("xml")) {
                    epiResult.xmlFileContent = fileContent.toString("base64");
                } else {
                    if(file.endsWith("mp4")){
                        epiResult.otherFilesContent.push({filename: file, fileContent: getImageAsBase64(fileContent, "video/mp4")})
                    } else {
                        epiResult.otherFilesContent.push({filename: file, fileContent: getImageAsBase64(fileContent)})
                    }
                }
            }
        }
        return epiResult;
    }

    this.deleteEPI = async (language, epiType, epiMarket) => {
        await this.registerFixedUrl(language, epiType);
        let existing = false;
        try {
            existing = !!await this.getEpi(language, epiType, epiMarket);
        } catch (err) {

        }
        let eventRecorder = await this.getEventRecorderInstance(this.getGTINSSI());
        eventRecorder.register(EVENTS.DELETE, this.getLeafletStoragePath(language, epiType, epiMarket));
        return existing;
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
        let clonedThis = JSON.parse(JSON.stringify(this));
        //the version should not be stored in DSU !!!
        //the version is read from the blockchain/database when needed
        clonedThis.version = undefined;
        delete clonedThis.version;
        let content = JSON.stringify(clonedThis);
        eventRecorder.register(EVENTS.WRITE, this.getJSONStoragePath(), content, true);
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

    this.persist = async (auditContext) => {
        if (eventRecorder) {
            const result = await eventRecorder.execute(auditContext);

            this.refreshEventRecorder();
            return result;
            //at this point we should end batch on dsu...?!
        }
        throw new Error("Nothing to persist");
    }

    this.recover = async () => {
        let pathSSI = await this.getPathKeySSI();
        let seedSSI = await $$.promisify(pathSSI.derive)();
        let sreadSSI = await $$.promisify(seedSSI.derive)();
        const gtinSSI = await this.getGTINSSI();

        //this var will help keep track of the new version that we will create
        let nextVersion = undefined;

        // inner function
        let recoverDSU = async (ssi, recoveryFnc) => {
            return new Promise(async (resolve, reject) => {
                let enclave = this.getEnclave();

                //this is just a wrapper of the recoveryFnc in order to manage the batch process
                let recoverFnc = async (dsu, callback) => {
                    //because in the recoveryFnc the content get "recovered" we need to control the batch for those operations
                    let batchId = await dsu.startOrAttachBatchAsync();
                    recoveryFnc(dsu, async (err, dsu) => {
                        if (err) {
                            return callback(err);
                        }
                        dsu.commitBatch(batchId, callback);
                    });
                };

                let dsu;
                try {
                    dsu = await $$.promisify(enclave.loadDSURecoveryMode)($$.SYSTEM_IDENTIFIER, ssi, recoverFnc);
                } catch (err) {
                    reject(err);
                    return;
                }

                //not sure why we had this timeout, but i'll leave it for backward compatible behaviour
                // setTimeout(() => {
                resolve(dsu);
                // }, 3000);
            })
        }

        //we keep the callback arg due to how resolver.recovery method works...
        let recoveryImmutableDSU = async (dsu, callback) => {
            let error;

            try {
                await $$.promisify(dsu.mount)(this.getMutableMountingPoint(), sreadSSI.getIdentifier());
            } catch (err) {
                const mountError = createOpenDSUErrorWrapper("Failed to mount mutable DSU", err);
                error = mountError;
            }

            return callback(error, dsu);
        }

        //we keep the callback arg due to how resolver.recovery method works...
        let recoveryMutableDSU = async (dsu, callback) => {
            dsu.writeFile("/recovered", new Date().toISOString(), async (err) => {
                if (err) {
                    return callback(err);
                }

                try {
                    nextVersion = await require("opendsu").loadApi("anchoring").getNextVersionNumberAsync(dsu.getCreationSSI());
                } catch (err) {
                    throw Error("Failed to get next dsu version");
                }

                return callback(undefined, dsu);
            });
        }

        return new Promise(async (resolve, reject) => {
            try {
                await recoverDSU(gtinSSI, recoveryImmutableDSU);
                let recoveredMutableDSU;
                let mutableJustCreated = false;
                try{
                    recoveredMutableDSU = await recoverDSU(seedSSI, recoveryMutableDSU);
                }catch(err){
                    let mutableAnchorId = await seedSSI.getAnchorIdAsync();
                    const openDSU = require("opendsu");
                    const anchoringAPI = openDSU.loadAPI("anchoring").getAnchoringX();
                    let version = await $$.promisify(anchoringAPI.getLastVersion)(mutableAnchorId);
                    if(!version){
                        recoveredMutableDSU = await this.createMutableDSUInstance();
                        let batchId = await recoveredMutableDSU.startOrAttachBatchAsync();
                        await $$.promisify(recoveryMutableDSU)(recoveredMutableDSU);
                        await recoveredMutableDSU.commitBatchAsync(batchId);
                        mutableJustCreated = true;
                    }else{
                        throw err;
                    }
                }

                let jsonInitializationRequired = false;
                try {
                     await recoveredMutableDSU.readFileAsync(this.getJSONStoragePath());
                } catch (err) {
                    if (err.message === `Path <${this.getJSONStoragePath()}> not found.` || mutableJustCreated) {
                        //we are not able to read the json file, so we need to create an empty one.
                        jsonInitializationRequired = true;
                    } else {
                        throw err;
                    }
                }

                if (jsonInitializationRequired) {
                    try {
                        await this.getEventRecorderInstance(this.getGTINSSI());
                        this.update({version: nextVersion});
                        await this.persist();
                    } catch (err) {
                        throw Error("Failed to store default json structure");
                    }
                }
            } catch (err) {
                return reject(err);
            }
            resolve(nextVersion);
        });
    }

    this.getBlockchainDSUVersion = async () => {
        let mutableDSU = await this.loadMutableDSUInstance();
        let version = await require("opendsu").loadApi("anchoring").getNextVersionNumberAsync(mutableDSU.getCreationSSI());
        return --version;
    }

    this.lock = async function(){
        const {acquireLock} = require("../../utils/Locks.js");
        const anchorId = await this.getGTINSSI().getAnchorIdAsync();
        try{
            this.lockId = await acquireLock(anchorId, 55*1000);
            return this.lockId;
        }catch(err){
            throw Error("Failed to lock the resource!");
        }
    }

    this.unlock = async function(){
        const {releaseLock} = require("../../utils/Locks.js");
        const anchorId = await this.getGTINSSI().getAnchorIdAsync();
        await releaseLock(anchorId, this.lockId);
    }
}

ModelBase.prototype.constants = {
    FREE_OBJECT: "FREE_OBJECT",
    EXTERNAL_OBJECT: "EXTERNAL_OBJECT",
    MY_OBJECT: "MY_OBJECT",
    RECOVERY_REQUIRED: "RECOVERY_REQUIRED"
};

ModelBase.prototype.checkStatus = async function () {
    let gtinSSI = this.getGTINSSI();
    let anchorId = await gtinSSI.getAnchorIdAsync();

    if (!anchorId) {
        return ModelBase.prototype.constants.FREE_OBJECT;
    }

    let openDSU = require("opendsu");
    const anchoring = openDSU.loadApi("anchoring").getAnchoringX();
    let lastVersion;
    try {
        lastVersion = await $$.promisify(anchoring.getLastVersion)(anchorId);
        let brickDomain = lastVersion.getDLDomain();
        let hint = gtinSSI.getHint();
        let myBrickDomain = hint.getBricksDomain();

        if (brickDomain !== myBrickDomain) {
            return ModelBase.prototype.constants.EXTERNAL_OBJECT;
        }
    } catch (err) {
        //todo: handle potential errors
        return ModelBase.prototype.constants.FREE_OBJECT;
    }

    let mutableKeySSI;
    try {
        let dsu = await this.loadImmutableDSUInstance();
        let mountingPoint = this.getMutableMountingPoint();
        let keyssi = require("opendsu").loadApi("keyssi");
        mutableKeySSI = await $$.promisify(dsu.getSSIForMount)(mountingPoint);
        mutableKeySSI = keyssi.parse(mutableKeySSI);

        // mutableCapableSigningKeySSI = await $$.promisify(this.getEnclave().getCapableOfSigningKeySSI)($$.SYSTEM_IDENTIFIER, mutableAnchorId);
    } catch (err) {
        return ModelBase.prototype.constants.RECOVERY_REQUIRED;
    }

    try {
        let mutableDSU = await $$.promisify(this.getEnclave().loadDSU)($$.SYSTEM_IDENTIFIER, mutableKeySSI);
        let jsonSerialization = await mutableDSU.readFileAsync(`${this.getJSONStoragePath()}`);
        Object.assign(this, JSON.parse(jsonSerialization));
    } catch (err) {
        return ModelBase.prototype.constants.RECOVERY_REQUIRED;
    }

    return ModelBase.prototype.constants.MY_OBJECT;
}

module.exports = ModelBase;
