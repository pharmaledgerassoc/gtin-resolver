function APIClient() {
    const baseUrl = require("opendsu").loadAPI("system").getBaseURL();
    this.fetchEndpoint = async function (endpoint, options = {}) {
        const response = await fetch(`${baseUrl}${endpoint}`, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    };

    this.checkInstallInfo = async function () {
        return this.fetchEndpoint('/maintenance/installInfo', { method: "GET" });
    };

    this.checkSystemHealth = async function () {
        return this.fetchEndpoint('/maintenance/systemHealth', { method: "GET" });
    };

    this.checkConfigsInfo = async function () {
        return this.fetchEndpoint('/maintenance/configsInfo', { method: "GET" });
    };

    this.checkWallets = async function () {
        return this.fetchEndpoint('/maintenance/checkWallets', { method: "GET" });
    };

    this.getCheckStatus = async function (checkType, healthCheckId) {
        return this.fetchEndpoint(`/maintenance/checkStatus/${checkType}/${healthCheckId}`, { method: "GET" });
    }

    this.postEndpoint = async function (endpoint, body) {
        const response = await fetch(`${baseUrl}${endpoint}`, {
            method: "POST",
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
    };

    this.checkSecrets = async function () {
        return this.postEndpoint('/maintenance/checkSecrets');
    };

    this.checkAnchoring = async function () {
        return this.postEndpoint('/maintenance/checkAnchoring');
    };

    this.checkBricking = async function () {
        return this.postEndpoint('/maintenance/checkBricking');
    };

    this.checkDatabases = async function (healthCheckId) {
        return this.postEndpoint('/maintenance/checkDatabases', { healthCheckId, tables: [] });
    };

    this.checkProducts = async function () {
        return this.postEndpoint('/maintenance/checkProducts');
    };

    this.checkBatches = async function () {
        return this.postEndpoint('/maintenance/checkBatches');
    };

    this.generateFailure = async function (component, action, args) {
        const endpoint = '/maintenance/generateFailure';
        const body = {
            component,
            action,
            args
        };
        const response = await fetch(`${baseUrl}${endpoint}`, {
            method: "DELETE",
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
    }
}

function getInstance() {
    return new APIClient();
}

module.exports = {
    getInstance
};
