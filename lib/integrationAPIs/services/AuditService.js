function AuditService(enclave) {
    const {getUserId} = require("../utils/getUserId");
    const {TABLES} = require("../utils/constants.js");
    const {AUDIT_LOG_TYPES} = require("../utils/constants.js");
    const crypto = require("opendsu").loadAPI("crypto");
    const generatePK = () => {
        return crypto.generateRandom(32).toString("base64url");
    }

    const generateAuditEntry = (context) => {
        const auditEntry = {
            itemCode: context.itemCode || context.gtin,
            reason: context.reason || context.operation,
            creationTime: context.creationTime || new Date().toISOString(),
            username: context.username || context.userId,
            version: context.version
        };

        if (context.batchNumber) {
            auditEntry.batchNumber = context.batchNumber;
        }

        return auditEntry;
    }

    this.auditProduct = async (auditId, productPayload, context) => {
        try {
            await $$.promisify(enclave.insertRecord)($$.SYSTEM_IDENTIFIER, TABLES.PRODUCTS, productPayload.productCode, productPayload);
        } catch (error) {
            await $$.promisify(enclave.updateRecord)($$.SYSTEM_IDENTIFIER, TABLES.PRODUCTS, productPayload.productCode, productPayload);
        }

        await this.auditSuccess(auditId, context);
    }

    this.auditBatch = async (auditId, batchPayload, context) => {
        const pk = `${batchPayload.productCode}_${batchPayload.batch}`
        try {
            await $$.promisify(enclave.insertRecord)($$.SYSTEM_IDENTIFIER, TABLES.BATCHES, pk, batchPayload);
        } catch (error) {
            await $$.promisify(enclave.updateRecord)($$.SYSTEM_IDENTIFIER, TABLES.BATCHES, pk, batchPayload);
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

    this.addLog = async (logType, auditMessage, req, res) => {
        const username = getUserId(req, auditMessage);
        let auditData = {username, ...auditMessage.payload}

        if (logType === AUDIT_LOG_TYPES.USER_ACCESS) {
            return await this.insertRecordToAudit(TABLES.USER_ACCESS, auditData);
        }
    }

    this.insertRecordToAudit = async (tableName, auditData) => {
        const auditId = generatePK();
        await $$.promisify(enclave.insertRecord)($$.SYSTEM_IDENTIFIER, tableName, auditId, auditData);
        return auditId;
    }

    this.auditSuccess = async (auditId, context) => {
        await $$.promisify(enclave.updateRecord)($$.SYSTEM_IDENTIFIER, TABLES.AUDIT, auditId, generateAuditEntry(context));
    }

    this.filterAuditLogs = async (logType, start, number, query, sort) => {
        let table;
        if (logType === AUDIT_LOG_TYPES.USER_ACCESS) {
            table = TABLES.USER_ACCESS
        }
        if (logType === AUDIT_LOG_TYPES.USER_ACTION) {
            table = TABLES.AUDIT
        }
        return await $$.promisify(enclave.filter)($$.SYSTEM_IDENTIFIER, table, query, sort, number);
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
