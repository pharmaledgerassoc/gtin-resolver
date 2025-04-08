function buildQueryParams(gtin, batchNumber, lang, leafletType, epiMarket) {
    //query params are sort on the fixedURL middleware when checking for any entry....
    //so we need to create the url that will be "hashed" with base64 into the same order and thus why
    //we will use URLSearchParams.sort function will provide the same sort mechanism on client and server
    let converter = new URL("https://non.relevant.url.com");

    //let create a wrapper over append method to ensure that NO UNDEFINED variable will be added to the query
    let append = converter.searchParams.append;
    converter.searchParams.append = (name, value)=>{
        if(typeof value === "undefined" || value === null){
            return;
        }
        append.call(converter.searchParams, name, value);
    }

    if(!epiMarket)
        converter.searchParams.append("batch", batchNumber);
    converter.searchParams.append("lang", lang);
    converter.searchParams.append("gtin", gtin);
    converter.searchParams.append("leaflet_type", leafletType);
    converter.searchParams.append("epiMarket",  epiMarket);
    converter.searchParams.sort();
    return converter.searchParams.toString();
}



module.exports = {
    buildQueryParams
};
