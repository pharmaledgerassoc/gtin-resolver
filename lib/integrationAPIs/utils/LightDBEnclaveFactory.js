function LightDBEnclaveFactory() {
    let instances = {};
    const PREFIX = "DB_";
    let secretsServiceInstance;

    this.generateEnclaveName = (domain, subdomain, appName) => {
        return appName ? `${PREFIX}${domain}_${subdomain}_${appName}` : `${PREFIX}${domain}_${subdomain}`;
    }

    const addEnclaveInstanceInCache = (domain, subdomain, appName, enclaveInstance) => {
        instances[this.generateEnclaveName(domain, subdomain, appName)] = enclaveInstance;
    }

    const getEnclaveInstanceFromCache = (domain, subdomain, appName) => {
        return instances[this.generateEnclaveName(domain, subdomain, appName)];
    }

    const enclaveExists = (domain, subdomain, appName) => {
        return !!getEnclaveInstanceFromCache(domain, subdomain, appName);
    }

    this.createLightDBEnclaveAsync = async (domain, subdomain, options) => {
        let skipCache = false;
        let appName = "";
        if (options && typeof options === "boolean") {
            skipCache = options;
        }
        if (options && typeof options === "string") {
            appName = options;
        }

        if (options && typeof options === "object") {
            skipCache = !!options.skipCache;
            appName = options.appName || "";
        }
        if (!skipCache && enclaveExists(domain, subdomain, appName)) {
            return getEnclaveInstanceFromCache(domain, subdomain, appName);
        }

        if (!secretsServiceInstance) {
            secretsServiceInstance = await require("apihub").getSecretsServiceInstanceAsync();
        }
        let secret;
        try {
            secret = secretsServiceInstance.readSecretFromDefaultContainerSync(this.generateEnclaveName(domain, subdomain, appName));
        } catch (e) {
            // ignored and handled below
        }

        if (!secret) {
            throw new Error(`Secret for enclave ${this.generateEnclaveName(domain, subdomain, appName)} not found`);
        }

        const slots = secret.split(";");
        const enclave = require("opendsu").loadAPI("enclave");
        const lightDBEnclaveInstance = enclave.initialiseLightDBEnclave(this.generateEnclaveName(domain, subdomain, appName), slots);
        try {
            await $$.promisify(lightDBEnclaveInstance.createDatabase)(this.generateEnclaveName(domain, subdomain, appName));
        } catch (e) {
            console.info(`Failed to create database for enclave ${this.generateEnclaveName(domain, subdomain, appName)}`, e);
        }

        addEnclaveInstanceInCache(domain, subdomain, appName, lightDBEnclaveInstance);
        return lightDBEnclaveInstance;
    };
}

let instance;
const getLightDBEnclaveFactoryInstance = () => {
    if (!instance) {
        instance = new LightDBEnclaveFactory();
    }
    return instance;
}

module.exports = {
    getLightDBEnclaveFactoryInstance
};
