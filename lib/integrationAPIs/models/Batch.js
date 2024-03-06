const ModelBase = require("./ModelBase.js");
const GTIN_SSI = require("../../GTIN_SSI.js");
const constants = require("../../constants/constants.js");
const {EVENTS} = require("../utils/Events");

function Batch(enclave, domain, subdomain, gtin, batchNumber, version) {

    const MUTABLE_MOUNTING_POINT = `/batch`;
    let instance = new ModelBase(enclave, domain, subdomain, gtin);

    //all the data that needs to be serialized as JSON needs to be added to the instance as soon as possible
    instance.productCode = gtin;
    instance.batch = batchNumber;
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
        return GTIN_SSI.createGTIN_SSI(domain, subdomain, instance.productCode, instance.batch);
    }


    let persist = instance.persist;
    instance.persist = async () => {
        await persist.call(instance);
//todo: check if we still need for the dsu anchoring before calling fixedURL
        /*require("./../../utils.js").activateGtinOwnerFixedUrl(productDSU, domain, subdomain, gtin);
        require("./../../utils.js").activateLeafletFixedUrl(productDSU, subdomain, subdomain, gtin);*/
    }

    return instance;
}

module.exports = Batch;
