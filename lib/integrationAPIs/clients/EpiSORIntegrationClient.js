const instances = {};

function EpiSORIntegrationClient(domain) {
    const getBasePath =  () => {
        return `/integration/${domain}`;
    }

    const _sendRequest = (endpoint, method, data, callback) => {
        if(typeof data === 'function'){
            callback = data;
            data = undefined;
        }
        let body = data ? JSON.stringify(data) : undefined;
        fetch(endpoint, {method, body, headers: {'Content-Type': 'application/json'}})
            .then(response => response.json())
            .then(response => callback(undefined, response))
            .catch(error => callback(error))
    };
    
    this.addProduct = (gtin, productMessage, callback) => {
        _sendRequest(`${getBasePath()}/product/${gtin}`, 'PUT', productMessage, callback);
    };

    this.updateProduct = (gtin, productMessage, callback) => {
        _sendRequest(`${getBasePath()}/product/${gtin}`, 'POST', productMessage, callback);
    };

    this.getProduct = (gtin, callback) => {
        _sendRequest(`${getBasePath()}/product/${gtin}`, 'GET', callback);
    };

    this.addImage = (gtin, productPhotoMessage, callback) => {
        _sendRequest(`${getBasePath()}/image/${gtin}`, 'PUT', productPhotoMessage, callback);
    };

    this.addBatch = (gtin, batchNumber, batchMessage, callback) => {
        _sendRequest(`${getBasePath()}/batch/${gtin}/${batchNumber}`, 'PUT', batchMessage, callback);
    };

    this.updateBatch = (gtin, batchNumber, batchMessage, callback) => {
        _sendRequest(`${getBasePath()}/batch/${gtin}/${batchNumber}`, 'POST', batchMessage, callback);
    };

    this.getBatch = (gtin, batchNumber, callback) => {
        _sendRequest(`${getBasePath()}/batch/${gtin}/${batchNumber}`, 'GET', callback);
    };

    this.addEPI = (gtin, batchNumber, epiMessage, callback) => {
        // The endpoint for adding EPI is not differentiated by method in the index.js, so assuming PUT is used for adding.
        _sendRequest(`${getBasePath()}/epi/${gtin}/${batchNumber}`, 'PUT', epiMessage, callback);
    };

    this.deleteEPI = (gtin, batchNumber, callback) => {
        _sendRequest(`${getBasePath()}/epi/${gtin}/${batchNumber}`, 'DELETE',  callback);
    };

    this.digestMessage = (message, callback) => {
        _sendRequest(`${getBasePath()}/message`, 'PUT', message, callback);
    };

    this.digestMultipleMessages = (messages, callback) => {
        _sendRequest(`${getBasePath()}/multipleMessages`, 'PUT', messages, callback);
    };

    this.digestGroupedMessages = (groupedMessages, callback) => {
        _sendRequest(`${getBasePath()}/groupedMessages`, 'PUT', groupedMessages, callback);
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