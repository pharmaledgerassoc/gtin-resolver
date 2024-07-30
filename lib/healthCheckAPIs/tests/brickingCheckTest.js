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
    let bricks = searchConsoleOutput("putBrick").map(line => {
        let splitLine = line.split(" ")
        return splitLine[splitLine.length - 1];
    });
    const generateFailureEndpoint = `${url}/maintenance/generateFailure`;
    // pick a random anchor to corrupt
    let brick = bricks[Math.floor(Math.random() * bricks.length)];
    const body = {
        component: "bricking",
        action: "corrupt",
        args: [brick]
    }
    let response = await http.fetch(generateFailureEndpoint, {
        method: "POST",
        body: JSON.stringify(body)
    });
    assert.true(response.status === 200, "Failed to generate failure");
    const brickingCheckpoint = `${url}/maintenance/checkBricking`;
    response = await http.fetch(brickingCheckpoint, {method:"POST"});
    assert.true(response.status === 200, "Failed to check bricking");
    response = await response.json();
    console.log(response);
    assert.true(response.vault.length === 1, "Bricking check failed");
    assert.true(response.vault[0].brick === brick, "Bricking check failed");
    callback();
}, 10000);