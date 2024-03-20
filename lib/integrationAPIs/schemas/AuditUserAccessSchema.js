const messageHeaderSchema = require("./../../mappings/messageHeaderSchema.js");
let auditUserAccessSchema = {
    "type": "object",
    "properties":
        {
            "payload": {
                "type": "object", "required": true,
                "properties": {
                    "userDID": {"type": "string", "required": true},
                    "userGroup": {"type": "string", "required": true}
                }
            }
        }
}
auditUserAccessSchema.properties = {...messageHeaderSchema, ...auditUserAccessSchema.properties};
module.exports = auditUserAccessSchema
