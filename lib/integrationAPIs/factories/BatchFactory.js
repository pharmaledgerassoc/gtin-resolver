const Batch = require("../models/Batch.js");
const BATCHES_TABLE = "batches";

function BatchFactory(enclave) {

    this.createBatch = function (domain, subdomain, gtin, batchNumber, version) {
        return new Batch(enclave, domain, subdomain, gtin, batchNumber, version);
    }

    this.lookupBatch = async function (domain, subdomain, gtin, batchNumber, version) {
        const batch = new Batch(enclave, domain, subdomain, gtin, batchNumber, version);
        if (await batch.immutableDSUIsCorrupted()) {
            const error = new Error(`Batch DSU is corrupted for ${batchNumber}`);
            error.rootCause = require("opendsu").constants.ERROR_ROOT_CAUSE.MISSING_DATA_ERROR;
            throw error;
        }

        try {
            await batch.loadMutableDSUInstance();
        } catch (e) {
            return undefined; //no batch found
        }
        await batch.loadMetadata();
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
