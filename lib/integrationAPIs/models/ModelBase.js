const {EventRecorder, EVENTS} = require("../utils/Events");
const {getEnclaveInstance} = require("./../utils/storage.js");
const {sanitize} = require("../../utils/htmlSanitize");

function ModelBase() {
  let eventRecorder;
  this.getEventRecorderInstance = async function (keyssi) {
    if (!eventRecorder) {
      eventRecorder = new EventRecorder(this.loadImmutableDSUInstance(keyssi));
    }
    return eventRecorder;
  }

  this.getGTINSSI = function () {
    throw new Error("Not implemented! Needs to be implemented in the wrapper class");
  }

  this.getLeafletStoragePath = function () {
    throw new Error("Not implemented! Needs to be implemented in the wrapper class");
  }

  this.getJSONStoragePath = function () {
    throw new Error("Not implemented! Needs to be implemented in the wrapper class");
  }

  this.ensureDSUStructure = function () {
    throw new Error("Not implemented! Needs to be implemented in the wrapper class");
  }

  this.getMutableMountingPoint = function () {
    throw new Error("Not implemented! Needs to be implemented in the wrapper class");
  }

  this.getPathOfPathSSI = function () {
    throw new Error("Not implemented! Needs to be implemented in the wrapper class");
  }

  this.loadImmutableDSUInstance = async function () {
    const keyssi = this.getGTINSSI();
    let enclave = getEnclaveInstance(keyssi.getDLDomain());
    const loadDSU = $$.promisify(enclave.loadDSU, enclave);
    let dsuInstance = await loadDSU(keyssi);
    return dsuInstance;
  }

  this.getMutableSeedSSI = async function () {
    const enclave = getEnclaveInstance();
    const {domain, path} = this.getPathOfPathSSI()
    let pathKeySSI = await $$.promisify(enclave.createPathKeySSI)(domain, path);
    const seedSSI = await $$.promisify(pathKeySSI.derive)();

    return seedSSI;
  }

  this.ensureDSUStructure = async function () {
    let seedSSI = await this.getMutableSeedSSI();
    let mutableDSU = await this.createDSUInstanceForSSI(seedSSI);
    let sreadSSI = await $$.promisify(mutableDSU.getKeySSIAsString)("sread");
    let immutableDSU = await this.createImmutableDSUInstance(this.getGTINSSI());
    await immutableDSU.mount(this.getMutableMountingPoint(), sreadSSI);
  }

  this.createImmutableDSUInstance = async function () {
    const keyssi = this.getGTINSSI();
    let enclave = getEnclaveInstance(keyssi.getDLDomain());
    const createDSUForExistingSSI = $$.promisify(enclave.createDSUForExistingSSI, enclave);
    let dsuInstance = await createDSUForExistingSSI(keyssi);
    return dsuInstance;
  }

  this.createDSUInstanceForSSI = async function (keyssi) {
    let enclave = getEnclaveInstance(keyssi.getDLDomain());
    const createDSUForExistingSSI = $$.promisify(enclave.createDSUForExistingSSI, enclave);
    let dsuInstance = await createDSUForExistingSSI(keyssi);
    return dsuInstance;
  }

  this.addEPI = async function (language, leafletMessage) {
    if (leafletMessage.action === "update") {
      await this.deleteEPI(language);
    }

    let {type} = leafletMessage;
    const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();
    let base64ToArrayBuffer = require("../../utils/CommonUtils").base64ToArrayBuffer;
    let base64XMLFileContent = leafletMessage.xmlFileContent;
    base64XMLFileContent = sanitize(base64XMLFileContent);

    let leafletHtmlContent, htmlXMLContent;
    try {
      const XMLDisplayService = require("../../services/XMLDisplayService/XMLDisplayService.js");
      const simulatedModel = {networkName: domain, product: {gtin}};
      let xmlDisplayService = new XMLDisplayService(undefined, undefined, simulatedModel, type, undefined);

      //remove BOM-utf8 chars from the beginning of the xml
      if (base64XMLFileContent.substring(0, 4) === '77u/') {
        base64XMLFileContent = base64XMLFileContent.substring(4)
      }
      htmlXMLContent = xmlDisplayService.getHTMLFromXML("", atob(base64XMLFileContent));

      leafletHtmlContent = xmlDisplayService.buildLeafletHTMLSections(htmlXMLContent);
    } catch (e) {
      console.log(e);
      leafletHtmlContent = null;
    }

    let differentCaseImgFiles = [];
    if (!leafletHtmlContent) {
      throw errMap.newCustomError(errMap.errorTypes.WRONG_XML_FORMAT, type);
    }

    let htmlImageNames = Array.from(htmlXMLContent.querySelectorAll("img")).map(img => img.getAttribute("src"))
    //removing from validation image src that are data URLs ("data:....")
    htmlImageNames = htmlImageNames.filter((imageSrc) => {
      let dataUrlRegex = new RegExp(/^\s*data:([a-z]+\/[a-z]+(;[a-z\-]+\=[a-z\-]+)?)?(;base64)?,[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*$/i);
      if (!!imageSrc.match(dataUrlRegex) || imageSrc.startsWith("data:")) {
        return false;
      }
      return true;
    });

    let uploadedImageNames = payload.otherFilesContent.map(fileObj => {
      return fileObj.filename
    })

    let arrayBufferXMLFileContent = base64ToArrayBuffer(base64XMLFileContent);
    eventRecorder.register(EVENTS.WRITE, this.getLeafletFilePath(type, language), $$.Buffer.from(arrayBufferXMLFileContent));

    htmlImageNames.forEach(htmlImgName => {
      let differentImg = uploadedImageNames.find((item) => item.toLowerCase() === htmlImgName.toLowerCase())
      if (differentImg) {
        if (htmlImgName !== differentImg) {
          differentCaseImgFiles.push(htmlImgName)
        }
      }
    });

    for (let i = 0; i < leafletMessage.otherFilesContent.length; i++) {
      let file = leafletMessage.otherFilesContent[i];
      let differentCaseFileName = differentCaseImgFiles.find(item => file.filename.toLowerCase() === item.toLowerCase());
      if (differentCaseFileName) {
        file.filename = differentCaseFileName;
      }
      let filePath = `${this.getLeafletStoragePath(type, language)}/${file.filename}`;
      eventRecorder.register(EVENTS.WRITE, filePath, $$.Buffer.from(base64ToArrayBuffer(file.fileContent)));
    }

  }

  this.deleteEPI = async function (language) {
    let eventRecorder = await this.getEventRecorderInstance(this.getGTINSSI());
    eventRecorder.register(EVENTS.DELETE, this.getLeafletStoragePath(language));
  }

  //check version before doing any deserialization
  this.loadData = async function () {
    let dsu = await this.loadImmutableDSUInstance(this.getGTINSSI());
    let jsonSerialization = await dsu.readFile(this.getJSONStoragePath());
    Object.assign(this, JSON.parse(jsonSerialization));
  }

  //check version before doing any serialization
  this.update = function (data) {
    Object.assign(this, data);
    let content = JSON.stringify(this);
    eventRecorder.register(EVENTS.WRITE, this.getJSONStoragePath(), content);
  }

  this.persist = async function () {
    if (eventRecorder) {
      try {
        await this.loadImmutableDSUInstance();
      } catch (err) {
        //how to know that the Immutable DSU exists or not ??!
        await this.ensureDSUStructure();
      }
      //let version = await require("opendsu").loadApi("anchoring").getNextVersionNumberAsync(this.get.getCreationSSI());
      this.update({version});
      return await eventRecorder.execute();

      //at this point we should end batch on dsu...?!
    }
    throw new Error("Nothing to persist");
  }

}

module.exports = ModelBase;