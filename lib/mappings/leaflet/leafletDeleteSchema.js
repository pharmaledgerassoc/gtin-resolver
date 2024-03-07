const Languages = require("../../utils/Languages");

const messageHeaderSchema = require("./../messageHeaderSchema");
let leafletDeleteSchema = {
    "type": "object",
    "properties":
        {
            "payload": {
                "type": "object", "required": true,
                "properties": {
                    "language": {
                        "type": "string",
                        "required": true,
                        regex: Languages.getLanguageRegex()
                    },
                    "productCode": {"type": "string", "required": true},
                    "batchNumber": {"type": "string", "required": false}

                }
            }
        }
}
leafletDeleteSchema.properties = {...messageHeaderSchema, ...leafletDeleteSchema.properties};
module.exports = leafletDeleteSchema;
