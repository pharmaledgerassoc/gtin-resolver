const {EVENTS} = require("../utils/Events.js");
const ModelBase = require("./ModelBase.js");
const GTIN_SSI = require("../../GTIN_SSI");
module.exports = function Product(domain, gtin, version){

  let instance = new ModelBase(domain);

  //all the data that needs to be serialized as JSON needs to be added to the instance as soon as possible
  instance.gtin = gtin;
  //there is version specific paths and logic that may need to be carefully treated
  instance.version = version;
  instance.epiProtocol = version;

  instance.getJSONStoragePath = function(){
    return `/product/${instance.version}/product.json`;
  }

  instance.getLeafletStoragePath = function(language){
    return `/product/${instance.version}/language`;
  }

  instance.getGTINSSI = function(){
    GTIN_SSI.createGTIN_SSI(domain, subdomain, instance.gtin);
  }

  return instance;
}