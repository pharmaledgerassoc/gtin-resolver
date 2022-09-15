module.exports = {
  VALID_SERIAL_NUMBER_TYPE: "valid",
  RECALLED_SERIAL_NUMBER_TYPE: "recalled",
  DECOMMISSIONED_SERIAL_NUMBER_TYPE: "decommissioned",
  PACKAGES_STORAGE_PATH: "/app/data/packages.json",
  LANGUAGES_STORAGE_PATH: "/app/data/languages.json",
  DATA_STORAGE_PATH: "/app/data",
  PRODUCTS_TABLE: "products",
  LOGS_TABLE: "logs",
  SERIAL_NUMBERS_LOGS_TABLE: "serial_numbers_logs",
  PRODUCT_KEYSSI_STORAGE_TABLE: "productKeySSIs",
  BATCHES_STORAGE_TABLE: "batches",
  EPI_PROTOCOL_VERSION: "v1",
  PRODUCT_DSU_MOUNT_POINT: "/product",
  BATCH_DSU_MOUNT_POINT: "/batch",
  BATCH_STORAGE_FILE: "/batch.epi_v",
  PRODUCT_STORAGE_FILE: "/product.epi_v",
  PRODUCT_IMAGE_FILE: "/image.png",
  HISTORY_ITEM_DEFAULT_ICON: "./assets/icons/product_image_placeholder.svg",
  LEAFLET_ATTACHMENT_FILE: "/leaflet.xml",
  SMPC_ATTACHMENT_FILE: "/smpc.xml",
  XSL_PATH: "./leaflet.xsl",
  IMPORT_LOGS: "import-logs",
  SUCCESS_MAPPING_STATUS: "success",
  FAILED_MAPPING_STATUS: "failed",
  MISSING_PRODUCT_DSU: "Missing Product DSU",
  DSU_LOAD_FAIL: "Something went wrong. Could not load DSU",
  MISSING_BATCH_DSU: "Missing Batch DSU",
  MISSING_PRODUCT_VERSION: "Missing Product Version",
  ANCHOR_CHECK_TIMEOUT: 15000,
  MESSAGE_TYPES: {
    PRODUCT: "Product",
    BATCH: "Batch",
    PRODUCT_PHOTO: "ProductPhoto",
    LEAFLET: "leaflet",
    SMPC: "smpc",
    VIDEO_SOURCE: "VideoSource"
  },
  LOG_TYPES: {
    PRODUCT: "PRODUCT_LOG",
    BATCH: "BATCH_LOG",
    PRODUCT_PHOTO: "PRODUCT_PHOTO_LOG",
    LEAFLET_LOG: "LEAFLET_LOG",
    VIDEO_SOURCE: "VIDEO_LOG",
    FAILED_ACTION: "FAILED_LOG"
  },
  DISABLED_FEATURES_MAP: {
    "01": {
      modelProperties: ["patientLeafletInfo"],
      description: "Patient leaflet"
    },
    "02": {
      modelProperties: ["expiredDateCheck"],
      description: "Show leaflet if batch expired"
    },
    "04": {
      modelProperties: ["practitionerInfo"],
      description: "Healthcare practitioner info"
    },
    "05": {
      modelProperties: ["videos"],
      description: "Video source"
    },
    "06": {
      modelProperties: ["adverseEventsReportingEnabled"],
      description: "Adverse Events reporting"
    },
    "07": {
      modelProperties: ["hasAcdcAuthFeature", "authFeatureFieldModel", "serialCheck"],
      description: "Anti-counterfeiting functions"
    },
    "08": {
      modelProperties: ["recalled"],
      description: "Recall functions"
    },
    "09": {
      modelProperties: ["defaultMessage"],
      description: "Batch message"
    }
  }
}
