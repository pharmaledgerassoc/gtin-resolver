const XMLDisplayService = require("../../services/XMLDisplayService/XMLDisplayService");
const constants = require("../utils/constants");

function ProductController(enclave, version) {
    const productFactory = require("../factories/ProductFactory.js").getInstance(enclave);
    const auditService = require("../services/AuditService.js").getInstance(enclave);
    const validationService = require("../services/ValidationService.js").getInstance();
    const constants = require("../utils/constants.js");
    const OPERATIONS = {
        ADD_PRODUCT: "addProduct",
        UPDATE_PRODUCT: "updateProduct",
        ADD_IMAGE: "addImage",
        UPDATE_IMAGE: "updateImage",
        DELETE_IMAGE: "deleteImage"
    }
    this.addProduct = async function (domain, subdomain, gtin, productMessage, res) {
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

        let auditId;
        try {
            auditId = await auditService.auditOperationInProgress(domain, subdomain, "ReplaceWithProperUserId", "... and other audit entry data needed");
        } catch (err) {
            res.send(500, "Failed to audit start of an operation");
            return;
        }

        try {
            product = await productFactory.lookupProduct(domain, subdomain, gtin);

            if (product) {

                await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");

                //there is already a product with the same gtin...
                res.send(409, "Product already exists");
                return;
            }

            product = productFactory.createProduct(domain, subdomain, gtin, version);
            //todo: CODE-REVIEW - why do we call this function here? can we hide this in the update function before doing the update?!
            await product.getEventRecorderInstance(product.getGTINSSI());
            product.update(productData);
            try {
                await product.persist();
            } catch (err) {
                console.error(err)
                await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
                //.... return proper error to the client
                res.send(529);
                return;
            }

        } catch (err) {
            console.error(err)
            await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
            //....
            res.send(500);
            return;
        }
        await auditService.auditProduct(auditId, productMessage, {operation: OPERATIONS.ADD_PRODUCT})
        res.send(200);
    }

    this.updateProduct = async function (domain, subdomain, gtin, productMessage, res) {
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

        let auditId;
        try {
            auditId = await auditService.auditOperationInProgress(domain, subdomain, "ReplaceWithProperUserId", "... and other audit entry data needed");
        } catch (err) {
            res.send(500, "Failed to audit start of an operation");
            return;
        }

        try {
            product = await productFactory.lookupProduct(domain, subdomain, gtin);
            await product.getEventRecorderInstance(product.getGTINSSI());

            if (!product) {
                //if we don't have a product to update ...
                await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
                res.send(404, "Product not found");
                return;
            }

            product.update(productData);
            try {
                await product.persist();
            } catch (err) {
                await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
                //.... return proper error to the client

                res.send(529);
                return;
            }

        } catch (err) {
            await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
            //....
            res.send(500);
            return;
        }
        auditService.auditProduct(auditId, productMessage, {operation: OPERATIONS.UPDATE_PRODUCT})
        res.send(200);
    }

    this.getProduct = async function (domain, subdomain, gtin, res) {
        try {
            let product;
            product = await productFactory.lookupProduct(domain, subdomain, gtin);

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

    this.addImage = async function (domain, subdomain, gtin, photoMessage, res) {
        let product;
        try {
            // await validationService.validatePhotoMessage(photoMessage);
        } catch (err) {
            res.send(422, "Payload validation failed");
            return;
        }

        const {imageData} = photoMessage.payload;

        let auditId;
        try {
            auditId = await auditService.auditOperationInProgress(domain, subdomain, "ReplaceWithProperUserId", "... and other audit entry data needed");
        } catch (err) {
            res.send(500, "Failed to audit start of an operation");
            return;
        }

        try {
            product = await productFactory.lookupProduct(domain, subdomain, gtin);
            await product.getEventRecorderInstance(product.getGTINSSI());
            if (!product) {
                //if we don't have a product to update ...
                await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
                res.send(404, "Product not found");
                return;
            }

            try {
                await product.addPhoto(imageData);
                await product.persist();
            } catch (err) {
                await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
                //.... return proper error to the client
            }

        } catch (err) {
            await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
            //....
        }
        auditService.auditProduct(auditId, photoMessage, {operation: OPERATIONS.ADD_IMAGE});
        res.send(200);
    }

    this.updateImage = this.addImage;

    this.getImage = async function (domain, subdomain, gtin, res) {
        try {
            let product;
            product = await productFactory.lookupProduct(domain, subdomain, gtin);

            if (!product) {
                //if we don't have a product...
                res.send(404, "Product not found");
                return;
            }

            const productPhoto = await product.getPhoto();
            return res.send(200, productPhoto);
        } catch (err) {
            //....
            res.send(500);
        }
    }
    this.deleteImage = async function (domain, subdomain, gtin, res) {
        let product;

        let auditId;
        try {
            auditId = await auditService.auditOperationInProgress(domain, subdomain, "ReplaceWithProperUserId", "... and other audit entry data needed");
        } catch (err) {
            res.send(500, "Failed to audit start of an operation");
            return;
        }

        try {
            product = await productFactory.lookupProduct(domain, subdomain, gtin);

            if (!product) {
                //if we don't have a product to update ...
                await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
                res.send(404, "Product not found");
                return;
            }

            try {
                await product.deletePhoto();
                await product.persist();
            } catch (err) {
                await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
                //.... return proper error to the client
            }

        } catch (err) {
            await auditService.auditFail(domain, subdomain, auditId, "replace with proper fail audit data");
            //....
        }

        res.send(200);
    }

    this.listProducts = async (start, number, query, sort, res) => {
        let products = await $$.promisify(enclave.filter)($$.SYSTEM_IDENTIFIER, constants.TABLES.PRODUCTS, query, sort, number);
        return products;
    }

    this.listLanguages = async (domain, subdomain, gtin, res) => {
        try {
            let product;
            product = await productFactory.lookupProduct(domain, subdomain, gtin);

            if (!product) {
                //if we don't have a product...
                res.send(404, "Product not found");
                return;
            }

            const languages = await product.listLanguages();
            return languages;
        } catch (err) {
            //....
            res.send(500);
        }
    }

    this.tryToDigest = async function (domain, subdomain, message, res) {
        try {
            // await validationService.validateProductMessage(message);
            let gtin = message.payload.productCode;
            if (await productFactory.lookupProduct(domain, subdomain, gtin)) {
                await this.updateProduct(domain, subdomain, gtin, message, res);
                return true;
            } else {
                await this.addProduct(domain, subdomain, gtin, message, res);
                return true;
            }
        } catch (err) {

        }

        try {
            // await validationService.validatePhotoMessage(message);
            let gtin = message.productCode;
            await this.addImage(domain, subdomain, gtin, message, res);
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