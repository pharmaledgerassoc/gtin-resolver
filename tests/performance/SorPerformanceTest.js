require("../../../opendsu-sdk/builds/output/testsRuntime");
require('../../../gtin-resolver/build/bundles/gtinResolver');

const dc = require("double-check");
const assert = dc.assert;
const EpiSORIntegrationClient = require("../../lib/integrationAPIs/clients/EpiSORIntegrationClient");
const tir = require("../../../opendsu-sdk/psknode/tests/util/tir");
const path = require("path");
const fs = require("fs");

// Function to measure execution time
async function measureApiPerformance(apiFunction, repetitions = 30) {
    const start = Date.now();
    const promises = [];

    for (let i = 0; i < repetitions; i++) {
        promises.push(apiFunction());
    }

    try {
        await Promise.all(promises);
        const end = Date.now();
        const duration = end - start;
        console.log(`API executed ${repetitions} times in ${duration} ms`);
    } catch (error) {
        console.error('Error executing API', error);
    }
}

assert.callback("EPISORClient Write API Performance Tests", async (callback) => {
    // Set up API Hub test node (same as in the provided test suite)
    const domain = 'testnet.dev';
    const subdomain = 'testnet.dev.epi';
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
            "batchNumber": "B123",
            "packagingSiteName": "",
            "expiryDate": "230600"
        }
    };

    const leafletDetails = require("../leaflet.json");
    const image = require("../image.json");

    process.env.SSO_SECRETS_ENCRYPTION_KEY = "+WG9HhIoXGGSVq6cMlhy2P3vuiqz1O/WAaiF5JhXmnc=";

    const openDSU = require("opendsu");
    const crypto = openDSU.loadAPI("crypto");
    const apiKeyAPIs = openDSU.loadAPI("apiKey");
    const keySSISpace = openDSU.loadAPI("keyssi");
    const http = openDSU.loadAPI("http");
    const systemAPI = openDSU.loadAPI("system");
    systemAPI.setEnvironmentVariable(openDSU.constants.BDNS_ROOT_HOSTS, "https://c1.dev.pladevs.com")
    const generateEncryptionKey = () => {
        return crypto.generateRandom(32).toString("base64");
    }

    const tokenEndpoint = "https://login.microsoftonline.com/d69968dd-8f36-47eb-b724-7f5e6e660066/oauth2/v2.0/token";
    const clientId = "5daf11d0-dc28-4d09-b8c7-2eec6f16eb78";
    const clientSecret = "";
    const scope = "api://5daf11d0-dc28-4d09-b8c7-2eec6f16eb78/.default";
    const getAccessToken = async () => {
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);
        params.append('scope', scope);

        let response;
        response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params
        })

        let data = await response.json();
        return data.access_token;
    }

    const accessToken = await getAccessToken();
    const interceptor = (data, callback) => {
        let {url, headers} = data;
        if (!headers) {
            headers = {};
        }

        if (!headers["x-api-key"]) {
            headers["x-api-key"] = process.env.SSO_SECRETS_ENCRYPTION_KEY;
        }

        if (!headers.authorization) {
            headers.authorization = `Bearer ${accessToken}`;
        }

        callback(undefined, {url, headers});
    }

    http.registerInterceptor(interceptor);

    const apiHub = require("apihub");
    const secretsService = await apiHub.getSecretsServiceInstanceAsync(path.join(apiHub.getServerConfig().storage, "../../apihub-root"));
    const LightDBEnclaveFactory = require("../../../gtin-resolver/lib/integrationAPIs/utils/LightDBEnclaveFactory");
    const lightDBEnclaveFactory = LightDBEnclaveFactory.getLightDBEnclaveFactoryInstance();
    const seedSSI = await $$.promisify(keySSISpace.createSeedSSI)(domain);
    await secretsService.putSecretInDefaultContainerAsync(lightDBEnclaveFactory.generateEnclaveName(domain, subdomain), seedSSI.base64Encode(seedSSI.getPrivateKey()))    // ... (rest of the setup code)

    const client = EpiSORIntegrationClient.getInstance(domain, subdomain);
    // promisify all methods of client
    for (let prop in client) {
        if (typeof client[prop] === 'function') {
            client[prop] = $$.promisify(client[prop]);
        }
    }
    // --- Performance Tests ---
// Test for addProduct
    console.log('Testing addProduct performance...');
    let existingGTINs = [];
    let existingBatchNumbers = [];

    function generateRandomGTIN14() {
        // Generate the first 13 digits randomly
        let gtinValue = '';
        for (let i = 0; i < 13; i++) {
            gtinValue += Math.floor(Math.random() * 10).toString();
        }

        // Calculate the check digit
        const gtinMultiplicationArray = [3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3];

        let gtinDigits = gtinValue.split("");


        let j = gtinMultiplicationArray.length - 1;
        let reszultSum = 0;
        for (let i = gtinDigits.length - 1; i >= 0; i--) {
            reszultSum = reszultSum + gtinDigits[i] * gtinMultiplicationArray[j];
            j--;
        }
        let validDigit = Math.floor((reszultSum + 10) / 10) * 10 - reszultSum;
        if (validDigit === 10) {
            validDigit = 0;
        }

        gtinValue += validDigit;
        existingGTINs.push(gtinValue);
        return gtinValue;
    }

    function generateRandomBatchNumber(length = 10) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    const products = await client.listProducts();
    existingGTINs = existingGTINs.concat(products.map(product => product.productCode));

    const batches = await client.listBatches();
    existingBatchNumbers = existingBatchNumbers.concat(batches.map(batch => batch.batchNumber));
    let existingBatchObjects = batches.map(batch => {
        return {
            productCode: batch.productCode,
            batchNumber: batch.batchNumber
        }
    });
    const updateProduct = async () => {
        const gtin = generateRandomGTIN14();
        productDetails.payload.inventedName = `Product ${generateRandomBatchNumber(5)}`;
        productDetails.payload.nameMedicinalProduct = productDetails.payload.inventedName;
        productDetails.payload.productCode = gtin;
        await client.updateProduct(gtin, productDetails);
    }

    // Test for updateProduct
    console.log('Testing updateProduct performance...');
    await measureApiPerformance(updateProduct);


    const updateBatch = async ()=>{
        const gtin = existingGTINs[Math.floor(Math.random() * existingGTINs.length)];
        const batchNumber = generateRandomBatchNumber();
        batchDetails.payload.productCode = gtin;
        batchDetails.payload.batchNumber = batchNumber;
        existingGTINs.push(gtin);
        await client.updateBatch(gtin, batchNumber, batchDetails);
    }
    // Test for updateBatch
    console.log('Testing updateBatch performance...');
    await measureApiPerformance(updateBatch);


    const updateImage = async ()=>{
        const gtin = existingGTINs[Math.floor(Math.random() * existingGTINs.length)];
        image.payload.productCode = gtin;
        await client.updateImage(gtin, image);
    }
    // Test for updateImage
    console.log('Testing updateImage performance...');
    await measureApiPerformance(updateImage);

    // Test for updateProductEPI
    const updateProductEPI = async () => {
        const gtin = existingGTINs[Math.floor(Math.random() * existingGTINs.length)];
        leafletDetails.payload.productCode = gtin;
        await client.updateProductEPI(gtin, language, "leaflet", leafletDetails);
    }
    console.log('Testing updateProductEPI performance...');
    await measureApiPerformance(updateProductEPI, 20);

    const updateBatchEPI = async ()=>{
        const batchObject = existingBatchObjects[Math.floor(Math.random() * existingBatchObjects.length)];
        leafletDetails.payload.productCode = batchObject.productCode;
        leafletDetails.payload.batchNumber = batchObject.batchNumber;
        await client.updateBatchEPI(batchObject.productCode, batchObject.batchNumber, language, "leaflet", leafletDetails);
    }
    // Test for updateBatchEPI
    console.log('Testing updateBatchEPI performance...');
    await measureApiPerformance(updateBatchEPI, 20);

    callback();
}, 1000000);