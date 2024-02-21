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
        const http = require('opendsu').loadAPI('http');
        if (method === 'GET') {
            http.fetch(endpoint, {method})
                .then(response => response.json())
                .then(response => callback(undefined, response))
                .catch(error => callback(error))
            //TODO: CODE-REVIEW - double callback call if the callback code is throwing errors...
        } else {
            let body;
            if (method !== 'DELETE' && data) {
                body = data ? JSON.stringify(data) : undefined;
            }
            http.fetch(endpoint, {method, body})
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

    this.getProductEPIs = (gtin, language, epiType, callback) => {
        _sendRequest(`${getBaseURL()}/epi/${gtin}/${language}/${epiType}`, 'GET', callback);
    }

    this.getBatchEPIs = (gtin, batchNumber, language, epiType, callback) => {
        _sendRequest(`${getBaseURL()}/epi/${gtin}/${batchNumber}/${language}/${epiType}`, 'GET', callback);
    }

    this.addProductEPI = (gtin, language, epiType, epiMessage, callback) => {
        return _sendRequest(`${getBaseURL()}/epi/${gtin}/${language}/${epiType}`, 'POST', epiMessage, callback);
    };

    this.addBatchEPI = (gtin, batchNumber, language, epiType, epiMessage, callback) => {
        _sendRequest(`${getBaseURL()}/epi/${gtin}/${batchNumber}/${language}/${epiType}`, 'POST', epiMessage, callback);
    };

    this.updateProductEPI = (gtin, language, epiType, epiMessage, callback) => {
        return _sendRequest(`${getBaseURL()}/epi/${gtin}/${language}/${epiType}`, 'PUT', epiMessage, callback);
    }

    this.updateBatchEPI = (gtin, batchNumber, language, epiType, epiMessage, callback) => {
        _sendRequest(`${getBaseURL()}/epi/${gtin}/${batchNumber}/${language}/${epiType}`, 'PUT', epiMessage, callback);
    }

    this.deleteProductEPI = (gtin, language, epiType, callback) => {
        return _sendRequest(`${getBaseURL()}/epi/${gtin}/${language}/${epiType}`, 'DELETE', callback);
    };

    this.deleteBatchEPI = (gtin, batchNumber, language, epiType, callback) => {
        _sendRequest(`${getBaseURL()}/epi/${gtin}/${batchNumber}/${language}/${epiType}`, 'DELETE', callback);
    };

    this.listProductLangs = (gtin, epiType, callback) => {
        _sendRequest(`${getBaseURL()}/listProductLangs/${gtin}/${epiType}`, 'GET', callback);
    }

    this.listBatchLangs = (gtin, batchNumber, epiType, callback) => {
        _sendRequest(`${getBaseURL()}/listBatchLangs/${gtin}/${batchNumber}/${epiType}`, 'GET', callback);
    }

    this.digestMessage = (message, callback) => {
        _sendRequest(`${getBaseURL()}/message`, 'PUT', message, callback);
    };

    function processParametersAndSendRequest(baseURL, endpoint, start, number, query, sort, callback) {
        if (typeof start === 'function') {
            callback = start;
            start = undefined;
            number = undefined;
            sort = undefined;
            query = undefined;
        }

        if (typeof number === 'function') {
            callback = number;
            number = undefined;
            sort = undefined;
            query = undefined;
        }

        if (typeof query === 'function') {
            callback = query;
            query = undefined;
        }

        if (typeof sort === 'function') {
            callback = sort;
            sort = undefined;
        }

        if (!query) {
            query = "__timestamp > 0";
        }
        let url = `${baseURL}/${endpoint}?query=${query}`;
        if (typeof start !== 'undefined') {
            url += `&start=${start}`;
        }
        if (typeof number !== 'undefined') {
            url += `&number=${number}`;
        }
        if (typeof sort !== 'undefined') {
            url += `&sort=${sort}`;
        }
        _sendRequest(url, 'GET', callback);
    }

    this.listProducts = (start, number, query, sort, callback) => {
        processParametersAndSendRequest(getBaseURL(), 'listProducts', start, number, query, sort, callback);
    };

    this.listBatches = (start, number, query, sort, callback) => {
        processParametersAndSendRequest(getBaseURL(), 'listBatches', start, number, query, sort, callback);
    };

    this.filterAuditLogs = (start, number, query, sort, callback) => {
        processParametersAndSendRequest(getBaseURL(), 'filterAuditLogs', start, number, query, sort, callback);
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
