function SecretsController() {

    this.checkSecrets = () => {
        return {
            status: getRandomResult(),
            date: Date.now()
        };
    }
    this.fixSecrets = (req, res) => {

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