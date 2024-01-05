const {getEnclaveInstance} = require("../utils/storage.js");

const enclave = getEnclaveInstance();

function AuditService(){

  this.auditSuccess = function(auditId){

  }

  this.auditFail = async function(auditId){

  }

  this.auditOperationInProgress = async function(){

  }
}

let serviceInstance;
function getInstance(){
  if(!serviceInstance){
    serviceInstance = new AuditService();
  }
  return serviceInstance;
}

module.exports = {
  getInstance
};