const ModelBase = require("./ModelBase.js");
const GTIN_SSI = require("../../GTIN_SSI.js");
const constants = require("../../constants/constants.js");
const {EVENTS} = require("../utils/Events");

function Product(domain, gtin, version){

  const IMMUTABLE_PATH = `/product/${instance.version}/`;
  let instance = new ModelBase();
  let subdomain = "NEEDS_UPDATE!!!";

  //all the data that needs to be serialized as JSON needs to be added to the instance as soon as possible
  instance.gtin = gtin;
  //there is version specific paths and logic that may need to be carefully treated
  instance.epiProtocol = version;

  instance.getJSONStoragePath = function(){
    return `/product/${instance.version}/product.json`;
  }

  instance.getLeafletStoragePath = function(language){
    return `/product/${instance.version}/${language}`;
  }

  instance.getMutableMountingPoint = function(){
   return constants.PRODUCT_DSU_MOUNT_POINT;
  }

  instance.getPathSSIData = function(){
    return {
      path: `0/${instance.gtin}`,
      domain: subdomain
    };
  }

  instance.getGTINSSI = function(){
    GTIN_SSI.createGTIN_SSI(domain, subdomain, instance.gtin);
  }


  let persist = instance.persist();
  instance.persist = async function(){
    await persist.call(instance);
//todo: check if we still need for the dsu anchoring before calling fixedURL
    /*require("./../../utils.js").activateGtinOwnerFixedUrl(productDSU, domain, gtin);
    require("./../../utils.js").activateLeafletFixedUrl(productDSU, subdomain, gtin);*/
  }

  instance.addPhoto = async function(photoData){
    let eventRecorder = await instance.getEventRecorderInstance(instance.getGTINSSI());
    eventRecorder.register(EVENTS.WRITE, IMMUTABLE_PATH+`/photo.png`, photoData);
  }

  return instance;
}

module.exports = Product;