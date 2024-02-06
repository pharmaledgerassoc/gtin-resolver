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

    //todo: CODE-REVIEW - if there is no need for this type of callback based function we should not waste time with them...
    this.createLightDBEnclave = (domain, subdomain, callback) => {

    }

    //todo: CODE-REVIEW - maybe this function should return a pendingCall type to be sure that no race condition for this initialization...
    this.createLightDBEnclaveAsync = async (domain, subdomain) => {
        if (enclaveExists(domain, subdomain)) {
            return getEnclaveInstanceFromCache(domain, subdomain);
        }

        if (!secretsServiceInstance) {
            secretsServiceInstance = await require("apihub").getSecretsServiceInstanceAsync();
        }
        let secret;
        try {
            secret = secretsServiceInstance.readSecretSync(this.generateEnclaveName(domain, subdomain));
        } catch (e) {
            //todo: CODE-REVIEW - add a reason why we don't touch the e variable in this case...
        }

        if (!secret) {
            throw new Error(`Secret for enclave ${this.generateEnclaveName(domain, subdomain)} not found`);
        }

        //todo: CODE-REVIEW - instead of the slit we should have a function from the secretsServiceInstance that should return the array!
        const slots = secret.split(";");
        const enclave = require("opendsu").loadAPI("enclave");
        const lightDBEnclaveInstance = enclave.initialiseLightDBEnclave(this.generateEnclaveName(domain, subdomain), slots);
        await $$.promisify(lightDBEnclaveInstance.createDatabase)(this.generateEnclaveName(domain, subdomain));
        await $$.promisify(lightDBEnclaveInstance.grantWriteAccess)($$.SYSTEM_IDENTIFIER);
        addEnclaveInstanceInCache(domain, subdomain, lightDBEnclaveInstance);
        return lightDBEnclaveInstance;
    }
}

module.exports = LightDBEnclaveFactory;