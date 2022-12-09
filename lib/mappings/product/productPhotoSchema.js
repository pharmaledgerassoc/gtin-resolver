const messageHeaderSchema = require("./../messageHeaderSchema");
let photoSchema = {
  "type": "object",
  "properties":
    {
      "productCode": {"type": "string", "required": true},
      "imageData": {"type": "string", "required": true},
    }
}
photoSchema.properties = {...messageHeaderSchema, ...photoSchema.properties};
module.exports = photoSchema
