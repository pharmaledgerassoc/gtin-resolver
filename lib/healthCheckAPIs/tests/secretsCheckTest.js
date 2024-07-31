require("../../../../opendsu-sdk/builds/output/testsRuntime");
const dc = require("double-check");
const assert = dc.assert;
const tir = require("../../../../opendsu-sdk/psknode/tests/util/tir");
assert.callback("Secrets Check Test", async (callback) => {
    const folder = await $$.promisify(dc.createTestFolder)("testFolder");
    const fs = require("fs");
    fs.accessSync(folder);
    const serverConfig = {
        "storage": folder,
        "port": 8080,
        "preventRateLimit": true,
        "activeComponents": [
            "bdns",
            "bricking",
            "anchoring",
            "secrets",
            "lightDBEnclave",
            "health-check-api",
            "staticServer"
        ],
        "componentsConfig": {
            "health-check-api": {
                "module": "./../../gtin-resolver",
                "function": "getHealthCheckAPIs"
            },
            "staticServer": {
                "excludedFiles": [
                    ".*.secret"
                ]
            },
            "bricking": {},
            "anchoring": {}
        },
        "enableRequestLogger": false,
        "enableJWTAuthorisation": false,
        "enableSimpleAuth": false,
        "enableOAuth": false,
        "enableAPIKeyAuth": false,
        "enableClientCredentialsOauth": false,
        "oauthJWKSEndpoint": "https://login.microsoftonline.com/d69968dd-8f36-47eb-b724-7f5e6e660066/discovery/v2.0/keys",
        "enableLocalhostAuthorization": false
    }

    const {port} = await tir.launchConfigurableApiHubTestNodeAsync({
        rootFolder: folder,
        serverConfig: serverConfig
    });

    const openDSU = require("opendsu");
    const http = openDSU.loadAPI("http");
    const crypto = openDSU.loadAPI("crypto");
    const apihub = require("apihub");
    const secretsServiceInstance = await apihub.getSecretsServiceInstanceAsync(folder);
    const secretsContainer = "secretsContainer";
    const secretName = "secretName";
    const secret = crypto.generateRandom(32);
    await secretsServiceInstance.putSecretAsync(secretsContainer, secretName, secret);
    const APIClient = require("../controllers/APIClient");
    const apiClient = APIClient.getInstance();
    // pick a random anchor to corrupt
    // remove the anchor from the list of anchors
    const component = "secrets";
    let action = "corrupt";
    let args = [secretsContainer];
    await apiClient.generateFailure(component, action, args);

    let response = await apiClient.checkSecrets();
    console.log(response);
    assert.true(response.corruptSecrets.fixable.length === 1, "Failed to detect the corrupt secret");
    assert.true(response.corruptSecrets.fixable[0].secretsContainer === secretsContainer, "Failed to detect the corrupt secret");
    callback();
}, 10000);