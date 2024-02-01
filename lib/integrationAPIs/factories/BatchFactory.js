const Batch = require("../models/Batch.js");
const BATCHES_TABLE = "batches";

function BatchFactory(enclave) {

    this.createBatch = function (domain, subdomain, batchId, gtin, version) {
        return new Batch(enclave, domain, subdomain, batchId, gtin, version);
    }

    this.lookupBatch = async function (domain, subdomain, batchId, gtin) {
        const batch = new Batch(enclave, domain, subdomain, batchId, gtin);
        if (await batch.immutableDSUIsCorrupted()) {
            const error = new Error(`Batch DSU is corrupted for ${batchId}`);
            error.rootCause = require("opendsu").constants.ERROR_ROOT_CAUSE.MISSING_DATA_ERROR;
            throw error;
        }

        try {
            await batch.loadMutableDSUInstance();
        } catch (e) {
            return undefined; //no batch found
        }
        return batch;
    }
}

let serviceInstance;

function getInstance(enclave) {
    if (!serviceInstance) {
        serviceInstance = new BatchFactory(enclave);
    }
    return serviceInstance;
}

module.exports = {
    getInstance
};