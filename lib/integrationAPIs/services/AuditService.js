const {getEnclaveInstance} = require("../utils/LightDBEnclaveFactory.js");

function AuditService() {

    this.auditSuccess = function (auditId) {

    }

    this.auditFail = async function (domain, auditId) {
        const enclave = getEnclaveInstance(domain);

    }

    this.auditOperationInProgress = async function (domain) {

    }
}

let serviceInstance;

function getInstance() {
    if (!serviceInstance) {
        serviceInstance = new AuditService();
    }
    return serviceInstance;
}

module.exports = {
    getInstance
};