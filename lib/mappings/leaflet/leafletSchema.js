const Languages = require("../../utils/Languages");

const messageHeaderSchema = require("./../messageHeaderSchema");
let leafletSchema = {
  "type": "object",
  "properties":
    {
      "action": {"type": "string", "required": true, regex: /^(new|update)$/},
      "language": {
        "type": "string",
        "required": true,
        regex: Languages.getLanguageRegex()
      },
      "productCode": {"type": "string", "required": true},
      "xmlFileContent": {"type": "string", "required": true},
      "otherFilesContent": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "filename": {
              "type": "string",
              "required": true
            },
            "fileContent": {
              "type": "string",
              "required": true
            },
          }
        }
      }
    }
}
leafletSchema.properties = {...messageHeaderSchema, ...leafletSchema.properties};
module.exports = leafletSchema
