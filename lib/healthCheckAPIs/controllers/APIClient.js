const http = require("opendsu").loadAPI("http");
function APIClient() {
    const baseUrl = require("opendsu").loadAPI("system").getBaseURL();
    this.fetchEndpoint = async function (endpoint, options = {}) {
        const response = await http.fetch(`${baseUrl}${endpoint}`, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    };

    this.checkInstallInfo = async function () {
        return this.fetchEndpoint('/maintenance/installInfo', {method: "GET"});
    };

    this.checkSystemHealth = async function () {
        return this.fetchEndpoint('/maintenance/systemHealth', {method: "GET"});
    };

    this.checkConfigsInfo = async function () {
        return this.fetchEndpoint('/maintenance/configsInfo', {method: "GET"});
    };

    this.checkWallets = async function () {
        return this.fetchEndpoint('/maintenance/checkWallets', {method: "GET"});
    };

    this.getCheckStatus = async function (healthCheckId, checkType) {
        let endpoint = `/maintenance/checkStatus/${healthCheckId}`;
        // if checkType is provided, append it to the endpoint as a query parameter
        if (checkType) {
            endpoint += `?checkType=${checkType}`;
        }
        return this.fetchEndpoint(endpoint, {method: "GET"});
    }

    this.postEndpoint = async function (endpoint, body) {
        const response = await http.fetch(`${baseUrl}${endpoint}`, {
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

    this.checkSecrets = async function (healthCheckId) {
        return this.postEndpoint('/maintenance/checkSecrets', {healthCheckId});
    };

    this.checkAnchoring = async function (healthCheckId) {
        return this.postEndpoint('/maintenance/checkAnchoring', {healthCheckId});
    };

    this.checkBricking = async function (healthCheckId) {
        return this.postEndpoint('/maintenance/checkBricking', {healthCheckId});
    };

    this.checkDatabases = async function (healthCheckId) {
        return this.postEndpoint('/maintenance/checkDatabases', {healthCheckId, tables: [
                "audit",
                "products",
                "batches",
                "user-access"
            ]
        });
    };

    this.checkProducts = async function (healthCheckId) {
        return this.postEndpoint('/maintenance/checkProducts', {healthCheckId});
    };

    this.checkBatches = async function (healthCheckId) {
        return this.postEndpoint('/maintenance/checkBatches', {healthCheckId});
    };

    this.startHealthCheck = async function () {
        return this.postEndpoint('/maintenance/startHealthCheck');
    }

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

    this.getIterationsMetadata = async function (start, number, sort, query) {
        let endpoint = `/maintenance/getIterationsMetadata?start=${start}&number=${number}&sort=${sort}&query=${query}`
        return this.fetchEndpoint(endpoint, {method: "GET"});

    }
}

function getInstance() {
    return new APIClient();
}

module.exports = {
    getInstance
};
