const openDSU = require("opendsu");
const config = openDSU.loadAPI("config");

async function getDisabledFeatures() {
  let disabledFeaturesArr = [];
  try {
    let disabledFeaturesList = await $$.promisify(config.getEnv)("disabledFeatures");
    if (disabledFeaturesList) {
      let disabledCodesArr = disabledFeaturesList.split(",");
      disabledCodesArr.forEach(item => {
        disabledFeaturesArr.push(item.trim());
      })
    }
  } catch (e) {
    console.log("Couldn't load disabledFeatures")
  }
  return disabledFeaturesArr;
}
async function getEpiProtocolVersion() {
  let defaultVersion = "v1";
  let epiProtocolVersion = await $$.promisify(config.getEnv)("epiProtocolVersion");
  return epiProtocolVersion || defaultVersion;
}

module.exports = {
  getDisabledFeatures
}
