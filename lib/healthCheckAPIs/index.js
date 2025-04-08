const urlModule = require('url');
const EPI_DOMAIN = process.env.EPI_DOMAIN;
const EPI_SUBDOMAIN = process.env.EPI_SUBDOMAIN;
const constants = require('./constants');
const openDSU = require('opendsu');
const crypto = openDSU.loadAPI('crypto');
const enclave = openDSU.loadAPI('enclave');

const bodyReaderMiddleware = require('../middlewares/bodyReaderMiddleware');
const {generatePk} = require("./utils");

module.exports = function healthCheckAPIs(server) {
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

    const statusController = require("./controllers/StatusController.js").getInstance(server);
    const apiClient = require("./controllers/APIClient.js").getInstance();
    const getDomainAndSubdomain = (req) => {
        const urlParts = urlModule.parse(req.url, true);
        let {domain, subdomain} = urlParts.query;
        domain = domain || EPI_DOMAIN;
        subdomain = subdomain || EPI_SUBDOMAIN;
        return {domain, subdomain};
    }

    server.get('/maintenance/fixSecrets', async function (req, res) {
        try {
            const urlParts = urlModule.parse(req.url, true);
            const {healthCheckRunId} = urlParts.query;
            let secretsPk = getComponentPk(healthCheckRunId, "secrets");
            let result = statusController.fixSecrets();
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
            let data = statusController.getInstallInfo();
            res.send(200, data);
        } catch (e) {
            res.send(500, e.message);
        }
    });

    server.get('/maintenance/systemHealth', function (req, res) {
        try {
            let data = statusController.getSystemHealthInfo();
            res.send(200, data);
        } catch (e) {
            res.send(500, e.message);
        }
    });

    server.get('/maintenance/checkSecrets', function (req, res) {
        try {
            let data = statusController.checkSecrets();
            res.send(200, data);
        } catch (e) {
            res.send(500, e.message);
        }
    });
    server.get('/maintenance/configsInfo', function (req, res) {
        try {
            let data = statusController.getConfigsInfo();
            res.send(200, data);
        } catch (e) {
            res.send(500, e.message);
        }
    });

    server.get('/maintenance/checkWallets', function (req, res) {
        try {
            let data = statusController.checkWallets();
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
            let result = statusController.fixWallet();
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
        syncChecks.push($$.promisify(apiClient.checkSecrets)());
        syncChecks.push($$.promisify(apiClient.checkInstallInfo)());
        syncChecks.push($$.promisify(apiClient.checkSystemHealth)());
        syncChecks.push($$.promisify(apiClient.checkConfigsInfo)());
        syncChecks.push($$.promisify(apiClient.checkWallets)());
        promises.push($$.promisify(apiClient.checkAnchoring)("start", pk));
        promises.push($$.promisify(apiClient.checkBricking)("start", pk));
        promises.push($$.promisify(apiClient.checkDatabases)("start", pk));
        promises.push($$.promisify(apiClient.checkProducts)("start", pk));
        promises.push($$.promisify(apiClient.checkBatches)("start", pk));
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
            //await $$.promisify(apiClient.checkAnchoring)("status");
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
                    await statusController.startProcess(checkType, healthCheckId, req.body);
                    res.send(200, `${checkType} started for health check:${healthCheckId}`);
                } catch (error) {
                    res.send(500, "Failed to start process." + error);
                }
                return;
            case "status":
                try {
                    const verificationStatus = await statusController.getCheckStatus(checkType, healthCheckId);
                    res.send(200, `${checkType} status for health check:${healthCheckId} is ${verificationStatus}`);
                } catch (error) {
                    res.send(500, "Failed to get process status." + error);
                }
                return;
            case "listChecks":
                try {
                    const checks = await statusController.listChecks(checkType);
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
                    const result = await statusController.getCheckResult(checkType, date);
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

    server.get('/maintenance/checkStatus/:healthCheckId', statusController.getCheckStatus);
    server.post('/maintenance/checkAnchoring', statusController.checkAnchoring);
    server.post('/maintenance/checkBricking', statusController.checkBricking);
    server.post('/maintenance/checkSecrets', statusController.checkSecrets);
    server.post('/maintenance/checkDatabases', statusController.checkDatabases);
    server.post('/maintenance/checkProducts', statusController.checkProducts);
    server.post('/maintenance/checkBatches', statusController.checkBatches);
    server.post('/maintenance/startHealthCheck', statusController.startHealthCheck);
    server.delete('/maintenance/generateFailure', statusController.generateFailure);
}
