const XMLDisplayService = require("./../services/XMLDisplayService/XMLDisplayService");
const {createGTIN_SSI} = require("./../GTIN_SSI");

function getWebLeaflet(server) {
  server.get("/leaflets/:domain", async function (request, response) {

    let domainName = request.params.domain;
    let leaflet_type = request.query.leaflet_type || "";
    let gtin = request.query.gtin || null;
    let lang = request.query.lang || "";
    let batch = request.query.batch || null;

    try {
      if (!gtin) {
        return sendResponse(response, 400, "gtin is a required parameter. Please check api documentation")
      }
      if (!leaflet_type) {
        return sendResponse(response, 400, "leaflet_type is a required parameter. Please check api documentation")
      }
      if (!lang) {
        return sendResponse(response, 400, "lang is a required parameter. Please check api documentation")
      }
      let gtinSSI = createGTIN_SSI(domainName, undefined, gtin, batch);
      let leafletXmlService = new XMLDisplayService(null, gtinSSI, {}, leaflet_type);
      leafletXmlService.readXmlFile(lang, (err, xmlContent, pathBase, leafletImagesObj) => {
        if (err) {
          let errMessage = `No available XML for gtin=${gtin} language=${lang} leaflet type=${leaflet_type}`
          if (batch) {
            errMessage = `${errMessage} batch id=${batch}`
          }
          return sendResponse(response, 404, `${errMessage}. Please check api documentation`)
        }
        sendResponse(response, 200, JSON.stringify({xmlContent, leafletImages: leafletImagesObj}));
      })
    } catch (err) {
      sendResponse(response, 500, err.message)
    }
  });
}

function sendResponse(response, statusCode, message) {
  response.statusCode = statusCode;
  response.end(message);
}

module.exports.getWebLeaflet = getWebLeaflet;
