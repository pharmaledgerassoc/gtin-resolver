const ModelBase = require("./ModelBase.js");
const GTIN_SSI = require("../../GTIN_SSI.js");
const constants = require("../../constants/constants.js");
const {EVENTS} = require("../utils/Events");

function Product(enclave, domain, subdomain, gtin, version) {

    const MUTABLE_MOUNTING_POINT = `/product`;
    let instance = new ModelBase(enclave, domain, subdomain, gtin);

    //all the data that needs to be serialized as JSON needs to be added to the instance as soon as possible
    instance.productCode = gtin;
    //there is version specific paths and logic that may need to be carefully treated
    instance.epiProtocol = version;

    instance.getJSONStoragePath = () => {
        return `/product.epi_v${instance.epiProtocol}.json`;
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
        return constants.PRODUCT_DSU_MOUNT_POINT;
    }

    instance.getPathSSIData = () => {
        return {
            path: `0/${instance.productCode}`,
            domain: subdomain
        };
    }

    instance.getGTINSSI = () => {
        return GTIN_SSI.createGTIN_SSI(domain, subdomain, instance.productCode);
    }

    let persist = instance.persist;
    instance.persist = async () => {
        await persist.call(instance);
//todo: check if we still need for the dsu anchoring before calling fixedURL
        /*require("./../../utils.js").activateGtinOwnerFixedUrl(productDSU, domain, subdomain, gtin);
        require("./../../utils.js").activateLeafletFixedUrl(productDSU, subdomain, subdomain, gtin);*/
    }

    instance.addPhoto = async (photoData) => {
        let eventRecorder = await instance.getEventRecorderInstance(instance.getGTINSSI());
        let fileExtension = ".png"; //for now is hardcoded to png, but it should reflect the info from the base64 data encoding...
        eventRecorder.register(EVENTS.WRITE, getImageMountingPoint(fileExtension), photoData);
    }

    const getImageMountingPoint = (fileExtension) => {
        return `/photo${fileExtension}`;
    }

    instance.getPhoto = async () => {
        const imageMountingPoint = getImageMountingPoint(".png");
        const dsu = await instance.loadMutableDSUInstance();
        return await dsu.readFileAsync(imageMountingPoint);
    }

    instance.deletePhoto = async () => {
        let eventRecorder = await instance.getEventRecorderInstance(instance.getGTINSSI());
        let fileExtension = ".png"; //for now is hardcoded to png, but it should reflect the info from the base64 data encoding...
        eventRecorder.register(EVENTS.DELETE, `${MUTABLE_MOUNTING_POINT}/photo${fileExtension}`);
    }

    instance.getPathOfPathSSI = () => {
        const path = `0/${instance.productCode}`;
        return {
            path: path,
            domain: domain
        };
    }

    return instance;
}

module.exports = Product;
