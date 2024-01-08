require("../../opendsu-sdk/builds/output/testsRuntime");

const assert = require("double-check").assert;
const MockEPISORClient = require("../lib/integrationAPIs/clients/MockClient");

assert.callback("MockEPISORClient Test Suite", async (callback) => {
    const client = new MockEPISORClient();
    const domain = 'testDomain';
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

    let error;
    try {
        await $$.promisify(client.addProduct)(domain, gtin, productDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding product");

    error = undefined;
    try {
        await $$.promisify(client.updateProduct)(domain, gtin, productDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while updating product");

    error = undefined;
    try {
        await $$.promisify(client.addEPIForProduct)(domain, gtin, leafletDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding EPI to product");

    error = undefined;
    let epi;
    try {
        epi = await $$.promisify(client.getProductLeaflet)(domain, gtin, language);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting product leaflet");
    assert.true(epi.xmlFileContent === leafletDetails.xmlFileContent, "Leaflet details are not the same");

    error = undefined;
    leafletDetails.xmlFileContent = "newXmlFileContent";
    try {
        await $$.promisify(client.updateEPIForProduct)(domain, gtin, leafletDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while updating EPI for product");

    error = undefined;
    epi = undefined;
    try {
        epi = await $$.promisify(client.getProductLeaflet)(domain, gtin, language);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting product leaflet");
    assert.true(epi.xmlFileContent === leafletDetails.xmlFileContent, "Leaflet details are not the same");

    error = undefined;
    try {
        await $$.promisify(client.addProductImage)(domain, gtin, imageData);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding product image");

    let productPhoto;
    try {
        productPhoto = await $$.promisify(client.getProductPhoto)(domain, gtin);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting product image");
    assert.true(productPhoto.imageData === imageData.imageData, "Image details are not the same");

    error = undefined;
    imageData.imageData = "newImageData";
    try {
        await $$.promisify(client.updateProductImage)(domain, gtin, imageData);
    } catch (e) {
        error = e;
    }

    assert.true(error === undefined, "Error while updating product image");

    productPhoto = undefined;
    try {
        productPhoto = await $$.promisify(client.getProductPhoto)(domain, gtin);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting product image");
    assert.true(productPhoto.imageData === imageData.imageData, "Image details are not the same");

    error = undefined;
    try {
        await $$.promisify(client.addBatch)(domain, gtin, batchNumber, batchDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding batch");

    error = undefined;
    try {
        await $$.promisify(client.updateBatch)(domain, gtin, batchNumber, batchDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while updating batch");

    error = undefined;
    try {
        await $$.promisify(client.deleteEPIofProduct)(domain, gtin, language);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while deleting EPI of product");

    error = undefined;
    try {
        await $$.promisify(client.addEPIForBatch)(domain, gtin, batchNumber, leafletDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding EPI to batch");

    error = undefined;
    let batchLeaflet;
    try {
        batchLeaflet = await $$.promisify(client.getBatchLeaflet)(domain, gtin, batchNumber, language);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting batch leaflet");
    assert.true(batchLeaflet.xmlFileContent === leafletDetails.xmlFileContent, "Leaflet details are not the same");


    error = undefined;
    leafletDetails.xmlFileContent = "newXmlFileContent2";

    try {
        await $$.promisify(client.updateEPIForBatch)(domain, gtin, batchNumber, leafletDetails);
    } catch (e) {
        error = e;
    }

    assert.true(error === undefined, "Error while updating EPI for batch");

    error = undefined;
    batchLeaflet = undefined;
    try {
        batchLeaflet = await $$.promisify(client.getBatchLeaflet)(domain, gtin, batchNumber, language);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting batch leaflet");
    assert.true(batchLeaflet.xmlFileContent === leafletDetails.xmlFileContent, "Leaflet details are not the same");


    error = undefined;
    try {
        await $$.promisify(client.addEPIForBatch)(domain, gtin, batchNumber, germanLeaflet);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding EPI to batch");

    error = undefined;
    let languages;
    try {
        languages = await $$.promisify(client.listProductsLangs)(domain, gtin);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting languages");
    assert.true(languages.length === 1, "Languages are not the same");


    try {
        languages = await $$.promisify(client.listBatchLangs)(domain, gtin, batchNumber);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting languages");
    assert.true(languages.length === 2, "Languages are not the same");


    callback();
}, 100000);