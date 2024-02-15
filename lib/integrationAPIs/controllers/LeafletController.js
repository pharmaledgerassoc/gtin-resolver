function LeafletController(enclave, version) {
    const productFactory = require("../factories/ProductFactory.js").getInstance(enclave);
    const batchFactory = require("../factories/BatchFactory.js").getInstance(enclave);
    const auditService = require("../services/AuditService.js").getInstance(enclave);
    const validationService = require("../services/ValidationService.js").getInstance();

    this.addEPI = async function (domain, subdomain, gtin, batchNumber, leafletMessage, res) {
        try {
            // await validationService.validateLeafletMessage(domain, subdomain, leafletMessage);
        } catch (err) {
            res.send(422, "Payload validation failed");
            return;
        }

        let auditId;
        try {
            auditId = await auditService.auditOperationInProgress(domain, subdomain, "ReplaceWithProperUserId", "... and other audit entry data needed");
        } catch (err) {
            res.send(500, "Failed to audit start of an operation");
            return;
        }

        const productCode = gtin;

        let targetObject;
        try {

            if (!batchNumber) {
                targetObject = await productFactory.lookupProduct(domain, subdomain, productCode, version);
            } else {
                targetObject = await batchFactory.lookupBatch(domain, subdomain, productCode, batchNumber, version);
            }

            if (!targetObject) {
                //if we don't have a product/batch to update ...
                await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
                res.send(404, "Product/Batch not found");
                return;
            }

            await targetObject.getEventRecorderInstance(targetObject.getGTINSSI());
            try {
                await targetObject.addEPI(leafletMessage);
                await targetObject.persist();
            } catch (err) {
                await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
                //.... return proper error to the client
            }

        } catch (err) {
            await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
            //....
        }

        res.send(200);
    }

    this.getEPI = async function (domain, subdomain, gtin, batchNumber, language, type, res) {
        let auditId;
        try {
            auditId = await auditService.auditOperationInProgress(domain, subdomain, "ReplaceWithProperUserId", "... and other audit entry data needed");
        } catch (err) {
            res.send(500, "Failed to audit start of an operation");
            return;
        }

        let targetObject;
        try {

            if (!batchNumber) {
                targetObject = await productFactory.lookupProduct(domain, subdomain, gtin, version);
            } else {
                targetObject = await batchFactory.lookupBatch(domain, subdomain, gtin, batchNumber, version);
            }

            if (!targetObject) {
                //if we don't have a product/batch to update ...
                await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
                res.send(404, "Product/Batch not found");
                return;
            }

            await targetObject.getEventRecorderInstance(targetObject.getGTINSSI());
            try {
                let EPI = await targetObject.getEpi(language, type);
                return EPI;
            } catch (err) {
                await auditService.auditFail(domain, subdomain, auditId, `Failed to get EPI`);
                //.... return proper error to the client
            }

        } catch (err) {
            await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
            //....
        }
    }


    this.updateEPI = this.addEPI;

    this.deleteEPI = async function (domain, subdomain, gtin, batchNumber, leafletMessage, res) {
        try {
            await validationService.validateLeafletDeleteMessage(leafletMessage);
        } catch (err) {
            res.send(422, "Payload validation failed");
            return;
        }

        let auditId;
        try {
            auditId = await auditService.auditOperationInProgress(domain, subdomain, "ReplaceWithProperUserId", "... and other audit entry data needed");
        } catch (err) {
            res.send(500, "Failed to audit start of an operation");
            return;
        }

        let {productCode, batchCode, language} = leafletMessage;

        let targetObject;
        try {

            if (!batchCode) {
                targetObject = await productFactory.lookupProduct(domain, subdomain, productCode);
            } else {
                targetObject = await batchFactory.lookupBatch(domain, subdomain, batchCode, productCode);
            }

            if (!targetObject) {
                //if we don't have a product/batch to update ...
                await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
                res.send(404, "Product/Batch not found");
                return;
            }

            try {
                await targetObject.deleteEPI(language);
                await targetObject.persist();
            } catch (err) {
                await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
                //.... return proper error to the client
            }

        } catch (err) {
            await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
            //....
        }

        res.send(200);
    };

    this.tryToDigest = async function (domain, subdomain, message, res) {
        try {
            await validationService.validateLeafletMessage(message);
            await this.addEPI(domain, subdomain, message, res);
            return true;
        } catch (err) {

        }

        try {
            await validationService.validateLeafletDeleteMessage(message);
            await this.deleteEPI(domain, subdomain, message, res);
            return true;
        } catch (err) {

        }

        return false;
    }
}

let instances = {};

function getInstance(enclave, version) {
    if (!instances[version]) {
        instances[version] = new LeafletController(enclave, version);
    }

    return instances[version];
}

module.exports = {
    getInstance
}
