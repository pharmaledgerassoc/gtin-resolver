const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const authenticationModes = ["ocb", "ccm", "gcm"];
const keySizes = [128, 192, 256];

function encryptionIsAuthenticated(algorithm) {
    for (const mode of authenticationModes) {
        if (algorithm.includes(mode)) {
            return true;
        }
    }

    return false;
}

function getKeyLength(algorithm) {
    for (const len of keySizes) {
        if (algorithm.includes(len.toString())) {
            return len / 8;
        }
    }

    throw new Error("Invalid encryption algorithm.");
}

const algorithm ="aes-256-gcm" 
let keylen = getKeyLength(algorithm);

function encryptionIsAuthenticated(algorithm) {
    for (const mode of authenticationModes) {
        if (algorithm.includes(mode)) {
            return true;
        }
    }

    return false;
}

function decrypt (encryptedData, decryptionKey, authTagLength = 0, options) {
    if (typeof encryptedData === "string") {
        encryptedData = Buffer.from(encryptedData);
    }
    if (typeof decryptionKey === "string") {
        decryptionKey = Buffer.from(decryptionKey);
    }

    let iv;

    if (!iv) {
        let res = getDecryptionParameters(encryptedData, authTagLength);
        iv = res.iv;
    }
    const decipher = crypto.createDecipheriv(algorithm, decryptionKey, iv, options);
    if (encryptionIsAuthenticated(algorithm)) {
        decipher.setAAD(aad);
        decipher.setAuthTag(tag);
    }

    return Buffer.concat([decipher.update(data), decipher.final()]);
};

function getDecryptionParameters (encryptedData, authTagLength = 0) {
    let aadLen = 0;
    if (encryptionIsAuthenticated) {
        authTagLength = 16;
        aadLen = keylen;
    }

    const tagOffset = encryptedData.length - authTagLength;
    tag = encryptedData.slice(tagOffset, encryptedData.length);

    const aadOffset = tagOffset - aadLen;
    aad = encryptedData.slice(aadOffset, tagOffset);

    iv = encryptedData.slice(aadOffset - 16, aadOffset);
    data = encryptedData.slice(0, aadOffset - 16);

    return {iv, aad, tag, data};
};

async function testSecretFromCommandLine() {
    const key = process.argv[2];
    
    try {
        let encryptionKey = Buffer.from(key, "base64");

         const secretsPath = path.join(__dirname, "..","..", "..", "..", "apihub-root" , "external-volume", "secrets");

        const secretPath = path.join(secretsPath, "adminApiKeys.secret");
        const secretContent = fs.readFileSync(secretPath);
        const b = decrypt(secretContent, encryptionKey);
        // fs.writeFileSync("adminApiKeys.secret", b);
    } catch (error) {
        return console.log(`Error decrypting secret: ${error.message}`);
    }
    console.log("adminApiKeys.secret decrypted successfully!");
}

testSecretFromCommandLine();