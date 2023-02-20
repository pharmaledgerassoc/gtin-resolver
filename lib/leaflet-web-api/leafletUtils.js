module.exports.dsuExists = function (server, keySSI, gtin, useFastRoute=false, callback){
    if(typeof useFastRoute === "function"){
        callback = useFastRoute;
        useFastRoute = false;
    }

    function resolverCheckDSU(){
        const resolver = require("opendsu").loadApi("resolver");
        resolver.dsuExists(keySSI, callback);
    }

    if(useFastRoute){
        return server.makeLocalRequest("GET",`/gtinOwner/${gtin}`, "", (err, response)=>{
            if(err || !response.domain){
                if(!err.cause){
                    //network error
                }
                return resolverCheckDSU();
            }

            return callback(undefined, true);
        });
    }

    resolverCheckDSU();
}

module.exports.dsuExistsAsync = $$.promisify(module.exports.dsuExists);