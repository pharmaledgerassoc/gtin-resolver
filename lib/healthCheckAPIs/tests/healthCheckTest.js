require("../../../../opendsu-sdk/builds/output/testsRuntime");
const dc = require("double-check");
const assert = dc.assert;
const tir = require("../../../../opendsu-sdk/psknode/tests/util/tir");
const {searchConsoleOutput, capture} = require("./ConsoleCapture");
const constants = require("../constants");
assert.callback("Health Check Test", async (callback) => {
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
    const resolver = openDSU.loadAPI("resolver");
    const crypto = openDSU.loadAPI("crypto");
    const domain = "vault";
    let dsu = await $$.promisify(resolver.createSeedDSU)(domain);
    await dsu.safeBeginBatchAsync();
    await $$.promisify(dsu.writeFile)("/maintenance", "maintenance", {encrypt: false});
    await dsu.commitBatchAsync();
    await $$.promisify(resolver.createSeedDSU)(domain);
    await dsu.safeBeginBatchAsync();
    await $$.promisify(dsu.writeFile)("/maintenance", "maintenance", {encrypt: false});
    await dsu.commitBatchAsync();
    const url = `http://localhost:${port}`;
    let anchors = searchConsoleOutput("updateAnchor").map(line => {
        let splitLine = line.split(" ")
        return splitLine[splitLine.length - 1];
    });

    let bricks = searchConsoleOutput("putBrick").map(line => {
        let splitLine = line.split(" ")
        return splitLine[splitLine.length - 1];
    });

    let brick = bricks[Math.floor(Math.random() * bricks.length)];

    const APIClient = require("../controllers/APIClient");
    const apiClient = APIClient.getInstance();
    let component = "bricking";
    let action = "corrupt";
    let args = [brick];
    await apiClient.generateFailure(component, action, args);

    let anchorToCorrupt = anchors[Math.floor(Math.random() * anchors.length)];
    anchors = anchors.filter(anchor => anchor !== anchorToCorrupt);
    component = "anchoring";
    action = "delete";
    args = [anchorToCorrupt];
    await apiClient.generateFailure(component, action, args);

    // pick a random anchor to corrupt different from the previous one
    anchorToCorrupt = anchors[Math.floor(Math.random() * anchors.length)];
    action = "corrupt";
    args = [anchorToCorrupt];
    await apiClient.generateFailure(component, action, args);

    const apihub = require("apihub");
    const secretsServiceInstance = await apihub.getSecretsServiceInstanceAsync(folder);
    const secretsContainer = "secretsContainer";
    const secretName = "secretName";
    const secret = crypto.generateRandom(32);
    await secretsServiceInstance.putSecretAsync(secretsContainer, secretName, secret);

    const checkId = await apiClient.startHealthCheck();
    setTimeout(async () => {
        let response = await apiClient.getCheckStatus(checkId);
        console.log(response);
        callback();
    }, 5000);
}, 10000);