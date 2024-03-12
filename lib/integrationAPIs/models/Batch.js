const ModelBase = require("./ModelBase.js");
const GTIN_SSI = require("../../GTIN_SSI.js");
const constants = require("../../constants/constants.js");

function Batch(enclave, domain, subdomain, gtin, batchNumber, version) {
    let instance = new ModelBase(enclave, domain, subdomain, gtin);

    //all the data that needs to be serialized as JSON needs to be added to the instance as soon as possible
    instance.productCode = gtin;
    instance.batchNumber = batchNumber;
    //there is version specific paths and logic that may need to be carefully treated
    instance.epiProtocol = `v${version}`;

    instance.getJSONStoragePath = () => {
        return `/batch.epi_${instance.epiProtocol}`;
    }

    instance.getLeafletStoragePath = (language, type) => {
        let path = `/${type}`;
        if (language) {
            path += `/${language}`;
        }
        return path;
    }

    instance.getLeafletFilePath = (language, type) => {
        return `${instance.getLeafletStoragePath(language, type)}/${type}.xml`;
    }

    instance.getMutableMountingPoint = () => {
        return constants.BATCH_DSU_MOUNT_POINT;
    }

    instance.getPathOfPathSSI = () => {
        return {
            path: `0/${gtin}/${batchNumber}`,
            domain: subdomain
        };
    }

    instance.getGTINSSI = () => {
        return GTIN_SSI.createGTIN_SSI(domain, subdomain, instance.productCode, instance.batchNumber);
    }


    let persist = instance.persist;
    instance.persist = async () => {
        let diffs = await persist.call(instance);
        //todo: check if we still need for the dsu anchoring before calling fixedURL
        await $$.promisify(require("./../../utils.js").activateGtinOwnerFixedUrl)(undefined, domain, gtin);
        await $$.promisify(require("./../../utils.js").activateLeafletFixedUrl)(undefined, domain, gtin);
        return diffs;
    }

    const loadMetadata = instance.loadMetadata;
    instance.loadMetadata = async () => {
        await loadMetadata.call(instance);
        instance.batchNumber = instance.batchNumber || instance.batch;
        instance.inventedName = instance.inventedName  || instance.productName;
        instance.nameMedicinalProduct = instance.nameMedicinalProduct || instance.productName;
        instance.productCode = instance.productCode || instance.gtin;
        instance.expiryDate = instance.expiryDate || instance.expiry;
    }

    return instance;
}

module.exports = Batch;
