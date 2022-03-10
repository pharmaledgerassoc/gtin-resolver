const openDSU = require("opendsu");
const resolver = openDSU.loadApi("resolver");
const GtinDSUFactory = require("./lib/GTIN_DSU_Factory");

resolver.registerDSUFactory("gtin", new GtinDSUFactory(resolver));
const {createGTIN_SSI, parseGTIN_SSI} = require("./lib/GTIN_SSI");
const {getDisabledFeatures} = require("./lib/ServerFeatureManager");
module.exports = {
  createGTIN_SSI,
  parseGTIN_SSI,
  getDisabledFeatures,
}

