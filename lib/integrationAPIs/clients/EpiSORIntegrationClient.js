const instances = {};

//TODO: CODE-REVIEW - why do we have callback type functions if in the app and APIs the new trend is to use async/await ?

function EpiSORIntegrationClient(domain, subdomain) {
    const getBaseURL = () => {
        const systemAPI = require('opendsu').loadAPI("system");

        return `${systemAPI.getBaseURL()}/integration/${domain}/${subdomain}`;
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
            //TODO: CODE-REVIEW - double callback call if the callback code is throwing errors...
        } else {
            let body = data ? JSON.stringify(data) : undefined;
            fetch(endpoint, {method, body})
                .then(response => response.text())
                .then(response => callback(undefined, response))
                .catch(error => callback(error))
            //TODO: CODE-REVIEW - double callback call if the callback code is throwing errors...
        }
    };

    this.addProduct = (gtin, productMessage, callback) => {
        _sendRequest(`${getBaseURL()}/product/${gtin}`, 'POST', productMessage, callback);
    };

    this.updateProduct = (gtin, productMessage, callback) => {
        _sendRequest(`${getBaseURL()}/product/${gtin}`, 'PUT', productMessage, callback);
    };

    this.getProductMetadata = (gtin, callback) => {
        _sendRequest(`${getBaseURL()}/product/${gtin}`, 'GET', callback);
    };

    this.addImage = (gtin, productPhotoMessage, callback) => {
        _sendRequest(`${getBaseURL()}/image/${gtin}`, 'POST', productPhotoMessage, callback);
    };

    this.updateImage = (gtin, productPhotoMessage, callback) => {
        _sendRequest(`${getBaseURL()}/image/${gtin}`, 'PUT', productPhotoMessage, callback);
    };

    this.getImage = (gtin, callback) => {
        const url = `${getBaseURL()}/image/${gtin}`;
        fetch(url, {method: 'GET'})
            .then(response => response.text())
            .then(response => callback(undefined, response))
            .catch(error => callback(error));
        //TODO: CODE-REVIEW - double callback call if the callback code is throwing errors...
    }

    this.addBatch = (gtin, batchNumber, batchMessage, callback) => {
        //TODO: CODE-REVIEW - validate the payload before sending it.
        _sendRequest(`${getBaseURL()}/batch/${gtin}/${batchNumber}`, 'POST', batchMessage, callback);
    };

    this.updateBatch = (gtin, batchNumber, batchMessage, callback) => {
        //TODO: CODE-REVIEW - validate the payload before sending it.
        _sendRequest(`${getBaseURL()}/batch/${gtin}/${batchNumber}`, 'PUT', batchMessage, callback);
    };

    this.getBatchMetadata = (gtin, batchNumber, callback) => {
        _sendRequest(`${getBaseURL()}/batch/${gtin}/${batchNumber}`, 'GET', callback);
    };

    this.addEPI = (gtin, batchNumber, epiMessage, callback) => {
        //TODO: CODE-REVIEW - validate the payload before sending it.
        if (typeof epiMessage === 'function') {
            callback = epiMessage;
            epiMessage = batchNumber;
            batchNumber = undefined;
        }
        if (!batchNumber) {
            return _sendRequest(`${getBaseURL()}/epi/${gtin}`, 'POST', epiMessage, callback);
        }
        _sendRequest(`${getBaseURL()}/epi/${gtin}/${batchNumber}`, 'POST', epiMessage, callback);
    };

    this.updateEPI = (gtin, batchNumber, epiMessage, callback) => {
        //TODO: CODE-REVIEW - validate the payload before sending it.
        if (typeof epiMessage === 'function') {
            callback = epiMessage;
            epiMessage = batchNumber;
            batchNumber = undefined;
        }
        if (!batchNumber) {
            return _sendRequest(`${getBaseURL()}/epi/${gtin}`, 'PUT', epiMessage, callback);
        }
        _sendRequest(`${getBaseURL()}/epi/${gtin}/${batchNumber}`, 'PUT', epiMessage, callback);
    }

    this.deleteEPI = (gtin, batchNumber, callback) => {
        if (typeof batchNumber === 'function') {
            callback = batchNumber;
            batchNumber = undefined;
        }
        if (!batchNumber) {
            return _sendRequest(`${getBaseURL()}/epi/${gtin}`, 'DELETE', callback);
        }
        _sendRequest(`${getBaseURL()}/epi/${gtin}/${batchNumber}`, 'DELETE', callback);
    };

    this.digestMessage = (message, callback) => {
        _sendRequest(`${getBaseURL()}/message`, 'PUT', message, callback);
    };

    this.listProducts = (start, number, query, sort, callback) => {
        _sendRequest(`${getBaseURL()}/listProducts?start=${start}&number=${number}&query=${query}&sort=${sort}`, 'GET', callback);
    }

    this.listBatches = (start, number, query, sort, callback) => {
        _sendRequest(`${getBaseURL()}/listBatches?start=${start}&number=${number}&query=${query}&sort=${sort}`, 'GET', callback);
    }
    this.digestMultipleMessages = (messages, callback) => {
        //TODO: CODE-REVIEW - validate the payload before sending it.
        _sendRequest(`${getBaseURL()}/multipleMessages`, 'PUT', messages, callback);
    };

    this.digestGroupedMessages = (groupedMessages, callback) => {
        //TODO: CODE-REVIEW - validate the payload before sending it.
        _sendRequest(`${getBaseURL()}/groupedMessages`, 'PUT', groupedMessages, callback);
    };
}

const getInstance = (domain, subdomain) => {
    const key = `${domain}_${subdomain}`;
    if (!instances[key]) {
        instances[key] = new EpiSORIntegrationClient(domain, subdomain);
    }

    return instances[key];
}

module.exports = {
    getInstance
};