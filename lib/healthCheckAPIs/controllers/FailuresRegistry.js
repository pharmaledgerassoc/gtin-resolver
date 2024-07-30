const registry = {};

function FailureRegistry() {}

FailureRegistry.prototype.registerFailure = (component, action, failureFunction) => {
    if (!registry[component]) {
        registry[component] = {};
    }
    registry[component][action] = failureFunction;
};

FailureRegistry.prototype.execute =  (component, action, ...args) => {
    if (!registry[component] || !registry[component][action]) {
        throw new Error(`No failure function registered for component: ${component}, action: ${action}`);
    }
    registry[component][action](...args);
};

module.exports = FailureRegistry;
const constants = require("../constants.js");
const fs = require("fs").promises;

const openDSU = require("opendsu");
const keySSISpace = openDSU.loadAPI("keyssi");
const getDomainFromSSI = (ssi) => {
    const keySSI = keySSISpace.parse(ssi);
    return keySSI.getDLDomain();
}

const getAnchorPath = (rootFolder, anchor) => {
    return `${rootFolder}/external-volume/domains/${getDomainFromSSI(anchor)}/anchors/${anchor}`;
}

const getBrickPathFromHashlink = (rootFolder, hashLink) => {
    const parsedHashLink = keySSISpace.parse(hashLink);
    const domain = parsedHashLink.getDLDomain();
    const brick = parsedHashLink.getHash();
    return `${rootFolder}/external-volume/domains/${domain}/brick-storage/${brick.substring(0, 2)}/${brick}`;
}

const getAnchorVersions = async (rootFolder, anchor) => {
    const anchorPath = getAnchorPath(rootFolder, anchor);
    const anchorContent = await fs.readFile(anchorPath);
    const anchorVersions = anchorContent.toString().split("\n");
    anchorVersions.pop();
    return anchorVersions;
}

const listDomains = async (rootFolder) => {
    const domainsPath = `${rootFolder}/external-volume/domains`;
    return await fs.readdir(domainsPath);
}

const getBrickPath = async (rootFolder, brick) => {
    const domains = await listDomains(rootFolder);
    for (let i = 0; i < domains.length; i++) {
        const domain = domains[i];
        const brickPath = `${rootFolder}/external-volume/domains/${domain}/brick-storage/${brick.substring(0, 2)}/${brick}`;
        try {
            await fs.access(brickPath);
            return brickPath;
        } catch (e) {
            continue;
        }
    }
}

FailureRegistry.prototype.registerFailure(constants.HEALTH_CHECK_COMPONENTS.ANCHORING, constants.FAILURE_ACTIONS.CORRUPT, async (rootFolder, anchorsToCorrupt) => {
    for (let i = 0; i < anchorsToCorrupt.length; i++) {
        const anchorVersions = await getAnchorVersions(rootFolder, anchorsToCorrupt[i]);
        const lastAnchorVersion = anchorVersions[anchorVersions.length - 1];
        const brickMapPath = getBrickPathFromHashlink(rootFolder, lastAnchorVersion);
        await fs.unlink(brickMapPath);
    }
})

FailureRegistry.prototype.registerFailure(constants.HEALTH_CHECK_COMPONENTS.BRICKING, constants.FAILURE_ACTIONS.DELETE, async (rootFolder, bricksToDelete) => {

})

FailureRegistry.prototype.registerFailure(constants.HEALTH_CHECK_COMPONENTS.BRICKING, constants.FAILURE_ACTIONS.CORRUPT, async (rootFolder, bricksToCorrupt) => {
    for (let i = 0; i < bricksToCorrupt.length; i++) {
        const brickPath = await getBrickPath(rootFolder, bricksToCorrupt[i]);
        await fs.writeFile(brickPath, "corrupted");
    }
})

module.exports = FailureRegistry;
