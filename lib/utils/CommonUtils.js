function getBloomFilterSerialisation(arr, bfSerialisation) {
  let crypto = require("opendsu").loadAPI("crypto");
  let bf;
  if (bfSerialisation) {
    bf = crypto.createBloomFilter(bfSerialisation);
  } else {
    bf = crypto.createBloomFilter({estimatedElementCount: arr.length, falsePositiveTolerance: 0.000001});
  }
  arr.forEach(sn => {
    bf.insert(sn);
  });
  return bf
}

function convertDateTOGMTFormat(date) {
  let formatter = new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    weekday: "short",
    monthday: "short",
    timeZone: 'GMT'
  });

  let arr = formatter.formatToParts(date);
  let no = {};
  arr.forEach(item => {
    no[item.type] = item.value;
  })
  let {year, month, day, hour, minute} = no;

  let offset = -date.getTimezoneOffset();
  let offset_min = offset % 60;
  if (!offset_min) {
    offset_min = "00"
  }
  offset = offset / 60;
  let offsetStr = "GMT ";
  if (offset) {
    if (offset > 0) {
      offsetStr += "+";
    }
    offsetStr += offset;
    offsetStr += ":";
    offsetStr += offset_min;
  }

  return `${year} ${month} ${day} ${hour}:${minute} ${offsetStr}`;
}

/**
 * https://gist.github.com/jonleighton/958841#gistcomment-2839519
 * @param arrayBuffer
 * @returns {string}
 */

let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Use a lookup table to find the index.
let lookup = new Uint8Array(256);
for (let i = 0; i < chars.length; i++) {
  lookup[chars.charCodeAt(i)] = i;
}

arrayBufferToBase64 = (arrayBuffer) => {
  let bytes = new Uint8Array(arrayBuffer),
    i, len = bytes.length, base64 = "";

  for (i = 0; i < len; i += 3) {
    base64 += chars[bytes[i] >> 2];
    base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    base64 += chars[bytes[i + 2] & 63];
  }

  if ((len % 3) === 2) {
    base64 = base64.substring(0, base64.length - 1) + "=";
  } else if (len % 3 === 1) {
    base64 = base64.substring(0, base64.length - 2) + "==";
  }

  return base64;
}

/**
 * @param base64
 * @returns {ArrayBuffer}
 */
base64ToArrayBuffer = (base64) => {
  let bufferLength = base64.length * 0.75,
    len = base64.length, i, p = 0,
    encoded1, encoded2, encoded3, encoded4;

  if (base64[base64.length - 1] === "=") {
    bufferLength--;
    if (base64[base64.length - 2] === "=") {
      bufferLength--;
    }
  }

  let arraybuffer = new ArrayBuffer(bufferLength),
    bytes = new Uint8Array(arraybuffer);

  for (i = 0; i < len; i += 4) {
    encoded1 = lookup[base64.charCodeAt(i)];
    encoded2 = lookup[base64.charCodeAt(i + 1)];
    encoded3 = lookup[base64.charCodeAt(i + 2)];
    encoded4 = lookup[base64.charCodeAt(i + 3)];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }

  return arraybuffer;
};

const bytesToBase64 = (bytes) => {
  const base64abc = [
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
    "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
    "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "/"
  ];

  let result = '', i, l = bytes.length;
  for (i = 2; i < l; i += 3) {
    result += base64abc[bytes[i - 2] >> 2];
    result += base64abc[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)];
    result += base64abc[((bytes[i - 1] & 0x0F) << 2) | (bytes[i] >> 6)];
    result += base64abc[bytes[i] & 0x3F];
  }
  if (i === l + 1) { // 1 octet yet to write
    result += base64abc[bytes[i - 2] >> 2];
    result += base64abc[(bytes[i - 2] & 0x03) << 4];
    result += "==";
  }
  if (i === l) { // 2 octets yet to write
    result += base64abc[bytes[i - 2] >> 2];
    result += base64abc[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)];
    result += base64abc[(bytes[i - 1] & 0x0F) << 2];
    result += "=";
  }
  return result;
}

function getImageAsBase64(imageData) {
  if (typeof imageData === "string") {
    return imageData;
  }
  if (!(imageData instanceof Uint8Array)) {
    imageData = new Uint8Array(imageData);
  }
  let base64Image = bytesToBase64(imageData);
  base64Image = `data:image/png;base64, ${base64Image}`;
  return base64Image;
}

const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * converts date from ISO (YYYY-MM-DD) to YYYY-HM, where HM comes from human name for the month, i.e. 2021-DECEMBER
 * @param {string} dateString
 */
function convertFromISOtoYYYY_HM(dateString, useFullMonthName, separator) {
  const splitDate = dateString.split('-');
  const month = parseInt(splitDate[1]);
  let separatorString = "-";
  if (typeof separator !== "undefined") {
    separatorString = separator;
  }
  if (useFullMonthName) {
    return `${splitDate[2]} ${separatorString} ${monthNames[month - 1]} ${separatorString} ${splitDate[0]}`;
  }
  return `${splitDate[2]} ${separatorString} ${monthNames[month - 1].slice(0, 3)} ${separatorString} ${splitDate[0]}`;
}

function convertFromGS1DateToYYYY_HM(gs1DateString) {
  let year = "20" + gs1DateString.slice(0, 2);
  let month = gs1DateString.slice(2, 4);
  let day = gs1DateString.slice(4);
  return `${day} - ${monthNames[month - 1].slice(0, 3)} - ${year}`
}

function getTimeSince(date) {

  let seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let month = new Date(date).getMonth() + 1;
  let monthSeconds = 31 * 24 * 60 * 60;
  if (month === 2) {
    monthSeconds = 28 * 24 * 60 * 60;
  }
  if ([4, 6, 9, 11].includes(month)) {
    monthSeconds = 30 * 24 * 60 * 60;
  }

  if (seconds > monthSeconds) {
    return
  }
  let interval = seconds / (24 * 60 * 60);
  if (interval >= 1) {
    return Math.floor(interval) + (interval >= 2 ? " days" : " day");
  }
  interval = seconds / (60 * 60);
  if (interval >= 1) {
    return Math.floor(interval) + (interval >= 2 ? " hours" : " hour");
  }
  interval = seconds / 60;
  if (interval >= 1) {
    return Math.floor(interval) + (interval >= 2 ? " minutes" : " minute");
  }
  return seconds + (seconds >= 2 ? " seconds" : " second");
}

function getDateForDisplay(date) {
  if (date.slice(0, 2) === "00") {
    return date.slice(5);
  }
  return date;
}

function getRecordPKey(gtinSSI, gs1Fields) {
  if (typeof gtinSSI !== "string") {
    gtinSSI = gtinSSI.getIdentifier();
  }
  return `${gtinSSI}${gs1Fields.batchNumber || "-"}|${gs1Fields.serialNumber}|${gs1Fields.expiry}`;
}

let productPrefix = "p_";
let batchPrefix = "b_";
let separator = " | ";
function getBatchMetadataPK(productCode, batch) {
  return `${productPrefix}${productCode}${separator}${batchPrefix}${batch}`;
}

function getDataFromBatchMetadataPK(batchMetadataPK){
  let result = {};
  let parts = batchMetadataPK.split(separator);
  if(parts){
    for(let part of parts){
      if(part.indexOf(productPrefix) !== -1){
        result.productCode = part.replace(productPrefix, "");
        continue;
      }
      if(part.indexOf(batchPrefix) !== -1){
        result.batch = part.replace(batchPrefix, "");
      }
    }
  }

  return result;
}

//convert date to last date of the month for 00 date
function convertToLastMonthDay(date) {
  let expireDateConverted = date.replace("00", "01");
  expireDateConverted = new Date(expireDateConverted.replaceAll(' ', ''));
  expireDateConverted.setFullYear(expireDateConverted.getFullYear(), expireDateConverted.getMonth() + 1, 0);
  expireDateConverted = expireDateConverted.getTime();
  return expireDateConverted;
}


module.exports = {
  base64ToArrayBuffer,
  arrayBufferToBase64,
  convertDateTOGMTFormat,
  getBloomFilterSerialisation,
  getImageAsBase64,
  bytesToBase64,
  convertFromISOtoYYYY_HM,
  convertFromGS1DateToYYYY_HM,
  getRecordPKey,
  getDateForDisplay,
  convertToLastMonthDay,
  getTimeSince,
  getBatchMetadataPK,
  getDataFromBatchMetadataPK
}
