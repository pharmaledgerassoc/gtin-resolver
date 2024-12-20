// Generalized migration function
const migrateDataToLightDB = async (walletDBEnclave, lightDBEnclave, sourceTableName, targetTableName, transformRecord = async record => await record, generatePK = record => record.pk) => {
    let tables;
    try{
        tables = await $$.promisify(walletDBEnclave.getAllTableNames)($$.SYSTEM_IDENTIFIER);
    }catch (e) {
        console.error("Failed to get tables", e);
    }

    console.log("====================================================================================================");
    console.log(tables);
    console.log("====================================================================================================");

    let records;
    try {
        records = await $$.promisify(walletDBEnclave.getAllRecords)(undefined, sourceTableName);
        console.log(`Preparing to migrate ${records.length} records from table ${sourceTableName} to table ${targetTableName}`);
    } catch (e) {
        console.error("Failed to get records from table", sourceTableName, e);
        throw e;
    }

    let counter = 0;
    for (let record of records) {
        const transformedRecord = await transformRecord(record);
        let existingRecord;
        try {
            existingRecord = await $$.promisify(lightDBEnclave.getRecord)($$.SYSTEM_IDENTIFIER, targetTableName, generatePK(record));
        } catch (e) {
            //table does not exist
        }

        if (!existingRecord) {
            try {
                counter++;
                await $$.promisify(lightDBEnclave.insertRecord)($$.SYSTEM_IDENTIFIER, targetTableName, generatePK(record), transformedRecord);
            } catch (e) {
                console.error("Failed to insert record", transformedRecord, "in table", targetTableName, e);
                throw e;
            }
        }
    }
    try {
        await $$.promisify(lightDBEnclave.saveDatabase)($$.SYSTEM_IDENTIFIER);
    } catch (e) {
        console.error("Failed to save database", e);
        throw e;
    }
    console.log(`Migrated ${counter} records from table ${sourceTableName} to table ${targetTableName}`);
};

module.exports = {
    migrateDataToLightDB
}