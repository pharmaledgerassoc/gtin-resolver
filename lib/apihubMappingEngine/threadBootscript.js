const worker_threads = "worker_threads";
const {parentPort, isMainThread} = require(worker_threads);
const openDSUBundle = "./../../../privatesky/psknode/bundles/openDSU.js";
require(openDSUBundle);
const gtinResolverBundle = "./../../../gtin-resolver/build/bundles/gtinResolver.js";
require(gtinResolverBundle);
let threadGroupMessages, walletSSI;
const gtinResolver = require("gtin-resolver");
let LogService = gtinResolver.loadApi("services").LogService;
const mappings = gtinResolver.loadApi("mappings")
const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();

if (isMainThread) {
  return;
}
parentPort.postMessage("ready");

function updateMessagesWithError(messages, err) {
  let messagesWithErrors = messages.map(msg => {
    return JSON.stringify({
      message: msg,
      reason: err.message,
      error: errMap.newCustomError(errMap.errorTypes.UNKNOWN, [err])
    });
  })
  return messagesWithErrors;
}

parentPort.on("message", (taskData) => {
  // parentPort.postMessage(message);
  taskData = JSON.parse(taskData);
  console.log(`[workers] node worker activated for wallet "${taskData.walletSSI}"`);
  const holderInfo = taskData.holderInfo;
  walletSSI = taskData.walletSSI;
  const groupMessages = taskData.messages;
  threadGroupMessages = groupMessages;
  const ServerDSUStorageImpl = gtinResolver.loadApi("services").DSUStorage.getInstance(walletSSI);

  return ServerDSUStorageImpl.enableDirectAccess(async (err) => {

    if (err) {
      console.error("[workers] uncaughtException inside node worker", err);
      parentPort.postMessage(JSON.stringify({walletSSI, undigestedMessages: updateMessagesWithError(groupMessages, err)}));
      return
    }
    const logService = new LogService(ServerDSUStorageImpl);
    const mappingEngine = mappings.getEPIMappingEngine(ServerDSUStorageImpl, {
      holderInfo: holderInfo,
      logService: logService
    })
    let undigestedMessages
    try {
      undigestedMessages = await mappingEngine.digestMessages(groupMessages);
    } catch (e) {
      return parentPort.postMessage(JSON.stringify({walletSSI, undigestedMessages: updateMessagesWithError(groupMessages, e)}));
    }
    console.log("[MAPPING ENGINE]:Undigested messages:", undigestedMessages.length);
    parentPort.postMessage(JSON.stringify({walletSSI, undigestedMessages}));
  });
});

process.on("uncaughtException", (error) => {
  console.error("[workers] uncaughtException inside node worker", error);
  return parentPort.postMessage(JSON.stringify({walletSSI, undigestedMessages: updateMessagesWithError(threadGroupMessages, error)}));
});


