const version = 1;
const {requestBodyJSONMiddleware} = require("./utils/middlewares.js");
const LightDBEnclaveFactory = require("./utils/LightDBEnclaveFactory.js");
const {validateGTIN} = require("../utils/ValidationUtils.js");
const {isBase64ValidImage} = require("../utils/CommonUtils.js");
const urlModule = require("url");

module.exports = function (server) {
    const lightDBEnclaveFactory = new LightDBEnclaveFactory();

    //setting up the connection to lightDB and share to the services via lightDBEnclaveFactory apis
    //lightDBEnclaveFactory.setEnclaveInstance(domain);

    function basicPreValidationMiddleware(req, res, next) {
        const {gtin, domain, subdomain} = req.params;

        //gtin validation required...
        let {isValid, message} = validateGTIN(gtin);
        if (!isValid) {
            res.send(400);
            return;
        }
        //collecting and JSON parsing of payload
        let payload = req.body;

        if (!payload) {
            res.send(400);
            return;
        }

        //maybe a ${domain} validation is required to be sure that we know the domain or else to return 404 !

        next();
    }

    function addSendMethodMiddleware(req, res, next) {
        res.send = function send(statusCode, result) {
            res.setHeader('Server', 'SoR integration Middleware');
            res.statusCode = statusCode;
            res.end(result);
        }

        next();
    }

    //this middleware injects the send method on res object before proceeding...
    server.use("/integration/*", addSendMethodMiddleware);

    server.use("/integration/:domain/:subdomain/*", async function (req, res, next) {
        const {domain, subdomain} = req.params;
        const enclaveInstance = await lightDBEnclaveFactory.createLightDBEnclaveAsync(domain, subdomain);
        const productController = require("./controllers/ProductController.js").getInstance(enclaveInstance, version);
        const batchController = require("./controllers/BatchController.js").getInstance(enclaveInstance, version);
        const leafletController = require("./controllers/LeafletController.js").getInstance(enclaveInstance, version);
        const monsterController = require("./controllers/MonsterController.js").getInstance(enclaveInstance, version);
        req.enclaveInstance = enclaveInstance;
        req.productController = productController;
        req.batchController = batchController;
        req.leafletController = leafletController;
        req.monsterController = monsterController;
        next();
    })

    //------ Product
    server.post("/integration/:domain/:subdomain/product/:gtin", requestBodyJSONMiddleware);
    // server.post("/integration/:domain/:subdomain/product/:gtin", basicPreValidationMiddleware);
    server.post("/integration/:domain/:subdomain/product/:gtin", async function (req, res) {
        const {gtin, domain, subdomain} = req.params;

        //collecting and JSON parsing of productMessage
        let productMessage = req.body;

        try {
            productMessage = JSON.parse(productMessage);
        } catch (err) {
            //can we send errors to the client?!
            res.send(415, err);
            return;
        }

        try {
            await req.productController.addProduct(domain, subdomain, gtin, productMessage, res);
        } catch (err) {
            res.send(500);
            return;
        }
    });

    server.put("/integration/:domain/:subdomain/product/:gtin", requestBodyJSONMiddleware);
    server.put("/integration/:domain/:subdomain/product/:gtin", basicPreValidationMiddleware);
    server.put("/integration/:domain/:subdomain/product/:gtin", async function (req, res) {
        const {gtin, domain, subdomain} = req.params;

        //collecting and JSON parsing of productMessage
        let productMessage = req.body;

        try {
            productMessage = JSON.parse(productMessage);
        } catch (err) {
            res.send(415, err);
            return;
        }

        try {
            await req.productController.updateProduct(domain, subdomain, gtin, productMessage, res);
        } catch (err) {
            res.send(500);
        }
    });

    server.get("/integration/:domain/:subdomain/product/:gtin", async function (req, res) {
        const {gtin, domain, subdomain} = req.params;

        //gtin validation required...
        let {isValid, message} = validateGTIN(gtin);
        if (!isValid) {
            res.send(400);
            return;
        }

        let productMetadata;
        try {
            productMetadata = await req.productController.getProduct(domain, subdomain, gtin, res);
        } catch (err) {
            res.send(500);
            return;
        }

        res.setHeader("Content-type", "text/json");
        res.send(200, productMetadata);
    });

    const imageHandler = async function (req, res) {
        const {gtin, domain, subdomain} = req.params;

        //collecting and JSON parsing of productPhotoMessage
        let productPhotoMessage = req.body;

        try {
            productPhotoMessage = JSON.parse(productPhotoMessage);
        } catch (err) {
            res.send(415, err);
            return;
        }

        // let isValidImage = await isBase64ValidImage(productPhotoMessage.imageData)
        // if (!isValidImage) {
        //     res.send(415, "Unsupported file format");
        //     return;
        // }

        try {
            await req.productController.addImage(domain, subdomain, gtin, productPhotoMessage, res);
        } catch (err) {
            res.send(500);
            return;
        }
    }

    server.post("/integration/:domain/:subdomain/image/:gtin", requestBodyJSONMiddleware);
    server.post("/integration/:domain/:subdomain/image/:gtin", basicPreValidationMiddleware);
    server.post("/integration/:domain/:subdomain/image/:gtin", imageHandler);

    server.put("/integration/:domain/:subdomain/image/:gtin", requestBodyJSONMiddleware);
    server.put("/integration/:domain/:subdomain/image/:gtin", basicPreValidationMiddleware);
    server.put("/integration/:domain/:subdomain/image/:gtin", imageHandler);

    server.get("/integration/:domain/:subdomain/image/:gtin", async function (req, res) {
        const {gtin, domain, subdomain} = req.params;

        //gtin validation required...
        let {isValid, message} = validateGTIN(gtin);
        if (!isValid) {
            res.send(400);
            return;
        }

        try {
            await req.productController.getImage(domain, subdomain, gtin, res);
        } catch (err) {
            res.send(500);
        }
    });

    //------ Batch
    server.put("/integration/:domain/:subdomain/batch/:gtin/:batchNumber", requestBodyJSONMiddleware);
    server.put("/integration/:domain/:subdomain/batch/:gtin/:batchNumber", basicPreValidationMiddleware);
    server.put("/integration/:domain/:subdomain/batch/:gtin/:batchNumber", async function (req, res) {
        const {gtin, domain, subdomain, batchNumber} = req.params;

        //collecting and JSON parsing of batchMessage
        let batchMessage = req.body;

        try {
            batchMessage = JSON.parse(batchMessage);
        } catch (err) {
            res.send(415, err);
            return;
        }

        try {
            await req.batchController.updateBatch(domain, subdomain, gtin, batchNumber, batchMessage, res);
        } catch (err) {
            res.send(500);
            return;
        }
    });

    server.post("/integration/:domain/:subdomain/batch/:gtin/:batchNumber", requestBodyJSONMiddleware);
    server.post("/integration/:domain/:subdomain/batch/:gtin/:batchNumber", basicPreValidationMiddleware);
    server.post("/integration/:domain/:subdomain/batch/:gtin/:batchNumber", async function (req, res) {
        const {gtin, domain, subdomain, batchNumber} = req.params;

        //collecting and JSON parsing of batchMessage
        let batchMessage = req.body;

        try {
            batchMessage = JSON.parse(batchMessage);
        } catch (err) {
            //can we send errors to the client?!
            res.send(415, err);
            return;
        }

        try {
            await req.batchController.addBatch(domain, subdomain, gtin, batchNumber, batchMessage, res);
        } catch (err) {
            res.send(500);
            return;
        }
    });

    server.get("/integration/:domain/:subdomain/batch/:gtin/:batchNumber", async function (req, res) {
        const {gtin, domain, subdomain, batchNumber} = req.params;

        //gtin validation required...
        let {isValid, message} = validateGTIN(gtin);
        if (!isValid) {
            res.send(400);
            return;
        }

        let batchMetadata;
        try {
            batchMetadata = await req.batchController.getBatch(domain, subdomain, gtin, batchNumber, res);
        } catch (err) {
            res.send(500);
            return;
        }

        res.setHeader("Content-type", "text/json");
        res.send(200, batchMetadata);
    });

    //------ Leaflet

    async function productEpiHandler(req, res) {
        const {gtin, domain, subdomain} = req.params;

        //collecting and JSON parsing of leafletMessage
        let leafletMessage = req.body;

        try {
            leafletMessage = JSON.parse(leafletMessage);
        } catch (err) {
            res.send(415, err);
            return;
        }

        try {
            await req.leafletController.addEPI(domain, subdomain, gtin, null, leafletMessage, res);
        } catch (err) {
            res.send(500);
            return;
        }
    }

    async function batchEpiHandler(req, res) {
        const {gtin, domain, subdomain, batchNumber} = req.params;

        //collecting and JSON parsing of leafletMessage
        let leafletMessage = req.body;

        try {
            leafletMessage = JSON.parse(leafletMessage);
        } catch (err) {
            res.send(415, err);
            return;
        }

        try {
            await req.leafletController.addEPI(domain, subdomain, gtin, batchNumber, leafletMessage, res);
        } catch (err) {
            res.send(500);
            return;
        }
    }

    server.put("/integration/:domain/:subdomain/epi/:gtin", requestBodyJSONMiddleware);
    server.put("/integration/:domain/:subdomain/epi/:gtin", basicPreValidationMiddleware);
    server.put("/integration/:domain/:subdomain/epi/:gtin", productEpiHandler);

    server.put("/integration/:domain/:subdomain/epi/:gtin/:batchNumber", requestBodyJSONMiddleware);
    server.put("/integration/:domain/:subdomain/epi/:gtin/:batchNumber", basicPreValidationMiddleware);
    server.put("/integration/:domain/:subdomain/epi/:gtin/:batchNumber", batchEpiHandler);

    server.post("/integration/:domain/:subdomain/epi/:gtin", requestBodyJSONMiddleware);
    server.post("/integration/:domain/:subdomain/epi/:gtin", basicPreValidationMiddleware);
    server.post("/integration/:domain/:subdomain/epi/:gtin", productEpiHandler);

    server.post("/integration/:domain/:subdomain/epi/:gtin/:batchNumber", requestBodyJSONMiddleware);
    server.post("/integration/:domain/:subdomain/epi/:gtin/:batchNumber", basicPreValidationMiddleware);
    server.post("/integration/:domain/:subdomain/epi/:gtin/:batchNumber", batchEpiHandler);


    async function deleteProductEpiHandler(req, res) {
        const {gtin, domain, subdomain} = req.params;

        //collecting and JSON parsing of leafletMessage
        let leafletMessage = req.body;

        try {
            leafletMessage = JSON.parse(leafletMessage);
        } catch (err) {
            res.send(415, err);
            return;
        }

        try {
            await req.leafletController.deleteProductEPI(domain, subdomain, gtin, leafletMessage, res);
        } catch (err) {
            res.send(500);
            return;
        }
    }

    async function deleteBatchEpiHandler(req, res) {
        const {gtin, domain, subdomain, batchNumber} = req.params;

        //collecting and JSON parsing of leafletMessage
        let leafletMessage = req.body;

        try {
            leafletMessage = JSON.parse(leafletMessage);
        } catch (err) {
            res.send(415, err);
            return;
        }

        try {
            await req.leafletController.deleteBatchEPI(domain, subdomain, gtin, batchNumber, leafletMessage, res);
        } catch (err) {
            res.send(500);
            return;
        }
    }


    server.delete("/integration/:domain/:subdomain/epi/:gtin", requestBodyJSONMiddleware);
    server.delete("/integration/:domain/:subdomain/epi/:gtin", basicPreValidationMiddleware);
    server.delete("/integration/:domain/:subdomain/epi/:gtin", deleteProductEpiHandler);

    server.delete("/integration/:domain/:subdomain/epi/:gtin/:batchNumber", requestBodyJSONMiddleware);
    server.delete("/integration/:domain/:subdomain/epi/:gtin/:batchNumber", basicPreValidationMiddleware);
    server.delete("/integration/:domain/:subdomain/epi/:gtin/:batchNumber", deleteBatchEpiHandler);

    //------ Messages
    server.put("/integration/:domain/:subdomain/message", requestBodyJSONMiddleware);
    server.put("/integration/:domain/:subdomain/message", async function (req, res) {
        let message = req.body;
        let {domain, subdomain} = req.params;

        try {
            message = JSON.parse(message);
        } catch (err) {
            res.send(415, err);
            return;
        }

        try {
            await req.monsterController.digestMessage(domain, subdomain, message, res);
        } catch (err) {
            res.send(500);
            return;
        }
    });

    server.put("/integration/:domain/:subdomain/multipleMessages", requestBodyJSONMiddleware);
    server.put("/integration/:domain/:subdomain/multipleMessages", async function (req, res) {
        let message = req.body;
        let {domain, subdomain} = req.params;

        try {
            message = JSON.parse(message);
        } catch (err) {
            res.send(415, err);
            return;
        }

        try {
            await req.monsterController.digestMultipleMessages(domain, subdomain, message, res);
        } catch (err) {
            res.send(500);
            return;
        }
    });


    server.get("/integration/:domain/:subdomain/listProducts", async (req, res) => {
        const urlModule = require('url');
        const urlParts = urlModule.parse(req.url, true);
        const {query, start, sort, number} = urlParts.query;
        let products;
        try {
            products = await req.productController.listProducts(parseInt(start), parseInt(number), query, sort, res);
        } catch (e) {
            return res.send(500);
        }
        res.setHeader("Content-type", "text/json");
        res.send(200, JSON.stringify(products));
    })

    server.get("/integration/:domain/:subdomain/listBatches", async (req, res) => {
        const urlModule = require('url');
        const urlParts = urlModule.parse(req.url, true);
        const {query, start, sort, number} = urlParts.query;
        let batches;
        try {
            batches = await req.batchController.listBatches(parseInt(start), parseInt(number), query, sort, res);
        } catch (e) {
            return res.send(500);
        }
        res.setHeader("Content-type", "text/json");
        res.send(200, JSON.stringify(batches));
    })

    server.get("/integration/:domain/:subdomain/listProductLangs/:gtin", async (req, res) => {
        const {gtin, domain, subdomain} = req.params;
        let languages;
        try {
            languages = await req.productController.listLanguages(domain, subdomain, gtin, res);
        } catch (e) {
            return res.send(500);
        }
        res.setHeader("Content-type", "text/json");
        res.send(200, JSON.stringify(languages));
    })

    server.get("/integration/:domain/:subdomain/listBatchLangs/:gtin/:batchNumber", async (req, res) => {
        const {gtin, domain, subdomain, batchNumber} = req.params;
        let languages;
        try {
            languages = await req.batchController.listLanguages(domain, subdomain, gtin, batchNumber, res);
        } catch (e) {
            return res.send(500);
        }
        res.setHeader("Content-type", "text/json");
        res.send(200, JSON.stringify(languages));
    });

    server.put("/integration/:domain/:subdomain/groupedMessages", requestBodyJSONMiddleware);
    server.put("/integration/:domain/:subdomain/groupedMessages", async function (req, res) {
        let message = req.body;
        let {domain, subdomain} = req.params;

        try {
            message = JSON.parse(message);
        } catch (err) {
            res.send(415, err);
            return;
        }

        try {
            await req.monsterController.digestGroupedMessages(domain, subdomain, message, res);
        } catch (err) {
            res.send(500);
            return;
        }
    });
}
