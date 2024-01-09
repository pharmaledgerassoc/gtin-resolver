const version = 1;

const productController = require("./controllers/ProductController.js").getInstance(version);

const requestBodyJSONMiddleware = require("./utils/middlewares.js");
const storage = require("./utils/storage.js");
const {validateGTIN} = require("../utils/ValidationUtils.js");

module.exports = function(server){


  //setting up the connection to lightDB and share to the services via storage apis
  //storage.setEnclaveInstance(domain);

  function productPreValidationMiddleware(req, res, next){
    const {gtin, domain} = req.params;

    //gtin validation required...
    let {isValid, message} = validateGTIN(gtin);
    if(!isValid){
      res.statusCode = 400;
      res.end();
      return;
    }
    //collecting and JSON parsing of productMessage
    let productMessage = req.body;

    if(!productMessage){
      res.statusCode = 400;
      res.end();
      return;
    }
    next();
  }

  server.put("/integration/:domain/addProduct/:gtin", requestBodyJSONMiddleware);
  server.put("/integration/:domain/addProduct/:gtin", productPreValidationMiddleware);
  server.put("/integration/:domain/addProduct/:gtin", async function(req, res){
        const {gtin, domain} = req.params;

        //collecting and JSON parsing of productMessage
        let productMessage = req.body;

        try{
          productMessage = JSON.parse(productMessage);
        }catch(err){
          res.statusCode = 415;
          //can we send errors to the client?!
          res.end(err);
          return;
        }

        try{
          await productController.addProduct(domain, gtin, productMessage, res);
        }catch(err){
          res.statusCode = 500;
          res.end();
          return;
        }
  });

  server.put("/integration/:domain/updateProduct/:gtin", requestBodyJSONMiddleware);
  server.put("/integration/:domain/updateProduct/:gtin", productPreValidationMiddleware);
  server.put("/integration/:domain/updateProduct/:gtin", async function(req, res){
    const {gtin, domain} = req.params;

    //collecting and JSON parsing of productMessage
    let productMessage = req.body;

    try{
      productMessage = JSON.parse(productMessage);
    }catch(err){
      res.statusCode = 415;
      //can we send errors to the client?!
      res.end(err);
      return;
    }

    try{
      await productController.updateProduct(domain, gtin, productMessage, res);
    }catch(err){
      res.statusCode = 500;
      res.end();
      return;
    }
  });
}