function ModelFactoryMixin(target, enclave) {
    const constants = require("../utils/constants.js");
    const cacheAPI = require("opendsu").loadAPI("cache");
    const cache = cacheAPI.getWeakRefMemoryCache(constants.MODELS_CACHE_NAME);

    target.getInstance = () => {
        throw Error("getInstance method not implemented");
    }

    target.getCacheKey = (gtin, batchNumber) => {
        if (typeof batchNumber === "undefined") {
            return gtin;
        }
        return `${gtin}_${batchNumber}`;
    }

    target.create = async (domain, subdomain, gtin, version, batchNumber) => {
        const cacheKey = target.getCacheKey(gtin, batchNumber);
        const instance = cache.get(cacheKey);
        if (instance) {
            return instance;
        }
        const newInstance = target.getInstance(domain, subdomain, gtin, version, batchNumber);
        newInstance.version = 1;
        cache.put(cacheKey, newInstance);
        await newInstance.getEventRecorderInstance(newInstance.getGTINSSI());
        return newInstance;
    };

    target.lookup = async (domain, subdomain, gtin, version, batchNumber) => {
        const cacheKey = target.getCacheKey(gtin, batchNumber);
        const instance = cache.get(cacheKey);
        if (instance) {
            return instance;
        }
        const newInstance = target.getInstance(domain, subdomain, gtin, version, batchNumber);

        if (await newInstance.immutableDSUIsCorrupted()) {
            const error = new Error(`DSU is corrupted for ${newInstance.getIdentifier()}`);
            error.rootCause = require("opendsu").constants.ERROR_ROOT_CAUSE.MISSING_DATA_ERROR;
            throw error;
        }
        try {
            await newInstance.loadMutableDSUInstance();
        } catch (e) {
            return undefined; //no instance found
        }
        await newInstance.loadMetadata();
        await newInstance.getEventRecorderInstance();
        newInstance.version++;
        cache.put(cacheKey, newInstance);
        return newInstance;

    }

    return target;
}

module.exports = ModelFactoryMixin;