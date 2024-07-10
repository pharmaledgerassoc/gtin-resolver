const bodyReaderMiddleware = (req, res, next) => {
    let data = '';

    req.on('data', chunk => {
        data += chunk;
    });

    req.on('end', () => {
        try {
            req.body = JSON.parse(data);
        } catch (e) {
            req.body = data;
        }
        next();
    });
};
module.exports=bodyReaderMiddleware;