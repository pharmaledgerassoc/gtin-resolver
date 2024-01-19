function BatchController(version) {
    const batchFactory = require("../services/BatchFactory.js").getInstance();
    const auditService = require("../services/AuditService.js").getInstance();
    const validationService = require("../services/ValidationService.js").getInstance();

    this.addBatch = async function (domain, batchId, gtin, batchMessage, res) {
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
            auditId = await auditService.auditOperationInProgress(domain, "ReplaceWithProperUserId", "... and other audit entry data needed");
        } catch (err) {
            res.send(500, "Failed to audit start of an operation");
            return;
        }

        try {
            batch = await batchFactory.lookupBatch(domain, batchId, gtin);

            if (batch) {

                await auditService.auditFail(domain, auditId, "replace with proper fail audit data");

                //there is already a batch with the same gtin...
                res.send(409, "Batch already exists");
                return;
            }

            batch = batchFactory.createBatch(domain, gtin, version);
            batch.update(batchData);
            try {
                await batch.persist();
            } catch (err) {
                await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
                //.... return proper error to the client
                res.send(529);
                return;
            }

        } catch (err) {
            await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
            //....
            res.send(500);
            return;
        }
        res.send(200);
    }

    this.updateBatch = async function (domain, gtin, batchMessage, res) {
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
            auditId = await auditService.auditOperationInProgress(domain, "ReplaceWithProperUserId", "... and other audit entry data needed");
        } catch (err) {
            res.send(500, "Failed to audit start of an operation");
            return;
        }

        try {
            batch = await batchFactory.lookupBatch(domain, gtin);

            if (!batch) {
                //if we don't have a batch to update ...
                await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
                res.send(404, "Batch not found");
                return;
            }

            batch.update(batchData);
            try {
                await batch.persist();
            } catch (err) {
                await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
                //.... return proper error to the client

                res.send(529);
                return;
            }

        } catch (err) {
            await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
            //....
            res.send(500);
            return;
        }

        res.send(200);
    }

    this.getBatch = async function (domain, gtin, res) {
        try {
            let batch;
            batch = await batchFactory.lookupBatch(domain, gtin);

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

    this.tryToDigest = async function (domain, message, res) {
        try {
            await validationService.validateBatchMessage(message);
            let batchNumber = message.batch.batchNumber;
            if (await batchFactory.lookupBatch(domain, batchNumber)) {
                await this.updateBatch(domain, batchNumber, message, res);
                return true;
            } else {
                await this.addBatch(domain, batchNumber, message, res);
                return true;
            }
        } catch (err) {

        }

        return false;
    }
}

let instances = {};

function getInstance(version) {
    if (!instances[version]) {
        instances[version] = new BatchController(version);
    }

    return instances[version];
}

module.exports = {
    getInstance
}