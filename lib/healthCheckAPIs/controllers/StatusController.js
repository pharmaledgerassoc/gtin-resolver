const openDSU = require('opendsu');
const crypto = openDSU.loadAPI('crypto');
const enclave = openDSU.loadAPI('enclave');

const dbName = "demiurge";
const lightDBEnclaveClient = enclave.initialiseLightDBEnclave(dbName);

const Status = {
    IN_PROGRESS: "inProgress",
    NEVER_EXECUTED: "neverExecuted",
    COMPLETED: "completed"
};

const Task = {
    CHECK_ANCHORING: "checkAnchoring",
    CHECK_BRICKING: "checkBricking",
    CHECK_DATABASES: "checkDatabases",
    CHECK_PRODUCTS: "checkProducts",
    CHECK_BATCHES: "checkBatches"
};

const completedChecks = {
    "checkAnchoring": {},
    "checkBricking": {},
    "checkDatabases": {},
    "checkProducts": {},
    "checkBatches": {}
};

/* TODO Remove */
function generateRandomName() {
    const adjectives = ['red', 'big', 'fast', 'tiny', 'green', 'blue'];
    const nouns = ['apple', 'car', 'house', 'book', 'tree', 'computer'];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adjective}_${noun}_${crypto.generateRandom(4).toString('hex')}`;
}

function StatusController() {

    function getComponentPk(healthCheckPK, componentName) {
        return healthCheckPK + "_" + componentName;
    }

    const markNeverExecutedCheck = async (checkType, healthCheckId) => {
        const componentPk = getComponentPk(healthCheckId, checkType);
        await $$.promisify(lightDBEnclaveClient.insertRecord)($$.SYSTEM_IDENTIFIER, healthCheckId, componentPk, {data: {status: Status.NEVER_EXECUTED}});
    }

    const markCheckInitiation = async (checkType, healthCheckId) => {
        const componentPk = getComponentPk(healthCheckId, checkType);
        await $$.promisify(lightDBEnclaveClient.insertRecord)($$.SYSTEM_IDENTIFIER, healthCheckId, componentPk, {data: {status: Status.IN_PROGRESS}});
    }

    const markCheckCompletion = async (checkType, healthCheckId, checkData) => {
        const componentPk = getComponentPk(healthCheckId, checkType);
        await $$.promisify(lightDBEnclaveClient.updateRecord)($$.SYSTEM_IDENTIFIER, healthCheckId, componentPk, {data: checkData});
    }

    this.checkAnchoring = async (healthCheckId, args) => {
        return new Promise(async (resolve) => {
            await markCheckInitiation(Task.CHECK_ANCHORING, healthCheckId);

            /* TODO Replace with actual implementation */

            let brokenAnchors = [];
            setTimeout(() => {
                for (let i = 0; i < 100; i++) {
                    if (Math.random() * 100 % i) {
                        brokenAnchors.push({
                            anchorId: crypto.generateRandom(16).toString("hex"),
                            issue: i % 2 === 0 ? "corrupted file" : "the corresponding brick map does not exist"
                        });
                    }
                }
                const checkData = {brokenAnchors: brokenAnchors,status: Status.COMPLETED};

                resolve(markCheckCompletion(Task.CHECK_ANCHORING, healthCheckId, checkData));
            }, 32000);
        });
    }

    this.checkBricking = async (healthCheckId, args) => {
        return new Promise(async (resolve) => {
            await markCheckInitiation(Task.CHECK_BRICKING, healthCheckId);

            /* TODO Replace with actual implementation */

            let brokenBricks = [];
            setTimeout(() => {
                for (let i = 0; i < 100; i++) {
                    if (Math.random() * 100 % i) {
                        brokenBricks.push({
                            brickId: crypto.generateRandom(16).toString("hex"),
                            issue: i % 2 === 0 ? "Corrupted file" : "Lack of access"
                        });
                    }
                }
                const checkData = {brokenBricks: brokenBricks,status: Status.COMPLETED};
                resolve(markCheckCompletion(Task.CHECK_BRICKING, healthCheckId, checkData));
            }, 32000);
        });
    }

    this.checkDatabases = async (healthCheckId, args) => {
        return new Promise(async (resolve) => {
            await markCheckInitiation(Task.CHECK_DATABASES, healthCheckId);

            /* TODO Replace with actual implementation */

            setTimeout(() => {
                let tables = [];
                for (let i = 0; i < 10; i++) {
                    const tableName = generateRandomName();
                    const loadStatus = Math.random() > 0.5 ? 'success' : 'fail';
                    tables.push({
                        tableName: tableName, load: loadStatus
                    });
                }
                const checkData = {tables: tables,status: Status.COMPLETED};
                resolve(markCheckCompletion(Task.CHECK_DATABASES, healthCheckId, checkData));
            }, 32000);
        });
    }

    this.checkProducts = async (healthCheckId) => {
        return new Promise(async (resolve) => {
            await markCheckInitiation(Task.CHECK_PRODUCTS, healthCheckId);

            /* TODO Replace with actual implementation */

            setTimeout(() => {
                let products = [];
                for (let i = 0; i < 100; i++) {
                    if (Math.random() > 0.9) {
                        products.push({
                            productName: generateRandomName(),
                        });
                    }
                }
                const checkData = {products: products,status: Status.COMPLETED};
                resolve(markCheckCompletion(Task.CHECK_PRODUCTS, healthCheckId, checkData));
            }, 32000);
        });
    }

    this.checkBatches = async (healthCheckId) => {
        return new Promise(async (resolve) => {
            await markCheckInitiation(Task.CHECK_BATCHES, healthCheckId);

            /* TODO Replace with actual implementation */

            setTimeout(() => {
                let batches = [];
                for (let i = 0; i < 100; i++) {
                    if (Math.random() > 0.9) {
                        batches.push({
                            batchName: generateRandomName(),
                        });
                    }
                }
                const checkData = {batches: batches,status: Status.COMPLETED};
                resolve(markCheckCompletion(Task.CHECK_BATCHES, healthCheckId, checkData));
            }, 32000);
        });
    }

    this.getCheckStatus = async (checkType, healthCheckId) => {
        return new Promise(async (resolve) => {
            const componentPk = getComponentPk(healthCheckId, checkType);
            const record = await $$.promisify(lightDBEnclaveClient.getRecord)($$.SYSTEM_IDENTIFIER, healthCheckId, componentPk);
            if (!record) {
                return resolve(Status.NEVER_EXECUTED);
            }
            resolve(record.data.status);
        });
    }

    this.startProcess = async (checkType, healthCheckId, args) => {
        switch (checkType) {
            case Task.CHECK_ANCHORING:
                if (!args.domain) {
                    await markNeverExecutedCheck(Task.CHECK_ANCHORING, healthCheckId);
                    throw new Error("Domain is required.");
                }
                this.checkAnchoring(healthCheckId, args);
                break;
            case Task.CHECK_BRICKING:
                if (!args.domain) {
                    await markNeverExecutedCheck(Task.CHECK_BRICKING, healthCheckId);
                    throw new Error("Domain is required.");
                }
                this.checkBricking(healthCheckId, args);
                break;
            case Task.CHECK_DATABASES:
                if (!args.tables) {
                    await markNeverExecutedCheck(Task.CHECK_DATABASES, healthCheckId);
                    throw new Error("Tables are required.");
                }
               this.checkDatabases(healthCheckId, args);
                break;
            case Task.CHECK_PRODUCTS:
                this.checkProducts(healthCheckId);
                break;
            case Task.CHECK_BATCHES:
                this.checkBatches(healthCheckId);
                break;
        }
    }

    this.listChecks = async (checkType) => {

    }

    this.getCheckResult = async (checkType, date) => {


    }
}

function getInstance(domain, subdomain) {
    return new StatusController(domain, subdomain);
}

module.exports = {
    getInstance
};