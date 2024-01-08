const {EventRecorder, EVENTS} = require("../utils/Events");
const {getEnclaveInstance} = require("./../utils/storage.js");

function ModelBase(){
  let eventRecorder;
  this.getEventRecorderInstance = async function(keyssi){
    if(!eventRecorder){
      eventRecorder = new EventRecorder(this.getDSUInstance(keyssi));
    }
    return eventRecorder;
  }

  this.getDSUInstance = async function(keyssi){
    let enclave = getEnclaveInstance(keyssi.getDLDomain());
    const loadDSU = $$.promisify(enclave.loadDSU, enclave);
    let dsuInstance = await loadDSU(keyssi);
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
    let dsu = await this.getDSUInstance(this.getGTINSSI());
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
      return await eventRecorder.execute();
    }
    throw new Error("Nothing to persist");
  }

}

module.exports = ModelBase;