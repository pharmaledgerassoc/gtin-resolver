function ProductController(version){
  const productFactory = require("../services/ProductFactory.js").getInstance();
  const auditService = require("../services/AuditService.js").getInstance();
  const validationService = require("../services/ValidationService.js").getInstance();

  this.addProduct = async function(domain, gtin, productMessage, res){
    let product;
    try{
      await validationService.validateProductMessage(productMessage);
    }catch(err){
      res.send(422, "Payload validation failed");
      return;
    }

    const productData = productMessage.product;

    if(gtin !== productData.productCode){
      res.send(422, "Payload validation failed");
      return;
    }

    let auditId;
    try{
      auditId = await auditService.auditOperationInProgress(domain, "ReplaceWithProperUserId", "... and other audit entry data needed");
    }catch(err){
      res.send(500, "Failed to audit start of an operation");
      return;
    }

    try{
      product = await productFactory.lookupProduct(domain, gtin);

      if(product){

        await auditService.auditFail(domain, auditId, "replace with proper fail audit data");

        //there is already a product with the same gtin...
        res.send(409, "Product already exists");
        return;
      }

      product = productFactory.createProduct(domain, gtin, version);
      product.update(productData);
      try{
        await product.persist();
      }catch(err){
        await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
        //.... return proper error to the client
        res.send(529);
        return;
      }

    }catch(err){
      await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
      //....
      res.send(500);
      return;
    }
    res.send(200);
  }

  this.updateProduct = async function(domain, gtin, productMessage, res){
    let product;
    try{
      await validationService.validateProductMessage(productMessage);
    }catch(err){
      res.send(422, "Payload validation failed");
      return;
    }

    const productData = productMessage.product;

    if(gtin !== productData.productCode){
      res.send(422, "Payload validation failed");
      return;
    }

    let auditId;
    try{
      auditId = await auditService.auditOperationInProgress(domain, "ReplaceWithProperUserId", "... and other audit entry data needed");
    }catch(err){
      res.send(500, "Failed to audit start of an operation");
      return;
    }

    try{
      product = await productFactory.lookupProduct(domain, gtin);

      if(!product){
        //if we don't have a product to update ...
        await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
        res.send(404, "Product not found");
        return;
      }

      product.update(productData);
      try{
        await product.persist();
      }catch(err){
        await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
        //.... return proper error to the client

        res.send(529);
        return;
      }

    }catch(err){
      await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
      //....
      res.send(500);
      return;
    }

    res.send(200);
  }

  this.getProduct = async function(domain, gtin, res){
    try{
      let product;
      product = await productFactory.lookupProduct(domain, gtin);

      if(!product){
        //if we don't have a product...
        res.send(404, "Product not found");
        return;
      }

      res.setHeader("Content-type", "text/json");
      res.send(200, JSON.stringify(product));
    }catch(err){
      //....
      res.send(500);
      return;
    }

    res.send(200);
  }

  this.addImage = async function(domain, gtin, photoMessage, res){
    let product;
    try{
      await validationService.validatePhotoMessage(photoMessage);
    }catch(err){
      res.send(422, "Payload validation failed");
      return;
    }

    const {imageData} = photoMessage;

    let auditId;
    try{
      auditId = await auditService.auditOperationInProgress(domain, "ReplaceWithProperUserId", "... and other audit entry data needed");
    }catch(err){
      res.send(500, "Failed to audit start of an operation");
      return;
    }

    try{
      product = await productFactory.lookupProduct(domain, gtin);

      if(!product){
        //if we don't have a product to update ...
        await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
        res.send(404, "Product not found");
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

    res.send(200);
  }

  this.updateImage = this.addImage;

  this.deleteImage = async function(domain, gtin, res){
    let product;

    let auditId;
    try{
      auditId = await auditService.auditOperationInProgress(domain, "ReplaceWithProperUserId", "... and other audit entry data needed");
    }catch(err){
      res.send(500, "Failed to audit start of an operation");
      return;
    }

    try{
      product = await productFactory.lookupProduct(domain, gtin);

      if(!product){
        //if we don't have a product to update ...
        await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
        res.send(404, "Product not found");
        return;
      }

      try{
        await product.deletePhoto();
        await product.persist();
      }catch(err){
        await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
        //.... return proper error to the client
      }

    }catch(err){
      await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
      //....
    }

    res.send(200);
  }

  this.tryToDigest = async function(domain, message, res){
    try{
      await validationService.validateProductMessage(message);
      let gtin = message.product.productCode;
      if(await productFactory.lookupProduct(domain, gtin)){
        await this.updateProduct(domain, gtin, message, res);
        return true;
      }else{
        await this.addProduct(domain, gtin, message, res);
        return true;
      }
    }catch(err){

    }

    try{
      await validationService.validatePhotoMessage(message);
      let gtin = message.productCode;
      await this.addImage(domain, gtin, message, res);
      return true;
    }catch(err){

    }

    return false;
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