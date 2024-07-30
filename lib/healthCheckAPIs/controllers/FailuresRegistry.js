const registry = {};

function FailureRegistry() {}

FailureRegistry.prototype.registerFailure = (component, action, failureFunction) => {
    if (!registry[component]) {
        registry[component] = {};
    }
    registry[component][action] = failureFunction;
};

FailureRegistry.prototype.executeFailure =  (component, action, ...args) => {
    if (!registry[component] || !registry[component][action]) {
        throw new Error(`No failure function registered for component: ${component}, action: ${action}`);
    }
    registry[component][action](...args);
};

module.exports = FailureRegistry;
const constants = require("../constants.js");

FailureRegistry.prototype.registerFailure(constants.HEALTH_CHECK_COMPONENTS.ANCHORING, constants.FAILURE_ACTIONS.DELETE, (rootFolder) => {

})

FailureRegistry.prototype.registerFailure(constants.HEALTH_CHECK_COMPONENTS.ANCHORING, constants.FAILURE_ACTIONS.CORRUPT, (rootFolder) => {

})

FailureRegistry.prototype.registerFailure(constants.HEALTH_CHECK_COMPONENTS.BRICKING, constants.FAILURE_ACTIONS.DELETE, (rootFolder) => {

})

FailureRegistry.prototype.registerFailure(constants.HEALTH_CHECK_COMPONENTS.BRICKING, constants.FAILURE_ACTIONS.CORRUPT, (rootFolder) => {

})
