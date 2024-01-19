let instances = {};

function setEnclaveInstance(domain, enclaveInstance) {
    instances[domain] = enclaveInstance;
}

function getEnclaveInstance(domain) {
    return instances[domain];
}

module.exports = {
    setEnclaveInstance,
    getEnclaveInstance
};