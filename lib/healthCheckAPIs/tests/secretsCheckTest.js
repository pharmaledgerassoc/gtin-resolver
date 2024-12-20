require("../../../../opendsu-sdk/builds/output/testsRuntime");
const dc = require("double-check");
const assert = dc.assert;
const tir = require("../../../../opendsu-sdk/psknode/tests/util/tir");
const constants = require("../constants");
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

    let checkId = await apiClient.checkSecrets();
    console.log(checkId);
    let response = await apiClient.getCheckStatus(checkId, component);
    assert.true(response.status === constants.HEALTH_CHECK_STATUSES.IN_PROGRESS, "Secrets check should be in progress");
    while(response.status === constants.HEALTH_CHECK_STATUSES.IN_PROGRESS){
        response = await apiClient.getCheckStatus(checkId, component);
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.true(response.status === constants.HEALTH_CHECK_STATUSES.FAILED, "Secrets check should have failed");
    callback();
}, 10000);