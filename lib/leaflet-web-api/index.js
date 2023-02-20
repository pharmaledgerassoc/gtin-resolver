const XMLDisplayService = require("./../services/XMLDisplayService/XMLDisplayService");
const LeafletInfoService = require("./../services/LeafletInfoService");
const GTIN_SSI = require("../GTIN_SSI");
const utils = require("./leafletUtils");

function getWebLeaflet(server) {

  server.registerAccessControlAllowHeaders(["epiprotocolversion"]);
  if (server.allowFixedUrl) {
    //let's make the fixedURL middleware aware of our endpoints
    server.allowFixedUrl("/leaflets/");
  }

  const logger = $$.getLogger("leaflet-web-api", "getWebLeaflet");
  server.get("/leaflets/:domain", async function (request, response) {

    let domainName = request.params.domain;
    let leaflet_type = request.query.leaflet_type || "";
    let gtin = request.query.gtin || null;
    let lang = request.query.lang || "";
    let batchNumber = request.query.batch || null;
    let expiry = request.query.expiry || null;
    let headers = request.headers;
    let epiProtocolVersion = headers.epiprotocolversion || null;

    try {
      if (!gtin) {
        logger.info(0x103, `Missing required parameter <gtin>`);
        return sendResponse(response, 400, JSON.stringify({code: "002"}));
      }

      if(gtin.length !== 14){
        logger.info(0x103, `Validation failed for gtin.length: <gtin>`);
        return sendResponse(response, 400, JSON.stringify({code: "002"}));
      }

      let validationResult = require("../utils/ValidationUtils").validateGTIN(gtin);
      if(validationResult && !validationResult.isValid){
        logger.info(0x103, `Validation failed for gtin: <gtin>`);
        return sendResponse(response, 400, JSON.stringify({code: "003"}));
      }

      if (!leaflet_type) {
        logger.info(0x103, `Missing required parameter <leaflet_type>`);
        return sendResponse(response, 400, "leaflet_type is a required parameter. Please check api documentation");
      }

      switch (leaflet_type) {
        case "smpc":
        case "leaflet":
          //we know to resolve only smpc and leaflets
          break;
        default:
          logger.info(0x103, `Unknown leaflet type: <leaflet_type>`);
          return sendResponse(response, 400, "Unknown leaflet type. Please check api documentation");
      }

      if (!lang) {
        logger.info(0x103, `Missing required parameter <lang>`);
        return sendResponse(response, 400, "lang is a required parameter. Please check api documentation");
      }

      try{
        require("./../utils/Languages").getLanguageFromCode(lang);
      }catch (err){
        logger.info(0x103, `Unable to handle lang: <lang>`);
        return sendResponse(response, 400, "Unable to handle lang. Please check api documentation");
      }

      const GTIN_SSI = require("../GTIN_SSI");
      const productGtinSSI = GTIN_SSI.createGTIN_SSI(domainName, undefined, gtin);
      const utils = require("./leafletUtils");
      let productKnown = false;
      try{
        productKnown = await utils.dsuExistsAsync(server, productGtinSSI, gtin, true);
      }catch(err){
        logger.info(0x103, `Unable to check Product DSU existence`);
        return sendResponse(response, 529, "Server busy checking product existence");
      }

      if(!productKnown){
        logger.info(0x103, `Gtin unknown`);
        return sendResponse(response, 400, JSON.stringify({code: "001"}));
      }

      let batchExists = false;
      try{
        const batchGtinSSI = GTIN_SSI.createGTIN_SSI(domainName, undefined, gtin, batchNumber);
        batchExists = await utils.dsuExistsAsync(server, batchGtinSSI, undefined);
      }catch(err){
        logger.info(0x103, `Unable to check Batch DSU existence`);
        return sendResponse(response, 529, "Server busy checking batch existence");
      }

      if(!batchExists){
        return server.makeLocalRequest("GET", `/leaflets/${domainName}?gtin=${gtin}&lang=${lang}&leaflet_type=${leaflet_type}`, (err, content)=>{
          if(err){
            logger.error(0x100, err.message);
            return sendResponse(response, 529, `Server busy reading gtin only leaflet` );
          }
          logger.info(0x100, "Successfully returned content from redirect to gtin only url");
          return sendResponse(response, 200, content);
        });
      }

      let leafletInfo = await LeafletInfoService.init({gtin, batchNumber, expiry}, domainName);
      const model = {
        product: {gtin},
        networkName: domainName
      }
      let leafletXmlService = new XMLDisplayService(null, leafletInfo.gtinSSI, model, leaflet_type);

      leafletXmlService.readXmlFile(lang, async (err, xmlContent, pathBase, leafletImagesObj) => {
        if (err) {
          if (err.statusCode === 504) {
            logger.error(0x100, err.message);
            return sendResponse(response, 529, "System busy; please try again later");
          }
          let errMessage = `No available XML for gtin=${gtin} language=${lang} leaflet type=${leaflet_type}`
          if (batchNumber) {
            errMessage = `${errMessage} batchNumber id=${batchNumber}`;
          }

          leafletXmlService.getAvailableLanguagesForXmlType((langerr, availableLanguages) => {
            if (langerr) {
              logger.info(0x103, errMessage);
              return sendResponse(response, 529, "System busy; please try again later");
            }

            if(!availableLanguages || !availableLanguages.length){
              logger.info(0x100, "No leaflet uploaded");
              return sendResponse(response, 404, JSON.stringify({code:"011"}));
            }

            logger.info(0x100, "Sending alternative languages");
            return sendResponse(response, 200, JSON.stringify({
              resultStatus: "no_xml_for_lang",
              availableLanguages: availableLanguages
            }));
          });
        } else {
          let productData = await leafletInfo.getProductClientModel();
          try {
            let batchData = await leafletInfo.getBatchClientModel();
            productData.batchData = batchData;
          } catch (e) {
            // gtin only case
            productData.batchData = null;
          }
          logger.audit(0x101, "Successfully returned leaflet");
          return sendResponse(response, 200, JSON.stringify({
            resultStatus: "xml_found",
            xmlContent,
            leafletImages: leafletImagesObj,
            productData
          }));
        }
      })
    } catch (err) {
      logger.info(0x103, err.message);
      return sendResponse(response, 500, err.message);
    }
  });
}


function sendResponse(response, statusCode, message) {
  response.statusCode = statusCode;
  response.end(message);
}

module.exports.getWebLeaflet = getWebLeaflet;
