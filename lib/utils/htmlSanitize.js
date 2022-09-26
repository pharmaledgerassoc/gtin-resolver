const checkIfBase64 = (str) => {
    const regex = /^([A-Za-z0-9+\/]{4})*([A-Za-z0-9+\/]{3}=|[A-Za-z0-9+\/]{2}==)?$/g;
    return regex.test(str);
}

const sanitize = (html) => {
    let clone = html;
    if ($$.Buffer.isBuffer(clone)) {
        clone = clone.toString();
    }

    if (checkIfBase64(clone)) {
        clone = $$.Buffer.from(clone, "base64").toString();
    }
    const regex = /(<iframe>([\s\S]*)<\/iframe>)|(<script>([\s\S]*)<\/script>)/g;

    if (regex.test(clone)) {
        throw Error(`The html contains forbidden tags`);
    }

    return html;
}

module.exports = {
    sanitize
}