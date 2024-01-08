const {EventRecorder, EVENTS} = require("../utils/Events");
const {getEnclaveInstance} = require("./../utils/storage.js");

function ModelBase(){
  let eventRecorder;
  this.getEventRecorderInstance = async function(keyssi){
    if(!eventRecorder){
      eventRecorder = new EventRecorder(this.loadImmutableDSUInstance(keyssi));
    }
    return eventRecorder;
  }

  this.getGTINSSI = function(){
    throw new Error("Not implemented! Needs to be implemented in the wrapper class");
  }

  this.getLeafletStoragePath = function(){
    throw new Error("Not implemented! Needs to be implemented in the wrapper class");
  }

  this.getJSONStoragePath = function(){
    throw new Error("Not implemented! Needs to be implemented in the wrapper class");
  }

  this.ensureDSUStructure = function(){
    throw new Error("Not implemented! Needs to be implemented in the wrapper class");
  }

  this.loadImmutableDSUInstance = async function(){
    const keyssi = this.getGTINSSI();
    let enclave = getEnclaveInstance(keyssi.getDLDomain());
    const loadDSU = $$.promisify(enclave.loadDSU, enclave);
    let dsuInstance = await loadDSU(keyssi);
    return dsuInstance;
  }

  this.createImmutableDSUInstance = async function(){
    const keyssi = this.getGTINSSI();
    let enclave = getEnclaveInstance(keyssi.getDLDomain());
    const createDSUForExistingSSI = $$.promisify(enclave.createDSUForExistingSSI, enclave);
    let dsuInstance = await createDSUForExistingSSI(keyssi);
    return dsuInstance;
  }

  this.createDSUInstanceForSSI = async function(keyssi){
    let enclave = getEnclaveInstance(keyssi.getDLDomain());
    const createDSUForExistingSSI = $$.promisify(enclave.createDSUForExistingSSI, enclave);
    let dsuInstance = await createDSUForExistingSSI(keyssi);
    return dsuInstance;
  }

  this.addLeaflet = async function(language, leaflet){
    await this.deleteLeaflet(language);
    for(let file in leaflet){
      const {path, content} = file;
      eventRecorder.register(EVENTS.WRITE, path, content);
    }
  }

  this.deleteLeaflet = async function(language){
    let eventRecorder = await this.getEventRecorderInstance(this.getGTINSSI());
    eventRecorder.register(EVENTS.DELETE, this.getLeafletStoragePath(language));
  }

  //check version before doing any deserialization
  this.loadData = async function(){
    let dsu = await this.loadImmutableDSUInstance(this.getGTINSSI());
    let jsonSerialization = await dsu.readFile(this.getJSONStoragePath());
    Object.assign(this, JSON.parse(jsonSerialization));
  }

  //check version before doing any serialization
  this.update = function(data){
    Object.assign(this, data);
    let content = JSON.stringify(this);
    eventRecorder.register(EVENTS.WRITE, this.getJSONStoragePath(), content);
  }

  this.persist = async function(){
    if(eventRecorder){
      try{
        await this.loadImmutableDSUInstance();
      }catch(err){
        //how to know that the Immutable DSU exists or not ??!
        await this.ensureDSUStructure();
      }
      return await eventRecorder.execute();
    }
    throw new Error("Nothing to persist");
  }

}

module.exports = ModelBase;