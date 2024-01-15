function LeafletController(version){
  const productFactory = require("../services/ProductFactory.js").getInstance();
  const batchFactory = require("../services/BatchFactory.js").getInstance();
  const auditService = require("../services/AuditService.js").getInstance();
  const validationService = require("../services/ValidationService.js").getInstance();

  this.addEPI = async function(domain, leafletMessage, res){
    try{
      await validationService.validateLeafletMessage(domain, leafletMessage);
    }catch(err){
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

    let {productCode, batchCode} = leafletMessage;

    let targetObject;
    try{

      if(!batchCode){
        targetObject = await productFactory.lookupProduct(domain, productCode);
      }else{
        targetObject = await batchFactory.lookupBatch(domain, batchCode, productCode);
      }

      if(!targetObject){
        //if we don't have a product/batch to update ...
        await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
        res.send(404, "Product/Batch not found");
        return;
      }

      try{
        await targetObject.addEPI(domain, leafletMessage);
        await targetObject.persist();
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

  this.updateEPI = this.addEPI;

  this.deleteEPI = async function (domain, batchId, gtin, leafletMessage, res){
    try{
      await validationService.validateLeafletDeleteMessage(leafletMessage);
    }catch(err){
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

    let {productCode, batchCode, language} = leafletMessage;

    let targetObject;
    try{

      if(!batchCode){
        targetObject = await productFactory.lookupProduct(domain, productCode);
      }else{
        targetObject = await batchFactory.lookupBatch(domain, batchCode, productCode);
      }

      if(!targetObject){
        //if we don't have a product/batch to update ...
        await auditService.auditFail(domain, auditId, "replace with proper fail audit data");
        res.send(404, "Product/Batch not found");
        return;
      }

      try{
        await targetObject.deleteEPI(language);
        await targetObject.persist();
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
      await validationService.validateLeafletMessage(message);
      await this.addEPI(domain, message, res);
      return true;
    }catch(err){

    }

    try{
      await validationService.validateLeafletDeleteMessage(message);
      await this.deleteEPI(domain, message, res);
      return true;
    }catch(err){

    }

    return false;
  }
}

let instances = {};
function getInstance(version){
  if(!instances[version]){
    instances[version] = new LeafletController(version);
  }

  return instances[version];
}

module.exports = {
  getInstance
}