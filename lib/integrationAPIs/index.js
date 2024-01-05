const version = 1;

const productController = require("./controllers/ProductController.js").getInstance(version);

const requestBodyJSONMiddleware = require("./utils/middlewares.js");
const storage = require("./utils/storage.js");

module.exports = function(server){


  //setting up the connection to lightDB and share to the services via storage apis
  //storage.setEnclaveInstance(domain);


  server.put("/integration/:domain/addProduct/:gtin", requestBodyJSONMiddleware);
  server.put("/integration/:domain/addProduct/:gtin", async function(req, res){
        const {gtin, domain} = req.params;

        //gtin validation required...

        //collecting and JSON parsing of productData
        let productData = req.body;

        if(!productData){
          res.statusCode = 400;
          res.end();
        }

        try{
          productData = JSON.parse(productData);
        }catch(err){
          res.statusCode = 415;
          //can we send errors to the client?!
          res.end(err);
        }

        try{
          await productController.addProduct(gtin, productData, res);
        }catch(err){
          res.statusCode = 500;
          res.end();
        }
  });


}