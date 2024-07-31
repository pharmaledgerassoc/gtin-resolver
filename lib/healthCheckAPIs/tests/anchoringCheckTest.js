require("../../../../opendsu-sdk/builds/output/testsRuntime");
const dc = require("double-check");
const assert = dc.assert;
const tir = require("../../../../opendsu-sdk/psknode/tests/util/tir");
const {searchConsoleOutput, capture} = require("./ConsoleCapture");
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
    let dsu = await $$.promisify(resolver.createSeedDSU)("vault");
    await dsu.safeBeginBatchAsync();
    await $$.promisify(dsu.writeFile)("/maintenance", "maintenance", {encrypt: false});
    await dsu.commitBatchAsync();
    await $$.promisify(resolver.createSeedDSU)("vault");
    await dsu.safeBeginBatchAsync();
    await $$.promisify(dsu.writeFile)("/maintenance", "maintenance", {encrypt: false});
    await dsu.commitBatchAsync();
    const url = `http://localhost:${port}`;
    let anchors = searchConsoleOutput("updateAnchor").map(line => {
        let splitLine = line.split(" ")
        return splitLine[splitLine.length - 1];
    });
    const APIClient = require("../controllers/APIClient");
    const apiClient = APIClient.getInstance();
    // pick a random anchor to corrupt
    let anchorToCorrupt = anchors[Math.floor(Math.random() * anchors.length)];
    const component = "anchoring";
    const action = "corrupt";
    const args = [anchorToCorrupt];
    await apiClient.generateFailure(component, action, args);

    let response = await apiClient.checkAnchoring();
    console.log(response);
    assert.true(response.length === 1, "Failed to detect corrupted anchor");
    assert.true(response[0].corruptAnchors.fixable.length === 1, "Failed to detect corrupted anchor");
    console.log(response[0].corruptAnchors.fixable[0].anchor);
    assert.true(response[0].corruptAnchors.fixable[0].anchor === anchorToCorrupt, "Failed to detect corrupted anchor");
    callback();
}, 10000);