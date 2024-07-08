function StatusController(req, res) {
    const {getUserID} = require("../../integrationAPIs/utils/getUserId");
    const logger = $$.getLogger("StatusController", "reportAPIs");

    this.getConfigsInfo = (network, cluster) => {

    }
}

function getInstance(domain, subdomain) {
    return new StatusController(domain, subdomain);
}