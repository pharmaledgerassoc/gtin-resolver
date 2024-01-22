const instances = {};

function EpiSORIntegrationClient(domain) {
    const getBaseURL = () => {
        const systemAPI = require('opendsu').loadAPI("system");

        return `${systemAPI.getBaseURL()}/integration/${domain}`;
    }

    const _sendRequest = (endpoint, method, data, callback) => {
        if (typeof data === 'function') {
            callback = data;
            data = undefined;
        }
        if (method === 'GET') {
            fetch(endpoint, {method})
                .then(response => response.json())
                .then(response => callback(undefined, response))
                .catch(error => callback(error))
        } else {
            let body = data ? JSON.stringify(data) : undefined;
            fetch(endpoint, {method, body, headers: {'Content-Type': 'application/json'}})
                .then(response => response.text())
                .then(response => callback(undefined, response))
                .catch(error => callback(error))
        }
    };

    this.addProduct = (gtin, productMessage, callback) => {
        _sendRequest(`${getBaseURL()}/product/${gtin}`, 'POST', productMessage, callback);
    };

    this.updateProduct = (gtin, productMessage, callback) => {
        _sendRequest(`${getBaseURL()}/product/${gtin}`, 'PUT', productMessage, callback);
    };

    this.getProduct = (gtin, callback) => {
        _sendRequest(`${getBaseURL()}/product/${gtin}`, 'GET', callback);
    };

    this.addImage = (gtin, productPhotoMessage, callback) => {
        _sendRequest(`${getBaseURL()}/image/${gtin}`, 'PUT', productPhotoMessage, callback);
    };

    this.addBatch = (gtin, batchNumber, batchMessage, callback) => {
        _sendRequest(`${getBaseURL()}/batch/${gtin}/${batchNumber}`, 'POST', batchMessage, callback);
    };

    this.updateBatch = (gtin, batchNumber, batchMessage, callback) => {
        _sendRequest(`${getBaseURL()}/batch/${gtin}/${batchNumber}`, 'PUT', batchMessage, callback);
    };

    this.getBatch = (gtin, batchNumber, callback) => {
        _sendRequest(`${getBaseURL()}/batch/${gtin}/${batchNumber}`, 'GET', callback);
    };

    this.addEPI = (gtin, batchNumber, epiMessage, callback) => {
        _sendRequest(`${getBaseURL()}/epi/${gtin}/${batchNumber}`, 'POST', epiMessage, callback);
    };

    this.deleteEPI = (gtin, batchNumber, callback) => {
        _sendRequest(`${getBaseURL()}/epi/${gtin}/${batchNumber}`, 'DELETE', callback);
    };

    this.digestMessage = (message, callback) => {
        _sendRequest(`${getBaseURL()}/message`, 'PUT', message, callback);
    };

    this.digestMultipleMessages = (messages, callback) => {
        _sendRequest(`${getBaseURL()}/multipleMessages`, 'PUT', messages, callback);
    };

    this.digestGroupedMessages = (groupedMessages, callback) => {
        _sendRequest(`${getBaseURL()}/groupedMessages`, 'PUT', groupedMessages, callback);
    };
}

const getInstance = (domain) => {
    if (!instances[domain]) {
        instances[domain] = new EpiSORIntegrationClient(domain);
    }

    return instances[domain];
}

module.exports = {
    getInstance
};