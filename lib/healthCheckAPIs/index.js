const urlModule = require('url');
const EPI_DOMAIN = process.env.EPI_DOMAIN;
const EPI_SUBDOMAIN = process.env.EPI_SUBDOMAIN;
const HEALTH_CHECK_TABLE = "health_check";

const openDSU = require('opendsu');
const crypto = openDSU.loadAPI('crypto');
const enclave = openDSU.loadAPI('enclave');

function healthCheckAPIs(server) {
    // this middleware injects the send method on res object before proceeding...
    server.use("/maintenance/*", addSendMethodMiddleware);
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
    }catch (e) {
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
        req.secretsController = require("./controllers/SecretsController.js").getInstance();
        next();
    })

    server.get('/maintenance/installInfo', function (req, res) {
        res.send(200, "Report Installation status. It can be used if the system is not working to report the internal status of various components etc. \n" + "Does not require authorisation. Any user authenticated by SSO will get this basic info. ");
    });

    server.get('/maintenance/systemHealth', function (req, res) {
        res.send(200, "Returns information about the general health of the system");
    });

    server.get('/maintenance/checkSecrets', function (req, res) {
        try {
            let healthCheckRunId = req.headers.healthCheckRunId;
            let secretsPk = getSecretsPk(healthCheckRunId);
            let result = req.secretsController.checkSecrets();
            lightDBEnclaveClient.insertRecord($$.SYSTEM_IDENTIFIER, healthCheckRunId, secretsPk, {data: result}, (err) => {
                if (err) {
                    res.send(500, err.message);
                }
            });
            res.send(200, "Success");
        } catch (e) {
            res.send(500, e.message);
        }
    });

    server.put('/maintenance/fixSecrets', function (req, res) {
        res.send(200, "Get the secrets component in a workable status, with the risk of losing some secrets");
    });

    server.get('/maintenance/configsInfo', function (req, res) {
        res.send(200, "Report All important Configurations for APIHub. Used to retrieve the list of BDNS DOMAIN that is required for checks");
        // get the domain and subdomain from query params
        const {domain, subdomain} = getDomainAndSubdomain(req);

        try {
            req.statusController.getConfigsInfo(domain, subdomain);
        } catch (err) {
            res.send(500, "Unexpected error occurred.");
        }
        res.send(200, domain + " " + subdomain);
    });

    server.get('/maintenance/checkWallets', function (req, res) {
        res.send(200, "Check wallets for a domain");
    });

    server.get('/maintenance/fixWallet', function (req, res) {
        res.send(200, "Restore the status of a wallet");
    });

    server.get('/maintenance/removeWrongBrick', function (req, res) {
        res.send(200, "Rename with extension “.wrong”, and  it makes it inaccessible the file corresponding to a brick that does not validate its hash (it is empty or with wrong data)");
    });

    server.get('/maintenance/fixLocalAnchor', function (req, res) {
        res.send(200, "Restore the status of a wrong anchor or recreate it (for anchors used by wallets only)");
    });

    server.get('/maintenance/fixDID', function (req, res) {
        res.send(200, "Forcefully change the private key for a DID that was lost");
    });
    server.post('/maintenance/addIteration', function (req, res) {
        let pk = generatePk();
        const objectData = {
            status: "in Progress", date: Date.now()
        }
        lightDBEnclaveClient.insertRecord($$.SYSTEM_IDENTIFIER, HEALTH_CHECK_TABLE, pk, {data: objectData}, (err) => {
            if (err) {
                res.send(500, "Failed to insert record");
                return;
            }
            res.send(200, pk);
        });
    })

    server.get('/maintenance/getIterationsMetadata', function (req, res) {
        const urlParts = urlModule.parse(req.url, true);
        const {start, number, sort, query} = urlParts.query;
        lightDBEnclaveClient.filter($$.SYSTEM_IDENTIFIER, HEALTH_CHECK_TABLE, query, sort, number, (err, records) => {
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
function getSecretsPk(runId){
    return runId + "_secrets";
}
    function addSendMethodMiddleware(req, res, next) {
        res.send = function send(statusCode, result) {
            res.setHeader('Server', 'Maintenance Middleware');
            res.statusCode = statusCode;
            res.end(result);
        }
        next();
    }

    /* Asynchronous APIs */

    async function checkHandler(req, res, checkType) {
        const action = req.params.action;
        let processId;
        switch (action) {
            case "start":
                processId = req.statusController.startProcess(checkType,req.body);
                res.status(200).send("Process started with processId: " + processId);
                return;
            case "status":
                processId = req.body.processId;
                if (!processId) {
                    res.status(400).send("Process ID is required.");
                    return;
                }
                try {
                    const verificationStatus = await req.statusController.getProcessStatus(processId);
                    res.status(200).send("Process status: " + verificationStatus);
                } catch (error) {
                    res.status(500).send("Failed to get process status.");
                }
                return;
            case "listChecks":
                try {
                    const checks = req.statusController.listChecks();
                    res.status(200).send(checks);
                }catch(error){
                    res.status(500).send("Failed to get process status.");
                }
                return;
            case "result":
                const date = req.body.date;
                if(!date){
                    res.status(400).send("Date is required.");
                    return;
                }
                try {
                    const result = await req.statusController.getCheckResult(date);
                    res.status(200).send(result);
                }catch(error){
                    res.status(500).send("Failed to get process status.");
                }
                return;
            default:
                res.status(400).send("Invalid action");
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