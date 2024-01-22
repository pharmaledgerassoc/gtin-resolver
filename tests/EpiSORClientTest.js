require("../../opendsu-sdk/builds/output/testsRuntime");
require('../../gtin-resolver/build/bundles/gtinResolver');

const dc = require("double-check");
const assert = dc.assert;
const EpiSORIntegrationClient = require("../lib/integrationAPIs/clients/EpiSORIntegrationClient");
const tir = require("../../opendsu-sdk/psknode/tests/util/tir");
assert.callback("MockEPISORClient Test Suite", async (callback) => {
    const domain = 'testDomain';
    const client = EpiSORIntegrationClient.getInstance(domain);
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
        "product": {
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
        "batch": {
            "productCode": "02113111111164",
            "batch": "B123",
            "packagingSiteName": "",
            "expiryDate": "230600"
        }
    };
    const leafletDetails = {
        "messageType": "leaflet",
        "messageTypeVersion": 1,
        "senderId": "ManualUpload",
        "receiverId": "QPNVS",
        "messageId": "S000001",
        "messageDateTime": "2023-01-11T09:10:01CET",
        "productCode": "02113111111164",
        "language": "en",
        "xmlFileContent": "xmlFileContent"
    }

    const germanLeaflet = {
        "messageType": "leaflet",
        "messageTypeVersion": 1,
        "senderId": "ManualUpload",
        "receiverId": "QPNVS",
        "messageId": "S000001",
        "messageDateTime": "2023-01-11T09:10:01CET",
        "productCode": "02113111111164",
        "language": "de",
        "xmlFileContent": "xmlFileContent"
    }

    const imageData = {
        "messageType": "ProductPhoto",
        "messageTypeVersion": 1,
        "senderId": "ManualUpload",
        "receiverId": "QPNVS",
        "messageId": "S000001",
        "messageDateTime": "2023-01-11T09:10:01CET",
        "productCode": "02113111111164",
        "imageId": "123456789",
        "imageType": "front",
        "imageFormat": "png",
        "imageData": "https://www.bayer.com/en/bayer-products/product-details/bounty-250-mg-0-68-ml-pre-filled-syringe"
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

    await tir.launchConfigurableApiHubTestNodeAsync({
        domains: [{name: domain, config: vaultDomainConfig}],
        rootFolder: folder,
        serverConfig: serverConfig
    });

    let error;
    try {
        await $$.promisify(client.addProduct)(gtin, productDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding product");

    error = undefined;
    try {
        await $$.promisify(client.updateProduct)(gtin, productDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while updating product");

    error = undefined;
    try {
        await $$.promisify(client.addEPI)(gtin, undefined, leafletDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding EPI to product");

    error = undefined;
    let epi;
    try {
        epi = await $$.promisify(client.getProductLeaflet)(gtin, language);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting product leaflet");
    assert.true(epi.xmlFileContent === leafletDetails.xmlFileContent, "Leaflet details are not the same");

    error = undefined;
    leafletDetails.xmlFileContent = "newXmlFileContent";
    try {
        await $$.promisify(client.updateEPIForProduct)(gtin, leafletDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while updating EPI for product");

    error = undefined;
    epi = undefined;
    try {
        epi = await $$.promisify(client.getProductLeaflet)(gtin, language);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting product leaflet");
    assert.true(epi.xmlFileContent === leafletDetails.xmlFileContent, "Leaflet details are not the same");

    error = undefined;
    try {
        await $$.promisify(client.addProductImage)(gtin, imageData);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding product image");

    let productPhoto;
    try {
        productPhoto = await $$.promisify(client.getProductPhoto)(gtin);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting product image");
    assert.true(productPhoto.imageData === imageData.imageData, "Image details are not the same");

    error = undefined;
    imageData.imageData = "newImageData";
    try {
        await $$.promisify(client.updateProductImage)(gtin, imageData);
    } catch (e) {
        error = e;
    }

    assert.true(error === undefined, "Error while updating product image");

    productPhoto = undefined;
    try {
        productPhoto = await $$.promisify(client.getProductPhoto)(gtin);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting product image");
    assert.true(productPhoto.imageData === imageData.imageData, "Image details are not the same");

    error = undefined;
    try {
        await $$.promisify(client.addBatch)(gtin, batchNumber, batchDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding batch");

    error = undefined;
    try {
        await $$.promisify(client.updateBatch)(gtin, batchNumber, batchDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while updating batch");

    error = undefined;
    try {
        await $$.promisify(client.deleteEPIofProduct)(gtin, language);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while deleting EPI of product");

    error = undefined;
    try {
        await $$.promisify(client.addEPIForBatch)(gtin, batchNumber, leafletDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding EPI to batch");

    error = undefined;
    let batchLeaflet;
    try {
        batchLeaflet = await $$.promisify(client.getBatchLeaflet)(gtin, batchNumber, language);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting batch leaflet");
    assert.true(batchLeaflet.xmlFileContent === leafletDetails.xmlFileContent, "Leaflet details are not the same");


    error = undefined;
    leafletDetails.xmlFileContent = "newXmlFileContent2";

    try {
        await $$.promisify(client.updateEPIForBatch)(gtin, batchNumber, leafletDetails);
    } catch (e) {
        error = e;
    }

    assert.true(error === undefined, "Error while updating EPI for batch");

    error = undefined;
    batchLeaflet = undefined;
    try {
        batchLeaflet = await $$.promisify(client.getBatchLeaflet)(gtin, batchNumber, language);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting batch leaflet");
    assert.true(batchLeaflet.xmlFileContent === leafletDetails.xmlFileContent, "Leaflet details are not the same");


    error = undefined;
    try {
        await $$.promisify(client.addEPIForBatch)(gtin, batchNumber, germanLeaflet);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding EPI to batch");

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