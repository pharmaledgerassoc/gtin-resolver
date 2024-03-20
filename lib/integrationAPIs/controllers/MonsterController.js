function MonsterController(enclave, version) {

    this.digestMessage = async function (domain, subdomain, message, req, res) {
        let digested = false;

        const productController = require("./ProductController.js").getInstance(version);
        digested = await productController.tryToDigest(domain, subdomain, message, req, res);
        if (digested) {
            return;
        }

        const batchController = require("./BatchController.js").getInstance(version);
        digested = await batchController.tryToDigest(domain, subdomain, message, req, res);
        if (digested) {
            return;
        }


        const leafletController = require("./LeafletController.js").getInstance(version);
        digested = await leafletController.tryToDigest(domain, subdomain, message, req, res);
        if (digested) {
            return;
        }

        res.send(422, "Failed to digestMessage");
        return;
    }

    this.digestMultipleMessages = async function (domain, subdomain, messages, req, res) {

    }

    this.digestGroupedMessages = async function (domain, subdomain, groupedMessages, req, res) {

    }
}

let instances = {};

function getInstance(enclave, version) {
    if (!instances[version]) {
        instances[version] = new MonsterController(enclave, version);
    }

    return instances[version];
}

module.exports = {
    getInstance
}