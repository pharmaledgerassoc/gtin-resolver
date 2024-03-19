require("../../../opendsu-sdk/builds/output/testsRuntime");
require('../../../gtin-resolver/build/bundles/gtinResolver');

const dc = require("double-check");
const assert = dc.assert;
const EpiSORIntegrationClient = require("../../lib/integrationAPIs/clients/EpiSORIntegrationClient");
const tir = require("../../../opendsu-sdk/psknode/tests/util/tir");
const path = require("path");
const fs = require("fs");

// Function to measure execution time
async function measureApiPerformance(apiFunction, repetitions = 2) {
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
    const domain = 'testDomain';
    const subdomain = 'testSubdomain';
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
        },
        "enableSimpleAuth": true
    }

    process.env.SSO_SECRETS_ENCRYPTION_KEY = "+WG9HhIoXGGSVq6cMlhy2P3vuiqz1O/WAaiF5JhXmnc=";
    process.env.EPI_DOMAIN = domain;
    process.env.EPI_SUBDOMAIN = subdomain;
    process.env.PSK_CONFIG_LOCATION = require("path").join(folder, "external-volume/config");
    const openDSU = require("opendsu");
    const crypto = openDSU.loadAPI("crypto");
    const apiKeyAPIs = openDSU.loadAPI("apiKey");
    const keySSISpace = openDSU.loadAPI("keyssi");
    const http = openDSU.loadAPI("http");
    const generateEncryptionKey = () => {
        return crypto.generateRandom(32).toString("base64");
    }
    const htPasswordPath = path.join(folder, ".htpassword.secret");
    for (let i = 0; i < 10; i++) {
        const user = `user${i}`;
        const password = `password${i}`;
        const hashedPassword = crypto.sha256JOSE(password).toString("hex");
        const mail = `usr${i}@example.com`;
        const ssoId = `usr${i}@example.com`;
        fs.appendFileSync(htPasswordPath, `${user}:${hashedPassword}:${mail}:${ssoId}\n`);
    }

    const interceptor = (data, callback) => {
        let {url, headers} = data;
        if (!headers) {
            headers = {};
        }

        if (!headers.authorization) {
            headers.authorization = authorization;
        }
        callback(undefined, {url, headers});
    }
    http.registerInterceptor(interceptor);

    const {port} = await tir.launchConfigurableApiHubTestNodeAsync({
        domains: [{name: domain, config: vaultDomainConfig}, {name: subdomain, config: vaultDomainConfig}],
        rootFolder: folder,
        serverConfig: serverConfig
    });

    const url = `http://localhost:${port}`;
    const apiKeysClient = apiKeyAPIs.getAPIKeysClient(url);
    const authorization = `Bearer user1:${crypto.sha256JOSE("password1").toString("hex")}`
    const headers = {
        "Authorization": authorization
    }

    const apiKey = generateEncryptionKey();
    const body = {
        apiKey,
        secret: generateEncryptionKey()
    }
    await apiKeysClient.becomeSysAdmin(JSON.stringify(body), headers);
    await apiKeysClient.associateAPIKey("DSU_Fabric", "name", "usr1@example.com", {secret: generateEncryptionKey(), scope:"write"}, headers);

    const secretsService = await require("apihub").getSecretsServiceInstanceAsync(folder);
    const LightDBEnclaveFactory = require("../../../gtin-resolver/lib/integrationAPIs/utils/LightDBEnclaveFactory");
    const lightDBEnclaveFactory = LightDBEnclaveFactory.getLightDBEnclaveFactoryInstance();
    const seedSSI = await $$.promisify(keySSISpace.createSeedSSI)(domain);
    await secretsService.putSecretInDefaultContainerAsync(lightDBEnclaveFactory.generateEnclaveName(domain, subdomain), seedSSI.base64Encode(seedSSI.getPrivateKey()))    // ... (rest of the setup code)

    const client = EpiSORIntegrationClient.getInstance(domain, subdomain);
    // promisify all methods of client
    for(let prop in client) {
        if(typeof client[prop] === 'function') {
            client[prop] = $$.promisify(client[prop]);
        }
    }
    // --- Performance Tests ---
// Test for addProduct
    console.log('Testing addProduct performance...');
    const generatedGTINs = [];
    const generatedBatchNumbers = [];
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
        generatedGTINs.push(gtinValue);
        return gtinValue;
    }

    function generateRandomBatchNumber(length = 10) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        generatedBatchNumbers.push(result);
        return result;
    }

    const updateProduct = async ()=>{
        const gtin = generateRandomGTIN14();
        productDetails.payload.productCode = gtin;
        await client.updateProduct(gtin, productDetails);
    }

    // Test for updateProduct
    console.log('Testing updateProduct performance...');
    await measureApiPerformance(updateProduct.bind(client));


    const updateBatch = async ()=>{
        const gtin = generatedGTINs[Math.floor(Math.random() * generatedGTINs.length)];
        const batchNumber = generateRandomBatchNumber();
        batchDetails.payload.productCode = gtin;
        batchDetails.payload.batchNumber = batchNumber;
        await client.updateBatch(gtin, batchNumber, batchDetails);
    }
    // Test for updateBatch
    console.log('Testing updateBatch performance...');
    await measureApiPerformance(updateBatch);
    //

    const updateImage = async ()=>{
        const gtin = generatedGTINs[Math.floor(Math.random() * generatedGTINs.length)];
        image.payload.productCode = gtin;
        await client.updateImage(gtin, image);
    }
    // Test for updateImage
    console.log('Testing updateImage performance...');
    await measureApiPerformance(updateImage);

    // Test for updateProductEPI
    const updateProductEPI = async ()=>{
        const gtin = generatedGTINs[Math.floor(Math.random() * generatedGTINs.length)];
        leafletDetails.payload.productCode = gtin;
        await client.updateProductEPI(gtin, language, "leaflet", leafletDetails);
    }
    console.log('Testing updateProductEPI performance...');
    await measureApiPerformance(updateProductEPI);

    const updateBatchEPI = async ()=>{
        const gtin = generatedGTINs[Math.floor(Math.random() * generatedGTINs.length)];
        const batchNumber = generatedBatchNumbers[Math.floor(Math.random() * generatedBatchNumbers.length)];
        leafletDetails.payload.productCode = gtin;
        leafletDetails.payload.batchNumber = batchNumber;
        await client.updateBatchEPI(gtin, batchNumber, language, "leaflet", leafletDetails);
    }
    // Test for updateBatchEPI
    console.log('Testing updateBatchEPI performance...');
    await measureApiPerformance(updateBatchEPI);

    callback();
}, 1000000);