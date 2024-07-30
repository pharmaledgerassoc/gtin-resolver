const urlModule = require('url');
const fs = require("fs").promises;
const path = require("path");
const EPI_DOMAIN = process.env.EPI_DOMAIN;
const EPI_SUBDOMAIN = process.env.EPI_SUBDOMAIN;
const constants = require('./constants');
const openDSU = require('opendsu');
const keySSISpace = openDSU.loadAPI("keyssi");
const crypto = openDSU.loadAPI('crypto');
const enclave = openDSU.loadAPI('enclave');
const https = require('https');
const {URL} = require('url');
const {makeRequest} = require('./utils');
const bodyParser = require("../middlewares/bodyReaderMiddleware");
const baseURL = openDSU.loadAPI('system').getBaseURL();

const bodyReaderMiddleware = require('../middlewares/bodyReaderMiddleware');

function healthCheckAPIs(server) {
    // this middleware injects the send method on res object before proceeding...
    server.use("/maintenance/*", addSendMethodMiddleware);
    server.use("/maintenance/*", bodyReaderMiddleware);
    const dbName = "demiurge";
    const lightDBEnclaveClient = enclave.initialiseLightDBEnclave(dbName);
    try {
        lightDBEnclaveClient.createDatabase(dbName, (err) => {
            if (err) {
                console.log("Failed to create database", err);
                return;
            }
            lightDBEnclaveClient.grantWriteAccess($$.SYSTEM_IDENTIFIER, (err) => {
                if (err) {
                    console.log("Failed to grant write access", err);
                }
            });
        });
    } catch (e) {
        //db already exists
    }


    const getDomainAndSubdomain = (req) => {
        const urlParts = urlModule.parse(req.url, true);
        let {domain, subdomain} = urlParts.query;
        domain = domain || EPI_DOMAIN;
        subdomain = subdomain || EPI_SUBDOMAIN;
        return {domain, subdomain};
    }
    server.use("/maintenance/*", async function (req, res, next) {
        const {domain, subdomain} = getDomainAndSubdomain(req);
        req.statusController = require("./controllers/StatusController.js").getInstance(domain, subdomain);
        req.client = require("./controllers/APIClient.js").getInstance(domain, subdomain);
        next();
    })


    server.get('/maintenance/fixSecrets', async function (req, res) {
        try {
            const urlParts = urlModule.parse(req.url, true);
            const {healthCheckRunId} = urlParts.query;
            let secretsPk = getComponentPk(healthCheckRunId, "secrets");
            let result = req.statusController.fixSecrets();
            let record = await $$.promisify(lightDBEnclaveClient.getRecord)($$.SYSTEM_IDENTIFIER, healthCheckRunId, secretsPk);
            record.data.status = result;
            await $$.promisify(lightDBEnclaveClient.updateRecord)($$.SYSTEM_IDENTIFIER, healthCheckRunId, secretsPk, record);
            if (result === constants.HEALTH_CHECK_STATUSES.REPAIRED) {
                await updateHealthCheckStatus(healthCheckRunId);
            }
            res.send(200, "Success");
        } catch (e) {
            res.send(500, e.message);
        }
    });
    server.get('/maintenance/installInfo', function (req, res) {
        try {
            let data = req.statusController.getInstallInfo();
            res.send(200, data);
        } catch (e) {
            res.send(500, e.message);
        }
    });

    server.get('/maintenance/systemHealth', function (req, res) {
        try {
            let data = req.statusController.getSystemHealthInfo();
            res.send(200, data);
        } catch (e) {
            res.send(500, e.message);
        }
    });

    server.get('/maintenance/checkSecrets', function (req, res) {
        try {
            let data = req.statusController.checkSecrets();
            res.send(200, data);
        } catch (e) {
            res.send(500, e.message);
        }
    });
    server.get('/maintenance/configsInfo', function (req, res) {
        try {
            let data = req.statusController.getConfigsInfo();
            res.send(200, data);
        } catch (e) {
            res.send(500, e.message);
        }
    });

    server.get('/maintenance/checkWallets', function (req, res) {
        try {
            let data = req.statusController.checkWallets();
            res.send(200, data);
        } catch (e) {
            res.send(500, e.message);
        }
    });
    server.get('/maintenance/fixWallet', async function (req, res) {
        try {
            const urlParts = urlModule.parse(req.url, true);
            const {healthCheckRunId} = urlParts.query;
            let walletsPk = getComponentPk(healthCheckRunId, "wallets");
            let result = req.statusController.fixWallet();
            let record = await $$.promisify(lightDBEnclaveClient.getRecord)($$.SYSTEM_IDENTIFIER, healthCheckRunId, walletsPk);
            record.data.status = result;
            await $$.promisify(lightDBEnclaveClient.updateRecord)($$.SYSTEM_IDENTIFIER, healthCheckRunId, walletsPk, record);
            if (result === constants.HEALTH_CHECK_STATUSES.REPAIRED) {
                await updateHealthCheckStatus(healthCheckRunId);
            }
            res.send(200, "Success");
        } catch (e) {
            res.send(500, e.message);
        }
    });

    async function updateHealthCheckStatus(healthCheckRunId, res) {
        let record = await $$.promisify(lightDBEnclaveClient.getRecord)($$.SYSTEM_IDENTIFIER, constants.HEALTH_CHECK_TABLE, healthCheckRunId);
        let data = record.data;
        data.failedChecksNr = data.failedChecksNr - 1;
        if (data.failedChecksNr === 0) {
            data.status = constants.HEALTH_CHECK_STATUSES.SUCCESS;
        }
        await $$.promisify(lightDBEnclaveClient.updateRecord)($$.SYSTEM_IDENTIFIER, constants.HEALTH_CHECK_TABLE, healthCheckRunId, {data: data});
    }

    server.get('/maintenance/removeWrongBrick', function (req, res) {
        res.send(200, "Rename with extension “.wrong”, and  it makes it inaccessible the file corresponding to a brick that does not validate its hash (it is empty or with wrong data)");
    });

    server.get('/maintenance/fixLocalAnchor', function (req, res) {
        res.send(200, "Restore the status of a wrong anchor or recreate it (for anchors used by wallets only)");
    });

    server.get('/maintenance/fixDID', function (req, res) {
        res.send(200, "Forcefully change the private key for a DID that was lost");
    });
    server.post('/maintenance/healthCheck/:action', async function (req, res) {
        let action = req.params.action;
        try {
            if (action === constants.HEALTH_CHECK_ACTIONS.START) {
                await startHealthCheck(req, res);
            } else if (action === constants.HEALTH_CHECK_ACTIONS.STATUS) {
                const urlParts = urlModule.parse(req.url, true);
                const {healthCheckRunId} = urlParts.query;
                let data = await getIterationStatus(healthCheckRunId);
                res.send(200, data);
            }
        } catch (e) {
            res.send(500, e.message);
        }
    });

    async function getIterationStatus(healthCheckRunId) {
        let record = await $$.promisify(lightDBEnclaveClient.getRecord)($$.SYSTEM_IDENTIFIER, constants.HEALTH_CHECK_TABLE, healthCheckRunId);
        return record.data;
    }

    async function startHealthCheck(req, res) {
        let pk = generatePk();
        const objectData = {
            status: constants.HEALTH_CHECK_STATUSES.IN_PROGRESS,
            date: Date.now(),
            pk: pk
        }
        await $$.promisify(lightDBEnclaveClient.insertRecord)($$.SYSTEM_IDENTIFIER, constants.HEALTH_CHECK_TABLE, pk, {data: objectData});
        let promises = [];
        let syncChecks = [];
        syncChecks.push($$.promisify(req.client.checkSecrets)());
        syncChecks.push($$.promisify(req.client.checkInstallInfo)());
        syncChecks.push($$.promisify(req.client.checkSystemHealth)());
        syncChecks.push($$.promisify(req.client.checkConfigsInfo)());
        syncChecks.push($$.promisify(req.client.checkWallets)());
        promises.push($$.promisify(req.client.checkAnchoring)("start", pk));
        promises.push($$.promisify(req.client.checkBricking)("start", pk));
        promises.push($$.promisify(req.client.checkDatabases)("start", pk));
        promises.push($$.promisify(req.client.checkProducts)("start", pk));
        promises.push($$.promisify(req.client.checkBatches)("start", pk));
        let results = await Promise.all(promises);
        let syncResults;
        syncResults = await Promise.all(syncChecks);
        for (let data of syncResults) {
            let componentPk = getComponentPk(pk, data.name);
            await $$.promisify(lightDBEnclaveClient.insertRecord)($$.SYSTEM_IDENTIFIER, pk, componentPk, {data: data});
        }
        let failedChecks = 0;
        for (let result of syncResults) {
            if (result.status === constants.HEALTH_CHECK_STATUSES.FAILED) {
                failedChecks++;
            }
        }

        setInterval(async () => {
            //await $$.promisify(req.client.checkAnchoring)("status");
            for (let result of results) {
                if (result.status === constants.HEALTH_CHECK_STATUSES.FAILED) {
                    failedChecks++;
                }
            }
            let checkStatus = failedChecks === 0 ? constants.HEALTH_CHECK_STATUSES.SUCCESS : constants.HEALTH_CHECK_STATUSES.FAILED;

            await markIterationComplete(pk, checkStatus, failedChecks);
        }, 2000);
        res.send(200, pk);
    }

    async function markIterationComplete(pk, status, failedChecksNr) {
        let record = await $$.promisify(lightDBEnclaveClient.getRecord)($$.SYSTEM_IDENTIFIER, constants.HEALTH_CHECK_TABLE, pk);
        record.data.status = status;
        record.data.failedChecksNr = failedChecksNr;
        await $$.promisify(lightDBEnclaveClient.updateRecord)($$.SYSTEM_IDENTIFIER, constants.HEALTH_CHECK_TABLE, pk, record);
    }

    server.get('/maintenance/getIterationComponent', async function (req, res) {
        const urlParts = urlModule.parse(req.url, true);
        const {healthCheckRunId, componentName} = urlParts.query;
        let pk = healthCheckRunId + "_" + componentName;
        try {
            let record = await $$.promisify(lightDBEnclaveClient.getRecord)($$.SYSTEM_IDENTIFIER, healthCheckRunId, pk);
            res.setHeader("Content-type", "text/json");
            res.send(200, JSON.stringify(record.data));
        } catch (e) {
            res.send(500, e.message);
        }
    });
    server.get('/maintenance/getIterationsMetadata', async function (req, res) {
        const urlParts = urlModule.parse(req.url, true);
        const {start, number, sort, query} = urlParts.query;
        try {
            let records = await $$.promisify(lightDBEnclaveClient.filter)($$.SYSTEM_IDENTIFIER, constants.HEALTH_CHECK_TABLE, query, sort, number);
            res.setHeader("Content-type", "text/json");
            res.send(200, JSON.stringify(records.map(record => {
                record.data.__timestamp = record.__timestamp;
                return record.data;
            })));
        } catch (e) {
            res.send(500, e.message);
        }
    });
    server.get('/maintenance/getIterationResults', function (req, res) {
        const urlParts = urlModule.parse(req.url, true);
        const {healthCheckRunId} = urlParts.query;
        lightDBEnclaveClient.getAllRecords($$.SYSTEM_IDENTIFIER, healthCheckRunId, (err, records) => {
            if (err) {
                res.send(500, "Failed to get records");
                return;
            }
            res.setHeader("Content-type", "text/json");
            res.send(200, JSON.stringify(records.map(record => record.data)));
        });
    })

    function generatePk() {
        return Array.from(crypto.generateRandom(32))
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
    }

    function getComponentPk(healthCheckPK, componentName) {
        return healthCheckPK + "_" + componentName;
    }


    function addSendMethodMiddleware(req, res, next) {
        res.send = function send(statusCode, result) {
            res.setHeader('Server', 'Maintenance Middleware');
            res.statusCode = statusCode;
            res.end(typeof result === "string" ? result : JSON.stringify(result));
        }
        next();
    }

    /* Asynchronous APIs */

    async function checkHandler(req, res, checkType) {
        const action = req.params.action;
        const healthCheckId = req.body.healthCheckId;
        if (!healthCheckId) {
            res.send(400, "Health check ID is required.");
            return;
        }
        switch (action) {
            case "start":
                try {
                    await req.statusController.startProcess(checkType, healthCheckId, req.body);
                    res.send(200, `${checkType} started for health check:${healthCheckId}`);
                } catch (error) {
                    res.send(500, "Failed to start process." + error);
                }
                return;
            case "status":
                try {
                    const verificationStatus = await req.statusController.getCheckStatus(checkType, healthCheckId);
                    res.send(200, `${checkType} status for health check:${healthCheckId} is ${verificationStatus}`);
                } catch (error) {
                    res.send(500, "Failed to get process status." + error);
                }
                return;
            case "listChecks":
                try {
                    const checks = await req.statusController.listChecks(checkType);
                    res.send(200, checks);
                } catch (error) {
                    res.send(500, "Failed to get process status." + error);
                }
                return;
            case "result":
                const date = req.body.date;
                if (!date) {
                    res.send(400, "Date is required.");
                    return;
                }
                try {
                    const result = await req.statusController.getCheckResult(checkType, date);
                    res.send(200, result);
                } catch (error) {
                    res.send(500, "Failed to get process status." + error);
                }
                return;
            default:
                res.send(400, "Invalid action");
                return;
        }
    }

    async function checkProducts(req, res) {
        try {
            // Step 1: Make an authorized request to list products URL
            const getProductsURL = baseURL + '/integration/listProducts?query=__timestamp%20%3E%200';
            const headers = {
                'Authorization': req.headers.authorization,
                'Content-Type': 'application/json'
            };

            const responseProducts = await makeRequest(getProductsURL, 'GET', headers);

            const products = responseProducts.body;
            const urlParts = urlModule.parse(req.url, true);
            const {healthCheckRunId} = urlParts.query;
            let record = await $$.promisify(lightDBEnclaveClient.getRecord)($$.SYSTEM_IDENTIFIER, constants.HEALTH_CHECK_TABLE, healthCheckRunId);

            // Step 2: For each object, send a request to list languages URL
            const totalProducts = products.length;
            for (let i = 0; i < totalProducts; i++) {
                const product = products[i];
                const getLanguagesURL = baseURL + `/integration/listProductLangs/${product.productCode}/leaflet`;
                const responseLanguages = await makeRequest(getLanguagesURL, 'GET', headers);

                const languages = responseLanguages.body;

                // Update progress
                data.status = `In Progress: ${((i + 1) / totalProducts * 100).toFixed(0)}%`;
                await $$.promisify(lightDBEnclaveClient.updateRecord)($$.SYSTEM_IDENTIFIER, constants.HEALTH_CHECK_TABLE, healthCheckRunId, {data: data});

                // Step 4: If the response is an array of language codes, send a request to URL
                if (Array.isArray(languages) && languages.length > 0) {
                    for (const lang of languages) {
                        const getLeafletsURL = baseURL + `/integration/epi/${product.productCode}/${lang}/leaflet`;
                        await makeRequest(getLeafletsURL, 'GET', headers);
                    }
                }
            }

            res.statusCode = 200;
            // Step 6: If no errors occur, log success message
            res.end("Products check successful, no issues found");
            // const checkData = { products: products, status: Status.COMPLETED, name: Task.CHECK_PRODUCTS };
            // resolve(markCheckCompletion(Task.CHECK_PRODUCTS, healthCheckId, checkData));
        } catch (error) {
            res.statusCode = 500;
            let message = "";
            // Handle errors by logging the appropriate message
            if (error.statusCode) {
                message = `Request to ${error.url} failed with status ${error.statusCode} and response body ${error.body}`;
            } else {
                message = `Request failed with error: ${error.message}`;
            }
            res.end(message);
        }
    }

    async function checkBatches(req, res) {
        try {
            // Step 1: Make an authorized request to list batches URL
            const getBatchesURL = baseURL + '/integration/listBatches?query=__timestamp%20%3E%200';
            const headers = {
                'Authorization': req.headers.authorization,
                'Content-Type': 'application/json'
            };

            const responseBatches = await makeRequest(getBatchesURL, 'GET', headers);

            const batches = responseBatches.body;
            const urlParts = urlModule.parse(req.url, true);
            const {healthCheckRunId} = urlParts.query;
            let record = await $$.promisify(lightDBEnclaveClient.getRecord)($$.SYSTEM_IDENTIFIER, constants.HEALTH_CHECK_TABLE, healthCheckRunId);

            // Step 2: For each object, send a request to list languages URL
            const totalBatches = batches.length;
            for (let i = 0; i < totalBatches; i++) {
                const batch = batches[i];
                const getLanguagesURL = baseURL + `/integration/listProductLangs/${batch.productCode}/${batch.batchNumber}/leaflet`;
                const responseLanguages = await makeRequest(getLanguagesURL, 'GET', headers);

                const languages = responseLanguages.body;

                // Update progress
                data.status = `Progress: ${((i + 1) / totalBatches * 100).toFixed(0)}%`;
                await $$.promisify(lightDBEnclaveClient.updateRecord)($$.SYSTEM_IDENTIFIER, constants.HEALTH_CHECK_TABLE, healthCheckRunId, {data: data});

                // Step 4: If the response is an array of language codes, send a request to URL
                if (Array.isArray(languages) && languages.length > 0) {
                    for (const lang of languages) {
                        const getLeafletsURL = baseURL + `/integration/epi/${batch.productCode}/${batch.batchNumber}/${lang}/leaflet`;
                        await makeRequest(getLeafletsURL, 'GET', headers);
                    }
                }
            }

            res.statusCode = 200;
            // Step 6: If no errors occur, log success message
            res.end("Batches check successful, no issues found");
            // const checkData = { batches: batches, status: Status.COMPLETED, name: Task.CHECK_BATCHES };
            // resolve(markCheckCompletion(Task.CHECK_BATCHES, healthCheckId, checkData));
        } catch (error) {
            res.statusCode = 500;
            let message = "";
            // Handle errors by logging the appropriate message
            if (error.statusCode) {
                message = `Request to ${error.url} failed with status ${error.statusCode} and response body ${error.body}`;
            } else {
                message = `Request failed with error: ${error.message}`;
            }
            res.end(message);
        }
    }

    function isArraySuffix(a, b) {
        // Step 1: Check if 'b' is longer than 'a'
        if (b.length > a.length) {
            return false;
        }

        // Step 2: Calculate the starting index 'k' in 'a'
        let k = a.length - b.length;

        // Step 3: Compare elements from 'a[k]' to 'a[a.length - 1]' with 'b'
        for (let i = 0; i < b.length; i++) {
            if (a[k + i] !== b[i]) {
                return false;
            }
        }

        return true;
    }

    const checkAnchorsForDomain = async (domain) => {
        const domainPath = path.join(server.rootFolder, "external-volume", "domains", domain);
        const anchorsPath = path.join(domainPath, "anchors");
        const anchorFiles = await fs.readdir(anchorsPath);
        const report = {
            corruptAnchors: {
                fixable: [],
                notFixable: []
            }
        }
        for (let i = 0; i < anchorFiles.length; i++) {
            const anchorFile = anchorFiles[i];
            const anchorPath = path.join(anchorsPath, anchorFile);
            const anchorContent = await fs.readFile(anchorPath);
            const lines = anchorContent.toString().split("\n");
            //remove the last line if it is empty
            if (lines[lines.length - 1] === "") {
                lines.pop();
            }
            const missingBrickMaps = [];
            for (let j = 0; j < lines.length; j++) {
                const encodedHashLink = lines[j];
                if (encodedHashLink === "") {
                    const obj = {
                        anchor: anchorFile,
                        reason: "Empty hashlink",
                        line: j
                    }
                    report.corruptAnchors.notFixable.push(obj)
                    // break from the second loop
                    break;
                }
                const decodedHashLink = crypto.decodeBase58(encodedHashLink).toString();
                let signedHashlinkSSI;
                try {
                    signedHashlinkSSI = keySSISpace.parse(decodedHashLink);
                } catch (e) {
                    const obj = {
                        anchor: anchorFile,
                        reason: `Failed to parse hashlink ${decodedHashLink}`,
                        line: j
                    }
                    report.corruptAnchors.notFixable.push(obj);
                    break;
                }
                const originalHash = signedHashlinkSSI.getHash();
                let hash = originalHash;
                let counter = 0;
                let found = false;
                while (counter < 5 && !found) {
                    const hashPrefix = hash.substring(0, 2);
                    const brickPath = path.join(domainPath, "brick-storage", hashPrefix, originalHash);
                    try {
                        await fs.access(brickPath);
                        found = true;
                    } catch (e) {
                        if (e.code === "ENOENT") {
                            if (!report.warnings) {
                                report.warnings = [];
                            }
                            counter++;
                            // change the case of the hash to accommodate for case-sensitive file systems
                            if (counter === 1) {
                                hash = hash.substring(0, 1).toLowerCase() + hash.substring(1, 2).toUpperCase() + hash.substring(2);
                            } else if (counter === 2) {
                                hash = hash.substring(0, 1).toUpperCase() + hash.substring(1, 2).toLowerCase() + hash.substring(2);
                            } else if (counter === 3) {
                                hash = hash.toLowerCase();
                            } else {
                                hash = hash.toUpperCase();
                            }
                        } else {
                            const obj = {
                                anchor: anchorFile,
                                reason: `Error accessing brickPath ${brickPath}`,
                                line: j
                            }
                            report.corruptAnchors.notFixable.push(obj);
                            break;
                        }
                    }
                }
                if (!found) {
                    missingBrickMaps.push(encodedHashLink);
                }

                // if the missing brickmaps are at the end of the anchor file, the anchor file can be fixed
                if (missingBrickMaps.length > 0) {
                    if (isArraySuffix(lines, missingBrickMaps)) {
                        const obj = {
                            anchor: anchorFile,
                            reason: `Missing brickMaps at the end of the anchor file`,
                            line: lines.length - missingBrickMaps.length,
                            missingBrickMaps: missingBrickMaps
                        }
                        report.corruptAnchors.fixable.push(obj);
                    }
                }
            }
        }

        return report;
    }

    const checkAnchoring = async function (req, res) {
        const domainsPath = path.join(server.rootFolder, "external-volume", "domains");
        try{
            await fs.access(domainsPath);
        } catch (e) {
            res.statusCode = 500;
            res.end(`Error accessing ${domainsPath}: ${e.message}`);
            return;
        }
        const domains = await fs.readdir(domainsPath);
        const reports = [];
        for (let i = 0; i < domains.length; i++) {
            const domain = domains[i];
            const report = await checkAnchorsForDomain(domain);
            reports.push(report);
        }

        res.statusCode = 200;
        res.end(JSON.stringify(reports));
    }

    const checkBrickingForDomain = async (domain) => {
        const domainPath = path.join(server.rootFolder, "external-volume", "domains", domain);
        const bricksPath = path.join(domainPath, "brick-storage");
        const bricksSubfolders = await fs.readdir(bricksPath);
        const corruptBricks = [];
        // iterate over each subfolder
        for (let i = 0; i < bricksSubfolders.length; i++) {
            const subfolder = bricksSubfolders[i];
            const subfolderPath = path.join(bricksPath, subfolder);
            const brickFiles = await fs.readdir(subfolderPath);
            // iterate over each brick file
            for (let j = 0; j < brickFiles.length; j++) {
                const brickFile = brickFiles[j];
                const brickPath = path.join(subfolderPath, brickFile);
                try {
                    await fs.access(brickPath);
                    const brickContent = await fs.readFile(brickPath);
                    // compute content hash
                    const hash = crypto.sha256(brickContent);
                    if (hash !== brickFile) {
                        corruptBricks.push({
                            brick: brickFile,
                            reason: "Invalid hash"
                        });
                    }
                } catch (e) {
                    if (e.code === "ENOENT") {
                        corruptBricks.push({
                            brick: brickFile,
                            reason: "File not found"
                        });
                    }
                }
            }
        }
        return corruptBricks;
    }

    const checkBricking = async function (req, res) {
        const domainsPath = path.join(server.rootFolder, "external-volume", "domains");
        const domains = await fs.readdir(domainsPath);
        const reports = {};
        for (let i = 0; i < domains.length; i++) {
            const domain = domains[i];
            const report = await checkBrickingForDomain(domain);
            reports[domain] = report;
        }

        res.statusCode = 200;
        res.end(JSON.stringify(reports));
    }

    const generateFailure = async function (req, res) {
        const FailuresRegistry = require('./controllers/FailuresRegistry');
        const failuresRegistry = new FailuresRegistry();
        const action = req.body.action;
        const component = req.body.component;
        try {
            failuresRegistry.execute(component, action, server.rootFolder, req.body.args);
            res.statusCode = 200;
            res.end("Success");
        } catch (e) {
            res.statusCode = 500;
            res.end(e.message);
        }
    }

    // server.post('/maintenance/generateFailure', bodyParser);
    server.post('/maintenance/generateFailure', generateFailure);

    server.post('/maintenance/checkAnchoring', checkAnchoring);
    server.post('/maintenance/checkBricking', checkBricking);


    server.post('/maintenance/checkDatabases/:action', async function (req, res) {
        await checkHandler(req, res, 'checkDatabases')
    });
    server.post('/maintenance/checkProducts', checkProducts);

    server.post('/maintenance/checkBatches/', checkBatches);
}

module.exports = healthCheckAPIs;