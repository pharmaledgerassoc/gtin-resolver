const XMLDisplayService = require("../../services/XMLDisplayService/XMLDisplayService");
const constants = require("../utils/constants");

function ProductController(enclave, version) {
    const productFactory = require("../factories/ProductFactory.js").getInstance(enclave);
    const auditService = require("../services/AuditService.js").getInstance(enclave);
    const validationService = require("../services/ValidationService.js").getInstance();
    const constants = require("../utils/constants.js");
    const OPERATIONS = constants.OPERATIONS;
    this.addProduct = async (domain, subdomain, gtin, productMessage, req, res) => {
        const userId = req.headers["user-id"];
        let product;
        try {
            // await validationService.validateProductMessage(productMessage);
        } catch (err) {
            res.send(422, "Payload validation failed");
            return;
        }

        const productData = productMessage.payload;

        if (gtin !== productData.productCode) {
            res.send(422, "Payload validation failed");
            return;
        }

        const operationInProgressContext = {
            operation: OPERATIONS.CREATE_PRODUCT_IN_PROGRESS,
            gtin,
            userId
        }

        const failedOperationContext = {
            operation: OPERATIONS.CREATE_PRODUCT_FAIL,
            gtin,
            userId
        }

        const successOperationContext = {
            operation: OPERATIONS.CREATE_PRODUCT,
            gtin,
            userId

        }

        let auditId;
        try {
            auditId = await auditService.auditOperationInProgress(operationInProgressContext);
        } catch (err) {
            res.send(500, "Failed to audit start of an operation");
            return;
        }

        try {
            product = await productFactory.lookupProduct(domain, subdomain, gtin, version);

            if (product) {
                await auditService.auditFail(auditId, failedOperationContext);

                //there is already a product with the same gtin...
                res.send(409, "Product already exists");
                return;
            }

            product = await productFactory.createProduct(domain, subdomain, gtin, version);
            //todo: CODE-REVIEW - why do we call this function here? can we hide this in the update function before doing the update?!
            product.update(productData);
            try {
                await product.persist();
            } catch (err) {
                console.error(err)
                await auditService.auditFail(auditId, failedOperationContext);
                //.... return proper error to the client
                res.send(529);
                return;
            }

        } catch (err) {
            console.error(err)
            await auditService.auditFail(auditId, failedOperationContext);
            //....
            res.send(500);
            return;
        }
        await auditService.auditProduct(auditId, productMessage, successOperationContext);
        res.send(200);
    }

    this.updateProduct = async function (domain, subdomain, gtin, productMessage, req, res) {
        const userId = req.headers["user-id"];
        let product;
        try {
            // await validationService.validateProductMessage(productMessage);
        } catch (err) {
            res.send(422, "Payload validation failed");
            return;
        }

        const productData = productMessage.payload;

        if (gtin !== productData.productCode) {
            res.send(422, "Payload validation failed");
            return;
        }

        const operationInProgressContext = {
            operation: OPERATIONS.UPDATE_PRODUCT_IN_PROGRESS,
            gtin,
            userId
        }

        const failedOperationContext = {
            operation: OPERATIONS.UPDATE_PRODUCT_FAIL,
            gtin,
            userId
        }

        const successOperationContext = {
            operation: OPERATIONS.UPDATE_PRODUCT,
            gtin,
            userId
        }

        let auditId;
        try {
            auditId = await auditService.auditOperationInProgress(operationInProgressContext);
        } catch (err) {
            res.send(500, "Failed to audit start of an operation");
            return;
        }

        try {
            product = await productFactory.lookupProduct(domain, subdomain, gtin, version);
            if (!product) {
                //if we don't have a product to update ...
                await auditService.auditFail(auditId, failedOperationContext);
                res.send(404, "Product not found");
                return;
            }

            product.update(productData);
            try {
                await product.persist();
            } catch (err) {
                await auditService.auditFail(auditId, failedOperationContext);
                //.... return proper error to the client

                res.send(529);
                return;
            }

        } catch (err) {
            await auditService.auditFail(auditId, failedOperationContext);
            //....
            res.send(500);
            return;
        }
        await auditService.auditProduct(auditId, productMessage, successOperationContext);
        res.send(200);
    }

    this.getProduct = async (domain, subdomain, gtin, req, res) => {
        try {
            let product;
            product = await productFactory.lookupProduct(domain, subdomain, gtin, version);

            if (!product) {
                //if we don't have a product...
                res.send(404, "Product not found");
                return;
            }

            const productMetadata = JSON.stringify(product);
            return productMetadata;
        } catch (err) {
            //....
            res.send(500);
        }
    }

    this.addImage = async (domain, subdomain, gtin, photoMessage, req, res) => {
        const userId = req.headers["user-id"];
        let product;
        try {
            // await validationService.validatePhotoMessage(photoMessage);
        } catch (err) {
            res.send(422, "Payload validation failed");
            return;
        }

        const {imageData} = photoMessage.payload;

        const operationInProgressContext = {
            operation: OPERATIONS.ADD_PRODUCT_PHOTO_IN_PROGRESS,
            gtin,
            userId
        }

        const failedOperationContext = {
            operation: OPERATIONS.ADD_PRODUCT_PHOTO_FAIL,
            gtin,
            userId
        }

        const successOperationContext = {
            operation: OPERATIONS.ADD_PRODUCT_PHOTO,
            gtin,
            userId
        }

        let auditId;
        try {
            auditId = await auditService.auditOperationInProgress(operationInProgressContext);
        } catch (err) {
            res.send(500, "Failed to audit start of an operation");
            return;
        }

        try {
            product = await productFactory.lookupProduct(domain, subdomain, gtin, version);
            if (!product) {
                //if we don't have a product to update ...
                await auditService.auditFail(auditId, "replace with proper fail audit data");
                res.send(404, "Product not found");
                return;
            }

            try {
                await product.addPhoto(imageData);
                await product.persist();
            } catch (err) {
                await auditService.auditFail(auditId, failedOperationContext);
                return res.send(500, "Failed to add photo");
                //.... return proper error to the client
            }

        } catch (err) {
            await auditService.auditFail(auditId, failedOperationContext);
            return res.send(500);
        }
        auditService.auditSuccess(auditId, photoMessage, successOperationContext);
        res.send(200);
    }

    this.updateImage = this.addImage;

    this.getImage = async (domain, subdomain, gtin, req, res) => {
        try {
            let product;
            product = await productFactory.lookupProduct(domain, subdomain, gtin, version);

            if (!product) {
                //if we don't have a product...
                res.send(412, "Product not found");
                return;
            }
            let productPhoto;
            try {
                productPhoto = await product.getPhoto();
            } catch (e) {
                return res.send(404, "Photo not found");
            }

            return res.send(200, productPhoto);
        } catch (err) {
            //....
            res.send(500);
        }
    }

    this.deleteImage = async (domain, subdomain, gtin, req, res) => {
        const userId = req.headers["user-id"];
        let product;

        const operationInProgressContext = {
            operation: OPERATIONS.DELETE_PRODUCT_PHOTO_IN_PROGRESS,
            gtin,
            userId
        }

        const failedOperationContext = {
            operation: OPERATIONS.DELETE_PRODUCT_PHOTO_FAIL,
            gtin,
            userId
        }

        const successOperationContext = {
            operation: OPERATIONS.DELETE_PRODUCT_PHOTO,
            gtin,
            userId
        }

        let auditId;
        try {
            auditId = await auditService.auditOperationInProgress(operationInProgressContext);
        } catch (err) {
            res.send(500, "Failed to audit start of an operation");
            return;
        }

        try {
            product = await productFactory.lookupProduct(domain, subdomain, gtin, version);

            if (!product) {
                //if we don't have a product to update ...
                await auditService.auditFail(auditId, failedOperationContext);
                res.send(404, "Product not found");
                return;
            }

            try {
                await product.deletePhoto();
                await product.persist();
            } catch (err) {
                await auditService.auditFail(auditId, failedOperationContext);
                //.... return proper error to the client
            }

        } catch (err) {
            await auditService.auditFail(auditId, failedOperationContext);
            //....
        }

        auditService.auditSuccess(auditId, successOperationContext);
        res.send(200);
    }

    this.listProducts = async (start, number, query, sort, req, res) => {
        let products = await $$.promisify(enclave.filter)($$.SYSTEM_IDENTIFIER, constants.TABLES.PRODUCTS, query, sort, number);
        return products;
    }

    this.listLanguages = async (domain, subdomain, gtin, epiType, req, res) => {
        try {
            let product;
            product = await productFactory.lookupProduct(domain, subdomain, gtin, version);

            if (!product) {
                //if we don't have a product...
                res.send(404, "Product not found");
                return;
            }

            const languages = await product.listLanguages(epiType);
            return languages;
        } catch (err) {
            //....
            res.send(500);
        }
    }

    this.tryToDigest = async function (domain, subdomain, message, req, res) {
        try {
            // await validationService.validateProductMessage(message);
            let gtin = message.payload.productCode;
            if (await productFactory.lookupProduct(domain, subdomain, gtin, version)) {
                await this.updateProduct(domain, subdomain, gtin, message, req, res);
                return true;
            } else {
                await this.addProduct(domain, subdomain, gtin, message, req, res);
                return true;
            }
        } catch (err) {

        }

        try {
            // await validationService.validatePhotoMessage(message);
            let gtin = message.productCode;
            await this.addImage(domain, subdomain, gtin, message, req, res);
            return true;
        } catch (err) {

        }

        return false;
    }
}

let instances = {};

function getInstance(enclave, version) {
    if (!instances[version]) {
        instances[version] = new ProductController(enclave, version);
    }

    return instances[version];
}

module.exports = {
    getInstance
}
