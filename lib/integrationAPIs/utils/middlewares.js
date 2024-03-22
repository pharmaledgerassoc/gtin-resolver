function requestBodyJSONMiddleware(request, response, next) {
    let data = "";

    request.on('data', (chunk) => {
        data += chunk;
    });

    request.on('end', () => {
        if (!data.length) {
            request.body = undefined;
            return next();
        }

        request.body = data;
        next();
    });
}

function getIntegrationAPIsAuthorizationMiddleware(server) {
    const BASE_PATH = "/integration/*";
    const READ_SCOPE = "read";
    const WRITE_SCOPE = "write";
    const SCOPES = [READ_SCOPE, WRITE_SCOPE];
    const WHITELISTED_PATHS = ["/integration/audit"];
    const APP_NAME = "DSU_Fabric";
    const apihub = require("apihub");
    const crypto = require("opendsu").loadAPI("crypto");
    server.use(BASE_PATH, async (req, res, next) => {
        const secretsServiceInstance = await apihub.getSecretsServiceInstanceAsync();
        if (req.headers["x-api-key"] && await secretsServiceInstance.validateAPIKey(req.headers["x-api-key"])) {
            next();
            return;
        }
        const userId = req.headers["user-id"];
        const secretName = crypto.sha256JOSE(APP_NAME + userId, "base64url");
        let secret;
        let apiKey;
        try {
            secret = secretsServiceInstance.getSecretSync(secretsServiceInstance.constants.CONTAINERS.USER_API_KEY_CONTAINER_NAME, secretName);
            secret = JSON.parse(secret);
            if (Object.keys(secret).length === 0) {
                throw new Error("Invalid secret");
            }
            apiKey = JSON.parse(Object.values(secret)[0]);
        } catch (e) {
            res.statusCode = 401;
            res.end(`User ${userId} is not authorized`);
            return;
        }

        if (!SCOPES.includes(apiKey.scope)) {
            res.statusCode = 401;
            res.end(`User ${userId} does not have the necessary permissions`);
            return;
        }

        if (apiKey.scope === READ_SCOPE) {
            if (WHITELISTED_PATHS.some(path => req.url.includes(path))) {
                next();
                return;
            }

            if ((req.method === "PUT" || req.method === "POST" || req.method === "DELETE")) {
                res.statusCode = 401;
                res.end(`User ${userId} does not have write access`);
                return;
            }
        }

        next();
    });
}

module.exports = {
    requestBodyJSONMiddleware,
    getIntegrationAPIsAuthorizationMiddleware
}