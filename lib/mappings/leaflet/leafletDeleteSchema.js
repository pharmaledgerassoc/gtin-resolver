const Languages = require("../../utils/Languages");

const messageHeaderSchema = require("./../messageHeaderSchema");
let leafletDeleteSchema = {
    "type": "object",
    "properties":
        {
            "payload": {
                "type": "object", "required": true,
                "properties": {
                    "action": {"type": "string", "required": true, regex: /^delete$/},
                    "language": {
                        "type": "string",
                        "required": true,
                        regex: Languages.getLanguageRegex()
                    },
                    "productCode": {"type": "string", "required": true}

                }
            }
        }
}
leafletDeleteSchema.properties = {...messageHeaderSchema, ...leafletDeleteSchema.properties};
module.exports = leafletDeleteSchema;
