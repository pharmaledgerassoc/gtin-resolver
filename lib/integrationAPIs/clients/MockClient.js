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

function MockEPISORClient() {
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

    this.addProduct = (domain, gtin, productDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.insertRecord(undefined, TABLES.PRODUCTS, gtin, productDetails, callback);
    };

    this.updateProduct = (domain, gtin, productDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.updateRecord(undefined, TABLES.PRODUCTS, gtin, productDetails, callback);
    };

    this.digestProductMessages = (domain, productMessages, callback) => {
        productMessages.forEach(productMessage => {
            switch (productMessage.messageType) {
                case MESSAGE_TYPES.PRODUCT:
                    try {
                        $$.promisify(this.addProduct)(domain, productMessage.gtin, productMessage);
                    } catch (err) {
                        $$.promisify(this.updateProduct)(domain, productMessage.gtin, productMessage);
                    }
                    break;
                case MESSAGE_TYPES.LEAFLET:
                    try {
                        $$.promisify(this.addEPIForProduct)(domain, productMessage.gtin, productMessage);
                    } catch (err) {
                        $$.promisify(this.updateEPIForProduct)(domain, productMessage.gtin, productMessage);
                    }
                    break;

                case MESSAGE_TYPES.PRODUCT_PHOTO:
                    try {
                        $$.promisify(this.addProductImage)(domain, productMessage.gtin, productMessage);
                    } catch (err) {
                        $$.promisify(this.updateProductImage)(domain, productMessage.gtin, productMessage);
                    }
                    break;
            }
        })
    };

    this.addEPIForProduct = (domain, gtin, leafletDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = getPkForProductLeaflet(gtin, leafletDetails.language);
        enclaveInstance.insertRecord(undefined, TABLES.PRODUCT_LEAFLETS, pk, leafletDetails, callback);
    };

    this.updateEPIForProduct = (domain, gtin, leafletDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = getPkForProductLeaflet(gtin, leafletDetails.language);
        enclaveInstance.updateRecord(undefined, TABLES.PRODUCT_LEAFLETS, pk, leafletDetails, callback);
    };

    this.deleteEPIofProduct = (domain, gtin, language, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = getPkForProductLeaflet(gtin, language);
        enclaveInstance.deleteRecord(undefined, TABLES.PRODUCT_LEAFLETS, pk, callback);
    };

    this.addProductImage = (domain, gtin, imageData, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.insertRecord(undefined, TABLES.IMAGES, gtin, imageData, callback);
    };

    this.updateProductImage = (domain, gtin, imageData, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.updateRecord(undefined, TABLES.IMAGES, gtin, imageData, callback);
    };

    this.addBatch = (domain, gtin, batchNumber, batchDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = getPkForBatchDetails(gtin, batchNumber);
        enclaveInstance.insertRecord(undefined, TABLES.BATCHES, pk, batchDetails, callback);
    };

    this.updateBatch = (domain, gtin, batchNumber, batchDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = getPkForBatchDetails(gtin, batchNumber);
        enclaveInstance.updateRecord(undefined, TABLES.BATCHES, pk, batchDetails, callback);
    };

    this.digestBatchMessages = (domain, batchMessages, callback) => {
        batchMessages.forEach(batchMessage => {
            switch (batchMessage.messageType) {
                case MESSAGE_TYPES.BATCH:
                    try {
                        $$.promisify(this.addBatch)(domain, batchMessage.batch.productCode, batchMessage.batch.batch, batchMessage);
                    } catch (err) {
                        $$.promisify(this.updateBatch)(domain, batchMessage.batch.productCode, batchMessage.batch.batch, batchMessage);
                    }
                    break;
                case MESSAGE_TYPES.LEAFLET:
                    try {
                        $$.promisify(this.addEPIForBatch)(domain, batchMessage.batch.productCode, batchMessage.batch.batch, batchMessage);
                    } catch (err) {
                        $$.promisify(this.updateEPIForBatch)(domain, batchMessage.batch.productCode, batchMessage.batch.batch, batchMessage);
                    }
                    break;
                default:
                    return callback(new Error(`Unknown message type ${batchMessage.messageType}`));
            }

            callback();
        })
    };

    this.addEPIForBatch = (domain, gtin, batchNumber, leafletDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = getPkForBatchLeaflet(gtin, batchNumber, leafletDetails.language);
        enclaveInstance.insertRecord(undefined, TABLES.BATCH_LEAFLETS, pk, leafletDetails, callback);
    };

    this.updateEPIForBatch = (domain, gtin, batchNumber, leafletDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = getPkForBatchLeaflet(gtin, batchNumber, leafletDetails.language);
        enclaveInstance.updateRecord(undefined, TABLES.BATCH_LEAFLETS, pk, leafletDetails, callback);
    };

    this.deleteEPIOfBatch = (domain, gtin, batchNumber, language, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = getPkForBatchLeaflet(gtin, batchNumber, language);
        enclaveInstance.deleteRecord(undefined, TABLES.BATCH_LEAFLETS, pk, callback);
    };

    this.readProductMetadata = (domain, gtin, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.getRecord(undefined, TABLES.PRODUCTS, gtin, callback);
    };

    this.readBatchMetadata = (domain, gtin, batchNumber, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = cryptoAPI.sha256JOSE(`${gtin}${batchNumber}`);
        enclaveInstance.getRecord(undefined, TABLES.BATCHES, pk, callback);
    };

    this.getProductPhoto = (domain, gtin, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.getRecord(undefined, TABLES.IMAGES, gtin, callback);
    }

    this.getProductLeaflet = (domain, gtin, language, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = getPkForProductLeaflet(gtin, language);
        enclaveInstance.getRecord(undefined, TABLES.PRODUCT_LEAFLETS, pk, callback);
    };

    this.getBatchLeaflet = (domain, gtin, batchNumber, language, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = getPkForBatchLeaflet(gtin, batchNumber, language);
        enclaveInstance.getRecord(undefined, TABLES.BATCH_LEAFLETS, pk, callback);
    };

    this.listProducts = (domain, start, number, sort, query, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.filter(undefined, TABLES.PRODUCTS, start, number, sort, query, callback);
    };

    this.listBatches = (domain, start, number, query, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.filter(undefined, TABLES.BATCHES, start, number, query, callback);
    };

    this.listProductsLangs = (domain, gtin, callback) => {
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

    this.listBatchLangs = (domain, gtin, batchNumber, callback) => {
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

    this.digestMessage = (domain, messageDetails, callback) => {
        throw Error("Not implemented");
    };

    this.digestMultipleMessages = (domain, messageDetails, callback) => {
        throw Error("Not implemented");
    };

    this.digestGroupedMessages = (domain, messageDetails, callback) => {
        throw Error("Not implemented");
    };

    this.addAuditLog = (domain, logDetails, callback) => {
        throw Error("Not implemented");
    };

    this.filterAuditLogs = (domain, start, number, sort, query, callback) => {
        throw Error("Not implemented");
    };
}

module.exports = MockEPISORClient;