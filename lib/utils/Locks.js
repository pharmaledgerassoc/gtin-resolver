const opendsu = require("opendsu");
const lockApi = opendsu.loadApi("lock");

async function acquireLock(resourceId, period) {
    const crypto = opendsu.loadApi("crypto");
    let secret = crypto.encodeBase58(crypto.generateRandom(32));

    let lockAcquired;

    lockAcquired = await lockApi.lockAsync(resourceId, secret, period);

    if (!lockAcquired) {
        secret = undefined;
    }

    return secret;
}

async function releaseLock(resourceId, secret) {
    try {
        await lockApi.unlockAsync(resourceId, secret);
    } catch (err) {
        //if the unlock fails, the lock will be released after the expiration period set at the beginning.
    }
}

module.exports = {acquireLock, releaseLock};