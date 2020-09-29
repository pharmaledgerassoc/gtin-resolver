const openDSU = require("opendsu");
const keyssiSpace = openDSU.loadApi("keyssi");

function GTIN_SSI(arraySSI) {

    const publicFunctions = ['getName', 'getDLDomain', 'getSpecificString', 'getVn', 'getHint', 'getAnchorId', 'getEncryptionKey', 'getIdentifier', 'getControl', 'clone'];
    publicFunctions.forEach(functionName => this[functionName] = arraySSI[functionName]);

    this.getIdentifier = (plain) => {
        const pskCrypto = require("pskcrypto");
        let identifier = arraySSI.getIdentifier(true);
        // identifier = identifier.replace("array", "gtin");
        return plain ? identifier : pskCrypto.pskBase58Encode(identifier);
    }
}

function setOptions(gtinSSI){
    if(typeof gtinSSI.options === "undefined"){
        gtinSSI.options = {};
    }
    gtinSSI.options.dsuFactoryType = "const";
}

function createGTIN_SSI(domain, gtin, batch, expiration, serialNumber) {
    let realSSI = keyssiSpace.buildArraySSI(domain, [gtin, batch, expiration]);
    let gtinSSI = new GTIN_SSI(realSSI);
    setOptions(gtinSSI);
    return gtinSSI;
}

function parseGTIN_SSI(ssiIdentifier) {
    const pskCrypto = require("pskcrypto");
    ssiIdentifier = pskCrypto.pskBase58Decode(ssiIdentifier).toString();
    ssiIdentifier = ssiIdentifier.replace("gtin", "array");
    ssiIdentifier = pskCrypto.pskBase58Encode(ssiIdentifier).toString();
    let realSSI = keyssiSpace.parse(ssiIdentifier);
    let gtinSSI = new GTIN_SSI(realSSI);
    setOptions(gtinSSI);
    return gtinSSI;
}

module.exports = {
    createGTIN_SSI,
    parseGTIN_SSI
};