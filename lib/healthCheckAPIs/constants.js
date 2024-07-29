module.exports = {
    HEALTH_CHECK_STATUSES : {
        IN_PROGRESS: "in_progress",
        SUCCESS: "success",
        FAILED: "failed",
        REPAIRED: "repaired",
        FAILED_REPAIR: "failed_repair"
    },
    HEALTH_CHECK_TABLE: "health_check",
    HEALTH_CHECK_COMPONENTS: {
        SECRETS: "secrets",
        SYSTEM_HEALTH: "systemHealth",
        INSTALL_INFO: "installInfo",
        CONFIGS_INFO: "configsInfo",
        WALLETS: "wallets",
        BRICKING: "bricking",
        ANCHORING: "anchoring",
        DATABASES: "databases",
        PRODUCTS: "products",
        BATCHES: "batches"
    },
    HEALTH_CHECK_ACTIONS: {
        START: "start",
        STATUS: "status"
    },
    FAILURE_ACTIONS: {
        DELETE: "delete",
        CORRUPT: "corrupt"
    }
}