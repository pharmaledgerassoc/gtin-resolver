const Product = require("../models/Product.js");
const PRODUCTS_TABLE = "products";

function ProductFactory(enclave) {

    this.createProduct = function (domain, subdomain, gtin, version) {
        return new Product(enclave, domain, subdomain, gtin, version);
    }

    this.lookupProduct = async function (domain, subdomain, gtin) {
        try {
            let result = enclave.lookupAsync(PRODUCTS_TABLE, gtin);
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
        serviceInstance = new ProductFactory(enclave);
    }
    return serviceInstance;
}

module.exports = {
    getInstance
};