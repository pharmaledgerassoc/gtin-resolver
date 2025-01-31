const constants = require("./../../constants/constants.js");
const instances = {};

//TODO: CODE-REVIEW - why do we have callback type functions if in the app and APIs the new trend is to use async/await ?
const systemAPI = require('opendsu').loadAPI("system");

function EpiSORIntegrationClient(domain, subdomain, appName) {
    const getBaseURL = () => {
        return `${systemAPI.getBaseURL()}/integration`;
    }

    const getEpiProductUrl = (gtin, language, epiType, ePIMarket) => {
        const baseEndpoint = `${getBaseURL()}/epi/${gtin}/${language}/${epiType}`;
        return ePIMarket ? `${baseEndpoint}/${ePIMarket}` : baseEndpoint;
    };

    const _sendRequest = (endpoint, method, data, responseType, callback) => {
        if (typeof data === 'function') {
            callback = data;
            data = undefined;
            responseType = "json";
        }

        if (typeof responseType === 'function') {
            callback = responseType;
            responseType = "json";
        }

        //add domain and subdomain as query parameters
        //check if the endpoint already has query parameters
        if (endpoint.indexOf('?') !== -1) {
            endpoint += '&';
        } else {
            endpoint += '?';
        }
        endpoint += `domain=${encodeURIComponent(domain)}&subdomain=${encodeURIComponent(subdomain)}`;
        if (appName) {
            endpoint += `&appName=${encodeURIComponent(appName)}`
        }
        const http = require('opendsu').loadAPI('http');
        if (method === 'GET') {
            let promise = http.fetch(endpoint, {method})
                .then(async response => {
                    if (response.status >= 400) {
                        let reason = await response.text();
                        throw {code: response.status, reason}
                    }
                    return response
                })

            if (responseType === "json") {
                promise.then(response => response.json())
                    .then(response => callback(undefined, response))
                    .catch(error => callback(error))

            } else {
                promise.then(response => response.text())
                    .then(response => callback(undefined, response))
                    .catch(error => callback(error))
            }

            //TODO: CODE-REVIEW - double callback call if the callback code is throwing errors...
        } else {
            let body;
            if (method !== 'DELETE' && data) {
                body = data ? JSON.stringify(data) : undefined;
            }
            http.fetch(endpoint, {method, body})
                .then(async response => {
                    if (response.status >= 400) {
                        let reason = await response.text();
                        throw {code: response.status, reason}
                    }
                    return response
                })
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

    this.getImage = (gtin, dsuVersion, callback) => {
        let url = `${getBaseURL()}/image/${gtin}?domain=${encodeURIComponent(domain)}&subdomain=${encodeURIComponent(subdomain)}`;

        if (typeof dsuVersion === "function") {
            callback = dsuVersion;
        } else {
            if (dsuVersion) {
                url = `${url}&version=${dsuVersion}`;
            }
        }
        const http = require('opendsu').loadAPI('http');
        http.fetch(url, {method: 'GET'})
            .then(response => response.text())
            .then(response => callback(undefined, response))
            .catch(error => callback(error));
        //TODO: CODE-REVIEW - double callback call if the callback code is throwing errors...
    }

    this.addBatch = (gtin, batchNumber, batchMessage, callback) => {
        //TODO: CODE-REVIEW - validate the payload before sending it.
        _sendRequest(`${getBaseURL()}/batch/${gtin}/${encodeURIComponent(batchNumber)}`, 'POST', batchMessage, callback);
    };

    this.addAuditLog = (logType, auditMessage, callback) => {
        _sendRequest(`${getBaseURL()}/audit/${logType}`, 'POST', auditMessage, callback);
    }

    this.updateBatch = (gtin, batchNumber, batchMessage, callback) => {
        //TODO: CODE-REVIEW - validate the payload before sending it.
        _sendRequest(`${getBaseURL()}/batch/${gtin}/${encodeURIComponent(batchNumber)}`, 'PUT', batchMessage, callback);
    };

    this.getBatchMetadata = (gtin, batchNumber, callback) => {
        _sendRequest(`${getBaseURL()}/batch/${gtin}/${encodeURIComponent(batchNumber)}`, 'GET', callback);
    };

    this.getProductEPIs = (gtin, language, epiType, dsuVersion, callback) => {
        let url = `${getBaseURL()}/epi/${gtin}/${language}/${epiType}`;
        if (typeof dsuVersion === "function") {
            callback = dsuVersion;
        } else {
            if (dsuVersion) {
                url = `${url}?version=${dsuVersion}`;
            }
        }

        _sendRequest(url, 'GET', callback);
    }

    this.getProductEPIsByMarket = (gtin, language, epiType, epiMarket, dsuVersion, callback) => {
        let url = `${getBaseURL()}/epi/${gtin}/${language}/${epiType}/${epiMarket}`;
        if (typeof dsuVersion === "function") {
            callback = dsuVersion;
        } else {
            if (dsuVersion) {
                url = `${url}?version=${dsuVersion}`;
            }
        }
        _sendRequest(url, 'GET', callback);
    }

    this.getBatchEPIs = (gtin, batchNumber, language, epiType, dsuVersion, callback) => {
        let url = `${getBaseURL()}/epi/${gtin}/${encodeURIComponent(batchNumber)}/${language}/${epiType}`;
        if (typeof dsuVersion === "function") {
            callback = dsuVersion;
        } else {
            if (dsuVersion) {
                url = `${url}?version=${dsuVersion}`;
            }
        }

        _sendRequest(url, 'GET', callback);
    }

    this.addProductEPI = (gtin, language, epiType, ePIMarket, epiMessage, callback) => {
        const url = getEpiProductUrl(gtin, language, epiType, ePIMarket);
        return _sendRequest(url, 'POST', epiMessage, callback);
    };

    this.addBatchEPI = (gtin, batchNumber, language, epiType, epiMessage, callback) => {
        _sendRequest(`${getBaseURL()}/epi/${gtin}/${encodeURIComponent(batchNumber)}/${language}/${epiType}`, 'POST', epiMessage, callback);
    };

    this.updateProductEPI = (gtin, language, epiType, epiMarket, epiMessage, callback) => {
        const url = getEpiProductUrl(gtin, language, epiType, epiMarket);
        return _sendRequest(url, 'PUT', epiMessage, callback);
    }

    this.updateBatchEPI = (gtin, batchNumber, language, epiType, epiMessage, callback) => {
        _sendRequest(`${getBaseURL()}/epi/${gtin}/${encodeURIComponent(batchNumber)}/${language}/${epiType}`, 'PUT', epiMessage, callback);
    }

    this.deleteProductEPI = (gtin, language, epiType, epiMarket, callback) => {
        const url = getEpiProductUrl(gtin, language, epiType, epiMarket);
        return _sendRequest(url, 'DELETE', callback);
    };

    this.deleteBatchEPI = (gtin, batchNumber, language, epiType, callback) => {
        _sendRequest(`${getBaseURL()}/epi/${gtin}/${encodeURIComponent(batchNumber)}/${language}/${epiType}`, 'DELETE', callback);
    };

    this.listProductLangs = (gtin, epiType, callback) => {
        _sendRequest(`${getBaseURL()}/listProductLangs/${gtin}/${epiType}`, 'GET', callback);
    }

    this.listProductMarkets = (gtin, epiType, callback) => {
        _sendRequest(`${getBaseURL()}/listProductMarkets/${gtin}/${epiType}`, 'GET', callback);
    }

    this.listBatchLangs = (gtin, batchNumber, epiType, callback) => {
        _sendRequest(`${getBaseURL()}/listBatchLangs/${gtin}/${encodeURIComponent(batchNumber)}/${epiType}`, 'GET', callback);
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

    this.filterAuditLogs = (logType, start, number, query, sort, callback) => {
        processParametersAndSendRequest(getBaseURL(), `audit/${logType}`, start, number, query, sort, callback);
    }

    this.doDemiurgeMigration = (demiurgeSharedEnclaveKeySSI, callback) => {
        _sendRequest(`${systemAPI.getBaseURL()}/doDemiurgeMigration`, 'PUT', {demiurgeSharedEnclaveKeySSI}, callback);
    };

    this.getDemiurgeMigrationStatus = (callback) => {
        _sendRequest(`${systemAPI.getBaseURL()}/getDemiurgeMigrationStatus`, 'GET', undefined, "text", callback);
    }

    this.doDSUFabricMigration = (epiSharedEnclaveKeySSI, callback) => {
        _sendRequest(`${systemAPI.getBaseURL()}/doMigration`, 'PUT', {epiSharedEnclaveKeySSI}, callback);
    }

    this.getDSUFabricMigrationStatus = (callback) => {
        _sendRequest(`${systemAPI.getBaseURL()}/getMigrationStatus`, 'GET', undefined, "text", callback);
    }

    this.digestMultipleMessages = (messages, callback) => {
        //TODO: CODE-REVIEW - validate the payload before sending it.
        _sendRequest(`${getBaseURL()}/multipleMessages`, 'PUT', messages, callback);
    };

    this.digestGroupedMessages = (groupedMessages, callback) => {
        //TODO: CODE-REVIEW - validate the payload before sending it.
        _sendRequest(`${getBaseURL()}/groupedMessages`, 'PUT', groupedMessages, callback);
    };

    this.objectStatus = async (productCode, batchNumber, callback) => {
        const systemAPI = require('opendsu').loadAPI("system");
        const http = require('opendsu').loadAPI('http');
        if (typeof batchNumber === "function") {
            callback = batchNumber;
            batchNumber = undefined;
        }

        let endpoint = `${systemAPI.getBaseURL()}/integration/objectStatus/${productCode}`;
        if (batchNumber) {
            endpoint += `/${encodeURIComponent(batchNumber)}`;
        }

        let response = await http.fetch(endpoint, {method: 'GET'});
        if (response.status !== 200) {
            return callback(Error("Failed to retrieve info"));
        }

        response = await response.text();
        return callback(undefined, response);
    };

    this.recover = async (productCode, batchNumber, callback) => {
        const systemAPI = require('opendsu').loadAPI("system");
        const http = require('opendsu').loadAPI('http');
        let endpointName = "recoverBatch";
        if (typeof batchNumber === "function") {
            callback = batchNumber;
            batchNumber = undefined;
            endpointName = "recoverProduct"
        }

        let endpoint = `${systemAPI.getBaseURL()}/integration/${endpointName}/${productCode}`;
        if (batchNumber) {
            endpoint += `/${encodeURIComponent(batchNumber)}`;
        }

        let response = await http.fetch(endpoint, {method: 'POST'});
        if (response.status !== 200) {
            return callback(Error("Failed to recover"));
        }

        return callback(undefined, response);
    };

    this.getGTINStatus = (productCode, callback) => {
        const systemAPI = require('opendsu').loadAPI("system");
        const http = require('opendsu').loadAPI('http');
        http.fetch(`${systemAPI.getBaseURL()}/gtinOwner/${domain}/${productCode}`, {method: 'GET'})
            .then(response => response.json())
            .then(response => {
                if (response.domain === domain) {
                    callback(undefined, JSON.stringify({
                        gtinStatus: constants.GTIN_AVAILABILITY_STATUS.OWNED,
                        ownerDomain: response.domain
                    }))
                } else {
                    callback(undefined, JSON.stringify({
                        gtinStatus: constants.GTIN_AVAILABILITY_STATUS.USED,
                        ownerDomain: response.domain
                    }))
                }
            })
            .catch(error => {
                let err404Status = require('opendsu').constants.ERROR_ROOT_CAUSE.MISSING_DATA_ERROR;
                if (error.rootCause === err404Status) {
                    callback(undefined, JSON.stringify({
                        gtinStatus: constants.GTIN_AVAILABILITY_STATUS.FREE
                    }))
                } else {
                    callback(error)
                }
            })
    };
}

const getInstance = (domain, subdomain, appName) => {
    const key = appName ? `${domain}_${subdomain}_${appName}` : `${domain}_${subdomain}`;
    if (!instances[key]) {
        instances[key] = new EpiSORIntegrationClient(domain, subdomain, appName);
    }

    return instances[key];
}

module.exports = {
    getInstance
};
