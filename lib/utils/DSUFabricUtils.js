const resolver = require("opendsu").loadAPI("resolver");
const UploadTypes = require("./UploadTypes");
const Languages = require("./Languages");
const constants = require("../constants/constants");
const utils = require("./CommonUtils");

const LEAFLET_CARD_STATUS = {
  NEW: "new",
  EXISTS: "exists",
  DELETE: "delete"
}

function generateCard(status, type, code, files, videoSource) {
  let card = {
    status: status,
    type: {value: type},
    language: {value: code},
    files: files,
    videoSource: videoSource
  };
  card.type.label = UploadTypes.getLanguage(type);
  card.language.label = Languages.getLanguageName(code);
  return card;
}

function getXMLFileContent(files, callback) {
  let xmlFiles = files.filter((file) => file.name.endsWith('.xml'));

  if (xmlFiles.length === 0) {
    return callback(new Error("No xml files found."))
  }
  getBase64FileContent(xmlFiles[0], callback)
}

async function getOtherCardFiles(files, callback) {
  let anyOtherFiles = files.filter((file) => !file.name.endsWith('.xml'))

  let filesContent = [];
  for (let i = 0; i < anyOtherFiles.length; i++) {
    let file = anyOtherFiles[i];
    filesContent.push({
      filename: file.name,
      fileContent: await $$.promisify(getBase64FileContent)(file)
    })
  }
  callback(undefined, filesContent);
}

function getBase64FileContent(file, callback) {
  let fileReader = new FileReader();

  fileReader.onload = function (evt) {
    let arrayBuffer = fileReader.result;
    let base64FileContent = arrayBufferToBase64(arrayBuffer);
    callback(undefined, base64FileContent);
  }

  fileReader.readAsArrayBuffer(file);
}

async function createEpiMessages(data) {
  let cardMessages = [];
  try {
    for (let i = 0; i < data.cards.length; i++) {
      let card = data.cards[i];

      if (card.status !== LEAFLET_CARD_STATUS.EXISTS) {

        let cardMessage = {
          messageTypeVersion: data.messageTypeVersion,
          senderId: data.senderId,
          receiverId: "",
          messageId: data.messageId,
          messageDateTime: data.messageDateTime,
          token: "",
          status: card.status,
          language: card.language.value,
          messageType: card.type.value
        }
        if (card.status === LEAFLET_CARD_STATUS.DELETE) {
          cardMessage.delete = true;
        } else {
          cardMessage.xmlFileContent = await $$.promisify(getXMLFileContent)(card.files);
          cardMessage.otherFilesContent = await $$.promisify(getOtherCardFiles)(card.files);
        }

        if (data.type === "product") {
          cardMessage.productCode = data.code;
        } else {
          if(data.productCode){
            cardMessage.productCode = data.productCode;
          }
          cardMessage.batchCode = data.code;
        }
        cardMessages.push(cardMessage);
      }
    }
  } catch (e) {
    console.log('err ', e);
  }

  return cardMessages;
}

async function getLanguageTypeCards(model, dsuObj, folderName) {
  let cards = [];
  let folders = await $$.promisify(dsuObj.listFolders)(`/${folderName}`);
  for (const languageCode of folders) {
    let files = await $$.promisify(dsuObj.listFiles)(`/${folderName}/${languageCode}`);
    let videoSource = "";
    if (model.videos && model.videos[`${folderName}/${languageCode}`]) {
      videoSource = atob(model.videos[`${folderName}/${languageCode}`]);
    }
    cards.push(generateCard(LEAFLET_CARD_STATUS.EXISTS, `${folderName}`, languageCode, files, videoSource));
  }
  return cards;
}

function getDSUAttachments(model, disabledFeatures, callback) {
  resolver.loadDSU(model.keySSI, async (err, dsuObj) => {
    if (err) {
      return callback(err);
    }

    //used temporarily to avoid the usage of dsu cached instances which are not up to date

    try {
      await $$.promisify(dsuObj.load)();
      let languageTypeCards = [];
      if (!disabledFeatures.includes("01")) {
        languageTypeCards = languageTypeCards.concat(await getLanguageTypeCards(model, dsuObj, "leaflet"));
      }
      if (!disabledFeatures.includes("04")) {
        languageTypeCards = languageTypeCards.concat(await getLanguageTypeCards(model, dsuObj, "smpc"));
      }

      try {
        let stat = await $$.promisify(dsuObj.stat)(constants.PRODUCT_IMAGE_FILE)
        if (stat.type === "file") {
          let data = await $$.promisify(dsuObj.readFile)(constants.PRODUCT_IMAGE_FILE);
          let productPhoto = utils.getImageAsBase64(data);
          return callback(undefined, {languageTypeCards: languageTypeCards, productPhoto: productPhoto});
        }
      } catch (err) {
        // if model is not a product or there is no image in dsu do not return a product photo
      }

      return callback(undefined, {languageTypeCards: languageTypeCards});
    } catch (e) {
      return callback(e);
    }
  });
}

module.exports = {
  generateCard,
  createEpiMessages,
  LEAFLET_CARD_STATUS,
  getDSUAttachments
}
