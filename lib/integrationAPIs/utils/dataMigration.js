const API_HUB = require('apihub');
const openDSU = require("opendsu");
const process = require("process");
const enclaveAPI = openDSU.loadAPI("enclave");
const {getDiffsForAudit} = require("./Events");
const anchoring = openDSU.loadApi("anchoring");
const resolver = openDSU.loadApi("resolver");
const anchoringX = anchoring.getAnchoringX();
let config = API_HUB.getServerConfig();

const PREFIX = 'DB_';
const generateEnclaveName = (domain, subdomain) => `${PREFIX}${domain}_${subdomain}`;

// Generalized migration function
const migrateDataToLightDB = async (epiEnclave, lightDBEnclave, sourceTableName, targetTableName, transformRecord = async record => await record, generatePK = record => record.pk) => {
    let records;
    try {
        records = await $$.promisify(epiEnclave.getAllRecords)(undefined, sourceTableName);
        // console.log("RECORDS", records)
    } catch (e) {
        console.error("Failed to get records from table", sourceTableName, e);
        throw e;
    }

    for (let record of records) {
        const transformedRecord = await transformRecord(record);
        let existingRecord;
        try {
            existingRecord = await $$.promisify(lightDBEnclave.getRecord)($$.SYSTEM_IDENTIFIER, targetTableName, generatePK(record));
        } catch (e) {
            //table does not exist
        }

        if (!existingRecord) {
            try {
                await $$.promisify(lightDBEnclave.insertRecord)($$.SYSTEM_IDENTIFIER, targetTableName, generatePK(record), transformedRecord);
            } catch (e) {
                console.error("Failed to insert record", transformedRecord, "in table", targetTableName, e);
                throw e;
            }
        }
    }
};

const getEpiEnclave = (keySSI, callback) => {
    const epiEnclave = enclaveAPI.initialiseWalletDBEnclave(keySSI);

    epiEnclave.on("error", (err) => {
        return callback(err);
    })

    epiEnclave.on("initialised", async () => {
        callback(undefined, epiEnclave);
    });
}

const getEpiEnclaveAsync = async (keySSI) => {
    return $$.promisify(getEpiEnclave)(keySSI);
}
const getSlotFromEpiEnclave = async (epiEnclave) => {
    const privateKey = await $$.promisify(epiEnclave.getPrivateKeyForSlot)(undefined, 0);
    console.log("GETTING SLOT FROM EPI ENCLAVE", privateKey);
    return privateKey.toString("base64");
}

const MIGRATION_STATUS = {
    NOT_STARTED: "not_started",
    IN_PROGRESS: "in_progress",
    COMPLETED: "completed"
}

const MIGRATION_SECRET_NAME = "wallet_migration";
let migrationStatus = MIGRATION_STATUS.NOT_STARTED;

const migrationDone = async () => {
    const secretsServiceInstance = await API_HUB.getSecretsServiceInstanceAsync(config.storage);
    let secret;
    try {
        secret = secretsServiceInstance.readSecretFromDefaultContainerSync(MIGRATION_SECRET_NAME);
    } catch (e) {
        console.log("Failed to read secret", MIGRATION_SECRET_NAME, e);
    }
    if (secret && secret === process.env.EPI_VERSION) {
        return true;
    }

    return false;
}

const copySlotToSecrets = async (slot, domain, subdomain) => {
    const secretsServiceInstance = await API_HUB.getSecretsServiceInstanceAsync(config.storage);
    await secretsServiceInstance.putSecretInDefaultContainerAsync(generateEnclaveName(domain, subdomain), slot);
}

const migrateDataFromEpiEnclaveToLightDB = async (domain, subdomain, epiEnclaveKeySSI) => {
    migrationStatus = MIGRATION_STATUS.IN_PROGRESS;
    let slot;
    let epiEnclave;
    try {
        epiEnclave = await getEpiEnclaveAsync(epiEnclaveKeySSI);
    } catch (e) {
        console.error("Failed to get epi enclave", e);
        throw e;
    }
    try {
        slot = await getSlotFromEpiEnclave(epiEnclave);
    } catch (err) {
        console.error("Failed to get slot from epi enclave", err);
        throw err;
    }

    try {
        await copySlotToSecrets(slot, domain, subdomain);
    } catch (e) {
        console.error("Failed to copy slot to secrets", e);
        throw e;
    }
    console.log("Slot copied to secrets");

    const LightDBEnclaveFactory = require("./LightDBEnclaveFactory");
    const lightDBEnclaveFactory = LightDBEnclaveFactory.getLightDBEnclaveFactoryInstance();
    const lightDBEnclave = await lightDBEnclaveFactory.createLightDBEnclaveAsync(domain, subdomain, true);

    // Define transformations for specific tables
    const transformProduct = record => {
        delete record.pk;
        record.productCode = record.gtin;
        record.inventedName = record.name;
        record.nameMedicinalProduct = record.description;
        return record;
    };

    const generateProductPk = record => record.gtin;

    const transformBatch = record => {
        delete record.pk;
        record.batchNumber = record.batchNumber || record.batch;
        record.inventedName = record.productName;
        record.nameMedicinalProduct = record.productDescription;
        record.productCode = record.gtin;
        record.expiryDate = record.expiry;
        return record;
    }

    const transformUserAccess = record => {
        record.username = record.userId;
        return record;
    }

    /*
    * old format kept logs in DSU so needs to be extracted
    * */
    const getLogDetails = async (record) => {
        if (record.auditKeySSI) {
            let auditDSU = await $$.promisify(resolver.loadDSU)(record.auditKeySSI);
            let auditDetails = await $$.promisify(auditDSU.readFile)("/audit.json");
            record = JSON.parse(auditDetails);
        }
        return record;
    }

    const transformAuditForBatch = async (record) => {
        record.batchNumber = record.itemCode;
        record.itemCode = record.gtin;
        // in case the old format does not have diffs property we should calculate it
        if (!record.diffs) {
            let auditDetails = await getLogDetails(record);
            record.diffs = auditDetails.diffs || getDiffsForAudit(auditDetails.logInfo.batch, {});
        }
    }

    const transformAuditForProduct = async (record) => {
        // in case the old format does not have diffs property we should calculate it
        if (!record.diffs) {
            let auditDetails = await getLogDetails(record);
            record.diffs = auditDetails.diffs || getDiffsForAudit(auditDetails.logInfo.product, {});
        }
    }

    const transformAuditLog = async record => {
        delete record.pk;
        let auditDetailsObject = {};
        if (record.logType === "BATCH_LOG") {
            try {
                await transformAuditForBatch(record);
            } catch (e) {
                console.log(e);
                //if fails to retrieve audit DSU data keep useful info for later use
                if (record.auditKeySSI) {
                    auditDetailsObject.auditKeySSI = record.auditKeySSI;
                    auditDetailsObject.anchorId = record.anchorId || "";
                    auditDetailsObject.hashLink = record.hashLink || "";
                }
            }
            auditDetailsObject.path = `/batch.epi_v1`
        }

        if (record.logType === "PRODUCT_LOG") {
            try {
                await transformAuditForProduct(record);
            } catch (e) {
                console.log(e);
                //if fails to retrieve audit DSU data keep useful info for later use
                if (record.auditKeySSI) {
                    auditDetailsObject.auditKeySSI = record.auditKeySSI;
                    auditDetailsObject.anchorId = record.anchorId || "";
                    auditDetailsObject.hashLink = record.hashLink || "";
                }
            }
            auditDetailsObject.path = `/product.epi_v1`
        }

        if (record.diffs) {
            auditDetailsObject.diffs = record.diffs;
        }

        if (record.status) {
            auditDetailsObject.status = record.status;
        }

        if (record.logType === "LEAFLET_LOG") {
            let auditDetails = await getLogDetails(record);
            record.details = [{
                epiLanguage: auditDetails.logInfo.language,
                epiType: auditDetails.logInfo.messageType
            }]
            if (record.metadata && record.metadata.attachedTo === "BATCH") {
                record.batchNumber = record.metadata.batch;
                record.itemCode = record.metadata.gtin;
            }
        } else {
            record.details = [auditDetailsObject];
        }

        if (record.anchorId && record.hashLink && !record.version) {
            try {
                let allVersions = await $$.promisify(anchoringX.getAllVersions)(record.anchorId)
                let version = allVersions.findIndex(item => item.getIdentifier() === record.hashLink);
                if (version >= 0) {
                    record.version = version + 1;
                }
            } catch (e) {
                //do nothing
            }
        }

        return record;
    }
    const generatePkForAudit = record => {
        let pk = record.pk;
        if (typeof pk !== "string") {
            pk = JSON.stringify(pk);
        }

        if (!pk) {
            pk = openDSU.loadAPI("crypto").generateRandom(32).toString("hex");
        }

        return pk;
    }
    const generateBatchPk = record => {
        return `${record.gtin}_${record.batchNumber}`;
    }
    const noTransform = record => record;

    // Use the generalized migration function for different tables with appropriate transformations
    await migrateDataToLightDB(epiEnclave, lightDBEnclave, "products", "products", transformProduct, generateProductPk);
    console.log("Products migrated")
    await migrateDataToLightDB(epiEnclave, lightDBEnclave, "batches", "batches", transformBatch, generateBatchPk);
    console.log("Batches migrated")
    await migrateDataToLightDB(epiEnclave, lightDBEnclave, "logs", "audit", transformAuditLog, generatePkForAudit);
    console.log("Audit migrated")
    await migrateDataToLightDB(epiEnclave, lightDBEnclave, "login_logs", "user-access", transformUserAccess);
    console.log("User actions migrated")
    await migrateDataToLightDB(epiEnclave, lightDBEnclave, "path-keyssi-private-keys", "path-keyssi-private-keys", noTransform);
    console.log("Path keyssi private keys migrated")

    const secretsServiceInstance = await API_HUB.getSecretsServiceInstanceAsync(config.storage);
    await secretsServiceInstance.putSecretInDefaultContainerAsync(MIGRATION_SECRET_NAME, process.env.EPI_VERSION);
    console.log("=============================================================")
    console.log("Migration of old wallet completed");
    console.log("=============================================================")
}

const getMigrationStatus = async () => {
    let migrationIsDone = await migrationDone();
    if (migrationIsDone) {
        return MIGRATION_STATUS.COMPLETED;
    }

    return migrationStatus;
}

module.exports = {
    getMigrationStatus,
    migrateDataFromEpiEnclaveToLightDB
}
