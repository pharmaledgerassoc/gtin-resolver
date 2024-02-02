function requestBodyJSONMiddleware(request, response, next) {
    let data = "";

    request.on('data', (chunk) => {
        data += chunk;
    });

    request.on('end', () => {
        if (!data.length) {
            request.body = undefined;
            return next();
        }

        request.body = data;
        next();
    });
}

module.exports = {
    requestBodyJSONMiddleware
}