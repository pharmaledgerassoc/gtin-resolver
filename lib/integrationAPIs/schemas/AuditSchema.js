const messageHeaderSchema = require("./../../mappings/messageHeaderSchema.js");
let auditLogSchema = {
    "type": "object",
    "properties":
        {
            "payload": {
                "type": "object", "required": true,
                "properties": {
                    "reason": {"type": "string", "required": true},
                    "itemCode": {"type": "string", "required": true},
                    "batchNumber": {"type": "string", "required": true},
                    "details": {
                        "type": "array"
                    },
                    "version": {"type": "number", "required": true}
                }
            }
        }
}
auditLogSchema.properties = {...messageHeaderSchema, ...auditLogSchema.properties};
module.exports = auditLogSchema
