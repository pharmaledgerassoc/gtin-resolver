const urlModule = require('url');
const EPI_DOMAIN = process.env.EPI_DOMAIN;
const EPI_SUBDOMAIN = process.env.EPI_SUBDOMAIN;

function healthCheckAPIs(server) {
    // this middleware injects the send method on res object before proceeding...
    server.use("/maintenance/*", addSendMethodMiddleware);

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
        res.send(200, "ok");
    });

    server.put('/maintenance/fixSecrets', function (req, res) {
        res.send(200, "ok");
    });

    server.get('/maintenance/configsInfo', function (req, res) {
        // get the domain and subdomain from query params
        const {domain, subdomain} = getDomainAndSubdomain(req);

        try {
            req.statusController.getConfigsInfo(domain, subdomain);
        } catch (err) {
            res.send(500, "Unexpected error occurred.");
        }
        res.send(200, domain + " " + subdomain);
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