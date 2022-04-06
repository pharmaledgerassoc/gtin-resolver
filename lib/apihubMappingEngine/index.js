const path = require("path");
const gtinResolver = require("../../index");

function getEPIMappingEngineForAPIHUB(server) {
    const gtinResolverBundle = "./../../../gtin-resolver/build/bundles/gtinResolver.js";
    require(gtinResolverBundle);
    const workerController = new WorkerController(server.rootFolder);
    workerController.boot((err) => {
        if (err) {
            console.log(err);
        }
    })

    function putMessage(request, response) {

        let domainName = request.params.domain;
        let subdomainName = request.params.subdomain;
        const walletSSI = request.headers.token;

        console.log(`EPI Mapping Engine called for domain:  ${domainName}, and walletSSI : ${walletSSI}`);

        let data = [];
        request.on('data', (chunk) => {
            data.push(chunk);
        });

        request.on('end', async () => {

            try {
                let body = Buffer.concat(data).toString();
                let messages = JSON.parse(body);
                if (!Array.isArray(messages)) {
                    messages = [messages]
                }
                try {
                    await workerController.addMessages(walletSSI, domainName, subdomainName, messages);
                } catch (err) {
                    console.log(err);
                    err.debug_message === "Invalid credentials" ? response.statusCode = 403 : response.statusCode = 500;
                    return response.end();
                }

                response.statusCode = 200;
                response.end();
                // workerController.addMessages(walletSSI, domainName, subdomainName, messages, async (err) => {
                //     if (err) {
                //         console.log(err);
                //         err.debug_message === "Invalid credentials" ? response.statusCode = 403 : response.statusCode = 500;
                //         return response.end();
                //
                //     }
                //
                //
                // });

            } catch (err) {
                console.error("Error on parse request message", err);
                err.debug_message === "Invalid credentials" ? response.statusCode = 403 : response.statusCode = 500;
                response.end(err.message);
            }
        })

    }

    server.put("/mappingEngine/:domain", putMessage);
    server.put("/mappingEngine/:domain/:subdomain", putMessage);

}

function WorkerController(rootFolder) {
    //dependencies
    const apiHub = require("apihub");
    const gtinResolver = require("gtin-resolver");
    const openDSU = require("opendsu");
    const getBaseUrl = openDSU.loadApi("system").getBaseURL;
    const path = require("path");
    const fs = require("fs");
    const Database = require("default-enclave");

    //constants
    const MAX_NUMBER_OF_MESSAGES = 50;
    const MAX_GROUP_SIZE = 10;
    const GROUPING_TIMEOUT = 5 * 1000;
    const BACKUP_DB_PATH = path.join(rootFolder, "backupDB");
    const ENCLAVE_FOLDER = path.join(rootFolder, "enclaves");
    const DATABASE_PERSISTENCE_TIMEOUT = 100;
    const WALLET_INFO_TABLE = "wallet_info";

    //state variables
    const walletIsBeingProcessed = {};
    const messagesPipe = {};
    const databases = {};
    const getDatabase = (walletSSI) => {
        if (typeof databases[walletSSI] === "undefined") {
            databases[walletSSI] = new Database(path.join(ENCLAVE_FOLDER, walletSSI), DATABASE_PERSISTENCE_TIMEOUT);
        }
        return databases[walletSSI];
    }

    async function storeUndigestedMessages(messagesEndpoint, groupMessages, walletSSI, undigestedMessages) {
        const gtinResolver = require("gtin-resolver");
        const mappings = gtinResolver.loadApi("mappings")
        let messagesToPersist = groupMessages.map(msg => {
            let response = mappings.buildResponse(0.2);
            response.setReceiverId(msg.senderId);
            response.setSenderId(msg.receiverId);
            response.setMessageType(msg.messageType);
            response.setRequestData(msg);
            return response;
        });
        try {
            messagesToPersist.forEach(item => {
                let index = undigestedMessages.findIndex(elem => elem.message.messageId === item.requestMessageId)

                if (index >= 0) {
                    let messageErrors = [];
                    let undigestedMessage = undigestedMessages[index];
                    if (undigestedMessage.error && undigestedMessage.error.otherErrors && undigestedMessage.error.otherErrors.details.length) {
                        undigestedMessage.error.otherErrors.details.forEach((element, index) => {
                            item.addErrorResponse(element.errorType, element.errorMessage, element.errorDetails, element.errorField);
                        })
                    }
                } else {
                    item.addSuccessResponse();
                }
            })

        } catch (e) {
            console.log(e);
        }

        const httpSpace = require("opendsu").loadApi('http');
        for (let item of messagesToPersist) {
            try {
                await $$.promisify(httpSpace.doPut)(messagesEndpoint, JSON.stringify(item));
            } catch (err) {
                console.log(`Could not persist message: ${item} with error ${err}`);
            }
        }
    }

    const getMessagePipe = (walletSSI) => {
        if (typeof messagesPipe[walletSSI] === "undefined") {
            const MessagesPipe = gtinResolver.getMessagesPipe();
            const MessageQueuingService = gtinResolver.loadApi("services").getMessageQueuingServiceInstance();
            messagesPipe[walletSSI] = new MessagesPipe(MAX_GROUP_SIZE, GROUPING_TIMEOUT, MessageQueuingService.getNextMessagesBlock);
        }

        return messagesPipe[walletSSI];
    }

    const getMessagesFromDb = (walletSSI, callback) => {
        const db = getDatabase(walletSSI);
        db.listQueue("", walletSSI, "asc", MAX_NUMBER_OF_MESSAGES, async (err, dbMessages) => {
            if (err) {
                return callback(err);
            }

            if (!dbMessages || dbMessages.length === 0) {
                return callback(undefined, []);
            }
            let messages = [];
            for (let i = 0; i < dbMessages.length; i++) {
                const message = await $$.promisify(db.getObjectFromQueue)("", walletSSI, dbMessages[i]);
                messages.push(message);
            }

            callback(undefined, messages);
        });
    }

    const getWalletInfoFromDb = async (walletSSI) => {
        const db = getDatabase(walletSSI);
        const record = await $$.promisify(db.getRecord)("", WALLET_INFO_TABLE, walletSSI);
        return record;
    }

    const deleteProcessedMessagesFromDb = async (walletSSI, messages) => {
        const db = getDatabase(walletSSI);
        for (let i = 0; i < messages.length; i++) {
            await $$.promisify(db.deleteObjectFromQueue)("", walletSSI, messages[i].pk)
        }
    };

    const dispatchMessagesToWorker = async (walletSSI, holderInfo, messages) => {
        const syndicate = require("syndicate");
        const pool = syndicate.createWorkerPool({
            bootScript: require("path").join(__dirname, "./threadBootscript.js")
        })

        const task = {
            walletSSI,
            holderInfo,
            messages,
        }

        walletIsBeingProcessed[walletSSI] = true;
        const response = await $$.promisify(pool.addTask, pool)(JSON.stringify(task));
        response.undigestedMessages = JSON.parse(response.undigestedMessages);
        walletIsBeingProcessed[walletSSI] = false;
        return response.undigestedMessages;
    }

    const processWalletMessages = (walletSSI, holderInfo, messagesEndpoint, callback) => {
        if (walletIsBeingProcessed[walletSSI]) {
            return callback();
        }

        getMessagesFromDb(walletSSI, async (err, messages) => {
            if (err) {
                return callback(err);
            }

            if (messages.length === 0) {
                return callback();
            }


            const messagePipe = getMessagePipe(walletSSI);
            messagePipe.addInQueue(messages);
            messagePipe.onNewGroup(async (groupMessages) => {
                const undigestedMessages = await dispatchMessagesToWorker(walletSSI, holderInfo, groupMessages);
                await deleteProcessedMessagesFromDb(walletSSI, groupMessages);
                await storeUndigestedMessages(messagesEndpoint, groupMessages, walletSSI, undigestedMessages);
                processWalletMessages(walletSSI, holderInfo, messagesEndpoint, callback);
            })
        })
    }

    this.boot = (callback) => {
        const __processWallets = () => {
            fs.readdir(ENCLAVE_FOLDER, async (err, files) => {
                if (err) {
                    return callback(err);
                }

                if (files.length === 0) {
                    return callback();
                }

                for (let i = 0; i < files.length; i++) {
                    const {walletSSI, holderInfo, messagesEndpoint} = await getWalletInfoFromDb(files[i]);
                    await $$.promisify(processWalletMessages)(walletSSI, holderInfo, messagesEndpoint);
                }
                callback();
            })
        }
        fs.access(ENCLAVE_FOLDER, async err => {
            if (err) {
                fs.mkdir(ENCLAVE_FOLDER, {recursive: true}, async err => {
                    if (err) {
                        return callback(err);
                    }

                    __processWallets();
                });

                return
            }

            __processWallets();
        })
    }

    const storeWalletInfo = async (walletSSI, holderInfo, messagesEndpoint) => {
        const db = getDatabase(walletSSI);
        let walletInfo;
        try {
            walletInfo = await $$.promisify(db.getRecord)("", WALLET_INFO_TABLE, walletSSI);
        } catch (e) {

        }

        if (typeof walletInfo === "undefined") {
            await $$.promisify(db.insertRecord)("", WALLET_INFO_TABLE, walletSSI, {
                holderInfo,
                walletSSI,
                messagesEndpoint
            });
        } else {
            await $$.promisify(db.updateRecord)("", WALLET_INFO_TABLE, walletSSI, {
                holderInfo,
                walletSSI,
                messagesEndpoint
            });
        }
    }

    this.addMessages = async (walletSSI, domain, subdomain, messages) => {
        let domainConfig, messagesEndpoint;
        domainConfig = apiHub.getDomainConfig(domain);
        subdomain = domainConfig.bricksDomain || subdomain;

        if (!subdomain) {
            throw new Error(`Missing subdomain. Must be provided in url or set in configuration`);
        }

        if (!walletSSI) {
            if (!domainConfig) {
                throw new Error(`Domain configuration ${domain} not found`);
            }

            if (!domainConfig.mappingEngineWalletSSI) {
                throw new Error(`mappingEngineWalletSSI is not set in the domain with name ${domain} configuration`);
            }
        }

        walletSSI = walletSSI || domainConfig.mappingEngineWalletSSI;
        messagesEndpoint = domainConfig.messagesEndpoint || `${getBaseUrl()}/mappingEngine/${domain}/${subdomain}/saveResult`
        const holderInfo = {domain, subdomain};
        const db = getDatabase(walletSSI);
        await storeWalletInfo(walletSSI, holderInfo, messagesEndpoint);
        for (let i = 0; i < messages.length; i++) {
            await $$.promisify(db.addInQueue)("", walletSSI, messages[i]);
        }

        $$.promisify(processWalletMessages)(walletSSI, holderInfo, messagesEndpoint);
    }
}

module.exports.getEPIMappingEngineForAPIHUB = getEPIMappingEngineForAPIHUB;
