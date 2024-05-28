function LightDBEnclaveFactory() {
    let instances = {};
    const PREFIX = "DB_";
    let secretsServiceInstance;

    this.generateEnclaveName = (domain, subdomain) => {
        return `${PREFIX}${domain}_${subdomain}`;
    }

    const addEnclaveInstanceInCache = (domain, subdomain, enclaveInstance) => {
        instances[this.generateEnclaveName(domain, subdomain)] = enclaveInstance;
    }

    const getEnclaveInstanceFromCache = (domain, subdomain) => {
        return instances[this.generateEnclaveName(domain, subdomain)];
    }

    const enclaveExists = (domain, subdomain) => {
        return !!getEnclaveInstanceFromCache(domain, subdomain);
    }

    //todo: CODE-REVIEW - maybe this function should return a pendingCall type to be sure that no race condition for this initialization...
    this.createLightDBEnclaveAsync = async (domain, subdomain, skipCache = false) => {
        if(!skipCache && enclaveExists(domain, subdomain)){
            return getEnclaveInstanceFromCache(domain, subdomain);
        }

        if (!secretsServiceInstance) {
            secretsServiceInstance = await require("apihub").getSecretsServiceInstanceAsync();
        }
        let secret;
        try {
            secret = secretsServiceInstance.readSecretFromDefaultContainerSync(this.generateEnclaveName(domain, subdomain));
        } catch (e) {
            // ignored and handled below
        }

        if (!secret) {
            throw new Error(`Secret for enclave ${this.generateEnclaveName(domain, subdomain)} not found`);
        }

        //todo: CODE-REVIEW - instead of the slit we should have a function from the secretsServiceInstance that should return the array!
        const slots = secret.split(";");
        const enclave = require("opendsu").loadAPI("enclave");
        const lightDBEnclaveInstance = enclave.initialiseLightDBEnclave(this.generateEnclaveName(domain, subdomain), slots);
        try {
            await $$.promisify(lightDBEnclaveInstance.createDatabase)(this.generateEnclaveName(domain, subdomain));
        } catch (e) {
            // this console.error is a little bit abusive and can make tests and spawn process, workers fail to soon....
            console.info(`Failed to create database for enclave ${this.generateEnclaveName(domain, subdomain)}`, e);
        }

        addEnclaveInstanceInCache(domain, subdomain, lightDBEnclaveInstance);
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