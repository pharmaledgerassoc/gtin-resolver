const fs = require('fs');
const path = require('path');
const constants = require("../constants/constants");
const MESSAGE_SEPARATOR = "#$%/N";
function getEPIMappingEngineMessageResults(server) {
  const MESSAGES_PATH =path.join(server.rootFolder, "external-volume", "messages");

  function getLogs(msgParam, domain, callback) {
    const sanitizedDomain = path.basename(domain); // Prevent path traversal by using basename
    const LOGS_FOLDER = path.join(MESSAGES_PATH, sanitizedDomain);
    const LOGS_FILE = path.join(LOGS_FOLDER, constants.LOGS_TABLE);

    // Verify that LOGS_FILE is strictly within MESSAGES_PATH
    if (path.relative(MESSAGES_PATH, LOGS_FILE).startsWith('..')) {
      return callback(Error("Path Traversal detected!"));
    }

    fs.access(LOGS_FILE, fs.F_OK, (err) => {
      if (err) {
        return callback(`No logs found for domain -  ${domain}`);
      }

      fs.readFile(LOGS_FILE, 'utf8', (err, result) => {
        if (err) {
          return callback(err);
        }
        let messages = result.split(MESSAGE_SEPARATOR);
        if (messages[messages.length - 1] === "") {
          messages.pop();
        }
        try {
          messages = messages.map(msg => JSON.parse(msg));
        } catch (err) {
          return callback(err);
        }
        return callback(null, messages.reverse());
      });
    });
  }

  server.put("/mappingEngine/:domain/:subdomain/saveResult", function (request, response) {
    let msgDomain = path.basename(request.params.domain); // Sanitize domain to prevent traversal
    let data = [];

    request.on('data', (chunk) => {
      data.push(chunk);
    });

    request.on('end', async () => {
      try {
        let body = Buffer.concat(data).toString();

        const fileDir = path.join(MESSAGES_PATH, msgDomain);
        const logsFile = path.join(fileDir, constants.LOGS_TABLE);

        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }

        // Enhanced Path Traversal Check
        if (path.relative(MESSAGES_PATH, logsFile).startsWith('..')) {
          response.statusCode = 403;
          response.end("Path Traversal detected!");
          return;
        }

        fs.appendFile(logsFile, body + MESSAGE_SEPARATOR, (err) => {
          if (err) {
            throw err;
          }
          response.statusCode = 200;
          response.end();
        });
      } catch (e) {
        response.statusCode = 500;
        response.end();
      }
    });
  });

  server.get("/mappingEngine/:domain/logs", function (request, response) {

    let domainName = request.params.domain;
    let msgParam = request.params.messageParam;
    console.log(`EPI Mapping Engine get called for domain:  ${domainName}`);

    try {
      getLogs(msgParam, domainName, (err, logs) => {
        if (err) {
          console.log(err);
          response.statusCode = 500;
          response.end(JSON.stringify({result: "Error", message: "No logs"}));
          return;
        }
        if (!logs || logs.length === 0) {
          logs = "Log list is empty";
        }
        response.statusCode = 200;
        response.end(JSON.stringify(logs));
      });

    } catch (err) {
      console.error(err);
      response.statusCode = 500;
      response.end(JSON.stringify({result: "Error", error: err}));
    }

  });
}

module.exports.getEPIMappingEngineMessageResults = getEPIMappingEngineMessageResults;
