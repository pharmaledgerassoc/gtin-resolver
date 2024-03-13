const messageHeaderSchema = require("./../../mappings/messageHeaderSchema.js");
let auditUserActionSchema = {
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
auditUserActionSchema.properties = {...messageHeaderSchema, ...auditUserActionSchema.properties};
module.exports = auditUserActionSchema
