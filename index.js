const openDSU = require("opendsu");
const resolver = openDSU.loadApi("resolver");
const GtinDSUFactory = require("./lib/GTIN_DSU_Factory");

resolver.registerDSUFactory("gtin", new GtinDSUFactory(resolver));
const {createGTIN_SSI, parseGTIN_SSI} = require("./lib/GTIN_SSI");
const DSUFabricFeatureManager = require("./lib/DSUFabricFeatureManager");
const LeafletFeatureManager = require("./lib/LeafletFeatureManager");
const LeafletInfoService = require("./lib/services/LeafletInfoService");
const DSUFabricUtilsService = require("./lib/services/DSUFabricUtilsService");
const Languages = require("./lib/constants/Languages");
const UploadTypes = require("./lib/constants/UploadTypes");

module.exports = {
  createGTIN_SSI,
  parseGTIN_SSI,
  DSUFabricFeatureManager,
  LeafletFeatureManager,
  LeafletInfoService,
  DSUFabricUtilsService,
  UploadTypes,
  Languages,
  loadApi: function (apiName) {
    switch (apiName) {
      case "mappings":
        return require("./lib/mappings");
      case "services":
        return require("./lib/services");
    }
  },
  getEPIMappingEngineForAPIHUB: function (server) {
    return require("./lib/apihubMappingEngine").getEPIMappingEngineForAPIHUB(server);
  },
  getEPIMappingEngineMessageResults: function (server) {
    return require("./lib/apihubMappingEngineMessageResults").getEPIMappingEngineMessageResults(server);
  },
  getMessagesPipe: function () {
    const opendsu = require("opendsu");
    return opendsu.loadApi("m2dsu").getMessagesPipe();
  },
  getErrorsMap: function () {
    return require("opendsu").loadApi("m2dsu").getErrorsMap();
  },
  getMappingsUtils: function () {
    return require("./lib/utils/commonUtils");
  }
}

