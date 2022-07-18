const productUtils = require("./product/productUtils");
const batchUtils = require("./batch/batchUtils");
const constants = require("../constants/constants");
const increaseVersion = async (context, message) => {
	try {

		if (message.batchCode) {
			const batchId = message.batchCode;
			let batchMetadata = await batchUtils.getBatchMetadata.call(context, message, batchId);
			batchMetadata.version++;
			await $$.promisify(context.storageService.updateRecord, context.storageService)(constants.BATCHES_STORAGE_TABLE, batchMetadata.pk, batchMetadata);
		} else {
			const productCode = message.productCode;
			let productMetadata = await productUtils.getProductMetadata.call(context, message, productCode);
			productMetadata.version++;
			await $$.promisify(context.storageService.updateRecord, context.storageService)(constants.PRODUCTS_TABLE, productMetadata.pk, productMetadata);
		}
	}catch (e) {
		console.log("error", e);
	}
}

module.exports = {
	increaseVersion
}