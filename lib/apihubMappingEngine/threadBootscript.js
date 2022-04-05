const worker_threads = "worker_threads";
const {parentPort, isMainThread} = require(worker_threads);
const openDSUBundle = "./../../../privatesky/psknode/bundles/openDSU.js";
require(openDSUBundle);
const gtinResolverBundle = "./../../../gtin-resolver/build/bundles/gtinResolver.js";
require(gtinResolverBundle);

const gtinResolver = require("gtin-resolver");
let LogService = gtinResolver.loadApi("services").LogService;
const mappings = gtinResolver.loadApi("mappings")

if (isMainThread) {
    return;
}
parentPort.postMessage("ready");

parentPort.on("message", (message) => {
    // parentPort.postMessage(message);
    message = JSON.parse(message);
    console.log(`[workers] node worker activated for wallet "${message.walletSSI}"`);
    const holderInfo = message.holderInfo;
    const walletSSI = message.walletSSI;
    const groupMessages = message.messages;
    const ServerDSUStorageImpl = gtinResolver.loadApi("services").DSUStorage.getInstance(walletSSI);

    return ServerDSUStorageImpl.enableDirectAccess(async (err) => {

        if (err) {
            console.error("[workers] uncaughtException inside node worker", err);
            setTimeout(() => process.exit(1), 100);
            return
        }
        const logService = new LogService(ServerDSUStorageImpl);
        const mappingEngine = mappings.getEPIMappingEngine(ServerDSUStorageImpl, {
            holderInfo: holderInfo,
            logService: logService
        })
        let undigestedMessages
        try{
            undigestedMessages = await mappingEngine.digestMessages(groupMessages);
        }catch (e) {
            console.error(e);
        }
        console.log("[MAPPING ENGINE]:Undigested messages:", undigestedMessages.length);
        undigestedMessages = JSON.stringify(undigestedMessages);
        parentPort.postMessage({walletSSI, undigestedMessages});
    });
});

process.on("uncaughtException", (error) => {
    console.error("[workers] uncaughtException inside node worker", error);

    setTimeout(() => process.exit(1), 100);
});


