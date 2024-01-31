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

    this.createLightDBEnclave = (domain, subdomain, callback) => {

    }

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

        }

        if (!secret) {
            throw new Error(`Secret for enclave ${this.generateEnclaveName(domain, subdomain)} not found`);
        }

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