
function Client(){
    this.checkSecrets = (healthCheckRunId, callback) => {
        fetch(`/maintenance/checkSecrets?healthCheckRunId=${healthCheckRunId}`, {
            method: "GET"
        }).then(response => {
            if (!response.ok) {
                return callback(`HTTP error! status: ${response.status}, message: ${response.message}`);
            }
            response.json().then(data => {
                callback("",data);
            });
        });
    }
    this.checkInstallInfo = (healthCheckRunId, callback) => {
        fetch(`/maintenance/installInfo?healthCheckRunId=${healthCheckRunId}`, {
            method: "GET"
        }).then(response => {
            if (!response.ok) {
                return callback(`HTTP error! status: ${response.status}`);
            }
            response.json().then(data => {
                callback("",data);
            });
        });
    }
    this.checkSystemHealth = (healthCheckRunId, callback) => {
        fetch(`/maintenance/systemHealth?healthCheckRunId=${healthCheckRunId}`, {
            method: "GET"
        }).then(response => {
            if (!response.ok) {
                return callback(`HTTP error! status: ${response.status}`);
            }
            response.json().then(data => {
                callback("",data);
            });
        });
    }
    this.checkConfigsInfo = (healthCheckRunId, callback) => {
        fetch(`/maintenance/configsInfo?healthCheckRunId=${healthCheckRunId}`, {
            method: "GET"
        }).then(response => {
            if (!response.ok) {
                return callback(`HTTP error! status: ${response.status}`);
            }
            response.json().then(data => {
                callback("",data);
            });
        });
    }
    this.checkWallets = (healthCheckRunId, callback) => {
        fetch(`/maintenance/checkWallets?healthCheckRunId=${healthCheckRunId}`, {
            method: "GET"
        }).then(response => {
            if (!response.ok) {
                return callback(`HTTP error! status: ${response.status}`);
            }
            response.json().then(data => {
                callback("",data);
            });
        });
    }
    this.checkAnchoring = async (action, callback)=>{
        fetch(`/maintenance/checkAnchoring/${action}`, {
            method: "GET"
        }).then(response => {
            if (!response.ok) {
                return callback(`HTTP error! status: ${response.status}`);
            }
            response.text().then(text => {
                callback("",text);
            });
        });
    };
    this.checkBricking = async (status)=>{};
    this.checkDatabases = async (status)=>{};
    this.checkProducts = async (status)=>{};
    this.checkBatches = async (status)=>{};
}
function getInstance(domain, subdomain) {
    return new Client(domain, subdomain);
}
module.exports = {
    getInstance
}