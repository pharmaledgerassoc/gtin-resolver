const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();

const itemValidator = function (messageValue, schemaObj, schemaKey) {

  if (!schemaObj.required && !messageValue) {
    return;
  }

  if (schemaObj.required && (!messageValue || ((typeof messageValue === "string") && !messageValue.trim()))) {
    invalidFields.push({field: schemaKey, message: `Required field`});
    return;
  }

  if (schemaObj.regex && !schemaObj.regex.test(messageValue)) {
    if (schemaKey === "messageTypeVersion") {
      invalidFields.push({field: schemaKey, message: `Wrong message version.`});
      return;
    }
    if (schemaKey === "marketId") {
      invalidFields.push({field: schemaKey, message: `not recognized`});
      return;
    }

    invalidFields.push({field: schemaKey, message: `Invalid format`});

    return;
  }

  if (schemaObj.type === "batchDate") {
    let resultDate;
    if (messageValue.length === 6) {
      let year = "20" + messageValue.slice(0, 2);
      let month = messageValue.slice(2, 4);
      let day = messageValue.slice(4, 6);
      if (day === "00") {
        day = "01";
      }
      resultDate = new Date(`${year}/${month}/${day}`);

    }
    if (!resultDate || resultDate.toString() === "Invalid Date") {
      invalidFields.push({
        field: schemaKey,
        message: `Wrong date format`
      });
    }

    return;
  }

  if ((schemaObj.type !== "array" && schemaObj.type !== typeof messageValue) || (schemaObj.type === "array" && !Array.isArray(messageValue))) {
    invalidFields.push({
      field: schemaKey,
      message: `Wrong type. Found ${typeof messageValue} , expected ${schemaObj.type}`
    });
    return;
  }
}

const schemaParser = function (message, schema) {
  const schemaObject = schema.properties;
  const schemaKeys = Object.keys(schemaObject);
  for (let i = 0; i < schemaKeys.length; i++) {
    const schemaKey = schemaKeys[i];
    if (schemaObject[schemaKey].type === "object") {
      if (!message[schemaKey]) {
        itemValidator(message[schemaKey], schemaObject[schemaKey], schemaKey);
      } else {
        schemaParser(message[schemaKey], schemaObject[schemaKey]);
      }
    }
    if (schemaObject[schemaKey].type === "array" && Array.isArray(message[schemaKey])) {
      message[schemaKey].forEach(msg => {
        if (schemaObject[schemaKey].items.type === "object") {
          schemaParser(msg, schemaObject[schemaKey].items)
        } else {
          itemValidator(msg, schemaObject[schemaKey].items, schemaKey);
        }

      })
    }
    if (schemaObject[schemaKey].type !== "object" && schemaObject[schemaKey].type !== "array") {
      if (!message[schemaKey] && schemaObject[schemaKey].defaultValue) {
        message[schemaKey] = schemaObject[schemaKey].defaultValue;
      } else {
        itemValidator(message[schemaKey], schemaObject[schemaKey], schemaKey);
      }
    }
  }

}
let invalidFields;
const validateMsgOnSchema = function (message, schema) {
  invalidFields = [];
  schemaParser(message, schema);
  if (invalidFields.length > 0) {
    return {
      valid: false, invalidFields: invalidFields
    }
  }
  return {
    valid: true
  }
}

async function validateMessageOnSchema(message, schema) {
  const msgValidation = validateMsgOnSchema(message, schema);
  if (!msgValidation.valid) {
    message.invalidFields = msgValidation.invalidFields;
    throw errMap.newCustomError(errMap.errorTypes.INVALID_MESSAGE_FORMAT, msgValidation.invalidFields);
  }
  return msgValidation;
}


function validateGTIN(gtinValue) {
  const gtinMultiplicationArray = [3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3];

  if (isNaN(gtinValue)) {
    return {isValid: false, message: "GTIN should be a numeric value"};
  }
  let gtinDigits = gtinValue.split("");

  // TO DO this check is to cover all types of gtin. For the moment we support just 14 digits length. TO update also in leaflet-ssapp
  /*
  if (gtinDigits.length !== 8 && gtinDigits.length !== 12 && gtinDigits.length !== 13 && gtinDigits.length !== 14) {

    return {isValid: false, message: "GTIN length should be 8, 12, 13 or 14"};
  }
  */

  if (gtinDigits.length !== 14) {
    return {isValid: false, message: "GTIN length should be 14"};
  }
  let j = gtinMultiplicationArray.length - 1;
  let reszultSum = 0;
  for (let i = gtinDigits.length - 2; i >= 0; i--) {
    reszultSum = reszultSum + gtinDigits[i] * gtinMultiplicationArray[j];
    j--;
  }
  let validDigit = Math.floor((reszultSum + 10) / 10) * 10 - reszultSum;
  if (validDigit === 10) {
    validDigit = 0;
  }
  if (gtinDigits[gtinDigits.length - 1] != validDigit) {
    return {isValid: false, message: "Invalid GTIN. Last digit should be " + validDigit};
  }

  return {isValid: true, message: "GTIN is valid"};
}

module.exports = {
  validateMessageOnSchema,
  validateGTIN
}

