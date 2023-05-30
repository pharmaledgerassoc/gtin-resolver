createOrUpdateRecord = async (storageService, logData, data) => {
    let dbRecord;
    try {
        dbRecord = await $$.promisify(storageService.getRecord, storageService)(logData.table, logData.pk);
    } catch (e) {
        //possible issue on db.
    }

    await storageService.safeBeginBatchAsync();
    let error;
    try {
        if (dbRecord) {
            await $$.promisify(storageService.updateRecord, storageService)(logData.table, logData.pk, data);
        } else {
            await $$.promisify(storageService.addIndex, storageService)(logData.table, "__timestamp");
            await $$.promisify(storageService.insertRecord, storageService)(logData.table, logData.pk, data);
        }
    } catch (e) {
        error = e;
    }
    try {
        await storageService.commitBatchAsync();
    } catch (e) {
        const commitError = createOpenDSUErrorWrapper(`Failed to commit batch`, e, error);
        try {
            await storageService.cancelBatchAsync();
        } catch (error) {
            throw createOpenDSUErrorWrapper(`Failed to cancel batch`, error, commitError);
        }
    }
    // if any error is caught during storage service operations, any changes done are committed and the error is thrown
    if (error) {
        throw error;
    }
}

module.exports = {
    createOrUpdateRecord
}
