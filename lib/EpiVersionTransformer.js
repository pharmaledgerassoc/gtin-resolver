const epiProtocolVersionMap = {
  "v1": {
    ROOT_PATH_TO_PRODUCT_DSU: "/product",
    ROOT_PATH_TO_BATCH_DSU: "/batch",
  }
}

function getVersionMap(epiProtocolVersion) {
  if (!epiProtocolVersionMap[epiProtocolVersion]) {
    throw new Error(`No mapping found for version ${epiProtocolVersion}`);
    return;
  }
  return epiProtocolVersionMap[epiProtocolVersion]
}

function getProductPath(epiProtocolVersion) {
  let versionMap = getVersionMap(epiProtocolVersion);
  return `${versionMap["ROOT_PATH_TO_PRODUCT_DSU"]}/product.json`;
}

function getProductImagePath(epiProtocolVersion) {
  let versionMap = getVersionMap(epiProtocolVersion);
  return `${versionMap["ROOT_PATH_TO_PRODUCT_DSU"]}/image.png`;
}


function getBatchPath(epiProtocolVersion) {
  let versionMap = getVersionMap(epiProtocolVersion);
  return `${versionMap["ROOT_PATH_TO_BATCH_DSU"]}/batch.json`;
}

module.exports = {
  getVersionMap,
  getProductPath,
  getProductImagePath,
  getBatchPath
}
