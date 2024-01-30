const {getEnclaveInstance} = require("../utils/LightDBEnclaveFactory.js");
const Batch = require("../models/Batch.js");
const BATCHES_TABLE = "batches";

function BatchFactory() {

    this.createBatch = function (domain, batchId, gtin, version) {
        return new Batch(domain, batchId, gtin, version);
    }

    this.lookupBatch = async function (domain, batchId, gtin) {
        const enclave = getEnclaveInstance(domain);
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

function getInstance() {
    if (!serviceInstance) {
        serviceInstance = new BatchFactory();
    }
    return serviceInstance;
}

module.exports = {
    getInstance
};