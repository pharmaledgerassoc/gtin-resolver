function SecretsController() {

    this.checkSecrets = () => {
        return {
            name: "Secrets",
            status: getRandomResult(),
            date: Date.now()
        };
    }
    this.fixSecrets = () => {

    }
}
function getRandomResult() {
    const randomNum = Math.random();
    return randomNum < 0.5 ? 'success' : 'fail';
}
function getInstance() {
    return new SecretsController();
}
module.exports = {
    getInstance
}