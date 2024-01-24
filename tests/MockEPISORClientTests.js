require("../../opendsu-sdk/builds/output/testsRuntime");

const assert = require("double-check").assert;
const MockEPISORClient = require("../lib/integrationAPIs/clients/MockClient");

assert.callback("MockEPISORClient Test Suite", async (callback) => {
    const domain = 'testDomain';
    const client = MockEPISORClient.getInstance(domain);
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
    const leafletDetails = {
        "messageType": "leaflet",
        "messageTypeVersion": 1,
        "senderId": "ManualUpload",
        "receiverId": "QPNVS",
        "messageId": "S000001",
        "messageDateTime": "2023-01-11T09:10:01CET",
        "payload": {
            "productCode": "02113111111164",
            "language": "en",
            "xmlFileContent": "xmlFileContent"
        }
    }

    const germanLeaflet = {
        "messageType": "leaflet",
        "messageTypeVersion": 1,
        "senderId": "ManualUpload",
        "receiverId": "QPNVS",
        "messageId": "S000001",
        "messageDateTime": "2023-01-11T09:10:01CET",
        "payload": {
            "productCode": "02113111111164",
            "language": "de",
            "xmlFileContent": "xmlFileContent"
        }
    }

    const imageData = {
        "messageType": "ProductPhoto",
        "messageTypeVersion": 1,
        "senderId": "ManualUpload",
        "receiverId": "QPNVS",
        "messageId": "S000001",
        "messageDateTime": "2023-01-11T09:10:01CET",
        "payload": {
            "productCode": "02113111111164",
            "imageId": "123456789",
            "imageType": "front",
            "imageFormat": "png",
            "imageData": "https://www.bayer.com/en/bayer-products/product-details/bounty-250-mg-0-68-ml-pre-filled-syringe"
        }
    }

    const auditLog = {
        "username": "user",
        "reason": "Created Product",
        "itemCode": "00000000031059",
        "anchorId": "Z8s5VtVtfCHVyveRKwqUb3hciWfxDDzedykF9oBkj65Mn6DQi7oQFbt4Wjz7grswCvVRX6o3KEKGbefHb5fBxrHpeinvsLT4rrSfnKzuP9dozsYYyuqTbACWUqx2MoiRpaPSzCeRmeibn1vUT71ABjXejRio1",
        "hashLink": "2HqJt69J687THmZfpfJ9iafoJtB2vUGE7wd8eQdYFW7j7EiUnLLNxGkQdz9J5dMpLZmL56b1mHkZSTmBz63tgJVTD7bQuiBf93wBjdPA4eM7PCrJgnQf4Hh1A6BZk8ssrqdo9jZ4dar7eaiLdWUFXg2DAp5KeHtaT2vikmR26hTCSyU39uQ1hZeR2YPwGLbGTkak7ueHU21gPJNupj1UX7Gpx7VFqN8FsGBxDfRP2Eevb",
        "metadata": {
            "gtin": "00000000031059"
        },
        "logInfo": {
            "messageType": "Product",
            "messageTypeVersion": 1,
            "senderId": "nicoleta@axiologic.net",
            "receiverId": "",
            "messageId": "6733277145574",
            "messageDateTime": "2024-01-23T13:04:50.881Z",
            "token": "",
            "payload": {
                "inventedName": "BN1059",
                "productCode": "00000000031059",
                "nameMedicinalProduct": "NN1059",
                "manufName": "",
                "flagEnableAdverseEventReporting": false,
                "flagEnableACFProductCheck": false,
                "healthcarePractitionerInfo": "SmPC",
                "patientSpecificLeaflet": "Patient Information",
                "markets": [],
                "internalMaterialCode": "",
                "strength": ""
            }
        }
    }


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
        await $$.promisify(client.addEPI)(gtin, leafletDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding EPI to product");

    error = undefined;
    let epi;
    try {
        epi = await $$.promisify(client.getEPI)(gtin, language);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting product leaflet");
    assert.true(epi.xmlFileContent === leafletDetails.payload.xmlFileContent, "Leaflet details are not the same");

    error = undefined;
    leafletDetails.payload.xmlFileContent = "newXmlFileContent";
    try {
        await $$.promisify(client.updateEPI)(gtin, leafletDetails);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while updating EPI for product");

    error = undefined;
    epi = undefined;
    try {
        epi = await $$.promisify(client.getEPI)(gtin, language);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting product leaflet");
    assert.true(epi.xmlFileContent === leafletDetails.payload.xmlFileContent, "Leaflet details are not the same");

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
    assert.true(productPhoto.imageData === imageData.payload.imageData, "Image details are not the same");

    error = undefined;
    imageData.payload.imageData = "newImageData";
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
    assert.true(productPhoto.imageData === imageData.payload.imageData, "Image details are not the same");

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
    let products;
    try {
        products = await $$.promisify(client.listProducts)(undefined, undefined, undefined, "productCode == 02113111111164");
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while listing products");
    assert.true(products.length === 1, "Products are not the same");

    error = undefined;
    let batches;
    try {
        batches = await $$.promisify(client.listBatches)(undefined, undefined, undefined, "productCode == 02113111111164");
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while listing products");
    assert.true(products.length === 1, "Products are not the same");

    error = undefined;
    try {
        await $$.promisify(client.deleteEPI)(gtin, language);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while deleting EPI of product");

    error = undefined;
    try {
        await $$.promisify(client.addEPI)(gtin, batchNumber, leafletDetails);
    } catch (e) {
        error = e;
        throw e;
    }
    assert.true(error === undefined, "Error while adding EPI to batch");

    error = undefined;
    let batchLeaflet;
    try {
        batchLeaflet = await $$.promisify(client.getEPI)(gtin, language, batchNumber);
    } catch (e) {
        error = e;
        throw e
    }
    assert.true(error === undefined, "Error while getting batch leaflet");
    assert.true(batchLeaflet.xmlFileContent === leafletDetails.payload.xmlFileContent, "Leaflet details are not the same");


    error = undefined;
    leafletDetails.payload.xmlFileContent = "newXmlFileContent2";

    try {
        await $$.promisify(client.updateEPI)(gtin, batchNumber, leafletDetails);
    } catch (e) {
        error = e;
    }

    assert.true(error === undefined, "Error while updating EPI for batch");

    error = undefined;
    batchLeaflet = undefined;
    try {
        batchLeaflet = await $$.promisify(client.getEPI)(gtin, language, batchNumber);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting batch leaflet");
    assert.true(batchLeaflet.xmlFileContent === leafletDetails.payload.xmlFileContent, "Leaflet details are not the same");


    error = undefined;
    try {
        await $$.promisify(client.addEPI)(gtin, batchNumber, germanLeaflet);
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


    error = undefined;
    try {
        await $$.promisify(client.addAuditLog)(auditLog);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding audit log");

    error = undefined;
    try {
        await $$.promisify(client.addAuditLog)(auditLog);
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while adding audit log");

    error = undefined;
    let auditLogs;
    try {
        auditLogs = await $$.promisify(client.filterAuditLogs)(0, undefined, undefined, "__timestamp > 0");
    } catch (e) {
        error = e;
    }
    assert.true(error === undefined, "Error while getting audit logs");
    assert.true(auditLogs.length === 2, "Audit logs are not the same");

    callback();
}, 100000);