const EVENTS = {
    WRITE: "WriteEvent",
    DELETE: "DeleteEvent"
}

function Event(dsu, path, content) {
    Object.assign(this, {dsu, path, content});
}

let getDiffsForAudit = (newData, prevData) => {
    if (prevData && (Array.isArray(prevData) || Object.keys(prevData).length > 0)) {
        let diffs = Object.keys(newData).reduce((diffs, key) => {
            if (JSON.stringify(prevData[key]) === JSON.stringify(newData[key])) return diffs
            return {
                ...diffs, [key]: {oldValue: prevData[key], newValue: newData[key]}
            }
        }, {})
        return diffs;
    }
}

function WriteEvent(dsu, path, content, diff, ...args) {
    let instance = new Event(dsu, path, content, diff, ...args);

    instance.execute = async function () {
        let diffs;
        if (typeof diff !== "boolean") {
            diffs = diff;
        } else {
            if (diff) {
                let oldContent = null;
                let newContent = null;
                try {
                    oldContent = await dsu.readFileAsync(path);
                    oldContent = JSON.parse(oldContent.toString());
                    newContent = JSON.parse(content);
                } catch (err) {
                    oldContent = null;
                }

                diffs = getDiffsForAudit(newContent, oldContent);
            } else {
                //no diffs...
            }
        }
        await dsu.writeFileAsync(path, content);
        return diffs ? {path, diffs} : undefined;
    }
    return instance;
}

function DeleteEvent(dsu, path, content, diff, ...args) {
    let instance = new Event(dsu, path, content, diff, ...args);

    instance.execute = async function () {
        let diffs;
        if(typeof diff !== "boolean") {
            diffs = diff;
        }else{
            if(diff){
                let oldContent = null;
                try{
                    let oldContent = await dsu.readFileAsync(path);
                    oldContent = JSON.parse(oldContent);
                    content = JSON.parse(content);
                }catch(err){
                    oldContent = null;
                }

                diffs = this.mappingLogService.getDiffsForAudit(null, oldContent);
            }else{
                //no diffs...
            }
        }
        await dsu.deleteAsync(path);
        return diffs ? {path, diffs} : undefined;
    }
    return instance;
}

const eventConstructors = {
    WriteEvent,
    DeleteEvent
}

function EventRecorder(dsuInstance) {

    let events = [];
    this.register = function (operation, path, content, ...args) {
        let EventConstructor = eventConstructors[operation];
        events.push(new EventConstructor(dsuInstance, path, content, ...args));
    }

    this.execute = async function (auditContext) {
        const batchNumber = await dsuInstance.startOrAttachBatchAsync();
        let version;
        let diffs = [];
        for (let event of events) {
            let operationDiff = await event.execute();
            if(operationDiff){
                diffs.push(operationDiff);
            }
        }

        await dsuInstance.commitBatchAsync(batchNumber);
        if(auditContext){
            auditContext.diffs = diffs;
            try{
                version = await require("opendsu").loadApi("anchoring").getNextVersionNumberAsync(dsuInstance.getCreationSSI());
            } catch (err){
                //todo: handle this error...
            }
            auditContext.version = version-1;
        }
        return diffs;
    }
}

module.exports = {
    EventRecorder,
    EVENTS
}