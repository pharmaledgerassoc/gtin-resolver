const {getEnclaveInstance} = require("../utils/storage.js");
const Product = require("../models/Product.js");
const enclave = getEnclaveInstance();



function ProductFactory(){

  this.createProduct = function(gtin, version){

  }

  this.lookupProduct = async function(gtin){

    //return undefined if no product found into enclave. and if we need a product object then the createProduct method should be called
  }

  this.validate = Product.prototype.validate;
}

let serviceInstance;
function getInstance(){
  if(!serviceInstance){
    serviceInstance = new ProductFactory();
  }
  return serviceInstance;
}

module.exports = {
  getInstance
};