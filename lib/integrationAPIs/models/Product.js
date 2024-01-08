const {EVENTS} = require("../utils/Events.js");
const ModelBase = require("./ModelBase.js");
const GTIN_SSI = require("../../GTIN_SSI");
module.exports = function Product(domain, gtin, version){

  let instance = new ModelBase(domain);
  let eventRecorder;//will be instantiated on demand

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

  //check version before doing any deserialization
  instance.loadData = async function(){
    let dsu = await instance.getDSUInstance(this.getGTINSSI());
    let jsonSerialization = await dsu.readFile(instance.getJSONStoragePath());
    Object.assign(instance, JSON.parse(jsonSerialization));
  }

  //check version before doing any serialization
  instance.update = function(productData){
    Object.assign(instance, productData);
    let content = JSON.stringify(instance);
    eventRecorder.register(EVENTS.WRITE, instance.getJSONStoragePath(), content);
  }

  instance.getGTINSSI = function(){
    GTIN_SSI.createGTIN_SSI(domain, subdomain, instance.gtin);
  }

  instance.addLeaflet = async function(language, leaflet){
    await instance.deleteLeaflet(language);
    for(let file in leaflet){
      const {path, content} = file;
      eventRecorder.register(EVENTS.WRITE, path, content);
    }
  }

  instance.deleteLeaflet = async function(language){
    if(!eventRecorder){
      eventRecorder = await instance.getEventRecorderInstance(instance.getGTINSSI());
    }
    eventRecorder.register(EVENTS.DELETE, instance.getLeafletStoragePath(language));
  }

  instance.persist = async function(){
    if(eventRecorder){
      return await eventRecorder.execute();
    }
    throw new Error("Nothing to persist");
  }

  return instance;
}