function requestBodyJSONMiddleware(request, response, next) {
    const data = [];

    request.on('data', (chunk) => {
        data.push(chunk);
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