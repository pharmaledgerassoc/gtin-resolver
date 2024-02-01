const ModelBase = require("./ModelBase.js");
const GTIN_SSI = require("../../GTIN_SSI.js");
const constants = require("../../constants/constants.js");
const {EVENTS} = require("../utils/Events");

function Batch(enclave, domain, subdomain, batchId, gtin, version) {

    const MUTABLE_MOUNTING_POINT = `/batch`;
    let instance = new ModelBase(enclave);

    //all the data that needs to be serialized as JSON needs to be added to the instance as soon as possible
    instance.productCode = gtin;
    instance.batch = batchId;
    //there is version specific paths and logic that may need to be carefully treated
    instance.epiProtocol = version;

    instance.getJSONStoragePath = function () {
        return `${MUTABLE_MOUNTING_POINT}/batch.epi_v${instance.epiProtocol}.json`;
    }

    instance.getLeafletStoragePath = function (type, language) {
        let path = `${MUTABLE_MOUNTING_POINT}/${type}`;
        if (language) {
            path += `/${language}`;
        }
        return path;
    }

    instance.getLeafletFilePath = function (type, language) {
        return `${instance.getLeafletStoragePath(type, language)}/${type}.xml`;
    }

    instance.getMutableMountingPoint = function () {
        return constants.BATCH_DSU_MOUNT_POINT;
    }

    instance.getPathOfPathSSI = function () {
        return {
            path: `0/${gtin}/${batchId}`,
            domain: subdomain
        };
    }

    instance.getGTINSSI = function () {
        return GTIN_SSI.createGTIN_SSI(domain, subdomain, subdomain, subdomain, instance.productCode, instance.batch);
    }


    let persist = instance.persist;
    instance.persist = async function () {
        await persist.call(instance);
//todo: check if we still need for the dsu anchoring before calling fixedURL
        /*require("./../../utils.js").activateGtinOwnerFixedUrl(productDSU, domain, subdomain, gtin);
        require("./../../utils.js").activateLeafletFixedUrl(productDSU, subdomain, subdomain, gtin);*/
    }

    return instance;
}

module.exports = Batch;