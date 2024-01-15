function MonsterController(version){

  this.digestMessage = async function(domain, message, res){
    let digested = false;

    const productController = require("./ProductController.js").getInstance(version);
    digested = await productController.tryToDigest(domain, message, res);
    if(digested){
      return;
    }

    const batchController = require("./BatchController.js").getInstance(version);
    digested = await batchController.tryToDigest(domain, message, res);
    if(digested){
      return;
    }


    const leafletController = require("./LeafletController.js").getInstance(version);
    digested = await leafletController.tryToDigest(domain, message, res);
    if(digested){
      return;
    }

    res.send(422, "Failed to digestMessage");
    return;
  }

  this.digestMultipleMessages = async function(domain, messages, res){

  }

  this.digestGroupedMessages = async function(domain, groupedMessages, res){

  }
}

let instances = {};
function getInstance(version){
  if(!instances[version]){
    instances[version] = new MonsterController(version);
  }

  return instances[version];
}

module.exports = {
  getInstance
}