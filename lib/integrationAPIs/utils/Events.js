const EVENTS = {
    WRITE: "WriteEvent",
    DELETE: "DeleteEvent"
}

function Event(dsu, path, content) {
    Object.assign(this, {dsu, path, content});
}

function WriteEvent(...args) {
    let instance = new Event(...args);
    const {dsu, path, content} = instance;

    instance.execute = async function () {
        return await dsu.writeFile(path, content);
    }
    return instance;
}

function DeleteEvent(...args) {
    let instance = new Event(...args);
    const {dsu, path} = instance;

    instance.execute = async function () {
        return await dsu.delete(path);
    }
    return instance;
}

const eventConstructors = {
    WriteEvent,
    DeleteEvent
}

function EventRecorder(dsuInstance) {

    let events = [];
    this.register = function (operation, path, content) {
        let EventConstructor = eventConstructors[operation];
        events.push(new EventConstructor(dsuInstance, path, content));
    }

    this.execute = async function () {
        //todo: dsuInstance.beginBatch

        for (let event in events) {
            await event.execute();
        }

        //todo: dsuInstance.commit();
    }

}

module.exports = {
    EventRecorder,
    EVENTS
}