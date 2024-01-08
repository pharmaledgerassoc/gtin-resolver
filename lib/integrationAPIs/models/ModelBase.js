const {EventRecorder} = require("../utils/Events");
const {getEnclaveInstance} = require("./../utils/storage.js");
const opendsu = require("opendsu");
const sc = opendsu.loadApi("sc");

module.exports = function ModelBase(){
  this.getEventRecorderInstance = async function(keyssi){
    let recorder = new EventRecorder(this.getDSUInstance(keyssi));
    return recorder;
  }

  this.getDSUInstance = async function(keyssi){
    let enclave = getEnclaveInstance(keyssi.getDLDomain());
    const loadDSU = $$.promisify(enclave.loadDSU, enclave);
    let dsuInstance = await loadDSU(keyssi);
    return dsuInstance;
  }

}