function AuditService(enclave) {
    const {TABLES} = require("../utils/constants.js");
    this.auditProduct = async (auditId, productMessage, context) => {
        try {
            await $$.promisify(enclave.insertRecord)($$.SYSTEM_IDENTIFIER, TABLES.PRODUCTS, productMessage.payload.productCode, productMessage.payload);
        } catch (error) {
            await $$.promisify(enclave.updateRecord)($$.SYSTEM_IDENTIFIER, TABLES.PRODUCTS, productMessage.payload.productCode, productMessage.payload);
        }
    }

    this.auditBatch = async (auditId, batchMessage, context) => {
        const pk = `${batchMessage.payload.gtin}_${batchMessage.payload.batchNumber}`
        try {
            await $$.promisify(enclave.insertRecord)($$.SYSTEM_IDENTIFIER, TABLES.BATCHES, pk, batchMessage.payload);
        } catch (error) {
            await $$.promisify(enclave.updateRecord)($$.SYSTEM_IDENTIFIER, TABLES.BATCHES, pk, batchMessage.payload);
        }
    }

    this.auditFail = async (domain, auditId) => {

    }

    this.auditOperationInProgress = async (domain) => {

    }
}

let serviceInstance;

function getInstance(enclave) {
    if (!serviceInstance) {
        serviceInstance = new AuditService(enclave);
    }
    return serviceInstance;
}

module.exports = {
    getInstance
};