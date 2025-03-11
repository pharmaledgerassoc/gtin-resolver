const messageHeaderSchema = require("./../../mappings/messageHeaderSchema.js");
let auditDemiurgeUserActionSchema = {
    "type": "object",
    "properties":
        {
            "payload": {
                "type": "object", "required": true,
                "properties": {
                    "action": {"type": "string", "required": true},
                    "userDID": {"type": "string", "required": true},
                    "userGroup": {"type": "string", "required": true}
                }
            }
        }
}
auditDemiurgeUserActionSchema.properties = {...messageHeaderSchema, ...auditDemiurgeUserActionSchema.properties};
module.exports = auditDemiurgeUserActionSchema
