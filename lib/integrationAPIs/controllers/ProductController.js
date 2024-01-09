function ProductController(version){
  const productFactory = require("../services/ProductFactory.js").getInstance();
  const auditService = require("../services/AuditService.js").getInstance();
  const validationService = require("../services/ValidationService.js").getInstance();

  this.addProduct = async function(domain, gtin, productMessage, res){
    let product;
    try{
      await validationService.validateProductMessage(productMessage);
    }catch(err){
      res.statusCode = 422;
      res.end("Payload validation failed");
      return;
    }

    const productData = productMessage.product;

    let auditId;
    try{
      auditId = await auditService.auditOperationInProgress(domain, "ReplaceWithProperUserId", "... and other audit entry data needed");
    }catch(err){
      res.statusCode = 500;
      res.end("Failed to audit start of an operation");
      return;
    }

    try{
      product = await productFactory.lookupProduct(domain, gtin);

      if(product){

        await auditService.auditFail(domain, auditId, "replace with proper fail audit data");

        //there is already a product with the same gtin...
        res.statusCode = 409;
        res.end("Product already exists");
        return;
      }

      product = productFactory.createProduct(domain, gtin, version);
      product.update(productData);
      try{
        await product.persist();
      }catch(err){
        await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
        //.... return proper error to the client
      }

    }catch(err){
      await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
      //....
    }


    res.statusCode = 200;
    res.end();
  }

  this.updateProduct = async function(domain, gtin, productMessage, res){
    let product;
    try{
      await validationService.validateProductMessage(productMessage);
    }catch(err){
      res.statusCode = 422;
      res.end("Payload validation failed");
      return;
    }

    const productData = productMessage.product;

    let auditId;
    try{
      auditId = await auditService.auditOperationInProgress(domain, "ReplaceWithProperUserId", "... and other audit entry data needed");
    }catch(err){
      res.statusCode = 500;
      res.end("Failed to audit start of an operation");
      return;
    }

    try{
      product = await productFactory.lookupProduct(domain, gtin);

      if(!product){
        //if we don't have a product to update ...
        await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
        res.statusCode = 400;
        res.end("Product not found");
        return;
      }

      product.update(productData);
      try{
        await product.persist();
      }catch(err){
        await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
        //.... return proper error to the client
      }

    }catch(err){
      await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
      //....
    }


    res.statusCode = 200;
    res.end();
  }

  this.addEPI = function(){

  }

  this.updateEPI = this.addEPI;

  this.deleteEPI = function(){

  }

  this.addImage = async function(domain, gtin, photoMessage, res){
    let product;
    try{
      await validationService.validatePhotoMessage(photoMessage);
    }catch(err){
      res.statusCode = 422;
      res.end("Payload validation failed");
      return;
    }

    const {imageData} = photoMessage;

    let auditId;
    try{
      auditId = await auditService.auditOperationInProgress(domain, "ReplaceWithProperUserId", "... and other audit entry data needed");
    }catch(err){
      res.statusCode = 500;
      res.end("Failed to audit start of an operation");
      return;
    }

    try{
      product = await productFactory.lookupProduct(domain, gtin);

      if(!product){
        //if we don't have a product to update ...
        await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
        res.statusCode = 400;
        res.end("Product not found");
        return;
      }

      try{
        await product.addPhoto(imageData);
        await product.persist();
      }catch(err){
        await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
        //.... return proper error to the client
      }

    }catch(err){
      await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
      //....
    }


    res.statusCode = 200;
    res.end();
  }

  this.updateImage = this.addImage;

  this.deleteImage = function(){

  }
}

let instances = {};
function getInstance(version){
  if(!instances[version]){
    instances[version] = new ProductController(version);
  }

  return instances[version];
}

module.exports = {
  getInstance
}