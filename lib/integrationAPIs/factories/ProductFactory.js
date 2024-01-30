const {getEnclaveInstance} = require("../utils/LightDBEnclaveFactory.js");
const Product = require("../models/Product.js");
const PRODUCTS_TABLE = "products";

function ProductFactory() {

    this.createProduct = function (domain, gtin, version) {
        return new Product(domain, gtin, version);
    }

    this.lookupProduct = async function (domain, gtin) {
        const enclave = getEnclaveInstance(domain);
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

function getInstance() {
    if (!serviceInstance) {
        serviceInstance = new ProductFactory();
    }
    return serviceInstance;
}

module.exports = {
    getInstance
};