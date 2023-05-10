createOrUpdateRecord = async (storageService, logData, data) => {
  let dbRecord;
  try {
    dbRecord = await $$.promisify(storageService.getRecord, storageService)(logData.table, logData.pk);
  } catch (e) {
    //possible issue on db.
  }

  await storageService.safeBeginBatchAsync();
  if (dbRecord) {
    await $$.promisify(storageService.updateRecord, storageService)(logData.table, logData.pk, data);
  } else {
    await $$.promisify(storageService.addIndex, storageService)(logData.table, "__timestamp");
    await $$.promisify(storageService.insertRecord, storageService)(logData.table, logData.pk, data);
  }
  await storageService.commitBatchAsync();
}

module.exports = {
  createOrUpdateRecord
}
