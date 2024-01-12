const ModelBase = require("./ModelBase.js");
const GTIN_SSI = require("../../GTIN_SSI.js");
const constants = require("../../constants/constants.js");
const {EVENTS} = require("../utils/Events");

function Batch(domain, batchId, gtin, version){

  const MUTABLE_MOUNTING_POINT = `/batch`;
  let instance = new ModelBase();
  let subdomain = "NEEDS_UPDATE!!!";

  //all the data that needs to be serialized as JSON needs to be added to the instance as soon as possible
  instance.gtin = gtin;
  instance.batchId = batchId;
  //there is version specific paths and logic that may need to be carefully treated
  instance.epiProtocol = version;

  instance.getJSONStoragePath = function(){
    return `${MUTABLE_MOUNTING_POINT}/batch.epi_v${instance.version}.json`;
  }

  instance.getLeafletStoragePath = function(language){
    let path = `${MUTABLE_MOUNTING_POINT}/leaflet`;
    if(language){
      path += `/${language}`;
    }
    return path;
  }

  instance.getSMPCStoragePath = function(language){
    let path = `${MUTABLE_MOUNTING_POINT}/smpc`;
    if(language){
      path += `/${language}`;
    }
    return path;
  }

  instance.getMutableMountingPoint = function(){
   return constants.BATCH_DSU_MOUNT_POINT;
  }

  instance.getPathSSIData = function(){
    return {
      path: `0/${gtin}/${batchId}`,
      domain: subdomain
    };
  }

  instance.getGTINSSI = function(){
    GTIN_SSI.createGTIN_SSI(domain, subdomain, instance.gtin, instance.batchId);
  }


  let persist = instance.persist();
  instance.persist = async function(){
    await persist.call(instance);
//todo: check if we still need for the dsu anchoring before calling fixedURL
    /*require("./../../utils.js").activateGtinOwnerFixedUrl(productDSU, domain, gtin);
    require("./../../utils.js").activateLeafletFixedUrl(productDSU, subdomain, gtin);*/
  }

  return instance;
}

module.exports = Batch;