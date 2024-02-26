const {TABLES, AUDIT_LOG_TYPES} = require("../utils/constants");

function AuditService(enclave) {
    const {TABLES} = require("../utils/constants.js");
    const crypto = require("opendsu").loadAPI("crypto");
    const generatePK = () => {
        return crypto.generateRandom(32).toString("base64url");
    }

    const generateAuditEntry = (context) => {
        const auditEntry = {
            gtin: context.gtin,
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

    this.addLog = async (logType, auditMessage, req, res) => {
        const userId = req.headers["user-id"];
        let auditData = {userId, ...auditMessage.payload}

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
        if (logType === AUDIT_LOG_TYPES.USER_ACCTION) {
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
