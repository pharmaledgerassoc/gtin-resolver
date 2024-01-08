const ModelBase = require("./ModelBase.js");
const GTIN_SSI = require("../../GTIN_SSI");

function Product(domain, gtin, version){

  let instance = new ModelBase(domain);
  let subdomain = "NEEDS_UPDATE!!!";

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

  instance.ensureDSUStructure = async function(){
    const constants = require("../../constants/constants");

    let mutableDSU = await this.createPathSSIDSU(subdomain, `0/${instance.gtin}`);
    let sreadSSI = await mutableDSU.getKeySSIAsString("sread");
    let immutableDSU = await instance.createImmutableDSUInstance(instance.getGTINSSI());
    await immutableDSU.mount(constants.PRODUCT_DSU_MOUNT_POINT, sreadSSI);
  }

  return instance;
}

Product.prototype.validate = async function(payload){
  const schema = require("../../mappings/product/productSchema.js");
  const validationUtils = require("../../utils/ValidationUtils.js");
  await validationUtils.validateMessageOnSchema(payload, schema);
  await validationUtils.validateMVP1Values(payload, "product");
}

module.exports = Product;