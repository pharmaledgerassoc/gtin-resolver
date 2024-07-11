
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
    this.checkAnchoring = async (action,healthCheckId, callback)=>{
        fetch(`/maintenance/checkAnchoring/${action}`, {
            method: "POST",
            body: JSON.stringify({
                healthCheckId: healthCheckId
            }),
        }).then(response => {
            if (!response.ok) {
                return callback(`HTTP error! status: ${response.status}`);
            }
            response.text().then(text => {
                callback("",text);
            });
        });
    };
    this.checkBricking = async (action,healthCheckId,callback)=>{
        fetch(`/maintenance/checkBricking/${action}`, {
            method: "POST",
            body: JSON.stringify({
                healthCheckId: healthCheckId
            }),
        }).then(response => {
            if (!response.ok) {
                return callback(`HTTP error! status: ${response.status}`);
            }
            response.text().then(text => {
                callback("",text);
            });
        });
    };
    this.checkDatabases = async (action,healthCheckId,callback)=>{
        fetch(`/maintenance/checkDatabases/${action}`, {
            method: "POST",
            body: JSON.stringify({
                healthCheckId: healthCheckId
            }),
        }).then(response => {
            if (!response.ok) {
                return callback(`HTTP error! status: ${response.status}`);
            }
            response.text().then(text => {
                callback("",text);
            });
        });
    };
    this.checkProducts = async (action,healthCheckId,callback)=>{
        fetch(`/maintenance/checkProducts/${action}`, {
            method: "POST",
            body: JSON.stringify({
                healthCheckId: healthCheckId
            }),
        }).then(response => {
            if (!response.ok) {
                return callback(`HTTP error! status: ${response.status}`);
            }
            response.text().then(text => {
                callback("",text);
            });
        });
    };
    this.checkBatches = async (action,healthCheckId,callback)=>{
        fetch(`/maintenance/checkBatches/${action}`, {
            method: "POST",
            body: JSON.stringify({
                healthCheckId: healthCheckId
            }),
        }).then(response => {
            if (!response.ok) {
                return callback(`HTTP error! status: ${response.status}`);
            }
            response.text().then(text => {
                callback("",text);
            });
        });
    };
}
function getInstance(domain, subdomain) {
    return new Client(domain, subdomain);
}
module.exports = {
    getInstance
}