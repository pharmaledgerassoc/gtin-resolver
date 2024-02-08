require("../../opendsu-sdk/builds/output/testsRuntime");
require('../../gtin-resolver/build/bundles/gtinResolver');

const dc = require("double-check");
const assert = dc.assert;
const EpiSORIntegrationClient = require("../lib/integrationAPIs/clients/EpiSORIntegrationClient");
const tir = require("../../opendsu-sdk/psknode/tests/util/tir");
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
            "strength": ""
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
            "batch": "B123",
            "packagingSiteName": "",
            "expiryDate": "230600"
        }
    };

    const leafletDetails = require("./leaflet.json");
    const imageData = {
        "messageType": "ProductPhoto",
        "messageTypeVersion": 1,
        "senderId": "ManualUpload",
        "receiverId": "QPNVS",
        "messageId": "S000001",
        "messageDateTime": "2023-01-11T09:10:01CET",
        "payload": {
            "productCode": "02113111111164",
            "imageData": "https://www.bayer.com/en/bayer-products/product-details/bounty-250-mg-0-68-ml-pre-filled-syringe"
        }
    }

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
    await tir.launchConfigurableApiHubTestNodeAsync({
        domains: [{name: domain, config: vaultDomainConfig}, {name: subdomain, config: vaultDomainConfig}],
        rootFolder: folder,
        serverConfig: serverConfig
    });

    const secretsService = await require("apihub").getSecretsServiceInstanceAsync(folder);
    const LightDBEnclaveFactory = require("../../gtin-resolver/lib/integrationAPIs/utils/LightDBEnclaveFactory");
    const lightDBEnclaveFactory = new LightDBEnclaveFactory();
    let secret;
    const keySSISpace = require("opendsu").loadAPI("keyssi");
    const seedSSI = await $$.promisify(keySSISpace.createSeedSSI)(domain);
    await secretsService.putSecretInDefaultContainerAsync(lightDBEnclaveFactory.generateEnclaveName(domain, subdomain), seedSSI.base64Encode(seedSSI.getPrivateKey()))
    let error;
    try {
        await $$.promisify(client.addProduct)(gtin, productDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding product");

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
        await $$.promisify(client.updateProduct)(gtin, productDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while updating product");

    error = undefined;
    try {
        await $$.promisify(client.addBatch)(gtin, batchNumber, batchDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding batch");

    error = undefined;
    let products;
    try {
        products = await $$.promisify(client.listProducts)(0, 10, "__timestamp > 0", "asc");
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting products");
    assert.true(products.length === 1, "Products length is not the same");
    assert.true(products[0].productCode === productDetails.payload.productCode, "Product details are not the same");
    error = undefined;
    try {
        await $$.promisify(client.addBatch)(gtin, batchNumber, batchDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding batch");

    error = undefined;
    let batchMetadata;
    try {
        batchMetadata = await $$.promisify(client.getBatchMetadata)(gtin, batchNumber);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting batch metadata");
    assert.true(batchMetadata.batch === batchDetails.payload.batch, "Batch details are not the same");

    error = undefined;
    try {
        await $$.promisify(client.updateBatch)(gtin, batchNumber, batchDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while updating batch");

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

    error = undefined;
    try {
        await $$.promisify(client.addImage)(gtin, imageData);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding product image");

    let productPhoto;
    try {
        productPhoto = await $$.promisify(client.getImage)(gtin);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting product image");
    assert.true(productPhoto === imageData.payload.imageData, "Image details are not the same");

    error = undefined;
    imageData.payload.imageData = "newImageData";
    try {
        await $$.promisify(client.updateImage)(gtin, imageData);
    } catch (e) {
        error = e;
    }

    assert.true(error === undefined, "Error while updating product image");

    productPhoto = undefined;
    try {
        productPhoto = await $$.promisify(client.getImage)(gtin);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting product image");
    assert.true(productPhoto === imageData.payload.imageData, "Image details are not the same");

    error = undefined;
    try {
        await $$.promisify(client.addEPI)(gtin, undefined, leafletDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding EPI to product");

    error = undefined;
    leafletDetails.xmlFileContent = "newXmlFileContent";
    try {
        await $$.promisify(client.updateEPI)(gtin, leafletDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while updating EPI for product");

    error = undefined;
    let languages;
    try {
        languages = await $$.promisify(client.listProductsLangs)(gtin);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting languages");
    assert.true(languages.length === 1, "Languages are not the same");


    try {
        languages = await $$.promisify(client.listBatchLangs)(gtin, batchNumber);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting languages");
    assert.true(languages.length === 2, "Languages are not the same");


    callback();
}, 100000);