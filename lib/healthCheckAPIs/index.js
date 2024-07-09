const urlModule = require('url');
const EPI_DOMAIN = process.env.EPI_DOMAIN;
const EPI_SUBDOMAIN = process.env.EPI_SUBDOMAIN;
const SecretsController = require("./controllers/SecretsController.js");
const enclave = require('opendsu').loadAPI('enclave');
function healthCheckAPIs(server) {
    // this middleware injects the send method on res object before proceeding...
    server.use("/maintenance/*", addSendMethodMiddleware);
    const secretsController = SecretsController.getInstance();
    const dbName = "demiurge";
    const lightDBEnclaveClient = enclave.initialiseLightDBEnclave(dbName);
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



    const getDomainAndSubdomain = (req) => {
        const urlParts = urlModule.parse(req.url, true);
        let {domain, subdomain} = urlParts.query;
        domain = domain || EPI_DOMAIN;
        subdomain = subdomain || EPI_SUBDOMAIN;
        return {domain, subdomain};
    }

    server.use("/maintenance/*", async function (req, res, next) {
        const {domain, subdomain} = getDomainAndSubdomain(req);
        // req.statusController = require("./controllers/StatusController.js").getInstance(domain, subdomain);
        next();
    })

    server.get('/maintenance/installInfo', function (req, res) {
        res.send(200, "Report Installation status. It can be used if the system is not working to report the internal status of various components etc. \n" +
            "Does not require authorisation. Any user authenticated by SSO will get this basic info. ");
    });

    server.get('/maintenance/systemHealth', function (req, res) {
        res.send(200, "Returns information about the general health of the system");
    });

    server.get('/maintenance/checkSecrets', function (req, res) {
        try {
            secretsController.checkSecrets(enclaveInstance, req, res);
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
}

function addSendMethodMiddleware(req, res, next) {
    res.send = function send(statusCode, result) {
        res.setHeader('Server', 'Maintenance Middleware');
        res.statusCode = statusCode;
        res.end(result);
    }
    next();
}

module.exports = healthCheckAPIs;