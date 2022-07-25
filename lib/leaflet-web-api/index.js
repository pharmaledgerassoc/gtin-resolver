const XMLDisplayService = require("./../services/XMLDisplayService/XMLDisplayService");
const {createGTIN_SSI} = require("./../GTIN_SSI");
const LeafletInfoService = require("./../services/LeafletInfoService");
const utils = require("./../utils/CommonUtils")

function getWebLeaflet(server) {
  server.get("/leaflets/:domain", async function (request, response) {

    let domainName = request.params.domain;
    let leaflet_type = request.query.leaflet_type || "";
    let gtin = request.query.gtin || null;
    let lang = request.query.lang || "";
    let batchNumber = request.query.batch || null;
    let expiry = request.query.expiry || null;
    let headers = request.headers;
    let epiProtocolVersion = headers.epiprotocolversion || null;
    let getProductData = headers.getproductdata;

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
      let leafletInfo = await LeafletInfoService.init({gtin, batchNumber, expiry}, domainName);
      const model = {
        product: {gtin},
        networkName: domainName
      }
      let leafletXmlService = new XMLDisplayService(null, leafletInfo.gtinSSI, model, leaflet_type);
      leafletXmlService.readXmlFile(lang, async (err, xmlContent, pathBase, leafletImagesObj) => {
        if (err) {
          let errMessage = `No available XML for gtin=${gtin} language=${lang} leaflet type=${leaflet_type}`
          if (batchNumber) {
            errMessage = `${errMessage} batchNumber id=${batchNumber}`
          }
          if (getProductData) {
            leafletXmlService.getAvailableLanguagesForXmlType((langerr, availableLanguages) => {
              if (langerr) {
                return sendResponse(response, 404, `${errMessage}. Please check api documentation`)
              }
              return sendResponse(response, 200, JSON.stringify({
                resultStatus: "no_xml_for_lang",
                availableLanguages: availableLanguages
              }));
            });
          } else {
            return sendResponse(response, 404, `${errMessage}. Please check api documentation`)
          }
        } else {
          if (getProductData) {
            let productData = await leafletInfo.getProductClientModel();
            let expired = getExpiredStatus(expiry);
            return sendResponse(response, 200, JSON.stringify({
              resultStatus: "xml_found",
              xmlContent,
              leafletImages: leafletImagesObj,
              productData,
              expired
            }));
          } else {
            return sendResponse(response, 200, JSON.stringify({xmlContent, leafletImages: leafletImagesObj}));
          }
        }
      })
    } catch (err) {
      sendResponse(response, 500, err.message)
    }
  });
}

function getExpiredStatus(expiry) {
  let normalizedExpiryDate;
  let expiryTime;
  try {
    if (expiry.slice(0, 2) === "00") {
      normalizedExpiryDate = utils.convertToLastMonthDay(expiry);
    } else {
      let expiryForDisplay = utils.getDateForDisplay(expiry);
      normalizedExpiryDate = expiryForDisplay.replace(/\s/g, '')
    }

    expiryTime = new Date(normalizedExpiryDate).getTime();
  } catch (err) {
    // do nothing
  }
  return !expiryTime || expiryTime < Date.now()
}

function sendResponse(response, statusCode, message) {
  response.statusCode = statusCode;
  response.end(message);
}

module.exports.getWebLeaflet = getWebLeaflet;
