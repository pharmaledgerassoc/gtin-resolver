const checkIfBase64 = (str) => {
    const regex = /^[A-Za-z0-9+/]+={0,2}$/g;
    return regex.test(str);

}

/**
 *
 * @param {string} str
 */
function parseBase64(str){
    if (str.length % 4 !== 0) {
        throw new Error(`Invalid length for a base 64: ${str.length} is not a multiple of 4.`);
    }

    let decoded;

    try {
        decoded = $$.Buffer.from(str, "base64").toString();
        // if (!/^[\x20-\x7E]*$/.test(decoded)) { // fails this test
        //     throw new Error(`base 64 after parse contains non printable characters`);
        // }

    } catch (e) {
        throw new Error(`Failed to decode base 64: ${e}`);
    }

    return decoded;
}

const sanitize = (html) => {
    let clone = html;
    try {
        if ($$.Buffer.isBuffer(clone)) {
            clone = clone.toString();
        }

        if (checkIfBase64(clone)) {
            clone = parseBase64(clone);
        }
        const regex = /(<(iframe|script)>(.*?)<\/\\1>)/gms;

        if (regex.test(clone)) {
            throw Error(`The html contains forbidden tags`);
        }

    } catch (e) {
        throw new Error(`Failed to sanitize HTML: ${e}`)
    }


    return html;
}

module.exports = {
    sanitize
}