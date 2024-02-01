function BatchController(enclave, version) {
    const batchFactory = require("../factories/BatchFactory.js").getInstance(enclave);
    const auditService = require("../services/AuditService.js").getInstance(enclave);
    const validationService = require("../services/ValidationService.js").getInstance();
    const OPERATIONS = {
        ADD_BATCH: "addBatch",
        UPDATE_BATCH: "updateBatch"
    }
    this.addBatch = async function (domain, subdomain, batchId, gtin, batchMessage, res) {
        let batch;
        try {
            await validationService.validateBatchMessage(batchMessage);
        } catch (err) {
            res.send(422, "Payload validation failed");
            return;
        }

        const batchData = batchMessage.batch;

        let auditId;
        try {
            auditId = await auditService.auditOperationInProgress(domain, subdomain, "ReplaceWithProperUserId", "... and other audit entry data needed");
        } catch (err) {
            res.send(500, "Failed to audit start of an operation");
            return;
        }

        try {
            batch = await batchFactory.lookupBatch(domain, subdomain, batchId, gtin);

            if (batch) {
                await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");

                //there is already a batch with the same gtin...
                res.send(409, "Batch already exists");
                return;
            }

            batch = batchFactory.createBatch(domain, subdomain, gtin, version);
            await batch.getEventRecorderInstance();
            batch.update(batchData);
            try {
                await batch.persist();
            } catch (err) {
                await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
                //.... return proper error to the client
                res.send(529);
                return;
            }


        } catch (err) {
            await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
            //....
            res.send(500);
            return;
        }

        auditService.auditBatch(auditId, batchMessage, {operation: OPERATIONS.ADD_BATCH});
        res.send(200);
    }

    this.updateBatch = async function (domain, subdomain, gtin, batchMessage, res) {
        let batch;
        try {
            await validationService.validateBatchMessage(batchMessage);
        } catch (err) {
            res.send(422, "Payload validation failed");
            return;
        }

        const batchData = batchMessage.batch;

        let auditId;
        try {
            auditId = await auditService.auditOperationInProgress(domain, subdomain, "ReplaceWithProperUserId", "... and other audit entry data needed");
        } catch (err) {
            res.send(500, "Failed to audit start of an operation");
            return;
        }

        try {
            batch = await batchFactory.lookupBatch(domain, subdomain, gtin);
            await batch.getEventRecorderInstance(batch.getGTINSSI());
            if (!batch) {
                //if we don't have a batch to update ...
                await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
                res.send(404, "Batch not found");
                return;
            }

            batch.update(batchData);
            try {
                await batch.persist();
            } catch (err) {
                await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
                //.... return proper error to the client

                res.send(529);
                return;
            }

        } catch (err) {
            await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
            //....
            res.send(500);
            return;
        }

        res.send(200);
    }

    this.getBatch = async function (domain, subdomain, gtin, res) {
        try {
            let batch;
            batch = await batchFactory.lookupBatch(domain, subdomain, gtin);

            if (!batch) {
                //if we don't have a batch...
                res.send(404, "Batch not found");
                return;
            }

            res.setHeader("Content-type", "text/json");
            res.send(200, JSON.stringify(batch));
        } catch (err) {
            //....
            res.send(500);
            return;
        }

        res.send(200);
    }

    this.tryToDigest = async function (domain, subdomain, message, res) {
        try {
            await validationService.validateBatchMessage(message);
            let batchNumber = message.batch.batchNumber;
            if (await batchFactory.lookupBatch(domain, subdomain, batchNumber)) {
                await this.updateBatch(domain, subdomain, batchNumber, message, res);
                return true;
            } else {
                await this.addBatch(domain, subdomain, batchNumber, message, res);
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