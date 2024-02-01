function AuditService() {

    this.auditProduct = async (auditId, productMessage, context) => {

    }

    this.auditBatch  = async (auditId, batchMessage, context) => {

    }

    this.auditFail = async (domain, auditId) => {

    }

    this.auditOperationInProgress = async (domain) => {

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