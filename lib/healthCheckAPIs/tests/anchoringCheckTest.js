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
    let anchors = searchConsoleOutput("updateAnchor").map(line => {
        let splitLine = line.split(" ")
        return splitLine[splitLine.length - 1];
    });
    const APIClient = require("../controllers/APIClient");
    const apiClient = APIClient.getInstance();
    // pick a random anchor to corrupt
    let anchorToCorrupt = anchors[Math.floor(Math.random() * anchors.length)];
    // remove the anchor from the list of anchors
    anchors = anchors.filter(anchor => anchor !== anchorToCorrupt);
    const component = "anchoring";
    let action = "delete";
    let args = [anchorToCorrupt];
    await apiClient.generateFailure(component, action, args);

    let checkId = await apiClient.checkAnchoring();
    console.log(checkId);
    let response = await apiClient.getCheckStatus(checkId, component);
    assert.true(response.status === constants.HEALTH_CHECK_STATUSES.IN_PROGRESS, "Anchoring check should be in progress");
    while(response.status === constants.HEALTH_CHECK_STATUSES.IN_PROGRESS){
        response = await apiClient.getCheckStatus(checkId, component);
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.true(response.status === constants.HEALTH_CHECK_STATUSES.FAILED, "Anchoring check should have failed");
    console.log(response);
    assert.true(response.status === constants.HEALTH_CHECK_STATUSES.FAILED, "Anchoring check should have failed");
    assert.true(response.report[domain].corruptAnchors.fixable.length === 1, "Failed to detect corrupted anchor");
    console.log(response.report[domain].corruptAnchors.fixable[0].anchor);
    assert.true(response.report[domain].corruptAnchors.fixable[0].anchor === anchorToCorrupt, "Failed to detect corrupted anchor");

    // pick a random anchor to corrupt different from the previous one
    anchorToCorrupt = anchors[Math.floor(Math.random() * anchors.length)];
    action = "corrupt";
    args = [anchorToCorrupt];
    await apiClient.generateFailure(component, action, args);
    checkId = await apiClient.checkAnchoring();
    response = await apiClient.getCheckStatus(checkId, component);
    assert.true(response.status === constants.HEALTH_CHECK_STATUSES.IN_PROGRESS, "Anchoring check should be in progress");
    while(response.status === constants.HEALTH_CHECK_STATUSES.IN_PROGRESS){
        response = await apiClient.getCheckStatus(checkId, component);
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.true(response.status === constants.HEALTH_CHECK_STATUSES.FAILED, "Anchoring check should have failed");
    console.log(response);
    assert.true(response.status === constants.HEALTH_CHECK_STATUSES.FAILED, "Anchoring check should have failed");
    assert.true(response.report[domain].corruptAnchors.notFixable.length === 1, "Failed to detect corrupted anchor");
    console.log(response.report[domain].corruptAnchors.notFixable[0].anchor);
    assert.true(response.report[domain].corruptAnchors.notFixable[0].anchor === anchorToCorrupt, "Failed to detect corrupted anchor");
    callback();
}, 10000);