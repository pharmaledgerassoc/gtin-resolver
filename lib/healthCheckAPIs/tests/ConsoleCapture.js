const { Writable } = require('stream');

function ConsoleCapture() {
    Writable.call(this);
    this.output = '';
}

ConsoleCapture.prototype = Object.create(Writable.prototype);
ConsoleCapture.prototype.constructor = ConsoleCapture;

ConsoleCapture.prototype._write = function(chunk, encoding, callback) {
    this.output += chunk.toString();
    callback();
};

ConsoleCapture.prototype.searchString = function(target) {
    return this.output
        .split('\n')
        .filter(line => line.includes(target));
};


ConsoleCapture.prototype.clear = function() {
    this.output = '';
};

const capture = new ConsoleCapture();
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);

process.stdout.write = (chunk, encoding, callback) => {
    capture.write(chunk, encoding, callback);
    originalStdoutWrite(chunk, encoding, callback);
};

process.stderr.write = (chunk, encoding, callback) => {
    capture.write(chunk, encoding, callback);
    originalStderrWrite(chunk, encoding, callback);
};

function searchConsoleOutput(targetString) {
    return capture.searchString(targetString);
}

module.exports = {
    searchConsoleOutput,
    capture
}