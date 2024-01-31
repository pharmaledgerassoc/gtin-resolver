const {getEnclaveInstance} = require("../utils/LightDBEnclaveFactory.js");
const Batch = require("../models/Batch.js");
const BATCHES_TABLE = "batches";

function BatchFactory(enclave) {

    this.createBatch = function (domain, subdomain, batchId, gtin, version) {
        return new Batch(enclave, domain, subdomain, batchId, gtin, version);
    }

    this.lookupBatch = async function (domain, subdomain, batchId, gtin) {
        try {
            let result = enclave.lookupAsync(BATCHES_TABLE, batchId, gtin);
            return result;
        } catch (err) {

        }
        return undefined;
        //return undefined if no product found into enclave. and if we need a product object then the createProduct method should be called
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