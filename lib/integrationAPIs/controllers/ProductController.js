function ProductController(version){

  this.addProduct = async function(domain, gtin, productMessage, res){
    const productFactory = require("../services/ProductFactory.js").getInstance();
    const auditService = require("../services/AuditService.js").getInstance();
    let product;
    try{
      await productFactory.validate(productMessage);
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

  this.updateProduct = function(){

  }

  this.addEPI = function(){

  }

  this.updateEPI = function(){

  }

  this.deleteEPI = function(){

  }

  this.addImage = function(){

  }

  this.updateImage = function(){

  }

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