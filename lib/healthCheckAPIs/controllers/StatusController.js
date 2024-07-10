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

const processCache = {
    "checkAnchoring": {},
    "checkBricking": {},
    "checkDatabases": {},
    "checkProducts": {},
    "checkBatches": {},
};
const completedChecks = {
    "checkAnchoring": {},
    "checkBricking": {},
    "checkDatabases": {},
    "checkProducts": {},
    "checkBatches": {},
};

function StatusController(req, res) {
    const {getUserID} = require("../../integrationAPIs/utils/getUserId");
    const logger = $$.getLogger("StatusController", "reportAPIs");
    const crypto = require('opendsu').loadAPI('crypto');
    const getCompletedChecks = (checkType) => {
        return Object.keys(completedChecks[checkType]);
    }
    const getCheckDetails = (checkType, checkDate) => {
        return completedChecks[checkType][checkDate];
    }

    const markTaskCompletion = (checkType, processId, checkData) => {
        processCache[checkType][processId].status = Status.COMPLETED;
        const completionTime = new Date().toISOString();
        completedChecks[Task.CHECK_ANCHORING][completionTime] = {
            completionTime: completionTime,
            ...checkData
        };
    }

    this.checkAnchoring = async (processId, args) => {
        return new Promise((resolve) => {
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
                const checkData = {brokenAnchors: brokenAnchors};

                resolve(markTaskCompletion(Task.CHECK_ANCHORING, processId, checkData));
            }, 32000);
        });
    }
    this.checkBricking = async (processId, args) => {
        return new Promise((resolve) => {
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
                const checkData = {brokenBricks: brokenBricks};
                resolve(markTaskCompletion(Task.CHECK_BRICKING, processId, checkData));
            }, 32000);
        });
    }
    this.checkDatabases = async (processId, args) => {
        function generateRandomTableName() {
            const adjectives = ['red', 'big', 'fast', 'tiny', 'green', 'blue'];
            const nouns = ['apple', 'car', 'house', 'book', 'tree', 'computer'];
            const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
            const noun = nouns[Math.floor(Math.random() * nouns.length)];
            return `${adjective}_${noun}_${crypto.generateRandom(4).toString('hex')}`;
        }

        return new Promise((resolve) => {
            setTimeout(() => {
                let tables = [];
                for (let i = 0; i < 10; i++) {
                    const tableName = generateRandomTableName();
                    const loadStatus = Math.random() > 0.5 ? 'success' : 'fail';
                    tables.push({
                        tableName: tableName,
                        load: loadStatus
                    });
                }
                const checkData = {tables: tables};
                resolve(markTaskCompletion(Task.CHECK_DATABASES, processId, checkData));
            }, 32000);
        });
    }
    this.checkProducts = async (processId) => {
        function generateRandomProductName() {
            const adjectives = ['red', 'big', 'fast', 'tiny', 'green', 'blue'];
            const nouns = ['apple', 'car', 'house', 'book', 'tree', 'computer'];
            const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
            const noun = nouns[Math.floor(Math.random() * nouns.length)];
            return `${adjective}_${noun}_${crypto.generateRandom(4).toString('hex')}`;
        }

        return new Promise((resolve) => {
            setTimeout(() => {
                let products = [];
                for (let i = 0; i < 100; i++) {
                    if (Math.random() > 0.9) {
                        products.push({
                            productName: generateRandomProductName(),
                        });
                    }
                }
                const checkData = {products: products};
                resolve(markTaskCompletion(Task.CHECK_DATABASES, processId, checkData));
            }, 32000);
        });
    }
    this.checkBatches = async (processId) => {
        function generateRandomBatchName() {
            const adjectives = ['red', 'big', 'fast', 'tiny', 'green', 'blue'];
            const nouns = ['apple', 'car', 'house', 'book', 'tree', 'computer'];
            const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
            const noun = nouns[Math.floor(Math.random() * nouns.length)];
            return `${adjective}_${noun}_${crypto.generateRandom(4).toString('hex')}`;
        }

        return new Promise((resolve) => {
            setTimeout(() => {
                let batches = [];
                for (let i = 0; i < 100; i++) {
                    if (Math.random() > 0.9) {
                        batches.push({
                            batchName: generateRandomBatchName(),
                        });
                    }
                }
                const checkData = {batches: batches};
                resolve(markTaskCompletion(Task.CHECK_DATABASES, processId, checkData));
                resolve(batches);
            }, 32000);
        });
    }
    this.getProcessStatus = async (checkType, processId) => {
        return processCache[checkType][processId].status;
    }

    this.startProcess = (checkType, args) => {

        const processId = crypto.generateRandom(32).toString("hex");

        switch (checkType) {
            case Task.CHECK_ANCHORING:
                if (!args.domain) {
                    processCache[checkType][processId] = {
                        status: Status.NEVER_EXECUTED
                    };
                    throw new Error("Domain is required.");
                }
                this.checkAnchoring(processId, args)
                break;
            case Task.CHECK_BRICKING:
                if (!args.domain) {
                    processCache[checkType][processId] = {
                        status: Status.NEVER_EXECUTED
                    };
                    throw new Error("Domain is required.");
                }

                this.checkBricking(processId, args)
                break;
            case Task.CHECK_DATABASES:
                if (!args.tables) {
                    processCache[checkType][processId] = {
                        status: Status.NEVER_EXECUTED
                    };
                    throw new Error("Tables are required.");
                }
                this.checkDatabases(processId, args);
                break;
            case Task.CHECK_PRODUCTS:
                this.checkProducts(processId);
                break;
            case Task.CHECK_BATCHES:
                this.checkProducts(processId);
                break;
        }

        processCache[checkType][processId] = {
            status: Status.IN_PROGRESS
        };
        return processId;
    }

    this.listChecks = async (checkType) => {
        return getCompletedChecks(checkType)
    }

    this.getCheckResult = async (checkType, date) => {
        return getCheckDetails(checkType, date);
    }

}

function getInstance(domain, subdomain) {
    return new StatusController(domain, subdomain);
}

module.exports = {
    getInstance
}