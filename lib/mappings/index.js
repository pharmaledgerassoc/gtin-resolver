//loading EPI necessary mappings
require("./product/product.js");
require("./batch/batch.js");
require("./product/productPhoto.js");
require("./product-video/videoSource.js");
require("./leaflet/leaflet.js");
require("./leaflet/leafletDelete.js");

module.exports.getEPIMappingEngine = function(dsuStorage, options){
	const opendsu = require("opendsu");
	const sharedDBStorageService = require("gtin-resolver").loadApi("services").SharedDBStorageService.getPromisifiedSharedObject(dsuStorage);
	return opendsu.loadApi("m2dsu").getMappingEngine(sharedDBStorageService, options);
}

// module.exports.utils = require("./utils.js");
module.exports.getMappingLogs = function (storageService){
	return require("../utils/logsUtils").createInstance(storageService).getMappingLogs;
}

module.exports.buildResponse = function(version){
	return require("./responses").buildResponse(version);
}
