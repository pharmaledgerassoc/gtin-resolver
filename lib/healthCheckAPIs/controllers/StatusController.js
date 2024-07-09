function StatusController(req, res) {
    const {getUserID} = require("../../integrationAPIs/utils/getUserId");
    const logger = $$.getLogger("StatusController", "reportAPIs");
    const crypto = require('opendsu').loadAPI('crypto');
    const processCache = {};
    this.getConfigsInfo = (network, cluster) => {

    }

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
    this.checkAnchoring = async (processId,args) => {
        return new Promise((resolve) => {
            let brokenAnchors = [];
            setTimeout(() => {
                for (let i = 0; i < 100; i++) {
                    if (Math.random() * 100 % i) {
                        brokenAnchors.push({
                            anchorId: crypto.randomBytes(16).toString("hex"),
                            issue: i % 2 === 0 ? "corrupted file" : "the corresponding brick map does not exist"
                        });
                    }
                }
                processCache[processId].status = Status.COMPLETED;
                resolve(brokenAnchors);
            }, 32000);
        });
    }
    this.checkBricking = async (processId,args) => {
        return new Promise((resolve) => {
            let brokenBricks = [];
            setTimeout(() => {
                for (let i = 0; i < 100; i++) {
                    if (Math.random() * 100 % i) {
                        brokenBricks.push({
                            brickId: crypto.randomBytes(16).toString("hex"),
                            issue: i % 2 === 0 ? "Corrupted file" : "Lack of access"
                        });
                    }
                }
                processCache[processId].status = Status.COMPLETED;
                resolve(brokenBricks);
            }, 32000);
        });
    }
    this.checkDatabases = async (processId,args) => {
        function generateRandomTableName() {
            const adjectives = ['red', 'big', 'fast', 'tiny', 'green', 'blue'];
            const nouns = ['apple', 'car', 'house', 'book', 'tree', 'computer'];
            const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
            const noun = nouns[Math.floor(Math.random() * nouns.length)];
            return `${adjective}_${noun}_${crypto.randomBytes(4).toString('hex')}`;
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
                processCache[processId].status = Status.COMPLETED;
                resolve(tables);
            }, 32000);
        });
    }
    this.checkProducts = async (processId) => {
        function generateRandomProductName() {
            const adjectives = ['red', 'big', 'fast', 'tiny', 'green', 'blue'];
            const nouns = ['apple', 'car', 'house', 'book', 'tree', 'computer'];
            const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
            const noun = nouns[Math.floor(Math.random() * nouns.length)];
            return `${adjective}_${noun}_${crypto.randomBytes(4).toString('hex')}`;
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
                processCache[processId].status = Status.COMPLETED;
                resolve(products);
            }, 32000);
        });
    }
    this.checkBatches = async (processId) => {
        function generateRandomBatchName() {
            const adjectives = ['red', 'big', 'fast', 'tiny', 'green', 'blue'];
            const nouns = ['apple', 'car', 'house', 'book', 'tree', 'computer'];
            const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
            const noun = nouns[Math.floor(Math.random() * nouns.length)];
            return `${adjective}_${noun}_${crypto.randomBytes(4).toString('hex')}`;
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
                processCache[processId].status = Status.COMPLETED;
                resolve(batches);
            }, 32000);
        });
    }
    this.getProcessStatus = async (processId) => {
        return processCache[processId].status;
    }

    this.startProcess = async (task, processId, args) => {
        processId = crypto.randomBytes(32).toString("hex");
        (async () => {
            switch (task) {
                case Task.CHECK_ANCHORING:
                    if (!args.domain) {
                        processCache[processId] = {
                            status: Status.NEVER_EXECUTED
                        };
                        throw new Error("Domain is required.");
                    }
                    this.checkAnchoring(processId, args)
                    break;
                case Task.CHECK_BRICKING:
                    if (!args.domain) {
                        processCache[processId] = {
                            status: Status.NEVER_EXECUTED
                        };
                        throw new Error("Domain is required.");
                    }
                    this.checkBricking(processId, args)
                    break;
                case Task.CHECK_DATABASES:
                    if (!args.tables) {
                        processCache[processId] = {
                            status: Status.NEVER_EXECUTED
                        };
                        throw new Error("Tables are required.");
                    }
                    this.checkDatabases(processId, args);
                    break;
                case Task.CHECK_PRODUCTS:
                    await this.checkProducts(processId);
                    break;
                case Task.CHECK_BATCHES:
                    this.checkProducts(processId);
                    break;
            }
        })();
        processCache[processId] = {
            status: Status.IN_PROGRESS
        };
        return processId;
    }

    this.listChecks = async () => {
    }

    this.getCheckResult = async (date) => {
    }

}

function getInstance(domain, subdomain) {
    return new StatusController(domain, subdomain);
}