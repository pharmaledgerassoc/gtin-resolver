function DefaultClient(domain){

}

let instances = {};
function getInstance(domain){
  if(!instances[domain]){
    instances[domain] = new DefaultClient(domain);
  }

  return instances[domain];
}

module.exports = {
 getInstance
};