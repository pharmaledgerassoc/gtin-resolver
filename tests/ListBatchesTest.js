require("../../opendsu-sdk/builds/output/testsRuntime");
require('../../gtin-resolver/build/bundles/gtinResolver');

const dc = require("double-check");
const assert = dc.assert;
const EpiSORIntegrationClient = require("../lib/integrationAPIs/clients/EpiSORIntegrationClient");
const tir = require("../../opendsu-sdk/psknode/tests/util/tir");
const leafletDetails = require("./leaflet.json");

assert.callback("EPISORClient Test Suite", async (callback) => {
    const domain = 'testDomain';
    const subdomain = 'testSubdomain';
    const client = EpiSORIntegrationClient.getInstance(domain, subdomain);
    const gtin = '02113111111164';
    const batchNumber = 'B123';
    const language = 'en';
    const productDetails = {
        "messageType": "Product",
        "messageTypeVersion": 1,
        "senderId": "ManualUpload",
        "receiverId": "QPNVS",
        "messageId": "S000001",
        "messageDateTime": "2023-01-11T09:10:01CET",
        "payload": {
            "productCode": "02113111111164",
            "internalMaterialCode": "",
            "inventedName": "BOUNTY",
            "nameMedicinalProduct": "BOUNTY® 250 mg / 0.68 mL pre-filled syringe",
            "strengths": []
        }
    };
    const productDetails2 = {
        "messageType": "Product",
        "messageTypeVersion": 1,
        "senderId": "ManualUpload",
        "receiverId": "QPNVS",
        "messageId": "S000001",
        "messageDateTime": "2023-01-11T09:10:01CET",
        "payload": {
            "productCode": "00000000000000",
            "internalMaterialCode": "",
            "inventedName": "BOUNTY",
            "nameMedicinalProduct": "BOUNTY® 250 mg / 0.68 mL pre-filled syringe",
            "strengths": []
        }
    };
    const batchDetails = {
        "messageType": "Batch",
        "messageTypeVersion": 1,
        "senderId": "ManualUpload",
        "receiverId": "QPNVS",
        "messageId": "S000001",
        "messageDateTime": "2023-01-11T09:10:01CET",
        "payload": {
            "productCode": "02113111111164",
            "batch": "B/123",
            "packagingSiteName": "",
            "expiryDate": "230600"
        }
    };

    const vaultDomainConfig = {
        "anchoring": {
            "type": "FS",
            "option": {}
        },
        "enable": ["enclave", "mq"]
    }

    const folder = await $$.promisify(dc.createTestFolder)("testFolder");
    const serverConfig = {
        "storage": folder,
        "port": 8080,
        "preventRateLimit": true,
        "activeComponents": [
            "bdns",
            "bricking",
            "anchoring",
            "epi-mapping-engine",
            "epi-mapping-engine-results",
            "get-gtin-owner",
            "leaflet-web-api",
            "integration-api",
            "mq",
            "secrets",
            "lightDBEnclave",
            "staticServer"
        ],
        "componentsConfig": {
            "epi-mapping-engine": {
                "module": "./../../gtin-resolver",
                "function": "getEPIMappingEngineForAPIHUB"
            },
            "epi-mapping-engine-results": {
                "module": "./../../gtin-resolver",
                "function": "getEPIMappingEngineMessageResults"
            },
            "leaflet-web-api": {
                "module": "./../../gtin-resolver",
                "function": "getWebLeaflet"
            },
            "get-gtin-owner": {
                "module": "./../../gtin-resolver",
                "function": "getGTINOwner"
            },
            "integration-api": {
                "module": "./../../gtin-resolver",
                "function": "getIntegrationAPIs"
            },
            "staticServer": {
                "excludedFiles": [
                    ".*.secret"
                ]
            },
            "bricking": {},
            "anchoring": {}
        }
    }

    process.env.SSO_SECRETS_ENCRYPTION_KEY = "+WG9HhIoXGGSVq6cMlhy2P3vuiqz1O/WAaiF5JhXmnc=";
    // process.env.EPI_DOMAIN = domain;
    // process.env.EPI_SUBDOMAIN = subdomain;
    // process.env.PSK_CONFIG_LOCATION = require("path").join(folder, "external-volume/config");
    await tir.launchConfigurableApiHubTestNodeAsync({
        domains: [{name: domain, config: vaultDomainConfig}, {name: subdomain, config: vaultDomainConfig}],
        rootFolder: folder,
        serverConfig: serverConfig
    });

    const secretsService = await require("apihub").getSecretsServiceInstanceAsync(folder);
    const LightDBEnclaveFactory = require("../../gtin-resolver/lib/integrationAPIs/utils/LightDBEnclaveFactory");
    const lightDBEnclaveFactory = LightDBEnclaveFactory.getLightDBEnclaveFactoryInstance();
    let secret;
    const keySSISpace = require("opendsu").loadAPI("keyssi");
    const seedSSI = await $$.promisify(keySSISpace.createSeedSSI)(domain);
    await secretsService.putSecretInDefaultContainerAsync(lightDBEnclaveFactory.generateEnclaveName(domain, subdomain), seedSSI.base64Encode(seedSSI.getPrivateKey()))
    let error;
    try {
        await $$.promisify(client.addProduct)(productDetails.payload.productCode, productDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding product");

    error = undefined;
    try {
        await $$.promisify(client.addProduct)(productDetails2.payload.productCode, productDetails2);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding product");
    error = undefined;

    let products;
    try {
        products = await $$.promisify(client.listProducts)(0, 10, "__timestamp > 0", "asc");
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting products");
    assert.true(products.length === 2, "Products length is not the same");
    assert.true(products[0].productCode === productDetails.payload.productCode, "Product details are not the same");
    assert.true(products[1].productCode === productDetails2.payload.productCode, "Product details are not the same");
    error = undefined;
    let productMetadata;
    try {
        productMetadata = await $$.promisify(client.getProductMetadata)(gtin);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while updating product");
    assert.true(productMetadata.productCode === productDetails.payload.productCode, "Product details are not the same");

    error = undefined;
    try {
        await $$.promisify(client.addBatch)(gtin, batchDetails.payload.batch, batchDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding batch");

    error = undefined;
    let batchMetadata;
    try {
        batchMetadata = await $$.promisify(client.getBatchMetadata)(gtin, batchDetails.payload.batch);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding batch");
    assert.true(batchMetadata.productCode === batchDetails.payload.productCode, "Batch details are not the same");

    error = undefined;
    productDetails.payload.nameMedicinalProduct = "newName";
    try {
        await $$.promisify(client.updateProduct)(gtin, productDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while updating product");

    error = undefined;
    let batches;
    try {
        batches = await $$.promisify(client.listBatches)(0, 10, "__timestamp > 0", "asc");
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting batches");
    assert.true(batches.length === 1, "Batches length is not the same");
    assert.true(batches[0].productCode === batchDetails.payload.productCode, "Batches details are not the same");
    assert.true(batches[0].nameMedicinalProduct === productDetails.payload.nameMedicinalProduct, "Batches details are not the same");

    callback();
}, 1000000);
