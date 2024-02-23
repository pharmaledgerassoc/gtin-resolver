function BatchController(enclave, version) {
    const batchFactory = require("../factories/BatchFactory.js").getInstance(enclave);
    const auditService = require("../services/AuditService.js").getInstance(enclave);
    const validationService = require("../services/ValidationService.js").getInstance();
    const constants = require("../utils/constants.js");
    const OPERATIONS = constants.OPERATIONS;
    this.addBatch = async function (domain, subdomain, gtin, batchNumber, batchMessage, req, res) {
        const userId = req.headers["user-id"];
        let batch;
        try {
            // await validationService.validateBatchMessage(batchMessage);
        } catch (err) {
            res.send(422, "Payload validation failed");
            return;
        }

        const operationInProgressContext = {
            userId,
            gtin,
            batchNumber,
            operation: OPERATIONS.CREATE_BATCH_IN_PROGRESS
        }

        const operationFailContext = {
            userId,
            gtin,
            batchNumber,
            operation: OPERATIONS.CREATE_BATCH_FAIL
        }

        const operationSuccessContext = {
            userId,
            gtin,
            batchNumber,
            operation: OPERATIONS.CREATE_BATCH
        }

        const batchData = batchMessage.payload;
        let auditId;
        try {
            auditId = await auditService.auditOperationInProgress(operationInProgressContext);
        } catch (err) {
            res.send(500, "Failed to audit start of an operation");
            return;
        }

        try {
            batch = await batchFactory.lookupBatch(domain, subdomain, gtin, batchNumber, version);

            if (batch) {
                await auditService.auditFail(auditId, operationFailContext);

                //there is already a batch with the same gtin...
                res.send(409, "Batch already exists");
                return;
            }

            batch = await batchFactory.createBatch(domain, subdomain, gtin, batchNumber, version);
            batch.update(batchData);
            try {
                await batch.persist();
            } catch (err) {
                await auditService.auditFail(auditId, operationFailContext);
                //.... return proper error to the client
                res.send(529);
                return;
            }


        } catch (err) {
            await auditService.auditFail(auditId, operationFailContext);
            //....
            res.send(500);
            return;
        }

        await auditService.auditBatch(auditId, batchMessage, operationSuccessContext);
        res.send(200);
    }

    this.updateBatch = async function (domain, subdomain, gtin, batchNumber, batchMessage, req, res) {
        const userId = req.headers["user-id"];
        let batch;
        try {
            // await validationService.validateBatchMessage(batchMessage);
        } catch (err) {
            res.send(422, "Payload validation failed");
            return;
        }

        const batchData = batchMessage.payload;

        const operationInProgressContext = {
            userId,
            gtin,
            batchNumber,
            operation: OPERATIONS.UPDATE_BATCH_IN_PROGRESS
        }

        const operationFailContext = {
            userId,
            gtin,
            batchNumber,
            operation: OPERATIONS.UPDATE_BATCH_FAIL
        }

        const operationSuccessContext = {
            userId,
            gtin,
            batchNumber,
            operation: OPERATIONS.UPDATE_BATCH
        }

        let auditId;
        try {
            auditId = await auditService.auditOperationInProgress(operationInProgressContext);
        } catch (err) {
            res.send(500, "Failed to audit start of an operation");
            return;
        }

        try {
            batch = await batchFactory.lookupBatch(domain, subdomain, gtin, batchNumber, version);
            if (!batch) {
                //if we don't have a batch to update ...
                await this.addBatch(domain, subdomain, gtin, batchNumber, batchMessage, req, res);
                return;
            }

            batch.update(batchData);
            try {
                await batch.persist();
            } catch (err) {
                await auditService.auditFail(auditId, operationFailContext);
                //.... return proper error to the client

                res.send(529);
                return;
            }
            await auditService.auditBatch(auditId, batchMessage, operationSuccessContext);
        } catch (err) {
            await auditService.auditFail(auditId, operationFailContext);
            //....
            res.send(500);
            return;
        }

        res.send(200);
    }

    this.getBatch = async function (domain, subdomain, gtin, batchNumber, req, res) {
        let batch;
        batch = await batchFactory.lookupBatch(domain, subdomain, gtin, batchNumber, version);

        if (!batch) {
            //if we don't have a batch...
            res.send(404, "Batch not found");
            return;
        }

        return JSON.stringify(batch);
    }

    this.listBatches = async (start, number, query, sort, req, res) => {
        const batches = await $$.promisify(enclave.filter)($$.SYSTEM_IDENTIFIER, constants.TABLES.BATCHES, query, sort, number);
        return batches;
    }

    this.listLanguages = async (domain, subdomain, gtin, batchNumber, epiType, req, res) => {
        try {
            let batch;
            batch = await batchFactory.lookupBatch(domain, subdomain, gtin, batchNumber, version);

            if (!batch) {
                res.send(404, "Batch not found");
                return;
            }

            const languages = await batch.listLanguages(epiType, batchNumber);
            return languages;
        } catch (err) {
            //....
            res.send(500);
        }
    };

    this.tryToDigest = async function (domain, subdomain, message, req, res) {
        try {
            await validationService.validateBatchMessage(message);
            let batchNumber = message.batch.batchNumber;
            if (await batchFactory.lookupBatch(domain, subdomain, batchNumber)) {
                await this.updateBatch(domain, subdomain, batchNumber, message, req, res);
                return true;
            } else {
                await this.addBatch(domain, subdomain, batchNumber, message, req, res);
                return true;
            }
        } catch (err) {

        }

        return false;
    }
}

let instances = {};

function getInstance(enclave, version) {
    if (!instances[version]) {
        instances[version] = new BatchController(enclave, version);
    }

    return instances[version];
}

module.exports = {
    getInstance
}