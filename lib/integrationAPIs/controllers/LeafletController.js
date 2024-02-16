function LeafletController(enclave, version) {
    const productFactory = require("../factories/ProductFactory.js").getInstance(enclave);
    const batchFactory = require("../factories/BatchFactory.js").getInstance(enclave);
    const auditService = require("../services/AuditService.js").getInstance(enclave);
    const validationService = require("../services/ValidationService.js").getInstance();
    const constants = require("../utils/constants.js");
    const OPERATIONS = constants.OPERATIONS;
    this.addEPI = async (domain, subdomain, gtin, batchNumber, leafletMessage, req, res) => {
        const userId = req.headers["user-id"];
        try {
            // await validationService.validateLeafletMessage(domain, subdomain, leafletMessage);
        } catch (err) {
            res.send(422, "Payload validation failed");
            return;
        }

        const operationInProgressContext = {
            userId,
            gtin,
            batchNumber,
            operation: OPERATIONS.ADD_LEAFLET_IN_PROGRESS
        }

        const operationFailContext = {
            userId,
            gtin,
            batchNumber,
            operation: OPERATIONS.ADD_LEAFLET_FAIL
        }

        const operationSuccessContext = {
            userId,
            gtin,
            batchNumber,
            operation: OPERATIONS.ADD_LEAFLET
        }

        let auditId;
        try {
            auditId = await auditService.auditOperationInProgress(operationInProgressContext);
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
                await auditService.auditFail(auditId, operationFailContext);
                res.send(404, "Product/Batch not found");
                return;
            }

            try {
                await targetObject.addEPI(leafletMessage);
                await targetObject.persist();
            } catch (err) {
                await auditService.auditFail(auditId, operationFailContext);
                //.... return proper error to the client
            }

        } catch (err) {
            await auditService.auditFail(auditId, operationFailContext);
            //....
        }

        await auditService.auditSuccess(auditId, operationSuccessContext);
        res.send(200);
    }

    this.getEPI = async (domain, subdomain, gtin, batchNumber, language, type, req, res) => {
        let targetObject;
        try {

            if (!batchNumber) {
                targetObject = await productFactory.lookupProduct(domain, subdomain, gtin, version);
            } else {
                targetObject = await batchFactory.lookupBatch(domain, subdomain, gtin, batchNumber, version);
            }

            if (!targetObject) {
                res.send(412, "Product/Batch not found");
                return;
            }

            let EPI = await targetObject.getEpi(language, type);
            return EPI;
        } catch (err) {
            res.send(500, "Failed to get EPI")
        }
    }


    this.updateEPI = this.addEPI;

    this.deleteEPI = async (domain, subdomain, gtin, batchNumber, leafletMessage, req, res) => {
        const userId = req.headers["user-id"];
        try {
            await validationService.validateLeafletDeleteMessage(leafletMessage);
        } catch (err) {
            res.send(422, "Payload validation failed");
            return;
        }

        const operationInProgressContext = {
            userId,
            gtin,
            batchNumber,
            operation: OPERATIONS.DELETE_LEAFLET_IN_PROGRESS
        }

        const operationFailContext = {
            userId,
            gtin,
            batchNumber,
            operation: OPERATIONS.DELETE_LEAFLET_FAIL
        }

        const operationSuccessContext = {
            userId,
            gtin,
            batchNumber,
            operation: OPERATIONS.DELETE_LEAFLET
        }

        let auditId;
        try {
            auditId = await auditService.auditOperationInProgress(operationInProgressContext);
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
                await auditService.auditFail(auditId, operationFailContext);
                res.send(404, "Product/Batch not found");
                return;
            }

            try {
                await targetObject.deleteEPI(language);
                await targetObject.persist();
            } catch (err) {
                await auditService.auditFail(auditId, operationFailContext);
                res.send(500);
                return;
            }

        } catch (err) {
            await auditService.auditFail(auditId, operationFailContext);
            return res.send(500);
        }

        await auditService.auditSuccess(auditId, operationSuccessContext);
        res.send(200);
    };

    this.tryToDigest = async function (domain, subdomain, message, req, res) {
        try {
            await validationService.validateLeafletMessage(message);
            await this.addEPI(domain, subdomain, message, req, res);
            return true;
        } catch (err) {

        }

        try {
            await validationService.validateLeafletDeleteMessage(message);
            await this.deleteEPI(domain, subdomain, message, req, res);
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
