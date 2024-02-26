function AuditService(enclave) {
    const {TABLES} = require("../utils/constants.js");
    const crypto = require("opendsu").loadAPI("crypto");
    const generatePK = () => {
        return crypto.generateRandom(32).toString("base64url");
    }

    const generateAuditEntry = (context) => {
        const auditEntry = {
            gtin:  context.gtin,
            operation: context.operation,
            timestamp: Date.now(),
            userId: context.userId
        };

        if (context.batchNumber) {
            auditEntry.batchNumber = context.batchNumber;
        }

        return auditEntry;
    }

    this.auditProduct = async (auditId, productMessage, context) => {
        try {
            await $$.promisify(enclave.insertRecord)($$.SYSTEM_IDENTIFIER, TABLES.PRODUCTS, productMessage.payload.productCode, productMessage.payload);
        } catch (error) {
            await $$.promisify(enclave.updateRecord)($$.SYSTEM_IDENTIFIER, TABLES.PRODUCTS, productMessage.payload.productCode, productMessage.payload);
        }

        await this.auditSuccess(auditId, context);
    }

    this.auditBatch = async (auditId, batchMessage, context) => {
        const pk = `${batchMessage.payload.productCode}_${batchMessage.payload.batch}`
        try {
            await $$.promisify(enclave.insertRecord)($$.SYSTEM_IDENTIFIER, TABLES.BATCHES, pk, batchMessage.payload);
        } catch (error) {
            await $$.promisify(enclave.updateRecord)($$.SYSTEM_IDENTIFIER, TABLES.BATCHES, pk, batchMessage.payload);
        }

        await this.auditSuccess(auditId, context);
    }

    this.auditFail = async (auditId, context) => {
        await $$.promisify(enclave.updateRecord)($$.SYSTEM_IDENTIFIER, TABLES.AUDIT, auditId, generateAuditEntry(context));
    }

    this.auditOperationInProgress = async (context) => {
        const auditId = generatePK();
        await $$.promisify(enclave.insertRecord)($$.SYSTEM_IDENTIFIER, TABLES.AUDIT, auditId, generateAuditEntry(context));
        return auditId;
    }

    this.auditSuccess = async (auditId, context) => {
        await $$.promisify(enclave.updateRecord)($$.SYSTEM_IDENTIFIER, TABLES.AUDIT, auditId, generateAuditEntry(context));
    }

    this.filterAuditLogs = async (start, number, query, sort) => {
        return await $$.promisify(enclave.filter)($$.SYSTEM_IDENTIFIER, TABLES.AUDIT, query, sort, number);
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