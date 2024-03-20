function isEmail(ssoDetectedId) {
    const regexPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regexPattern.test(ssoDetectedId);
}

const getUserId = (req, message) => {
    if (isEmail(req.headers["user-id"])) {
        return req.headers["user-id"];
    }

    if (message && message.senderId) {
        return `${message.senderId} [${req.headers["user-id"]}]`;
    }

    return req.headers["user-id"];
}

module.exports = {
    getUserId
}