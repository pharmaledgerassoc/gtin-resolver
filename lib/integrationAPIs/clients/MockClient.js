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
        PRODUCT_PAYLOADS: "product_payloads",
        PRODUCT_HEADERS: "product_headers",
        BATCH_PAYLOADS: "batch_payloads",
        BATCH_HEADERS: "batch_headers",
        PRODUCT_LEAFLET_PAYLOADS: "product_leaflets_payloads",
        PRODUCT_LEAFLET_HEADERS: "product_leaflets_headers",
        BATCH_LEAFLET_PAYLOADS: "batch_leaflets_payloads",
        BATCH_LEAFLET_HEADERS: "batch_leaflets_headers",
        IMAGE_HEADERS: "image_headers",
        IMAGE_PAYLOADS: "images_payloads",
        AUDIT_LOGS: "audit_logs"
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
        enclaveInstance.insertRecord(undefined, TABLES.PRODUCT_HEADERS, gtin, productDetails, err => {
            if (err) {
                return callback(err);
            }
            enclaveInstance.insertRecord(undefined, TABLES.PRODUCT_PAYLOADS, gtin, productDetails.payload, callback);
        });
    };

    this.updateProduct = (gtin, productDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.updateRecord(undefined, TABLES.PRODUCT_HEADERS, gtin, productDetails, err => {
            if (err) {
                return callback(err);
            }
            enclaveInstance.updateRecord(undefined, TABLES.PRODUCT_PAYLOADS, gtin, productDetails.payload, callback);
        });
    };

    this.digestProductMessages = (productMessages) => {
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
                        $$.promisify(this.addEPI)(productMessage.gtin, productMessage);
                    } catch (err) {
                        $$.promisify(this.updateEPI)(productMessage.gtin, productMessage);
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

    this.addEPI = (gtin, batchNumber, leafletDetails, callback) => {
        if (typeof leafletDetails === "function") {
            callback = leafletDetails;
            leafletDetails = batchNumber;
            batchNumber = undefined;
        }
        leafletDetails.payload.type = leafletDetails.messageType;
        const enclaveInstance = getEnclaveInstance(domain);
        if (!batchNumber) {
            const pk = getPkForProductLeaflet(gtin, leafletDetails.payload.language);
            return enclaveInstance.insertRecord(undefined, TABLES.PRODUCT_LEAFLET_HEADERS, pk, leafletDetails, err => {
                if (err) {
                    return callback(err);
                }
                leafletDetails.payload.type = leafletDetails.messageType;
                enclaveInstance.insertRecord(undefined, TABLES.PRODUCT_LEAFLET_PAYLOADS, pk, leafletDetails.payload, callback);
            });
        }
        const pk = getPkForBatchLeaflet(gtin, batchNumber, leafletDetails.payload.language);
        enclaveInstance.insertRecord(undefined, TABLES.BATCH_LEAFLET_HEADERS, pk, leafletDetails, err => {
            if (err) {
                return callback(err);
            }
            enclaveInstance.insertRecord(undefined, TABLES.BATCH_LEAFLET_PAYLOADS, pk, leafletDetails.payload, callback);
        });
    };

    this.updateEPI = (gtin, batchNumber, leafletDetails, callback) => {
        if (typeof leafletDetails === "function") {
            callback = leafletDetails;
            leafletDetails = batchNumber;
            batchNumber = undefined;
        }
        leafletDetails.payload.type = leafletDetails.messageType;
        const enclaveInstance = getEnclaveInstance(domain);
        if (!batchNumber) {
            const pk = getPkForProductLeaflet(gtin, leafletDetails.payload.language);
            return enclaveInstance.updateRecord(undefined, TABLES.PRODUCT_LEAFLET_HEADERS, pk, leafletDetails, err => {
                if (err) {
                    return callback(err);
                }
                enclaveInstance.updateRecord(undefined, TABLES.PRODUCT_LEAFLET_PAYLOADS, pk, leafletDetails.payload, callback);
            });
        }

        const pk = getPkForBatchLeaflet(gtin, batchNumber, leafletDetails.payload.language);
        enclaveInstance.updateRecord(undefined, TABLES.BATCH_LEAFLET_HEADERS, pk, leafletDetails, err => {
            if (err) {
                return callback(err);
            }
            enclaveInstance.updateRecord(undefined, TABLES.BATCH_LEAFLET_PAYLOADS, pk, leafletDetails.payload, callback);
        });
    };

    this.deleteEPI = (gtin, batchNumber, language, callback) => {
        if (typeof language === "function") {
            callback = language;
            language = batchNumber;
            batchNumber = undefined;
        }
        const enclaveInstance = getEnclaveInstance(domain);
        if (!batchNumber) {
            const pk = getPkForProductLeaflet(gtin, language);
            return enclaveInstance.deleteRecord(undefined, TABLES.PRODUCT_LEAFLET_HEADERS, pk, err => {
                if (err) {
                    return callback(err);
                }
                enclaveInstance.deleteRecord(undefined, TABLES.PRODUCT_LEAFLET_PAYLOADS, pk, callback);
            });
        }

        const pk = getPkForBatchLeaflet(gtin, batchNumber, language);
        enclaveInstance.deleteRecord(undefined, TABLES.BATCH_LEAFLET_HEADERS, pk, err => {
            if (err) {
                return callback(err);
            }
            enclaveInstance.deleteRecord(undefined, TABLES.BATCH_LEAFLET_PAYLOADS, pk, callback);
        });
    };

    this.addProductImage = (gtin, imageData, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.insertRecord(undefined, TABLES.IMAGE_HEADERS, gtin, imageData, err => {
            if (err) {
                return callback(err);
            }
            enclaveInstance.insertRecord(undefined, TABLES.IMAGE_PAYLOADS, gtin, imageData.payload, callback);
        });
    };

    this.updateProductImage = (gtin, imageData, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.updateRecord(undefined, TABLES.IMAGE_HEADERS, gtin, imageData, err => {
            if (err) {
                return callback(err);
            }
            enclaveInstance.updateRecord(undefined, TABLES.IMAGE_PAYLOADS, gtin, imageData.payload, callback);
        });
    };

    this.addBatch = (gtin, batchNumber, batchDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = getPkForBatchDetails(gtin, batchNumber);
        enclaveInstance.insertRecord(undefined, TABLES.BATCH_HEADERS, pk, batchDetails, err => {
            if (err) {
                return callback(err);
            }
            enclaveInstance.insertRecord(undefined, TABLES.BATCH_PAYLOADS, pk, batchDetails.payload, callback);
        });
    };

    this.updateBatch = (gtin, batchNumber, batchDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = getPkForBatchDetails(gtin, batchNumber);
        enclaveInstance.updateRecord(undefined, TABLES.BATCH_HEADERS, pk, batchDetails, err => {
            if (err) {
                return callback(err);
            }
            enclaveInstance.updateRecord(undefined, TABLES.BATCH_PAYLOADS, pk, batchDetails.payload, callback);
        });
    };

    this.digestBatchMessages = (batchMessages, callback) => {
        batchMessages.forEach(batchMessage => {
            switch (batchMessage.messageType) {
                case MESSAGE_TYPES.BATCH:
                    try {
                        $$.promisify(this.addBatch)(batchMessage.payload.productCode, batchMessage.payload.batch, batchMessage);
                    } catch (err) {
                        $$.promisify(this.updateBatch)(batchMessage.payload.productCode, batchMessage.payload.batch, batchMessage);
                    }
                    break;
                case MESSAGE_TYPES.LEAFLET:
                    try {
                        $$.promisify(this.addEPI)(batchMessage.payload.productCode, batchMessage.payload.batch, batchMessage);
                    } catch (err) {
                        $$.promisify(this.updateEPI)(batchMessage.payload.productCode, batchMessage.payload.batch, batchMessage);
                    }
                    break;
                default:
                    return callback(new Error(`Unknown message type ${batchMessage.messageType}`));
            }

            callback();
        })
    };

    this.readProductMetadata = (gtin, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.getRecord(undefined, TABLES.PRODUCT_PAYLOADS, gtin, callback);
    };

    this.readBatchMetadata = (gtin, batchNumber, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = getPkForBatchDetails(gtin, batchNumber);
        enclaveInstance.getRecord(undefined, TABLES.BATCH_PAYLOADS, pk, callback);
    };

    this.getProductPhoto = (gtin, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.getRecord(undefined, TABLES.IMAGE_PAYLOADS, gtin, callback);
    }

    this.getEPI = (gtin, language, batchNumber, callback) => {
        if (typeof batchNumber === "function") {
            callback = batchNumber;
            batchNumber = undefined;
        }
        const enclaveInstance = getEnclaveInstance(domain);
        if (!batchNumber) {
            const pk = getPkForProductLeaflet(gtin, language);
            return enclaveInstance.getRecord(undefined, TABLES.PRODUCT_LEAFLET_PAYLOADS, pk, callback);
        }

        const pk = getPkForBatchLeaflet(gtin, batchNumber, language);
        enclaveInstance.getRecord(undefined, TABLES.BATCH_LEAFLET_PAYLOADS, pk, callback);
    };

    this.listProducts = (start, number, sort, query, callback) => {
        if (typeof number === "function") {
            callback = number
            query = start
            sort = undefined;
            number = undefined;
            sort = undefined;
        }
        if (typeof sort === "function") {
            callback = sort
            query = number
            sort = undefined;
            start = undefined;
        }
        if (typeof query === "function") {
            callback = query;
            query = sort;
            sort = undefined;
            start = undefined;
            number = undefined;
        }
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.filter(undefined, TABLES.PRODUCT_PAYLOADS, query, sort, number, callback);
    };

    this.listBatches = (start, number, sort, query, callback) => {
        if (typeof number === "function") {
            callback = number
            query = start
            sort = undefined;
            number = undefined;
            sort = undefined;
        }
        if (typeof sort === "function") {
            callback = sort
            query = number
            sort = undefined;
            start = undefined;
        }
        if (typeof query === "function") {
            callback = query;
            query = sort;
            sort = undefined;
            start = undefined;
            number = undefined;
        }
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.filter(undefined, TABLES.BATCH_PAYLOADS, query, sort, number, callback);
    };

    this.listProductLangs = (gtin, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.getAllRecords(undefined, TABLES.PRODUCT_LEAFLET_PAYLOADS, (err, records) => {
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
        enclaveInstance.getAllRecords(undefined, TABLES.BATCH_LEAFLET_PAYLOADS, (err, records) => {
            if (err) {
                return callback(err);
            }

            let languages = records.map(record => record.language);
            languages = [...new Set(languages)];
            callback(undefined, languages);
        })
    };

    this.addAuditLog = (logDetails, callback) => {
        const pk = cryptoAPI.generateRandom(32).toString("hex");
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.insertRecord(undefined, TABLES.AUDIT_LOGS, pk, logDetails, callback);
    };

    this.filterAuditLogs = (start, number, sort, query, callback) => {
        if (typeof number === "function") {
            callback = number
            query = start
            sort = undefined;
            number = undefined;
            sort = undefined;
        }
        if (typeof sort === "function") {
            callback = sort
            query = number
            sort = undefined;
            start = undefined;
        }
        if (typeof query === "function") {
            callback = query;
            query = sort;
            sort = undefined;
            start = undefined;
            number = undefined;
        }
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.filter(undefined, TABLES.AUDIT_LOGS, query, sort, number, callback);
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
