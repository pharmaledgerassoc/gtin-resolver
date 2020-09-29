function GTIN_DSU_Factory(resolver) {
    this.create = (keySSI, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        options.dsuFactoryType = "const";
        resolver.createDSU(keySSI, options, callback);
    };


    this.load = (keySSI, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        options.dsuFactoryType = "const";
        resolver.loadDSU(keySSI, options, callback);
    };
}

module.exports = GTIN_DSU_Factory;
