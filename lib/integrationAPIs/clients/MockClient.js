const enclaveInstances = {};
const openDSU = require("opendsu");
const enclaveAPI = openDSU.loadAPI("enclave");
const cryptoAPI = openDSU.loadAPI("crypto");
const getEnclaveInstance = (domain) => {
    if (!enclaveInstances[domain]) {
        enclaveInstances[domain] = enclaveAPI.initialiseMemoryEnclave();
    }
    return enclaveInstances[domain];
}

function MockEPISORClient(domain) {
    const TABLES = {
        PRODUCTS: "products",
        BATCHES: "batches",
        PRODUCT_LEAFLETS: "product_leaflets",
        BATCH_LEAFLETS: "batch_leaflets",
        IMAGES: "images"
    }

    const MESSAGE_TYPES = {
        PRODUCT: "Product",
        BATCH: "Batch",
        LEAFLET: "leaflet",
        PRODUCT_PHOTO: "ProductPhoto"
    }

    const getPkForBatchDetails = (gtin, batchNumber) => {
        return `${gtin}#${batchNumber}`;
    }

    const getPkForProductLeaflet = (gtin, language) => {
        return `${language}#${gtin}`;
    }

    const getPkForBatchLeaflet = (gtin, batchNumber, language) => {
        return `${language}#${gtin}#${batchNumber}`;
    }

    this.addProduct = (gtin, productDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.insertRecord(undefined, TABLES.PRODUCTS, gtin, productDetails, callback);
    };

    this.updateProduct = (gtin, productDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.updateRecord(undefined, TABLES.PRODUCTS, gtin, productDetails, callback);
    };

    this.digestProductMessages = (productMessages, callback) => {
        productMessages.forEach(productMessage => {
            switch (productMessage.messageType) {
                case MESSAGE_TYPES.PRODUCT:
                    try {
                        $$.promisify(this.addProduct)(productMessage.gtin, productMessage);
                    } catch (err) {
                        $$.promisify(this.updateProduct)(productMessage.gtin, productMessage);
                    }
                    break;
                case MESSAGE_TYPES.LEAFLET:
                    try {
                        $$.promisify(this.addEPIForProduct)(productMessage.gtin, productMessage);
                    } catch (err) {
                        $$.promisify(this.updateEPIForProduct)(productMessage.gtin, productMessage);
                    }
                    break;

                case MESSAGE_TYPES.PRODUCT_PHOTO:
                    try {
                        $$.promisify(this.addProductImage)(productMessage.gtin, productMessage);
                    } catch (err) {
                        $$.promisify(this.updateProductImage)(productMessage.gtin, productMessage);
                    }
                    break;
            }
        })
    };

    this.addEPIForProduct = (gtin, leafletDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = getPkForProductLeaflet(gtin, leafletDetails.language);
        enclaveInstance.insertRecord(undefined, TABLES.PRODUCT_LEAFLETS, pk, leafletDetails, callback);
    };

    this.updateEPIForProduct = (gtin, leafletDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = getPkForProductLeaflet(gtin, leafletDetails.language);
        enclaveInstance.updateRecord(undefined, TABLES.PRODUCT_LEAFLETS, pk, leafletDetails, callback);
    };

    this.deleteEPIofProduct = (gtin, language, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = getPkForProductLeaflet(gtin, language);
        enclaveInstance.deleteRecord(undefined, TABLES.PRODUCT_LEAFLETS, pk, callback);
    };

    this.addProductImage = (gtin, imageData, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.insertRecord(undefined, TABLES.IMAGES, gtin, imageData, callback);
    };

    this.updateProductImage = (gtin, imageData, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.updateRecord(undefined, TABLES.IMAGES, gtin, imageData, callback);
    };

    this.addBatch = (gtin, batchNumber, batchDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = getPkForBatchDetails(gtin, batchNumber);
        enclaveInstance.insertRecord(undefined, TABLES.BATCHES, pk, batchDetails, callback);
    };

    this.updateBatch = (gtin, batchNumber, batchDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = getPkForBatchDetails(gtin, batchNumber);
        enclaveInstance.updateRecord(undefined, TABLES.BATCHES, pk, batchDetails, callback);
    };

    this.digestBatchMessages = (batchMessages, callback) => {
        batchMessages.forEach(batchMessage => {
            switch (batchMessage.messageType) {
                case MESSAGE_TYPES.BATCH:
                    try {
                        $$.promisify(this.addBatch)(batchMessage.batch.productCode, batchMessage.batch.batch, batchMessage);
                    } catch (err) {
                        $$.promisify(this.updateBatch)(batchMessage.batch.productCode, batchMessage.batch.batch, batchMessage);
                    }
                    break;
                case MESSAGE_TYPES.LEAFLET:
                    try {
                        $$.promisify(this.addEPIForBatch)(batchMessage.batch.productCode, batchMessage.batch.batch, batchMessage);
                    } catch (err) {
                        $$.promisify(this.updateEPIForBatch)(batchMessage.batch.productCode, batchMessage.batch.batch, batchMessage);
                    }
                    break;
                default:
                    return callback(new Error(`Unknown message type ${batchMessage.messageType}`));
            }

            callback();
        })
    };

    this.addEPIForBatch = (gtin, batchNumber, leafletDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = getPkForBatchLeaflet(gtin, batchNumber, leafletDetails.language);
        enclaveInstance.insertRecord(undefined, TABLES.BATCH_LEAFLETS, pk, leafletDetails, callback);
    };

    this.updateEPIForBatch = (gtin, batchNumber, leafletDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = getPkForBatchLeaflet(gtin, batchNumber, leafletDetails.language);
        enclaveInstance.updateRecord(undefined, TABLES.BATCH_LEAFLETS, pk, leafletDetails, callback);
    };

    this.deleteEPIOfBatch = (gtin, batchNumber, language, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = getPkForBatchLeaflet(gtin, batchNumber, language);
        enclaveInstance.deleteRecord(undefined, TABLES.BATCH_LEAFLETS, pk, callback);
    };

    this.readProductMetadata = (gtin, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.getRecord(undefined, TABLES.PRODUCTS, gtin, callback);
    };

    this.readBatchMetadata = (gtin, batchNumber, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = cryptoAPI.sha256JOSE(`${gtin}${batchNumber}`);
        enclaveInstance.getRecord(undefined, TABLES.BATCHES, pk, callback);
    };

    this.getProductPhoto = (gtin, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.getRecord(undefined, TABLES.IMAGES, gtin, callback);
    }

    this.getProductLeaflet = (gtin, language, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = getPkForProductLeaflet(gtin, language);
        enclaveInstance.getRecord(undefined, TABLES.PRODUCT_LEAFLETS, pk, callback);
    };

    this.getBatchLeaflet = (gtin, batchNumber, language, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = getPkForBatchLeaflet(gtin, batchNumber, language);
        enclaveInstance.getRecord(undefined, TABLES.BATCH_LEAFLETS, pk, callback);
    };

    this.listProducts = (number, sort, query, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.filter(undefined, TABLES.PRODUCTS, query, sort, number, callback);
    };

    this.listBatches = (number, sort, query, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.filter(undefined, TABLES.BATCHES, query, sort, number, callback);
    };

    this.listProductsLangs = (gtin, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.getAllRecords(undefined, TABLES.PRODUCT_LEAFLETS, (err, records) => {
            if (err) {
                return callback(err);
            }

            let languages = records.map(record => record.language);
            languages = [...new Set(languages)];
            callback(undefined, languages);
        })
    };

    this.listBatchLangs = (gtin, batchNumber, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.getAllRecords(undefined, TABLES.BATCH_LEAFLETS, (err, records) => {
            if (err) {
                return callback(err);
            }

            let languages = records.map(record => record.language);
            languages = [...new Set(languages)];
            callback(undefined, languages);
        })
    };

    this.digestMessage = (messageDetails, callback) => {
        throw Error("Not implemented");
    };

    this.digestMultipleMessages = (messageDetails, callback) => {
        throw Error("Not implemented");
    };

    this.digestGroupedMessages = (messageDetails, callback) => {
        throw Error("Not implemented");
    };

    this.addAuditLog = (logDetails, callback) => {
        throw Error("Not implemented");
    };

    this.filterAuditLogs = (start, number, sort, query, callback) => {
        throw Error("Not implemented");
    };
}

const instances = {};
const getInstance = (domain) => {
    if (!instances[domain]) {
        instances[domain] = new MockEPISORClient(domain);
    }

    return instances[domain];
}

module.exports = {
    getInstance
}