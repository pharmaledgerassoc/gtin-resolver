const validationUtils = require("../../utils/ValidationUtils.js");
const schema = require("../../mappings/product/productSchema.js");

function ValidationService(){
  this.validateProductMessage = async function validateProductMessage(payload){
    const schema = require("../../mappings/product/productSchema.js");
    const validationUtils = require("../../utils/ValidationUtils.js");
    await validationUtils.validateMessageOnSchema(payload, schema);
    await validationUtils.validateMVP1Values(payload, "product");
  }

  this.validateBatchMessage = async function validateBatchMessage(payload){
    const schema = require("../../mappings/batch/batchSchema.js");
    const validationUtils = require("../../utils/ValidationUtils.js");
    await validationUtils.validateMessageOnSchema(payload, schema);
    await validationUtils.validateMVP1Values(payload, "product");
  }

  this.validatePhotoMessage = async function validatePhotoMessage(payload){
    const schema = require("../../mappings/product/productPhoto.js");
    const validationUtils = require("../../utils/ValidationUtils.js");
    await validationUtils.validateMessageOnSchema(payload, schema);
  }

  this.validateLeafletMessage = async function validateLeafletMessage(payload){
    const schema = require("../../mappings/leaflet/leafletSchema.js");
    const validationUtils = require("../../utils/ValidationUtils.js");
    await validationUtils.validateMessageOnSchema(payload, schema);
  }

  this.validateLeafletDeleteMessage = async function validateLeafletDeleteMessage(payload){
    const schema = require("../../mappings/leaflet/leafletDeleteSchema.js");
    const validationUtils = require("../../utils/ValidationUtils.js");
    await validationUtils.validateMessageOnSchema(payload, schema);
  }

  this.validateLeafletDeleteMessage = async function validateLeafletDeleteMessage(payload){
    const schema = require("../../mappings/leaflet/leafletDeleteSchema.js");
    const validationUtils = require("../../utils/ValidationUtils.js");
    await validationUtils.validateMessageOnSchema(payload, schema);
    await validationUtils.validateMVP1Values(payload, "product");
  }

}


let serviceInstance;
function getInstance(){
  if(!serviceInstance){
    serviceInstance = new ValidationService();
  }
  return serviceInstance;
}

module.exports = {
  getInstance
};