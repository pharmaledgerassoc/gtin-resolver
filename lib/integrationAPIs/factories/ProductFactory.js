const Product = require("../models/Product.js");
const PRODUCTS_TABLE = "products";

function ProductFactory(enclave) {

    this.createProduct = function (domain, subdomain, gtin, version) {
        return new Product(enclave, domain, subdomain, gtin, version);
    }

    this.lookupProduct = async function (domain, subdomain, gtin, version) {
        const product = new Product(enclave, domain, subdomain, gtin, version);
        if (await product.immutableDSUIsCorrupted()) {
            const error = new Error(`Product DSU is corrupted for ${gtin}`);
            error.rootCause = require("opendsu").constants.ERROR_ROOT_CAUSE.MISSING_DATA_ERROR;
            throw error;
        }

        try {
            await product.loadMutableDSUInstance();
        } catch (e) {
            return undefined; //no product found
        }
        return product;
    }
}

let serviceInstance;

function getInstance(enclave) {
    if (!serviceInstance) {
        serviceInstance = new ProductFactory(enclave);
    }
    return serviceInstance;
}

module.exports = {
    getInstance
};