const GTIN_SSI = require("../GTIN_SSI");
const path = require("path");
const fs = require('fs');

function getGTINOwner(server) {
  if (server.allowFixedUrl) {
    //let's make the fixedURL middleware aware of our endpoints
    server.allowFixedUrl("/gtinOwner/");
  }

  const logger = $$.getLogger("gtinOwner", "getGtinOwner");
  const Database = require("loki-enclave-facade");
  const cachePath = path.join(server.rootFolder, "external-volume", "gtinOwner", "cache");
  try {
    fs.accessSync(cachePath);
  } catch (e) {
    fs.mkdirSync(cachePath, {recursive: true});
  }

  const DATABASE_PERSISTENCE_TIMEOUT = 100;
  const database = new Database(cachePath, DATABASE_PERSISTENCE_TIMEOUT);
  const GTIN_OWNERS_TABLE = "gtinOwners";
  server.get("/gtinOwner/:epiDomain/:gtin", async function (request, response) {
    let epiDomain = request.params.epiDomain;
    let gtin = request.params.gtin;
    const url = `/gtinOwner/${epiDomain}/${gtin}`;
    let gtinOwnerDomain;
    try {
      gtinOwnerDomain = await $$.promisify(database.getRecord)(undefined, GTIN_OWNERS_TABLE, url);
    } catch (e) {
      //exceptions on getting records from db are handled bellow
    }
    if (typeof gtinOwnerDomain !== "undefined") {

      try {
        let dbObj = JSON.parse(gtinOwnerDomain);
        if (dbObj.domain) {
          return sendResponse(response, 200, gtinOwnerDomain);
        }
      } catch (e) {
        //db record is invalid; continue with resolving request
      }

    }
    const openDSU = require("opendsu");

    const gtinSSI = GTIN_SSI.createGTIN_SSI(epiDomain, undefined, gtin);
    const anchoring = openDSU.loadAPI("anchoring");
    const anchoringx = anchoring.getAnchoringX();
    anchoringx.getLastVersion(gtinSSI, async (err, latestHashLink) => {
      if (err) {
        logger.info(0x103, `Failed to get last version for SSI <${gtinSSI.getIdentifier()}>`, err.message);
        sendResponse(response, 500, JSON.stringify({error: err}));
        return;
      }

      if(!latestHashLink){
        logger.info(0x103, `Gtin not found`);
        sendResponse(response, 404, "");
        return;
      }

      const keySSISpace = require("opendsu").loadAPI("keyssi");
      if (typeof latestHashLink === "string") {
        try {
          latestHashLink = keySSISpace.parse(latestHashLink);
        } catch (e) {
          logger.info(0x103, `Failed to parse hashlink <${latestHashLink}>`, e.message);
          sendResponse(response, 500, JSON.stringify({error: e}))
          return;
        }
      }

      gtinOwnerDomain = JSON.stringify({
        domain: latestHashLink.getDLDomain(),
      });

      try {
        await $$.promisify(database.insertRecord)(undefined, GTIN_OWNERS_TABLE, url, gtinOwnerDomain);
      } catch (e) {
        logger.info(0x0, `Failed to cache gtinOwnerDomain `, e.message);
        //failed to cache; continue without caching
      }

      sendResponse(response, 200, gtinOwnerDomain);
    })
  })
}

function sendResponse(response, statusCode, message) {
  response.statusCode = statusCode;
  response.end(message);
}

module.exports.getGTINOwner = getGTINOwner;
