require("../../../../opendsu-sdk/builds/output/testsRuntime");
const dc = require("double-check");
const assert = dc.assert;
const tir = require("../../../../opendsu-sdk/psknode/tests/util/tir");
const {searchConsoleOutput, capture} = require("./ConsoleCapture");
const constants = require("../constants");
assert.callback("Anchoring Check Test", async (callback) => {
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
    let bricks = searchConsoleOutput("putBrick").map(line => {
        let splitLine = line.split(" ")
        return splitLine[splitLine.length - 1];
    });
    const APIClient = require("../controllers/APIClient");
    const apiClient = APIClient.getInstance()
    // pick a random brick to corrupt
    let brick = bricks[Math.floor(Math.random() * bricks.length)];

    const component = "bricking";
    const action = "corrupt";
    const args = [brick];
    await apiClient.generateFailure(component, action, args);

    let response = await apiClient.checkBricking();
    console.log(response);
    assert.true(response.status === constants.HEALTH_CHECK_STATUSES.FAILED, "Bricking check should have failed");
    assert.true(response.report[domain].length === 1, "Bricking check failed");
    assert.true(response.report[domain][0].brick === brick, "Bricking check failed");
    callback();
}, 10000);