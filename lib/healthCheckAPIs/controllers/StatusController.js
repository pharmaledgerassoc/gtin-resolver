function StatusController(req, res) {
    const {getUserID} = require("../../integrationAPIs/utils/getUserId");
    const logger = $$.getLogger("StatusController", "reportAPIs");
    const crypto = require('opendsu').loadAPI('crypto');

    const Status = {
        IN_PROGRESS: "inProgress",
        NEVER_EXECUTED: "neverExecuted",
        COMPLETED: "completed"
    };

    const Task = {
        CHECK_ANCHORING: "checkAnchoring",
        CHECK_BRICKING: "checkBricking",
        CHECK_DATABASES: "checkDatabases",
        CHECK_PRODUCTS: "checkProducts",
        CHECK_BATCHES: "checkBatches"
    };

    this.getConfigsInfo = (network, cluster) => {

    }
    this.getProcessStatus = async (processId) => {
        const statuses = Object.values(Status);
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        return status;
    }

    this.startProcess = async (task, processId, ...args) => {
        processId = crypto.randomBytes(32).toString("hex");
        (async () => {
            switch (task) {
                case Task.CHECK_ANCHORING:
                    break;
                case Task.CHECK_BRICKING:
                    break;
                case Task.CHECK_DATABASES:
                    break;
                case Task.CHECK_PRODUCTS:
                    break;
                case Task.CHECK_BATCHES:
                    break;
            }
        })();

        return processId;
    }

    this.listChecks = async () => {
    }

    this.getCheckResult = async (date) => {
    }

}

function getInstance(domain, subdomain) {
    return new StatusController(domain, subdomain);
}
module.exports = {
    getInstance
}