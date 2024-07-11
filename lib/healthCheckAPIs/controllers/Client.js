
function Client(){
    this.getBaseURL = () => {
        return `localhost:8080`;
    };
    this.checkSecrets = (callback) => {
        fetch(`${this.getBaseURL()}/maintenance/checkSecrets`, {
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
    this.checkInstallInfo = (callback) => {
        fetch(`${this.getBaseURL()}/maintenance/installInfo`, {
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
    this.checkSystemHealth = (callback) => {
        fetch(`${this.getBaseURL()}/maintenance/systemHealth`, {
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
    this.checkConfigsInfo = (callback) => {
        fetch(`${this.getBaseURL()}/maintenance/configsInfo`, {
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
    this.checkWallets = (callback) => {
        fetch(`${this.getBaseURL()}/maintenance/checkWallets`, {
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
        fetch(`${this.getBaseURL()}/maintenance/checkAnchoring/${action}`, {
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
        fetch(`${this.getBaseURL()}/maintenance/checkBricking/${action}`, {
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
        fetch(`${this.getBaseURL()}/maintenance/checkDatabases/${action}`, {
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
        fetch(`${this.getBaseURL()}/maintenance/checkProducts/${action}`, {
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
        fetch(`${this.getBaseURL()}/maintenance/checkBatches/${action}`, {
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