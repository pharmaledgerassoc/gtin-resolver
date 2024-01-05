module.exports = function Product(gtin, version){

  this.gtin = gtin;
  //there is version specific paths and logic that may need to be carefully treated
  this.version = version;

  this.getStoragePath = function(){
    return `/product/${this.version}/product.json`;
  }

  //check version before doing any deserialization
  this.deserialize = function(productData, version){

  }

  //check version before doing any deserialization
  this.serialize = function(version){

  }

  let leaflets = [];
  this.addLeaflet = function(language, leaflet){
    leaflets.push({language});
  }

  let removedLeaflets=[];
  this.deleteLeaflet = function(language){
      removedLeaflets.push({})
  }

  this.persist = async function(){

  }

  return this;
}