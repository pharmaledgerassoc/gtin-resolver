const urlModule = require('url');
const EPI_DOMAIN = process.env.EPI_DOMAIN;
const EPI_SUBDOMAIN = process.env.EPI_SUBDOMAIN;
const HEALTH_CHECK_TABLE = "health_check";

const openDSU = require('opendsu');
const crypto = openDSU.loadAPI('crypto');
const enclave = openDSU.loadAPI('enclave');

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
        req.systemHealthController = require("./controllers/SystemHealthController.js").getInstance(domain, subdomain);
        req.client = require("./controllers/Client.js").getInstance(domain, subdomain);
        next();
    })


    server.get('/maintenance/fixSecrets', function (req, res) {
        try {
            const urlParts = urlModule.parse(req.url, true);
            const {healthCheckRunId} = urlParts.query;
            let secretsPk = getComponentPk(healthCheckRunId, "secrets");
            let result = req.systemHealthController.fixSecrets();
            lightDBEnclaveClient.getRecord($$.SYSTEM_IDENTIFIER, healthCheckRunId, secretsPk, (err, record) => {
                if (err) {
                    res.send(500, err.message);
                    return;
                }
                record.data.status = result;
                lightDBEnclaveClient.updateRecord($$.SYSTEM_IDENTIFIER, healthCheckRunId, secretsPk, record, (err) => {
                    if (err) {
                        res.send(500, err.message);
                        return;
                    }
                    updateHealthIterationStatus(healthCheckRunId, res);
                });
            });
        } catch (e) {
            res.send(500, e.message);
        }
    });
    server.get('/maintenance/installInfo', function (req, res) {
        try {
            let data = req.systemHealthController.getInstallInfo();
            res.send(200, data);
        } catch (e) {
            res.send(500, e.message);
        }
    });

    server.get('/maintenance/systemHealth', function (req, res) {
        try {
            let data = req.systemHealthController.getSystemHealthInfo();
            res.send(200, data);
        } catch (e) {
            res.send(500, e.message);
        }
    });

    server.get('/maintenance/checkSecrets', function (req, res) {
        try {
            let data = req.systemHealthController.checkSecrets();
            res.send(200, data);
        } catch (e) {
            res.send(500, e.message);
        }
    });
    server.get('/maintenance/configsInfo', function (req, res) {
        try {
            let data = req.systemHealthController.getConfigsInfo();
            res.send(200, data);
        } catch (e) {
            res.send(500, e.message);
        }
    });

    server.get('/maintenance/checkWallets', function (req, res) {
        try {
            let data = req.systemHealthController.checkWallets();
            res.send(200, data);
        } catch (e) {
            res.send(500, e.message);
        }
    });
    server.get('/maintenance/fixWallet', function (req, res) {
        try {
            const urlParts = urlModule.parse(req.url, true);
            const {healthCheckRunId} = urlParts.query;
            let walletsPk = getComponentPk(healthCheckRunId, "wallets");
            let result = req.systemHealthController.fixWallet();
            lightDBEnclaveClient.getRecord($$.SYSTEM_IDENTIFIER, healthCheckRunId, walletsPk, (err, record) => {
                if (err) {
                    res.send(500, err.message);
                    return;
                }
                record.data.status = result;
                lightDBEnclaveClient.updateRecord($$.SYSTEM_IDENTIFIER, healthCheckRunId, walletsPk, record, (err) => {
                    if (err) {
                        res.send(500, err.message);
                        return;
                    }
                    updateHealthIterationStatus(healthCheckRunId, res);
                });
            });
        } catch (e) {
            res.send(500, e.message);
        }
    });
    function updateHealthIterationStatus(healthCheckRunId, res){
        lightDBEnclaveClient.getRecord($$.SYSTEM_IDENTIFIER, HEALTH_CHECK_TABLE, healthCheckRunId, (err, record) => {
            if (err) {
                return res.send(500, "Failed to get record");
            }
            record.data.failedChecksNr = parseInt(record.data.failedChecksNr) - 1;
            if (record.data.failedChecksNr === 0) {
                record.data.status = "success";
            }
            lightDBEnclaveClient.updateRecord($$.SYSTEM_IDENTIFIER, HEALTH_CHECK_TABLE, healthCheckRunId, record, (err) => {
                if (err) {
                    return res.send(500, "Failed to update record");
                }
                res.send(200, "Success");
            });
        });
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
    server.post('/maintenance/healthCheck/run', async function (req, res) {
        let pk = generatePk();
        const objectData = {
            status: "in Progress",
            date: Date.now(),
            pk: pk
        }
        try {
            await $$.promisify(lightDBEnclaveClient.insertRecord)(undefined, HEALTH_CHECK_TABLE, pk, {data: objectData});
            let promises = [];
            let syncChecks = [];
            syncChecks.push($$.promisify(req.client.checkSecrets)());
            syncChecks.push($$.promisify(req.client.checkInstallInfo)());
            syncChecks.push($$.promisify(req.client.checkSystemHealth)());
            syncChecks.push($$.promisify(req.client.checkConfigsInfo)());
            syncChecks.push($$.promisify(req.client.checkWallets)());
            promises.push($$.promisify(req.client.checkAnchoring)("start"));
            promises.push($$.promisify(req.client.checkBricking)("start"));
            promises.push($$.promisify(req.client.checkDatabases)("start"));
            promises.push($$.promisify(req.client.checkProducts)("start"));
            promises.push($$.promisify(req.client.checkBatches)("start"));
            let results = await Promise.all(promises);
            let syncResults;
            syncResults = await Promise.all(syncChecks);
            for(let data of syncResults){
                let componentPk = getComponentPk(pk, data.name);
                await $$.promisify(lightDBEnclaveClient.insertRecord)($$.SYSTEM_IDENTIFIER, pk, componentPk, {data: data});
            }
            setInterval(async () => {
                await $$.promisify(req.client.checkAnchoring)("status");
                let failedChecks = 0;
                for(let result of results){
                    if(result.status === "failed"){
                        failedChecks++;
                    }
                }
                let checkStatus = failedChecks === 0 ? "success" : "failed";

                await markIterationComplete(pk, checkStatus, failedChecks);
            }, 2000);
            res.send(200, pk);
        } catch (e) {
            res.send(500, e.message);
        }
    })
    async function markIterationComplete(pk, status, failedChecksNr){
        let record = await $$.promisify(lightDBEnclaveClient.getRecord)($$.SYSTEM_IDENTIFIER, HEALTH_CHECK_TABLE, pk);
        record.data.status = status;
        record.data.failedChecksNr = failedChecksNr;
        await $$.promisify(lightDBEnclaveClient.updateRecord)($$.SYSTEM_IDENTIFIER, HEALTH_CHECK_TABLE, pk, record);
    }
    server.get('/maintenance/getIterationComponent', function (req, res) {
        const urlParts = urlModule.parse(req.url, true);
        const {healthCheckRunId, componentName} = urlParts.query;
        let pk = healthCheckRunId + "_" + componentName;
        lightDBEnclaveClient.getRecord($$.SYSTEM_IDENTIFIER, healthCheckRunId, pk, (err, record) => {
            if (err) {
                res.send(500, "Failed to get record");
                return;
            }
            res.setHeader("Content-type", "text/json");
            res.send(200, JSON.stringify(record.data));
        });
    });
    server.get('/maintenance/getIterationsMetadata', function (req, res) {
        const urlParts = urlModule.parse(req.url, true);
        const {start, number, sort, query} = urlParts.query;
        lightDBEnclaveClient.filter($$.SYSTEM_IDENTIFIER, HEALTH_CHECK_TABLE, query, sort, number, (err, records) => {
            if (err) {
                res.send(500, "Failed to get records");
                return;
            }
            res.setHeader("Content-type", "text/json");
            res.send(200, JSON.stringify(records.map(record => {
                record.data.__timestamp = record.__timestamp;
                return record.data;
            })));
        });
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
        let processId;
        switch (action) {
            case "start":
                try {
                    processId = await req.statusController.startProcess(checkType, req.body);
                    res.send(200, "Process started with processId: " + processId);
                } catch (error) {
                    res.send(500, "Failed to start process." + error);
                }
                return;
            case "status":
                processId = req.body.processId;
                if (!processId) {
                    res.send(400, "Process ID is required.");
                    return;
                }
                try {
                    const verificationStatus = await req.statusController.getProcessStatus(checkType, processId);
                    res.send(200, "Process status: " + verificationStatus);
                } catch (error) {
                    res.send(500, "Failed to get process status.");
                }
                return;
            case "listChecks":
                try {
                    const checks = await req.statusController.listChecks(checkType);
                    res.send(200, checks);
                } catch (error) {
                    res.send(500, "Failed to get process status.");
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
                    res.send(500, "Failed to get process status.");
                }
                return;
            default:
                res.send(400, "Invalid action");
                return;
        }
    }

    server.post('/maintenance/checkAnchoring/:action', async function (req, res) {
        await checkHandler(req, res, 'checkAnchoring')
    });
    server.post('/maintenance/checkBricking/:action', async function (req, res) {
        await checkHandler(req, res, 'checkBricking')
    });
    server.post('/maintenance/checkDatabases/:action', async function (req, res) {
        await checkHandler(req, res, 'checkDatabases')
    });
    server.post('/maintenance/checkProducts/:action', async function (req, res) {
        await checkHandler(req, res, 'checkProducts')
    });
    server.post('/maintenance/checkBatches/:action', async function (req, res) {
        await checkHandler(req, res, 'checkBatches')
    });
}

module.exports = healthCheckAPIs;