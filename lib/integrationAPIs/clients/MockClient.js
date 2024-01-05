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
        LEAFLETS: "leaflets",
        IMAGES: "images"
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
        
    };

    this.addEPIToProduct = (domain, gtin, leafletDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.insertRecord(undefined, TABLES.LEAFLETS, gtin, leafletDetails, callback);
    };

    this.updateEPIForProduct = (domain, gtin, leafletDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.updateRecord(undefined, TABLES.LEAFLETS, gtin, leafletDetails, callback);
    };

    this.deleteEPIofProduct = (domain, gtin, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.deleteRecord(undefined, TABLES.LEAFLETS, gtin, callback);
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
        const pk = cryptoAPI.sha256JOSE(`${gtin}${batchNumber}`);
        enclaveInstance.insertRecord(undefined, TABLES.BATCHES, pk, batchDetails, callback);
    };

    this.updateBatch = (domain, gtin, batchNumber, batchDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = cryptoAPI.sha256JOSE(`${gtin}${batchNumber}`);
        enclaveInstance.updateRecord(undefined, TABLES.BATCHES, pk, batchDetails, callback);
    };

    this.digestBatchMessages = (domain, messageDetails, callback) => {
        
    };

    this.addEPItoBatch = (domain, gtin, batchNumber, leafletDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = cryptoAPI.sha256JOSE(`${gtin}${batchNumber}`);
        enclaveInstance.insertRecord(undefined, TABLES.LEAFLETS, pk, leafletDetails, callback);
    };

    this.updateEPIForBatch = (domain, gtin, batchNumber, leafletDetails, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = cryptoAPI.sha256JOSE(`${gtin}${batchNumber}`);
        enclaveInstance.updateRecord(undefined, TABLES.LEAFLETS, pk, leafletDetails, callback);
    };

    this.deleteEPIOfBatch = (domain, batchNumber, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = cryptoAPI.sha256JOSE(batchNumber);
        enclaveInstance.deleteRecord(undefined, TABLES.LEAFLETS, pk, callback);
    };

    this.readProductsMetadata = (domain, gtin, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.getRecord(undefined, TABLES.PRODUCTS, gtin, callback);
    };

    this.readBatchMetadata = (domain, gtin, batchNumber, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = cryptoAPI.sha256JOSE(`${gtin}${batchNumber}`);
        enclaveInstance.getRecord(undefined, TABLES.BATCHES, pk, callback);
    };

    this.getProductLeaflet = (domain, gtin, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.getRecord(undefined, TABLES.LEAFLETS, gtin, callback);
    };

    this.getBatchLeaflet = (domain, gtin, batchNumber, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        const pk = cryptoAPI.sha256JOSE(`${gtin}${batchNumber}`);
        enclaveInstance.getRecord(undefined, TABLES.LEAFLETS, pk, callback);
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
        
    };

    this.listBatchLangs = (domain, gtin, batchNumber, callback) => {
        
    };

    this.digestMessage = (domain, messageDetails, callback) => {
        
    };

    this.digestMultipleMessages = (domain, messageDetails, callback) => {
        
    };

    this.digestGroupedMessages = (domain, messageDetails, callback) => {
        
    };

    this.addAuditLog = (domain, logDetails, callback) => {
        
    };

    this.filterAuditLogs = (domain, start, number, sort, query, callback) => {
        
    };
}