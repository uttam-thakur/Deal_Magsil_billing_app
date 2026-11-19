const FOLDER_NAME = "Deal Magsil Billing";
const STAMP_NAME = "deal-magsil-stamp";

const INITIAL_ADMIN_USERNAME = "admin";

const INITIAL_ADMIN_PASSWORD_HASH =
  "14bd6bbc0615236c3f8b3c63df4aafa7587bec300159e7b9b03d21bfb045ae83";
// DealMagsil@123
const SESSION_TTL_SECONDS = 21600;

const PROP_SPREADSHEET_ID = "DEAL_MAGSIL_SPREADSHEET_ID";

const HEADERS = {
  Users: [
    "id",
    "username",
    "passwordHash",
    "createdAt",
    "updatedAt",
  ],

  Company: [
    "key",
    "value",
  ],

  Products: [
    "id",
    "name",
    "hsn",
    "unit",
    "rate",
    "gstRate",
    "category",
    "active",
  ],

  Customers: [
    "id",
    "name",
    "address",
    "contact",
    "gstin",
    "state",
    "stateCode",
  ],

  Invoices: [
    "id",
    "invoiceNo",
    "date",
    "mode",
    "taxMode",
    "buyerSameAsConsignee",
    "paymentStatus",
    "createdAt",
    "metaJson",
    "buyerJson",
    "consigneeJson",
    "itemsJson",
    "roundOff",
  ],

  Ledger: [
    "id",
    "date",
    "type",
    "customerId",
    "customerName",
    "invoiceId",
    "invoiceNo",
    "itemSummary",
    "debit",
    "credit",
    "amount",
    "balance",
    "status",
    "paymentMode",
    "reference",
    "notes",
    "createdAt",
  ],

  InventoryItems: [
    "id",
    "name",
    "type",
    "category",
    "unit",
    "openingStock",
    "minStock",
    "costRate",
    "location",
    "supplier",
    "batchNo",
    "linkedProductId",
    "active",
    "notes",
    "createdAt",
  ],

  InventoryTransactions: [
    "id",
    "date",
    "itemId",
    "itemName",
    "itemType",
    "transactionType",
    "quantity",
    "unit",
    "rate",
    "referenceNo",
    "source",
    "party",
    "batchNo",
    "location",
    "notes",
    "createdAt",
  ],

  Production: [
    "id",
    "date",
    "outputItemId",
    "outputItemName",
    "outputQuantity",
    "unit",
    "batchNo",
    "referenceNo",
    "notes",
    "rawMaterialsJson",
    "createdAt",
  ],

  Leads: [
    "id",
    "leadDate",
    "source",
    "sourceDetail",
    "customerName",
    "phone",
    "whatsapp",
    "email",
    "address",
    "sitePlace",
    "leadType",
    "productInterest",
    "requirement",
    "expectedQuantity",
    "estimatedValue",
    "status",
    "priority",
    "nextFollowUpDate",
    "remarks",
    "lostReason",
    "convertedInvoiceNo",
    "createdAt",
    "updatedAt",
  ],

  ServiceProviders: ["id", "name", "category", "phone", "alternatePhone", "address", "serviceDetails", "vehicleNumber", "rate", "paymentTerms", "notes", "active", "createdAt", "updatedAt"],

  Purchases: ["id", "date", "itemName", "category", "quantity", "unit", "unitPrice", "totalAmount", "paidAmount", "supplierName", "supplierPhone", "invoiceNumber", "paymentStatus", "paymentMode", "remarks", "createdAt", "updatedAt"],

  Workers: [
    "id",
    "name",
    "phone",
    "type",
    "role",
    "wageType",
    "wageRate",
    "joiningDate",
    "active",
    "notes",
    "createdAt",
  ],

  Attendance: [
    "id",
    "date",
    "workerId",
    "workerName",
    "workerType",
    "status",
    "inTime",
    "outTime",
    "breakMinutes",
    "totalHours",
    "overtimeHours",
    "site",
    "remarks",
    "createdAt",
    "updatedAt",
  ],
};


/* =========================================================
   GET
========================================================= */

function doGet(e) {
  try {
    const p = e && e.parameter ? e.parameter : {};

    const result = routeGet_(p);

    return jsonp_(result, p.callback);
  } catch (err) {
    return jsonp_(
      {
        ok: false,
        error: String(
          err && err.message
            ? err.message
            : err
        ),
      },
      e && e.parameter
        ? e.parameter.callback
        : ""
    );
  }
}


/* =========================================================
   POST
========================================================= */

function doPost(e) {
  const p = e && e.parameter ? e.parameter : {};

  const requestId = String(
    p.requestId || ""
  );

  try {
    const result = routePost_(p);

    if (requestId) {
      CacheService
        .getScriptCache()
        .put(
          "mutation:" + requestId,
          JSON.stringify({
            ok: true,
            result: result || {},
          }),
          60
        );
    }

    return jsonp_(result, "");
  } catch (err) {
    const error = String(
      err && err.message
        ? err.message
        : err
    );

    if (requestId) {
      CacheService
        .getScriptCache()
        .put(
          "mutation:" + requestId,
          JSON.stringify({
            ok: false,
            error: error,
          }),
          60
        );
    }

    return jsonp_(
      {
        ok: false,
        error: error,
      },
      ""
    );
  }
}


/* =========================================================
   GET ROUTER
========================================================= */

function routeGet_(p) {
  const action = String(
    p.action || "health"
  );

  if (action !== "login" && action !== "health") {
    const sessionUsername = requireSession_(p.token);
    if (sessionUsername === "employee" && !["mutationStatus", "nextInvoiceNumber", "bootstrap", "stamp"].includes(action)) {
      throw new Error("Access denied: employee accounts cannot access this feature.");
    }
  }

  if (action === "health") {
    return {
      ok: true,
      service: "Deal Magsil Cloud Billing",
    };
  }


  if (action === "mutationStatus") {
    requireSession_(p.token);

    const raw =
      CacheService
        .getScriptCache()
        .get(
          "mutation:" +
          String(
            p.requestId || ""
          )
        );

    return raw
      ? JSON.parse(raw)
      : {
          ok: false,
          error: "Mutation is still processing.",
        };
  }


  if (action === "login") {
    return login_(
      String(p.username || ""),
      String(p.passwordHash || "")
    );
  }


  if (action === "nextInvoiceNumber") {
    requireSession_(p.token);

    return {
      ok: true,
      invoiceNo: nextInvoiceNumber_(),
    };
  }


  if (action === "bootstrap") {
    const username =
      requireSession_(p.token);

    const data = readAll_();

    // Return only the minimum dataset needed by employee pages.
    // Company details are required for bill printing; products/customers
    // are required for billing; inventory and attendance data are allowed.
    if (username === "employee") {
      data.invoices = [];
      data.ledgerEntries = [];
      data.leads = [];
      data.serviceProviders = [];
      data.purchases = [];
    }

    data.user = {
      username: username,
      role: username === "employee" ? "employee" : "owner",
    };

    return {
      ok: true,
      data: data,
    };
  }


  if (action === "stamp") {
    requireSession_(p.token);

    return {
      ok: true,
      stamp: readStamp_(),
    };
  }

  if (action === "exportWorkbook") {
    const username = requireSession_(p.token);
    assertOwner_(username);
    return exportWorkbook_();
  }

  if (action === "listBackups") {
    const username = requireSession_(p.token);
    assertOwner_(username);
    return { ok: true, backups: listBackups_() };
  }

  throw new Error(
    "Unknown GET action: " + action
  );
}


/* =========================================================
   POST ROUTER
========================================================= */

function routePost_(p) {
  const action = String(
    p.action || ""
  );

  const sessionUsername = requireSession_(p.token);
  const employeeAllowedActions = ["saveInvoice", "saveInventoryItem", "deleteInventoryItem", "saveInventoryTransaction", "saveProduction", "saveWorker", "deleteWorker", "saveAttendance", "deleteAttendance"];
  if (sessionUsername === "employee" && !employeeAllowedActions.includes(action)) {
    throw new Error("Access denied: employee accounts cannot access this feature.");
  }

  const payload =
    decodePayload_(
      p.payload || ""
    );

  if (action === "backupNow") {
    assertOwner_(sessionUsername);
    return createBackup_("manual");
  }

  if (action === "restoreBackup") {
    assertOwner_(sessionUsername);
    return restoreBackup_(String(payload.fileId || ""));
  }

  /* -------------------------
     STAMP
  ------------------------- */

  if (action === "uploadStamp") {
    return uploadStamp_(payload);
  }


  /* -------------------------
     COMPANY
  ------------------------- */

  if (action === "saveCompany") {
    saveCompany_(
      payload.entity || payload
    );

    return {
      ok: true,
    };
  }


  /* -------------------------
     INVOICE
  ------------------------- */

  if (action === "saveInvoice") {
    saveInvoice_(
      payload.entity || payload
    );

    return {
      ok: true,
    };
  }


  if (action === "deleteInvoice") {
    deleteInvoice_(
      payload.entity &&
      payload.entity.id
        ? payload.entity.id
        : payload.id
    );

    return {
      ok: true,
    };
  }


  /* -------------------------
     PRODUCT
  ------------------------- */

  if (action === "saveProduct") {
    const result =
      saveProduct_(
        payload.entity || payload
      );

    return {
      ok: true,
      ...result,
    };
  }


  if (action === "deleteProduct") {
    deleteById_(
      "Products",
      payload.entity &&
      payload.entity.id
        ? payload.entity.id
        : payload.id
    );

    return {
      ok: true,
    };
  }


  if (action === "replaceProducts") {
    replaceProducts_(
      payload.products || []
    );

    return {
      ok: true,
    };
  }


  /* -------------------------
     CUSTOMER
  ------------------------- */

  if (action === "replaceCustomers") {
    replaceCustomers_(
      payload.customers || []
    );

    return {
      ok: true,
    };
  }


  if (action === "saveCustomer") {
    const result =
      upsertCustomer_(
        payload.entity || payload
      );

    return {
      ok: true,
      ...result,
    };
  }


  if (action === "deleteCustomer") {
    deleteById_(
      "Customers",
      payload.entity &&
      payload.entity.id
        ? payload.entity.id
        : payload.id
    );

    return {
      ok: true,
    };
  }


  /* -------------------------
     LEDGER
  ------------------------- */

  if (action === "saveLedgerEntry") {
    return saveLedgerEntry_(
      payload.entity || payload
    );
  }


  if (action === "deleteLedgerEntry") {
    deleteById_(
      "Ledger",
      payload.entity &&
      payload.entity.id
        ? payload.entity.id
        : payload.id
    );

    return {
      ok: true,
      message: "Ledger entry deleted.",
    };
  }


  /* =====================================================
     INVENTORY ITEM
     THIS IS THE IMPORTANT PART
  ===================================================== */

  if (action === "saveInventoryItem") {
    return saveInventoryItem_(
      payload.entity || payload
    );
  }


  if (action === "deleteInventoryItem") {
    deleteById_(
      "InventoryItems",
      payload.entity &&
      payload.entity.id
        ? payload.entity.id
        : payload.id
    );

    return {
      ok: true,
      message: "Inventory item deleted.",
    };
  }


  /* -------------------------
     INVENTORY TRANSACTION
  ------------------------- */

  if (
    action ===
    "saveInventoryTransaction"
  ) {
    return saveInventoryTransaction_(
      payload.entity || payload
    );
  }


  /* -------------------------
     PRODUCTION
  ------------------------- */

  if (action === "saveProduction") {
    return saveProduction_(
      payload.entity || payload
    );
  }


  /* -------------------------
     LEADS / MARKETING
  ------------------------- */

  if (action === "saveLead") {
    return saveLead_(
      payload.entity || payload
    );
  }

  if (action === "deleteLead") {
    deleteById_(
      "Leads",
      payload.entity &&
      payload.entity.id
        ? payload.entity.id
        : payload.id
    );

    return {
      ok: true,
      message: "Lead deleted.",
    };
  }


  if (action === "saveServiceProvider") return saveFlatRecord_("ServiceProviders", payload.entity || payload, "name");
  if (action === "deleteServiceProvider") { deleteById_("ServiceProviders", payload.entity && payload.entity.id ? payload.entity.id : payload.id); return { ok: true, message: "Service provider deleted." }; }
  if (action === "savePurchase") return saveFlatRecord_("Purchases", payload.entity || payload, "itemName");
  if (action === "deletePurchase") { deleteById_("Purchases", payload.entity && payload.entity.id ? payload.entity.id : payload.id); return { ok: true, message: "Purchase deleted." }; }

  /* -------------------------
     ATTENDANCE / WORKERS
  ------------------------- */

  if (action === "saveWorker") {
    const workerPayload = getEntityPayload_(payload);
    return saveWorker_(workerPayload);
  }

  if (action === "deleteWorker") {
    deleteById_(
      "Workers",
      payload.entity &&
      payload.entity.id
        ? payload.entity.id
        : payload.id
    );

    return {
      ok: true,
      message: "Worker deleted.",
    };
  }

  if (action === "saveAttendance") {
    const attendancePayload = getEntityPayload_(payload);
    return saveAttendance_(attendancePayload);
  }

  if (action === "deleteAttendance") {
    deleteById_(
      "Attendance",
      payload.entity &&
      payload.entity.id
        ? payload.entity.id
        : payload.id
    );

    return {
      ok: true,
      message: "Attendance deleted.",
    };
  }

  /* -------------------------
     PASSWORD
  ------------------------- */

  if (action === "changePassword") {
    changePassword_(
      p.token,
      payload.currentPasswordHash,
      payload.newPasswordHash
    );

    return {
      ok: true,
    };
  }


  throw new Error(
    "Unknown POST action: " + action
  );
}


/* =========================================================
   LOGIN
========================================================= */

function login_(
  username,
  passwordHash
) {
  // Dedicated employee account: password is 0341; username is not required.
  const employeePasswordHash = "5a040a181795f3a2b842a51b0cf2518ac3496cabec8f2d1dd16421e125b473bc";
  if (String(passwordHash || "").trim() === employeePasswordHash) {
    return createSession_("employee", "employee");
  }

  const ss =
    getSpreadsheet_();

  ensureSheets_(ss);

  const sheet =
    ss.getSheetByName(
      "Users"
    );


  if (sheet.getLastRow() < 2) {
    const now =
      new Date().toISOString();

    sheet.appendRow([
      Utilities.getUuid(),
      INITIAL_ADMIN_USERNAME,
      INITIAL_ADMIN_PASSWORD_HASH,
      now,
      now,
    ]);
  }


  const rows =
    getRows_(sheet);


  const user =
    rows.find(
      function (r) {
        return (
          String(
            r.username || ""
          )
            .trim()
            .toLowerCase() ===
            String(
              username || ""
            )
              .trim()
              .toLowerCase()
          &&
          String(
            r.passwordHash || ""
          )
            .trim() ===
            String(
              passwordHash || ""
            )
              .trim()
        );
      }
    );


  if (!user) {
    return {
      ok: false,
      error:
        "Invalid username or password.",
    };
  }


  return createSession_(String(user.username), "owner");
}


function createSession_(username, role) {
  const token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
  const now = Date.now();
  const session = { username: username, role: role, createdAt: now, expiresAt: now + 7 * 24 * 60 * 60 * 1000 };
  PropertiesService.getScriptProperties().setProperty("SESSION_" + token, JSON.stringify(session));
  CacheService.getScriptCache().put("session:" + token, String(username), SESSION_TTL_SECONDS);
  return { ok: true, token: token, user: { username: username, role: role } };
}

/* =========================================================
   SESSION
========================================================= */

function requireSession_(token) {
  if (!token) {
    throw new Error(
      "SESSION_EXPIRED"
    );
  }


  const key =
    "SESSION_" +
    String(token);


  const props =
    PropertiesService
      .getScriptProperties();


  const raw =
    props.getProperty(key);


  if (raw) {
    try {
      const session =
        JSON.parse(raw);


      if (
        session &&
        session.username &&
        Number(
          session.expiresAt
        ) > Date.now()
      ) {
        session.expiresAt =
          Date.now() +
          7 *
            24 *
            60 *
            60 *
            1000;


        props.setProperty(
          key,
          JSON.stringify(session)
        );


        CacheService
          .getScriptCache()
          .put(
            "session:" + token,
            String(
              session.username
            ),
            SESSION_TTL_SECONDS
          );


        return String(
          session.username
        );
      }


      props.deleteProperty(
        key
      );
    } catch (_) {
      props.deleteProperty(
        key
      );
    }
  }


  const cachedUsername =
    CacheService
      .getScriptCache()
      .get(
        "session:" + token
      );


  if (cachedUsername) {
    const session = {
      username:
        String(cachedUsername),

      createdAt:
        Date.now(),

      expiresAt:
        Date.now() +
        7 *
          24 *
          60 *
          60 *
          1000,
    };


    props.setProperty(
      key,
      JSON.stringify(session)
    );


    return String(
      cachedUsername
    );
  }


  throw new Error(
    "SESSION_EXPIRED"
  );
}


/* =========================================================
   INVOICE NUMBER
========================================================= */

function nextInvoiceNumber_() {
  const lock =
    LockService.getScriptLock();

  lock.waitLock(10000);

  try {
    const now =
      new Date();

    const month =
      now.getMonth() + 1;

    const year =
      now.getFullYear();


    const fy =
      month >= 4
        ? String(year).slice(2) +
          "-" +
          String(year + 1).slice(2)
        : String(year - 1).slice(2) +
          "-" +
          String(year).slice(2);


    const key =
      "COUNTER_" +
      fy.replace("-", "_");


    const props =
      PropertiesService
        .getScriptProperties();


    let counter =
      Number(
        props.getProperty(key) || 0
      );


    const invoiceSheet =
      getSpreadsheet_()
        .getSheetByName(
          "Invoices"
        );


    const rows =
      getRows_(invoiceSheet);


    rows.forEach(
      function (r) {
        const n =
          Number(
            String(
              r.invoiceNo || ""
            )
              .split("/")
              .pop()
          );

        if (isFinite(n)) {
          counter =
            Math.max(
              counter,
              n
            );
        }
      }
    );


    counter += 1;


    props.setProperty(
      key,
      String(counter)
    );


    return (
      "DM/" +
      fy +
      "/" +
      String(counter)
        .padStart(3, "0")
    );
  } finally {
    lock.releaseLock();
  }
}


/* =========================================================
   CHANGE PASSWORD
========================================================= */

function changePassword_(
  token,
  currentHash,
  newHash
) {
  const username =
    requireSession_(token);


  if (!newHash) {
    throw new Error(
      "New password is required."
    );
  }


  const sheet =
    getSpreadsheet_()
      .getSheetByName(
        "Users"
      );


  const rows =
    getRows_(sheet);


  const idx =
    rows.findIndex(
      function (r) {
        return (
          String(r.username) ===
          String(username)
        );
      }
    );


  if (
    idx < 0 ||
    String(
      rows[idx].passwordHash
    ) !==
      String(currentHash)
  ) {
    throw new Error(
      "Current password is incorrect."
    );
  }


  sheet
    .getRange(
      idx + 2,
      3
    )
    .setValue(
      String(newHash)
    );


  sheet
    .getRange(
      idx + 2,
      5
    )
    .setValue(
      new Date().toISOString()
    );
}


/* =========================================================
   READ ALL DATA
========================================================= */

function readAll_() {
  const ss =
    getSpreadsheet_();

  ensureSheets_(ss);


  /* -------------------------
     COMPANY
  ------------------------- */

  const company = {};

  const companyRows =
    getRows_(
      ss.getSheetByName(
        "Company"
      )
    );


  if (!companyRows.length) {
    saveCompany_(
      starterCompany_()
    );
  }


  getRows_(
    ss.getSheetByName(
      "Company"
    )
  ).forEach(
    function (r) {
      company[r.key] =
        r.value;
    }
  );


  /* -------------------------
     PRODUCTS
  ------------------------- */

  const productRows =
    getRows_(
      ss.getSheetByName(
        "Products"
      )
    );


  if (!productRows.length) {
    replaceProducts_(
      starterProducts_()
    );
  }


  const products =
    getRows_(
      ss.getSheetByName(
        "Products"
      )
    ).map(
      function (r) {
        return {
          id:
            String(r.id),

          name:
            String(r.name || ""),

          hsn:
            String(r.hsn || ""),

          unit:
            String(
              r.unit || "Pcs"
            ),

          rate:
            Number(r.rate) || 0,

          gstRate:
            Number(r.gstRate) || 0,

          category:
            String(
              r.category || ""
            ),

          active:
            String(
              r.active
            ).toLowerCase() !==
            "false",
        };
      }
    );


  /* -------------------------
     CUSTOMERS
  ------------------------- */

  const customers =
    getRows_(
      ss.getSheetByName(
        "Customers"
      )
    ).map(
      function (r) {
        return {
          id:
            String(r.id),

          name:
            String(r.name || ""),

          address:
            String(
              r.address || ""
            ),

          contact:
            String(
              r.contact || ""
            ),

          gstin:
            String(
              r.gstin || ""
            ),

          state:
            String(
              r.state || ""
            ),

          stateCode:
            String(
              r.stateCode || ""
            ),
        };
      }
    );


  /* -------------------------
     INVOICES
  ------------------------- */

  const invoices =
    getRows_(
      ss.getSheetByName(
        "Invoices"
      )
    ).map(
      function (r) {
        return {
          id:
            String(r.id),

          invoiceNo:
            String(
              r.invoiceNo || ""
            ),

          mode:
            String(
              r.mode || "GST"
            ),

          taxMode:
            String(
              r.taxMode || "INTRA"
            ),

          meta:
            parseJson_(
              r.metaJson,
              {}
            ),

          buyer:
            parseJson_(
              r.buyerJson,
              {}
            ),

          consignee:
            parseJson_(
              r.consigneeJson,
              {}
            ),

          buyerSameAsConsignee:
            String(
              r.buyerSameAsConsignee
            ).toLowerCase() ===
            "true",

          items:
            parseJson_(
              r.itemsJson,
              []
            ),

          roundOff:
            Number(
              r.roundOff
            ) || 0,

          paymentStatus:
            String(
              r.paymentStatus ||
                "Pending"
            ),

          createdAt:
            String(
              r.createdAt || ""
            ),
        };
      }
    );


  /* -------------------------
     INVENTORY ITEMS
  ------------------------- */

  const inventoryItems =
    getRows_(
      ss.getSheetByName(
        "InventoryItems"
      )
    ).map(
      function (r) {
        return {
          id:
            String(
              r.id || ""
            ),

          name:
            String(
              r.name || ""
            ),

          type:
            String(
              r.type ||
                "RAW_MATERIAL"
            ),

          category:
            String(
              r.category || ""
            ),

          unit:
            String(
              r.unit || "Kg"
            ),

          openingStock:
            Number(
              r.openingStock
            ) || 0,

          minStock:
            Number(
              r.minStock
            ) || 0,

          costRate:
            Number(
              r.costRate
            ) || 0,

          location:
            String(
              r.location || ""
            ),

          supplier:
            String(
              r.supplier || ""
            ),

          batchNo:
            String(
              r.batchNo || ""
            ),

          linkedProductId:
            String(
              r.linkedProductId || ""
            ),

          active:
            String(
              r.active
            ).toLowerCase() !==
            "false",

          notes:
            String(
              r.notes || ""
            ),

          createdAt:
            String(
              r.createdAt || ""
            ),
        };
      }
    );


  /* -------------------------
     INVENTORY TRANSACTIONS
  ------------------------- */

  const inventoryTransactions =
    getRows_(
      ss.getSheetByName(
        "InventoryTransactions"
      )
    ).map(
      function (r) {
        return {
          id:
            String(
              r.id || ""
            ),

          date:
            String(
              r.date || ""
            ),

          itemId:
            String(
              r.itemId || ""
            ),

          itemName:
            String(
              r.itemName || ""
            ),

          itemType:
            String(
              r.itemType ||
                "RAW_MATERIAL"
            ),

          transactionType:
            String(
              r.transactionType ||
                "IN"
            ),

          quantity:
            Number(
              r.quantity
            ) || 0,

          unit:
            String(
              r.unit || ""
            ),

          rate:
            Number(
              r.rate
            ) || 0,

          referenceNo:
            String(
              r.referenceNo || ""
            ),

          source:
            String(
              r.source || "Manual"
            ),

          party:
            String(
              r.party || ""
            ),

          batchNo:
            String(
              r.batchNo || ""
            ),

          location:
            String(
              r.location || ""
            ),

          notes:
            String(
              r.notes || ""
            ),

          createdAt:
            String(
              r.createdAt || ""
            ),
        };
      }
    );


  /* -------------------------
     PRODUCTION
  ------------------------- */

  const production =
    getRows_(
      ss.getSheetByName(
        "Production"
      )
    ).map(
      function (r) {
        return {
          id:
            String(
              r.id || ""
            ),

          date:
            String(
              r.date || ""
            ),

          outputItemId:
            String(
              r.outputItemId || ""
            ),

          outputItemName:
            String(
              r.outputItemName || ""
            ),

          outputQuantity:
            Number(
              r.outputQuantity
            ) || 0,

          unit:
            String(
              r.unit || ""
            ),

          batchNo:
            String(
              r.batchNo || ""
            ),

          referenceNo:
            String(
              r.referenceNo || ""
            ),

          notes:
            String(
              r.notes || ""
            ),

          rawMaterials:
            parseJson_(
              r.rawMaterialsJson,
              []
            ),

          createdAt:
            String(
              r.createdAt || ""
            ),
        };
      }
    );


  /* -------------------------
     LEADS / MARKETING
  ------------------------- */

  const leads =
    getRows_(
      ss.getSheetByName(
        "Leads"
      )
    ).map(
      function (r) {
        return {
          id: String(r.id || ""),
          leadDate: String(r.leadDate || ""),
          source: String(r.source || "Other"),
          sourceDetail: String(r.sourceDetail || ""),
          customerName: String(r.customerName || ""),
          phone: String(r.phone || ""),
          whatsapp: String(r.whatsapp || ""),
          email: String(r.email || ""),
          address: String(r.address || ""),
          sitePlace: String(r.sitePlace || ""),
          leadType: String(r.leadType || "Homeowner"),
          productInterest: String(r.productInterest || ""),
          requirement: String(r.requirement || ""),
          expectedQuantity: Number(r.expectedQuantity) || 0,
          estimatedValue: Number(r.estimatedValue) || 0,
          status: String(r.status || "New"),
          priority: String(r.priority || "Warm"),
          nextFollowUpDate: String(r.nextFollowUpDate || ""),
          remarks: String(r.remarks || ""),
          lostReason: String(r.lostReason || ""),
          convertedInvoiceNo: String(r.convertedInvoiceNo || ""),
          createdAt: String(r.createdAt || ""),
          updatedAt: String(r.updatedAt || ""),
        };
      }
    );


  /* -------------------------
     LEDGER
  ------------------------- */

  syncLedgerSales_(ss);


  const ledgerEntries =
    getRows_(
      ss.getSheetByName(
        "Ledger"
      )
    ).map(
      function (r) {
        return {
          id:
            String(
              r.id || ""
            ),

          date:
            String(
              r.date || ""
            ),

          type:
            String(
              r.type || "Receipt"
            ),

          customerId:
            String(
              r.customerId || ""
            ),

          customerName:
            String(
              r.customerName || ""
            ),

          invoiceId:
            String(
              r.invoiceId || ""
            ),

          invoiceNo:
            String(
              r.invoiceNo || ""
            ),

          itemSummary:
            String(
              r.itemSummary || ""
            ),

          debit:
            Number(
              r.debit
            ) || 0,

          credit:
            Number(
              r.credit
            ) || 0,

          amount:
            Number(
              r.amount
            ) || 0,

          balance:
            Number(
              r.balance
            ) || 0,

          status:
            String(
              r.status || "Pending"
            ),

          paymentMode:
            String(
              r.paymentMode ||
                "Cash"
            ),

          reference:
            String(
              r.reference || ""
            ),

          notes:
            String(
              r.notes || ""
            ),

          createdAt:
            String(
              r.createdAt || ""
            ),
        };
      }
    );


  /* -------------------------
     WORKERS
  ------------------------- */

  const workers =
    getRows_(
      ss.getSheetByName("Workers")
    ).map(function (r) {
      return {
        id: String(r.id || ""),
        name: String(r.name || ""),
        phone: String(r.phone || ""),
        type: String(r.type || "LABOUR"),
        role: String(r.role || ""),
        wageType: String(r.wageType || "DAILY"),
        wageRate: Number(r.wageRate) || 0,
        joiningDate: String(r.joiningDate || ""),
        active: String(r.active).toLowerCase() !== "false",
        notes: String(r.notes || ""),
        createdAt: String(r.createdAt || ""),
      };
    });

  /* -------------------------
     ATTENDANCE
  ------------------------- */

  const attendance =
    getRows_(
      ss.getSheetByName("Attendance")
    ).map(function (r) {
      return {
        id: String(r.id || ""),
        date: String(r.date || ""),
        workerId: String(r.workerId || ""),
        workerName: String(r.workerName || ""),
        workerType: String(r.workerType || "LABOUR"),
        status: String(r.status || "PRESENT"),
        inTime: String(r.inTime || ""),
        outTime: String(r.outTime || ""),
        breakMinutes: Number(r.breakMinutes) || 0,
        totalHours: Number(r.totalHours) || 0,
        overtimeHours: Number(r.overtimeHours) || 0,
        site: String(r.site || ""),
        remarks: String(r.remarks || ""),
        createdAt: String(r.createdAt || ""),
        updatedAt: String(r.updatedAt || ""),
      };
    });

  const serviceProviders = getRows_(ss.getSheetByName("ServiceProviders")).map(function(r) { return { id:String(r.id||""), name:String(r.name||""), category:String(r.category||"Other"), phone:String(r.phone||""), alternatePhone:String(r.alternatePhone||""), address:String(r.address||""), serviceDetails:String(r.serviceDetails||""), vehicleNumber:String(r.vehicleNumber||""), rate:Number(r.rate)||0, paymentTerms:String(r.paymentTerms||""), notes:String(r.notes||""), active:String(r.active).toLowerCase() !== "false", createdAt:String(r.createdAt||""), updatedAt:String(r.updatedAt||"") }; });
  const purchases = getRows_(ss.getSheetByName("Purchases")).map(function(r) { return { id:String(r.id||""), date:String(r.date||""), itemName:String(r.itemName||""), category:String(r.category||""), quantity:Number(r.quantity)||0, unit:String(r.unit||"Pcs"), unitPrice:Number(r.unitPrice)||0, totalAmount:Number(r.totalAmount)||0, paidAmount:Number(r.paidAmount)||0, supplierName:String(r.supplierName||""), supplierPhone:String(r.supplierPhone||""), invoiceNumber:String(r.invoiceNumber||""), paymentStatus:String(r.paymentStatus||"Pending"), paymentMode:String(r.paymentMode||""), remarks:String(r.remarks||""), createdAt:String(r.createdAt||""), updatedAt:String(r.updatedAt||"") }; });

  return {
    company:
      company,

    products:
      products.length
        ? products
        : starterProducts_(),

    customers:
      customers,

    invoices:
      invoices,

    ledgerEntries:
      ledgerEntries,

    inventoryItems:
      inventoryItems,

    inventoryTransactions:
      inventoryTransactions,

    production:
      production,

    leads:
      leads,

    workers:
      workers,

    attendance:
      attendance,

    serviceProviders: serviceProviders,
    purchases: purchases,

    user: {
      username: "",
    },
  };
}


function saveFlatRecord_(sheetName, entity, requiredField) {
  if (!entity || !String(entity[requiredField] || "").trim()) throw new Error(requiredField + " is required.");
  const ss = getSpreadsheet_(); ensureSheets_(ss);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error(sheetName + " sheet was not found.");
  const headers = HEADERS[sheetName];
  const id = String(entity.id || Utilities.getUuid());
  const now = new Date().toISOString();
  const rows = getRows_(sheet);
  const existingIndex = rows.findIndex(function(r) { return String(r.id || "") === id; });
  const record = Object.assign({}, entity, { id: id, updatedAt: now, createdAt: entity.createdAt || now });
  const values = headers.map(function(key) { const value = record[key]; return value === undefined || value === null ? "" : value; });
  if (existingIndex >= 0) sheet.getRange(existingIndex + 2, 1, 1, headers.length).setValues([values]); else sheet.appendRow(values);
  return { ok: true, entity: record };
}

/* =========================================================
   COMPANY
========================================================= */

function saveCompany_(entity) {
  const sheet =
    getSpreadsheet_()
      .getSheetByName(
        "Company"
      );


  const existing =
    getRows_(sheet);


  const incoming =
    entity || {};


  Object.keys(
    incoming
  ).forEach(
    function (key) {
      const value =
        incoming[key] == null
          ? ""
          : String(
              incoming[key]
            );


      const idx =
        existing.findIndex(
          function (r) {
            return (
              String(r.key) ===
              key
            );
          }
        );


      if (idx >= 0) {
        sheet
          .getRange(
            idx + 2,
            2
          )
          .setValue(
            value
          );
      } else {
        sheet.appendRow([
          key,
          value,
        ]);
      }
    }
  );
}


/* =========================================================
   SAVE INVOICE
========================================================= */

function saveInvoice_(invoice) {
  if (
    !invoice ||
    !invoice.id
  ) {
    throw new Error(
      "Invoice ID is required."
    );
  }


  const sheet =
    getSpreadsheet_()
      .getSheetByName(
        "Invoices"
      );


  const rows =
    getRows_(sheet);


  const invoiceNo =
    String(
      (
        invoice.meta &&
        invoice.meta.invoiceNo
      ) || ""
    ).trim();


  const duplicateNo =
    rows.find(
      function (r) {
        return (
          String(
            r.invoiceNo || ""
          )
            .trim()
            .toLowerCase() ===
            invoiceNo
              .toLowerCase()
          &&
          String(r.id) !==
            String(invoice.id)
        );
      }
    );


  if (duplicateNo) {
    throw new Error(
      "Invoice number already exists. Open that bill and edit it instead of creating another bill."
    );
  }


  const row = [
    invoice.id,

    invoiceNo,

    (
      invoice.meta &&
      invoice.meta.date
    ) || "",

    invoice.mode ||
      "GST",

    invoice.taxMode ||
      "INTRA",

    String(
      !!invoice.buyerSameAsConsignee
    ),

    invoice.paymentStatus ||
      "Pending",

    invoice.createdAt ||
      new Date().toISOString(),

    JSON.stringify(
      invoice.meta || {}
    ),

    JSON.stringify(
      invoice.buyer || {}
    ),

    JSON.stringify(
      invoice.consignee || {}
    ),

    JSON.stringify(
      invoice.items || []
    ),

    Number(
      invoice.roundOff
    ) || 0,
  ];


  const idx =
    rows.findIndex(
      function (r) {
        return (
          String(r.id) ===
          String(invoice.id)
        );
      }
    );


  if (idx >= 0) {
    sheet
      .getRange(
        idx + 2,
        1,
        1,
        row.length
      )
      .setValues([
        row,
      ]);
  } else {
    sheet.appendRow(row);
  }


  syncInvoiceInventory_(
    getSpreadsheet_(),
    invoice
  );
}


/* =========================================================
   SAVE PRODUCT
========================================================= */

function saveProduct_(product) {
  if (
    !product ||
    !String(
      product.name || ""
    ).trim()
  ) {
    throw new Error(
      "Product name is required."
    );
  }


  const sheet =
    getSpreadsheet_()
      .getSheetByName(
        "Products"
      );


  const rows =
    getRows_(sheet);


  const name =
    String(
      product.name || ""
    )
      .trim()
      .toLowerCase();


  const hsn =
    String(
      product.hsn || ""
    )
      .trim()
      .toLowerCase();


  const duplicate =
    rows.find(
      function (r) {
        return (
          String(r.id) !==
            String(product.id) &&
          String(
            r.name || ""
          )
            .trim()
            .toLowerCase() ===
            name &&
          String(
            r.hsn || ""
          )
            .trim()
            .toLowerCase() ===
            hsn
        );
      }
    );


  if (duplicate) {
    throw new Error(
      "A product with the same name and HSN already exists."
    );
  }


  const id =
    String(
      product.id ||
        Utilities.getUuid()
    );


  const row = [
    id,

    String(
      product.name || ""
    ).trim(),

    String(
      product.hsn || ""
    ),

    String(
      product.unit || "Pcs"
    ),

    Number(
      product.rate
    ) || 0,

    Number(
      product.gstRate
    ) || 0,

    String(
      product.category || ""
    ),

    String(
      product.active !== false
    ),
  ];


  const idx =
    rows.findIndex(
      function (r) {
        return (
          String(r.id) ===
          id
        );
      }
    );


  if (idx >= 0) {
    sheet
      .getRange(
        idx + 2,
        1,
        1,
        row.length
      )
      .setValues([
        row,
      ]);
  } else {
    sheet.appendRow(row);
  }


  return {
    id: id,
    product: {
      ...product,
      id: id,
    },
  };
}


/* =========================================================
   SAVE INVENTORY ITEM
   THIS FIXES YOUR ERROR
========================================================= */

function saveInventoryItem_(item) {

  if (
    !item ||
    !String(
      item.name || ""
    ).trim()
  ) {
    throw new Error(
      "Inventory material/product name is required."
    );
  }


  const ss =
    getSpreadsheet_();


  const sheet =
    ss.getSheetByName(
      "InventoryItems"
    );


  if (!sheet) {
    throw new Error(
      "InventoryItems sheet was not found."
    );
  }


  const rows =
    getRows_(sheet);


  const id =
    String(
      item.id ||
        Utilities.getUuid()
    );


  const name =
    String(
      item.name || ""
    )
      .trim()
      .toLowerCase();


  const type =
    String(
      item.type ||
        "RAW_MATERIAL"
    );


  const duplicate =
    rows.find(
      function (r) {

        return (
          String(r.id) !== id &&

          String(
            r.name || ""
          )
            .trim()
            .toLowerCase() ===
            name &&

          String(
            r.type ||
              "RAW_MATERIAL"
          ) === type
        );

      }
    );


  if (duplicate) {
    throw new Error(
      "This inventory material/product already exists."
    );
  }


  const createdAt =
    String(
      item.createdAt ||
        new Date().toISOString()
    );


  const row = [

    id,

    String(
      item.name || ""
    ).trim(),

    type,

    String(
      item.category || ""
    ),

    String(
      item.unit || "Kg"
    ),

    Number(
      item.openingStock
    ) || 0,

    Number(
      item.minStock
    ) || 0,

    Number(
      item.costRate
    ) || 0,

    String(
      item.location || ""
    ),

    String(
      item.supplier || ""
    ),

    String(
      item.batchNo || ""
    ),

    String(
      item.linkedProductId || ""
    ),

    String(
      item.active !== false
    ),

    String(
      item.notes || ""
    ),

    createdAt,
  ];


  const idx =
    rows.findIndex(
      function (r) {
        return (
          String(r.id) ===
          id
        );
      }
    );


  if (idx >= 0) {

    sheet
      .getRange(
        idx + 2,
        1,
        1,
        row.length
      )
      .setValues([
        row,
      ]);

  } else {

    sheet.appendRow(
      row
    );

  }


  return {
    ok: true,

    message:
      idx >= 0
        ? "Inventory item updated."
        : "Inventory item saved.",

    item: {
      ...item,

      id: id,

      name:
        String(
          item.name || ""
        ).trim(),

      type: type,

      unit:
        String(
          item.unit || "Kg"
        ),

      openingStock:
        Number(
          item.openingStock
        ) || 0,

      minStock:
        Number(
          item.minStock
        ) || 0,

      costRate:
        Number(
          item.costRate
        ) || 0,

      active:
        item.active !== false,

      createdAt:
        createdAt,
    },
  };
}


/* =========================================================
   SAVE INVENTORY TRANSACTION
========================================================= */

function saveInventoryTransaction_(tx) {

  if (
    !tx ||
    !tx.itemId
  ) {
    throw new Error(
      "Inventory material is required."
    );
  }


  const qty =
    Number(
      tx.quantity
    ) || 0;


  const movementType =
    String(
      tx.transactionType ||
        "IN"
    );


  if (
    movementType ===
    "ADJUSTMENT"
  ) {

    if (qty === 0) {
      throw new Error(
        "Adjustment quantity cannot be zero."
      );
    }

  } else if (
    qty <= 0
  ) {

    throw new Error(
      "Quantity must be greater than zero."
    );

  }


  const ss =
    getSpreadsheet_();


  const itemRows =
    getRows_(
      ss.getSheetByName(
        "InventoryItems"
      )
    );


  const item =
    itemRows.find(
      function (r) {
        return (
          String(r.id) ===
          String(tx.itemId)
        );
      }
    );


  if (!item) {
    throw new Error(
      "Inventory material was not found."
    );
  }


  if (
    movementType ===
    "OUT"
  ) {

    const available =
      inventoryStock_(
        ss,
        String(
          tx.itemId
        )
      );


    if (
      qty >
      available +
        0.000001
    ) {
      throw new Error(
        "Insufficient stock. Available: " +
          available.toFixed(3) +
          " " +
          String(
            item.unit || ""
          )
      );
    }
  }


  const sheet =
    ss.getSheetByName(
      "InventoryTransactions"
    );


  const rows =
    getRows_(sheet);


  const id =
    String(
      tx.id ||
        Utilities.getUuid()
    );


  const row = [

    id,

    String(
      tx.date ||
        new Date()
          .toISOString()
          .slice(0, 10)
    ),

    String(item.id),

    String(
      item.name || ""
    ),

    String(
      item.type ||
        "RAW_MATERIAL"
    ),

    movementType,

    qty,

    String(
      item.unit ||
        tx.unit ||
        ""
    ),

    Number(
      tx.rate
    ) || 0,

    String(
      tx.referenceNo || ""
    ),

    String(
      tx.source ||
        "Manual"
    ),

    String(
      tx.party || ""
    ),

    String(
      tx.batchNo ||
        item.batchNo ||
        ""
    ),

    String(
      tx.location ||
        item.location ||
        ""
    ),

    String(
      tx.notes || ""
    ),

    String(
      tx.createdAt ||
        new Date().toISOString()
    ),
  ];


  const idx =
    rows.findIndex(
      function (r) {
        return (
          String(r.id) ===
          id
        );
      }
    );


  if (idx >= 0) {

    sheet
      .getRange(
        idx + 2,
        1,
        1,
        row.length
      )
      .setValues([
        row,
      ]);

  } else {

    sheet.appendRow(
      row
    );

  }


  return {
    ok: true,

    transaction: {
      ...tx,

      id: id,

      itemName:
        String(
          item.name || ""
        ),

      itemType:
        String(
          item.type ||
            "RAW_MATERIAL"
        ),

      unit:
        String(
          item.unit || ""
        ),

      quantity:
        qty,
    },
  };
}


/* =========================================================
   INVENTORY STOCK
========================================================= */

function inventoryStock_(
  ss,
  itemId
) {

  const itemRows =
    getRows_(
      ss.getSheetByName(
        "InventoryItems"
      )
    );


  const item =
    itemRows.find(
      function (r) {
        return (
          String(r.id) ===
          String(itemId)
        );
      }
    );


  if (!item) {
    return 0;
  }


  const transactions =
    getRows_(
      ss.getSheetByName(
        "InventoryTransactions"
      )
    );


  return (
    Number(
      item.openingStock
    ) || 0
  ) +
    transactions
      .filter(
        function (r) {
          return (
            String(r.itemId) ===
            String(itemId)
          );
        }
      )
      .reduce(
        function (
          sum,
          r
        ) {

          const type =
            String(
              r.transactionType ||
                "IN"
            );


          const q =
            Number(
              r.quantity
            ) || 0;


          if (
            type ===
            "OUT"
          ) {
            return (
              sum - q
            );
          }


          if (
            type ===
            "ADJUSTMENT"
          ) {
            return (
              sum + q
            );
          }


          return (
            sum + q
          );

        },
        0
      );
}


/* =========================================================
   PRODUCTION
========================================================= */

function saveProduction_(
  production
) {

  if (
    !production ||
    !production.outputItemId
  ) {
    throw new Error(
      "Finished product is required."
    );
  }


  const outputQty =
    Number(
      production.outputQuantity
    ) || 0;


  if (
    outputQty <= 0
  ) {
    throw new Error(
      "Production output quantity must be greater than zero."
    );
  }


  const ss =
    getSpreadsheet_();


  const itemRows =
    getRows_(
      ss.getSheetByName(
        "InventoryItems"
      )
    );


  const output =
    itemRows.find(
      function (r) {
        return (
          String(r.id) ===
          String(
            production.outputItemId
          )
        );
      }
    );


  if (
    !output ||
    String(
      output.type
    ) !==
      "FINISHED_PRODUCT"
  ) {
    throw new Error(
      "Finished product was not found."
    );
  }


  const raw =
    Array.isArray(
      production.rawMaterials
    )
      ? production.rawMaterials
      : [];


  if (!raw.length) {
    throw new Error(
      "Add at least one raw material."
    );
  }


  raw.forEach(
    function (r) {

      const item =
        itemRows.find(
          function (x) {
            return (
              String(x.id) ===
              String(r.itemId)
            );
          }
        );


      const q =
        Number(
          r.quantity
        ) || 0;


      if (
        !item ||
        String(
          item.type
        ) !==
          "RAW_MATERIAL"
      ) {
        throw new Error(
          "Invalid raw material in production."
        );
      }


      if (q <= 0) {
        throw new Error(
          "Raw material quantity must be greater than zero."
        );
      }


      const available =
        inventoryStock_(
          ss,
          String(
            r.itemId
          )
        );


      if (
        q >
        available +
          0.000001
      ) {
        throw new Error(
          "Insufficient stock for " +
            String(
              item.name
            ) +
            ". Available: " +
            available.toFixed(
              3
            ) +
            " " +
            String(
              item.unit || ""
            )
        );
      }

    }
  );


  const lock =
    LockService
      .getScriptLock();


  lock.waitLock(
    10000
  );


  try {

    const productionId =
      String(
        production.id ||
          Utilities.getUuid()
      );


    const createdAt =
      String(
        production.createdAt ||
          new Date().toISOString()
      );


    const txSheet =
      ss.getSheetByName(
        "InventoryTransactions"
      );


    const now =
      new Date().toISOString();


    /* -------------------------
       OUTPUT STOCK IN
    ------------------------- */

    txSheet.appendRow([
      Utilities.getUuid(),

      String(
        production.date ||
          now.slice(0, 10)
      ),

      String(output.id),

      String(
        output.name || ""
      ),

      "FINISHED_PRODUCT",

      "IN",

      outputQty,

      String(
        output.unit ||
          production.unit ||
          ""
      ),

      Number(
        output.costRate
      ) || 0,

      String(
        production.referenceNo ||
          productionId
      ),

      "Production",

      "",

      String(
        production.batchNo || ""
      ),

      String(
        output.location || ""
      ),

      "Production output",

      now,
    ]);


    /* -------------------------
       RAW MATERIAL STOCK OUT
    ------------------------- */

    raw.forEach(
      function (r) {

        const item =
          itemRows.find(
            function (x) {
              return (
                String(x.id) ===
                String(r.itemId)
              );
            }
          );


        txSheet.appendRow([
          Utilities.getUuid(),

          String(
            production.date ||
              now.slice(0, 10)
          ),

          String(item.id),

          String(
            item.name || ""
          ),

          "RAW_MATERIAL",

          "OUT",

          Number(
            r.quantity
          ) || 0,

          String(
            item.unit ||
              r.unit ||
              ""
          ),

          Number(
            item.costRate
          ) || 0,

          String(
            production.referenceNo ||
              productionId
          ),

          "Production Consumption",

          "",

          String(
            production.batchNo ||
              ""
          ),

          String(
            item.location ||
              ""
          ),

          "Consumed for " +
            String(
              output.name || ""
            ),

          now,
        ]);

      }
    );


    /* -------------------------
       PRODUCTION RECORD
    ------------------------- */

    const pSheet =
      ss.getSheetByName(
        "Production"
      );


    pSheet.appendRow([
      productionId,

      String(
        production.date ||
          now.slice(0, 10)
      ),

      String(output.id),

      String(
        output.name || ""
      ),

      outputQty,

      String(
        output.unit ||
          production.unit ||
          ""
      ),

      String(
        production.batchNo || ""
      ),

      String(
        production.referenceNo ||
          productionId
      ),

      String(
        production.notes || ""
      ),

      JSON.stringify(
        raw
      ),

      createdAt,
    ]);


    return {
      ok: true,

      production: {
        ...production,

        id:
          productionId,

        outputItemName:
          String(
            output.name || ""
          ),

        unit:
          String(
            output.unit || ""
          ),
      },
    };

  } finally {

    lock.releaseLock();

  }
}


/* =========================================================
   SYNC INVOICE INVENTORY
========================================================= */

function syncInvoiceInventory_(
  ss,
  invoice
) {

  const txSheet =
    ss.getSheetByName(
      "InventoryTransactions"
    );


  const txRows =
    getRows_(
      txSheet
    );


  const sourceRef =
    "Invoice:" +
    String(
      invoice.id || ""
    );


  const inventoryItems =
    getRows_(
      ss.getSheetByName(
        "InventoryItems"
      )
    );


  const invoiceItems =
    Array.isArray(
      invoice.items
    )
      ? invoice.items
      : [];


  const previousByItem =
    {};


  txRows.forEach(
    function (r) {

      if (
        String(
          r.source
        ) ===
          "Invoice Sale" &&
        String(
          r.referenceNo
        ) ===
          sourceRef
      ) {

        const id =
          String(
            r.itemId || ""
          );


        previousByItem[id] =
          (
            previousByItem[id] ||
            0
          ) +
          (
            Number(
              r.quantity
            ) || 0
          );
      }

    }
  );


  const requiredByItem =
    {};


  invoiceItems.forEach(
    function (line) {

      const productId =
        String(
          line.productId ||
            ""
        );


      const inv =
        inventoryItems.find(
          function (i) {

            return (
              productId &&
              String(
                i.linkedProductId ||
                  ""
              ) ===
                productId &&
              String(
                i.type
              ) ===
                "FINISHED_PRODUCT"
            );

          }
        );


      if (!inv) {
        return;
      }


      const q =
        Number(
          line.quantity
        ) || 0;


      if (q > 0) {

        requiredByItem[
          String(inv.id)
        ] =
          (
            requiredByItem[
              String(inv.id)
            ] || 0
          ) + q;

      }

    }
  );


  Object.keys(
    requiredByItem
  ).forEach(
    function (itemId) {

      const available =
        inventoryStock_(
          ss,
          itemId
        ) +
        (
          previousByItem[
            itemId
          ] || 0
        );


      if (
        requiredByItem[
          itemId
        ] >
        available +
          0.000001
      ) {

        const inv =
          inventoryItems.find(
            function (i) {
              return (
                String(i.id) ===
                itemId
              );
            }
          );


        throw new Error(
          "Insufficient stock for " +
            String(
              inv
                ? inv.name
                : "finished product"
            ) +
            ". Available: " +
            available.toFixed(
              3
            ) +
            " " +
            String(
              inv
                ? inv.unit
                : ""
            )
        );
      }

    }
  );


  /* -------------------------
     REMOVE OLD TRANSACTIONS
  ------------------------- */

  for (
    let idx =
      txRows.length - 1;
    idx >= 0;
    idx--
  ) {

    const r =
      txRows[idx];


    if (
      String(
        r.source
      ) ===
        "Invoice Sale" &&
      String(
        r.referenceNo
      ) ===
        sourceRef
    ) {

      txSheet.deleteRow(
        idx + 2
      );

    }
  }


  /* -------------------------
     ADD NEW TRANSACTIONS
  ------------------------- */

  invoiceItems.forEach(
    function (line) {

      const productId =
        String(
          line.productId ||
            ""
        );


      const inv =
        inventoryItems.find(
          function (i) {

            return (
              productId &&
              String(
                i.linkedProductId ||
                  ""
              ) ===
                productId &&
              String(
                i.type
              ) ===
                "FINISHED_PRODUCT"
            );

          }
        );


      if (!inv) {
        return;
      }


      const q =
        Number(
          line.quantity
        ) || 0;


      if (q <= 0) {
        return;
      }


      txSheet.appendRow([
        Utilities.getUuid(),

        String(
          (
            invoice.meta &&
            invoice.meta.date
          ) ||
            new Date()
              .toISOString()
              .slice(0, 10)
        ),

        String(inv.id),

        String(
          inv.name || ""
        ),

        "FINISHED_PRODUCT",

        "OUT",

        q,

        String(
          inv.unit ||
            line.unit ||
            ""
        ),

        Number(
          line.costPrice ||
            inv.costRate
        ) || 0,

        sourceRef,

        "Invoice Sale",

        String(
          (
            invoice.buyer &&
            invoice.buyer.name
          ) || ""
        ),

        "",

        String(
          inv.location || ""
        ),

        "Automatic stock deduction from bill " +
          String(
            (
              invoice.meta &&
              invoice.meta.invoiceNo
            ) || ""
          ),

        new Date().toISOString(),
      ]);

    }
  );
}


/* =========================================================
   SAVE LEDGER ENTRY
========================================================= */

function saveLedgerEntry_(
  entry
) {

  if (
    !entry ||
    !String(
      entry.customerName || ""
    ).trim()
  ) {
    throw new Error(
      "Customer is required for a ledger receipt."
    );
  }


  const amount =
    Number(
      entry.amount
    ) || 0;


  if (amount <= 0) {
    throw new Error(
      "Receipt amount must be greater than zero."
    );
  }


  const ss =
    getSpreadsheet_();


  const sheet =
    ss.getSheetByName(
      "Ledger"
    );


  const rows =
    getRows_(sheet);


  const id =
    String(
      entry.id ||
        Utilities.getUuid()
    );


  // Manual debtor balances are stored in the same Ledger sheet without
  // requiring an invoice in the Invoices sheet.
  if (String(entry.type || "Receipt") === "Manual Due") {
    const manualRow = [
      id,
      String(entry.date || new Date().toISOString().slice(0, 10)),
      "Manual Due",
      String(entry.customerId || ""),
      String(entry.customerName || "").trim(),
      "",
      String(entry.invoiceNo || "Manual entry"),
      String(entry.itemSummary || ""),
      amount,
      0,
      amount,
      amount,
      "Pending",
      String(entry.paymentMode || "Other"),
      String(entry.reference || ""),
      String(entry.notes || ""),
      String(entry.createdAt || new Date().toISOString())
    ];
    const existingIndex = rows.findIndex(function (r) { return String(r.id) === id; });
    if (existingIndex >= 0) {
      sheet.getRange(existingIndex + 2, 1, 1, manualRow.length).setValues([manualRow]);
    } else {
      sheet.appendRow(manualRow);
    }
    return { success: true, id: id };
  }


  // Receipts for manually entered debtor balances use invoiceId="manual:<due-id>".
  // Keep these receipts separate from the original Manual Due principal so that
  // collecting ₹50 against a ₹500 due leaves ₹450 outstanding.
  const linkedId = String(entry.invoiceId || "");
  if (String(entry.type || "Receipt") !== "Manual Due" && linkedId.indexOf("manual:") === 0) {
    const manualId = linkedId.slice("manual:".length);
    const manual = rows.find(function (r) {
      return String(r.id) === manualId && String(r.type || "").toLowerCase() === "manual due";
    });
    if (!manual) throw new Error("Linked manual debtor record was not found.");
    const principal = Math.max(0, Number(manual.amount || manual.debit || 0) || 0);
    const alreadyReceived = rows.filter(function (r) {
      return String(r.invoiceId || "") === linkedId && String(r.type || "").toLowerCase() === "receipt" && String(r.id) !== id;
    }).reduce(function (sum, r) { return sum + (Number(r.credit || r.amount) || 0); }, 0);
    const due = Math.max(0, principal - alreadyReceived);
    if (amount > due + 0.01) throw new Error("Receipt amount cannot be greater than the outstanding manual due of " + due.toFixed(2) + ".");
    const remaining = Math.max(0, due - amount);
    const manualReceiptRow = [
      id,
      String(entry.date || new Date().toISOString().slice(0, 10)),
      "Receipt",
      String(entry.customerId || manual.customerId || ""),
      String(entry.customerName || manual.customerName || "").trim(),
      linkedId,
      String(entry.invoiceNo || manual.invoiceNo || "Manual due payment"),
      "",
      0,
      amount,
      amount,
      remaining,
      remaining <= 0.01 ? "Paid" : "Pending",
      String(entry.paymentMode || "Cash"),
      String(entry.reference || ""),
      String(entry.notes || ""),
      String(entry.createdAt || new Date().toISOString())
    ];
    const existingManualReceipt = rows.findIndex(function (r) { return String(r.id) === id; });
    if (existingManualReceipt >= 0) sheet.getRange(existingManualReceipt + 2, 1, 1, manualReceiptRow.length).setValues([manualReceiptRow]);
    else sheet.appendRow(manualReceiptRow);
    return { success: true, id: id, remaining: remaining };
  }

  let invoice =
    null;


  let invoiceTotal =
    0;


  if (entry.invoiceId) {

    const invoiceRows =
      getRows_(
        ss.getSheetByName(
          "Invoices"
        )
      );


    const invoiceRow =
      invoiceRows.find(
        function (r) {
          return (
            String(r.id) ===
            String(
              entry.invoiceId
            )
          );
        }
      );


    if (!invoiceRow) {
      throw new Error(
        "Linked invoice was not found."
      );
    }


    invoice = {
      mode:
        String(
          invoiceRow.mode ||
            "GST"
        ),

      roundOff:
        Number(
          invoiceRow.roundOff
        ) || 0,

      paymentStatus:
        String(
          invoiceRow.paymentStatus ||
            "Pending"
        ),

      items:
        parseJson_(
          invoiceRow.itemsJson,
          []
        ),
    };


    invoiceTotal =
      invoiceTotal_(
        invoice
      );


    if (
      invoice.paymentStatus ===
      "Successful"
    ) {
      throw new Error(
        "This invoice is already marked Successful, so its outstanding due is zero."
      );
    }


    const alreadyReceived =
      rows
        .filter(
          function (r) {

            return (
              String(
                r.invoiceId
              ) ===
                String(
                  entry.invoiceId
                ) &&
              String(
                r.type
              ).toLowerCase() ===
                "receipt" &&
              String(r.id) !==
                id
            );

          }
        )
        .reduce(
          function (
            sum,
            r
          ) {

            return (
              sum +
              (
                Number(
                  r.credit ||
                    r.amount
                ) || 0
              )
            );

          },
          0
        );


    const due =
      Math.max(
        0,
        invoiceTotal -
          alreadyReceived
      );


    if (
      amount >
      due + 0.01
    ) {
      throw new Error(
        "Receipt amount cannot be greater than the outstanding invoice due of " +
          due.toFixed(2) +
          "."
      );
    }
  }


  const priorReceipts =
    entry.invoiceId
      ? rows
          .filter(
            function (r) {

              return (
                String(
                  r.invoiceId
                ) ===
                  String(
                    entry.invoiceId
                  ) &&
                String(
                  r.type
                ).toLowerCase() ===
                  "receipt" &&
                String(r.id) !==
                  id
              );

            }
          )
          .reduce(
            function (
              sum,
              r
            ) {

              return (
                sum +
                (
                  Number(
                    r.credit ||
                      r.amount
                  ) || 0
                )
              );

            },
            0
          )
      : 0;


  const remaining =
    entry.invoiceId
      ? Math.max(
          0,
          invoiceTotal -
            priorReceipts -
            amount
        )
      : 0;


  const status =
    entry.invoiceId &&
    remaining <= 0.01
      ? "Paid"
      : "Pending";


  const row = [
    id,

    String(
      entry.date ||
        new Date()
          .toISOString()
          .slice(0, 10)
    ),

    "Receipt",

    String(
      entry.customerId || ""
    ),

    String(
      entry.customerName || ""
    ).trim(),

    String(
      entry.invoiceId || ""
    ),

    String(
      entry.invoiceNo || ""
    ),

    "",

    0,

    amount,

    amount,

    remaining,

    status,

    String(
      entry.paymentMode ||
        "Cash"
    ),

    String(
      entry.reference || ""
    ),

    String(
      entry.notes || ""
    ),

    String(
      entry.createdAt ||
        new Date().toISOString()
    ),
  ];


  const idx =
    rows.findIndex(
      function (r) {
        return (
          String(r.id) ===
          id
        );
      }
    );


  if (idx >= 0) {

    sheet
      .getRange(
        idx + 2,
        1,
        1,
        row.length
      )
      .setValues([
        row,
      ]);

  } else {

    sheet.appendRow(
      row
    );

  }


  if (
    entry.invoiceId &&
    remaining <= 0.01
  ) {
    syncInvoicePaymentStatus_(
      ss,
      entry.invoiceId,
      "Successful"
    );
  }


  syncLedgerSales_(ss);


  return {
    ok: true,

    message:
      idx >= 0
        ? "Ledger receipt updated."
        : "Ledger receipt saved.",

    entry: {
      ...entry,

      id: id,

      type:
        "Receipt",

      amount:
        amount,

      credit:
        amount,

      balance:
        remaining,

      status:
        status,
    },
  };
}


/* =========================================================
   SYNC LEDGER SALES
========================================================= */

function syncLedgerSales_(ss) {

  const ledgerSheet =
    ss.getSheetByName(
      "Ledger"
    );


  const invoiceRows =
    getRows_(
      ss.getSheetByName(
        "Invoices"
      )
    );


  const ledgerRows =
    getRows_(
      ledgerSheet
    );


  invoiceRows.forEach(
    function (invoiceRow) {

      const invoiceId =
        String(
          invoiceRow.id || ""
        );


      if (!invoiceId) {
        return;
      }


      const exists =
        ledgerRows.some(
          function (r) {

            return (
              String(
                r.type
              ).toLowerCase() ===
                "sale" &&
              String(
                r.invoiceId
              ) ===
                invoiceId
            );

          }
        );


      if (exists) {
        return;
      }


      const buyer =
        parseJson_(
          invoiceRow.buyerJson,
          {}
        );


      const consignee =
        parseJson_(
          invoiceRow.consigneeJson,
          {}
        );


      const party =
        buyer.name
          ? buyer
          : consignee;


      const items =
        parseJson_(
          invoiceRow.itemsJson,
          []
        );


      const invoice = {
        mode:
          String(
            invoiceRow.mode ||
              "GST"
          ),

        roundOff:
          Number(
            invoiceRow.roundOff
          ) || 0,

        items:
          items,
      };


      const total =
        invoiceTotal_(
          invoice
        );


      const itemSummary =
        items
          .map(
            function (i) {
              return String(
                i.description ||
                  i.name ||
                  "Item"
              );
            }
          )
          .filter(Boolean)
          .join(", ");


      ledgerSheet.appendRow([
        "sale-" +
          invoiceId,

        String(
          invoiceRow.date ||
            new Date()
              .toISOString()
              .slice(0, 10)
        ),

        "Sale",

        "",

        String(
          party.name || ""
        ),

        invoiceId,

        String(
          invoiceRow.invoiceNo ||
            ""
        ),

        itemSummary,

        total,

        0,

        total,

        total,

        String(
          invoiceRow.paymentStatus ||
            "Pending"
        ) ===
        "Successful"
          ? "Paid"
          : "Pending",

        "",

        "",

        "Invoice sale",

        String(
          invoiceRow.createdAt ||
            new Date().toISOString()
        ),
      ]);

    }
  );
}


/* =========================================================
   INVOICE PAYMENT STATUS
========================================================= */

function syncInvoicePaymentStatus_(
  ss,
  invoiceId,
  status
) {

  const sheet =
    ss.getSheetByName(
      "Invoices"
    );


  const rows =
    getRows_(sheet);


  const idx =
    rows.findIndex(
      function (r) {
        return (
          String(r.id) ===
          String(invoiceId)
        );
      }
    );


  if (idx >= 0) {

    sheet
      .getRange(
        idx + 2,
        7
      )
      .setValue(
        status
      );

  }
}


/* =========================================================
   INVOICE TOTAL
========================================================= */

function invoiceTotal_(
  invoice
) {

  if (!invoice) {
    return 0;
  }


  const items =
    Array.isArray(
      invoice.items
    )
      ? invoice.items
      : [];


  const subtotal =
    items.reduce(
      function (
        sum,
        item
      ) {

        return (
          sum +
          (
            Number(
              item.quantity
            ) || 0
          ) *
          (
            Number(
              item.rate
            ) || 0
          )
        );

      },
      0
    );


  if (
    String(
      invoice.mode ||
        "GST"
    ) ===
    "NON_GST"
  ) {

    return Math.round(
      (
        subtotal +
        (
          Number(
            invoice.roundOff
          ) || 0
        )
      ) *
        100
    ) / 100;

  }


  const tax =
    items.reduce(
      function (
        sum,
        item
      ) {

        const line =
          (
            Number(
              item.quantity
            ) || 0
          ) *
          (
            Number(
              item.rate
            ) || 0
          );


        return (
          sum +
          line *
            (
              (
                Number(
                  item.gstRate
                ) || 0
              ) /
              100
            )
        );

      },
      0
    );


  return (
    Math.round(
      (
        subtotal +
        tax +
        (
          Number(
            invoice.roundOff
          ) || 0
        )
      ) *
        100
    ) / 100
  );
}


/* =========================================================
   DELETE INVOICE
========================================================= */

function deleteInvoice_(id) {

  if (!id) {
    return;
  }


  const ss =
    getSpreadsheet_();


  deleteById_(
    "Invoices",
    id
  );


  const sheet =
    ss.getSheetByName(
      "InventoryTransactions"
    );


  const rows =
    getRows_(sheet);


  for (
    let i =
      rows.length - 1;
    i >= 0;
    i--
  ) {

    if (
      String(
        rows[i].source
      ) ===
        "Invoice Sale" &&
      String(
        rows[i].referenceNo
      ) ===
        "Invoice:" +
          String(id)
    ) {

      sheet.deleteRow(
        i + 2
      );

    }
  }
}


/* =========================================================
   WORKERS
========================================================= */

function getEntityPayload_(payload) {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  if (payload.entity && typeof payload.entity === "object") {
    return payload.entity;
  }

  return payload;
}

function saveWorker_(worker) {
  if (!worker || !String(worker.name || "").trim()) {
    throw new Error("Worker/staff name is required.");
  }

  const sheet = getSpreadsheet_().getSheetByName("Workers");
  const rows = getRows_(sheet);
  const id = String(worker.id || Utilities.getUuid());
  const name = String(worker.name || "").trim();
  const phone = String(worker.phone || "").trim();

  const duplicate = rows.find(function (r) {
    return String(r.id) !== id &&
      String(r.name || "").trim().toLowerCase() === name.toLowerCase() &&
      String(r.phone || "").trim() === phone &&
      phone !== "";
  });

  if (duplicate) {
    throw new Error("A worker/staff member with the same name and phone already exists.");
  }

  const now = new Date().toISOString();
  const row = [
    id,
    name,
    phone,
    String(worker.type || "LABOUR"),
    String(worker.role || ""),
    String(worker.wageType || "DAILY"),
    Math.max(0, Number(worker.wageRate) || 0),
    String(worker.joiningDate || ""),
    String(worker.active) !== "false",
    String(worker.notes || ""),
    String(worker.createdAt || now),
  ];

  const idx = rows.findIndex(function (r) {
    return String(r.id) === id;
  });

  if (idx >= 0) {
    sheet.getRange(idx + 2, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return {
    ok: true,
    worker: {
      ...worker,
      id: id,
      name: name,
      phone: phone,
      createdAt: String(worker.createdAt || now),
    },
  };
}


/* =========================================================
   ATTENDANCE
========================================================= */

function saveAttendance_(record) {
  if (!record || !String(record.workerId || "").trim()) {
    throw new Error("Worker/staff is required.");
  }

  const date = String(record.date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid attendance date.");
  }

  const status = String(record.status || "PRESENT");
  const allowed = ["PRESENT", "ABSENT", "HALF_DAY", "LEAVE"];
  if (allowed.indexOf(status) < 0) {
    throw new Error("Invalid attendance status.");
  }

  const workerSheet = getSpreadsheet_().getSheetByName("Workers");
  const workerRows = getRows_(workerSheet);
  const worker = workerRows.find(function (r) {
    return String(r.id) === String(record.workerId);
  });

  if (!worker) {
    throw new Error("Selected worker/staff member was not found.");
  }

  const sheet = getSpreadsheet_().getSheetByName("Attendance");
  const rows = getRows_(sheet);
  const id = String(record.id || Utilities.getUuid());

  const duplicate = rows.find(function (r) {
    return String(r.id) !== id &&
      String(r.workerId) === String(record.workerId) &&
      String(r.date) === date;
  });

  if (duplicate) {
    throw new Error("Attendance is already marked for this worker on this date.");
  }

  const inTime = status === "ABSENT" || status === "LEAVE" ? "" : String(record.inTime || "");
  const outTime = status === "ABSENT" || status === "LEAVE" ? "" : String(record.outTime || "");
  const breakMinutes = status === "ABSENT" || status === "LEAVE"
    ? 0
    : Math.max(0, Number(record.breakMinutes) || 0);

  let totalHours = 0;
  if (inTime && outTime) {
    const inParts = inTime.split(":").map(Number);
    const outParts = outTime.split(":").map(Number);

    if (
      inParts.length !== 2 ||
      outParts.length !== 2 ||
      !inParts.every(isFinite) ||
      !outParts.every(isFinite)
    ) {
      throw new Error("Invalid IN/OUT time.");
    }

    const start = inParts[0] * 60 + inParts[1];
    const end = outParts[0] * 60 + outParts[1];

    if (end <= start) {
      throw new Error("OUT time must be later than IN time.");
    }

    totalHours = Math.max(0, (end - start - breakMinutes) / 60);
  }

  const overtimeHours = totalHours > 8 ? totalHours - 8 : 0;
  const now = new Date().toISOString();

  const row = [
    id,
    date,
    String(record.workerId),
    String(worker.name || record.workerName || ""),
    String(worker.type || record.workerType || "LABOUR"),
    status,
    inTime,
    outTime,
    Number(breakMinutes.toFixed(2)),
    Number(totalHours.toFixed(2)),
    Number(overtimeHours.toFixed(2)),
    String(record.site || ""),
    String(record.remarks || ""),
    String(record.createdAt || now),
    now,
  ];

  const idx = rows.findIndex(function (r) {
    return String(r.id) === id;
  });

  if (idx >= 0) {
    sheet.getRange(idx + 2, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return {
    ok: true,
    attendance: {
      ...record,
      id: id,
      date: date,
      workerId: String(record.workerId),
      workerName: String(worker.name || record.workerName || ""),
      workerType: String(worker.type || record.workerType || "LABOUR"),
      status: status,
      inTime: inTime,
      outTime: outTime,
      breakMinutes: Number(breakMinutes.toFixed(2)),
      totalHours: Number(totalHours.toFixed(2)),
      overtimeHours: Number(overtimeHours.toFixed(2)),
      createdAt: String(record.createdAt || now),
      updatedAt: now,
    },
  };
}


/* =========================================================
   DELETE BY ID
========================================================= */

function saveLead_(lead) {
  if (
    !lead ||
    !String(lead.customerName || "").trim()
  ) {
    throw new Error("Customer name is required.");
  }

  if (
    !String(lead.phone || "").trim() &&
    !String(lead.whatsapp || "").trim() &&
    !String(lead.email || "").trim()
  ) {
    throw new Error("At least one phone, WhatsApp number or email is required.");
  }

  if (!String(lead.requirement || "").trim()) {
    throw new Error("Customer requirement is required.");
  }

  const sheet =
    getSpreadsheet_().getSheetByName("Leads");

  const rows = getRows_(sheet);

  const id =
    String(lead.id || Utilities.getUuid());

  const now =
    new Date().toISOString();

  const row = [
    id,
    String(lead.leadDate || now.slice(0, 10)),
    String(lead.source || "Other"),
    String(lead.sourceDetail || ""),
    String(lead.customerName || "").trim(),
    String(lead.phone || "").trim(),
    String(lead.whatsapp || "").trim(),
    String(lead.email || "").trim(),
    String(lead.address || ""),
    String(lead.sitePlace || ""),
    String(lead.leadType || "Homeowner"),
    String(lead.productInterest || ""),
    String(lead.requirement || ""),
    Number(lead.expectedQuantity) || 0,
    Number(lead.estimatedValue) || 0,
    String(lead.status || "New"),
    String(lead.priority || "Warm"),
    String(lead.nextFollowUpDate || ""),
    String(lead.remarks || ""),
    String(lead.lostReason || ""),
    String(lead.convertedInvoiceNo || ""),
    String(lead.createdAt || now),
    now,
  ];

  const idx =
    rows.findIndex(function (r) {
      return String(r.id) === id;
    });

  if (idx >= 0) {
    sheet.getRange(idx + 2, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return {
    ok: true,
    lead: {
      ...lead,
      id: id,
      createdAt: String(lead.createdAt || now),
      updatedAt: now,
    },
  };
}


/* =========================================================
   DELETE BY ID
========================================================= */

function deleteById_(
  sheetName,
  id
) {

  if (!id) {
    return;
  }


  const sheet =
    getSpreadsheet_()
      .getSheetByName(
        sheetName
      );


  if (!sheet) {
    return;
  }


  const rows =
    getRows_(sheet);


  const idx =
    rows.findIndex(
      function (r) {
        return (
          String(r.id) ===
          String(id)
        );
      }
    );


  if (idx >= 0) {

    sheet.deleteRow(
      idx + 2
    );

  }
}


/* =========================================================
   REPLACE PRODUCTS
========================================================= */

function replaceProducts_(
  products
) {

  const sheet =
    getSpreadsheet_()
      .getSheetByName(
        "Products"
      );


  clearData_(
    sheet
  );


  const rows =
    products.map(
      function (p) {

        return [
          p.id,

          p.name,

          p.hsn,

          p.unit,

          Number(
            p.rate
          ) || 0,

          Number(
            p.gstRate
          ) || 0,

          p.category,

          String(
            !!p.active
          ),
        ];

      }
    );


  if (rows.length) {

    sheet
      .getRange(
        2,
        1,
        rows.length,
        8
      )
      .setValues(
        rows
      );

  }
}


/* =========================================================
   REPLACE CUSTOMERS
========================================================= */

function replaceCustomers_(
  customers
) {

  const sheet =
    getSpreadsheet_()
      .getSheetByName(
        "Customers"
      );


  clearData_(
    sheet
  );


  const rows =
    customers.map(
      function (c) {

        return [
          c.id,

          c.name,

          c.address,

          c.contact,

          c.gstin,

          c.state,

          c.stateCode,
        ];

      }
    );


  if (rows.length) {

    sheet
      .getRange(
        2,
        1,
        rows.length,
        7
      )
      .setValues(
        rows
      );

  }
}


/* =========================================================
   SAVE CUSTOMER
========================================================= */

function upsertCustomer_(
  customer
) {

  if (
    !customer ||
    !String(
      customer.name || ""
    ).trim()
  ) {
    throw new Error(
      "Customer name is required."
    );
  }


  const sheet =
    getSpreadsheet_()
      .getSheetByName(
        "Customers"
      );


  const rows =
    getRows_(sheet);


  const name =
    String(
      customer.name || ""
    )
      .trim()
      .toLowerCase();


  const gstin =
    String(
      customer.gstin || ""
    )
      .trim()
      .toLowerCase();


  const duplicate =
    rows.find(
      function (r) {

        return (
          String(r.id) !==
            String(
              customer.id
            ) &&

          String(
            r.name || ""
          )
            .trim()
            .toLowerCase() ===
            name &&

          String(
            r.gstin || ""
          )
            .trim()
            .toLowerCase() ===
            gstin
        );

      }
    );


  if (duplicate) {
    throw new Error(
      "A customer with the same name and GSTIN already exists."
    );
  }


  const id =
    String(
      customer.id ||
        Utilities.getUuid()
    );


  const row = [
    id,

    String(
      customer.name || ""
    ).trim(),

    customer.address ||
      "",

    customer.contact ||
      "",

    customer.gstin ||
      "",

    customer.state ||
      "",

    customer.stateCode ||
      "",
  ];


  const idx =
    rows.findIndex(
      function (r) {
        return (
          String(r.id) ===
          id
        );
      }
    );


  if (idx >= 0) {

    sheet
      .getRange(
        idx + 2,
        1,
        1,
        7
      )
      .setValues([
        row,
      ]);

  } else {

    sheet.appendRow(
      row
    );

  }


  return {
    id: id,

    customer: {
      ...customer,
      id: id,
    },
  };
}


/* =========================================================
   UPLOAD STAMP
========================================================= */

function uploadStamp_(
  p
) {

  if (
    !p ||
    !p.dataUrl
  ) {
    throw new Error(
      "No image received."
    );
  }


  const folder =
    getOrCreateFolder_();


  const mimeType =
    String(
      p.mimeType ||
        "image/png"
    );


  const dataUrl =
    String(
      p.dataUrl
    );


  const base64 =
    dataUrl.replace(
      /^data:[^;]+;base64,/,
      ""
    );


  if (!base64) {
    throw new Error(
      "Invalid image data."
    );
  }


  const bytes =
    Utilities.base64Decode(
      base64
    );


  const ext =
    extension_(
      mimeType
    );


  const purpose = String(p.purpose || "stamp").toLowerCase() === "logo" ? "logo" : "stamp";
  const assetName = purpose === "logo" ? "deal-magsil-logo" : STAMP_NAME;
  const filename = assetName + ext;


  const old =
    folder.getFiles();


  while (
    old.hasNext()
  ) {

    const oldFile =
      old.next();


    if (
      String(
        oldFile.getName()
      ).indexOf(
        STAMP_NAME
      ) === 0 &&
      !oldFile.isTrashed()
    ) {

      try {
        oldFile.setTrashed(
          true
        );
      } catch (_) {}

    }
  }


  const file =
    folder.createFile(
      Utilities.newBlob(
        bytes,
        mimeType,
        filename
      )
    );


  let sharingEnabled =
    false;


  try {

    file.setSharing(
      DriveApp.Access
        .ANYONE_WITH_LINK,

      DriveApp.Permission
        .VIEW
    );

    sharingEnabled =
      true;

  } catch (_) {}


  const result = {

    ok: true,

    fileId:
      file.getId(),

    folderId:
      folder.getId(),

    url:
      "https://drive.google.com/thumbnail?id=" +
      file.getId() + "&sz=w1200",

    sharingEnabled:
      sharingEnabled,
  };


  if (purpose === "logo") {
    saveCompany_({ logoDriveFileId: result.fileId, logoImage: result.url });
  } else {
    saveCompany_({ stampDriveFileId: result.fileId, stampDriveFolderId: result.folderId, stampImage: result.url });
  }


  return result;
}


/* =========================================================
   ONE-TIME EXPORT AUTHORIZATION
   Run this function manually from the Apps Script editor as
   the deployment owner. It forces Google to request the
   external_request + Drive scopes before the web app is used.
========================================================= */
function authorizeWorkbookExport() {
  const result = exportWorkbook_();
  Logger.log("Workbook export authorization successful: " + result.fileName +
    " (" + result.base64.length + " base64 characters)");
  return { ok: true, fileName: result.fileName };
}

/* =========================================================
   EXPORT LIVE GOOGLE SHEETS WORKBOOK AS XLSX
========================================================= */
function exportWorkbook_() {
  const spreadsheet = getSpreadsheet_();
  const fileId = spreadsheet.getId();
  const mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const response = UrlFetchApp.fetch(
    "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(fileId) + "/export?mimeType=" + encodeURIComponent(mimeType),
    { method: "get", headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() }, muteHttpExceptions: true }
  );
  if (response.getResponseCode() !== 200) {
    throw new Error("Google Sheets could not export the workbook (HTTP " + response.getResponseCode() + "). Check Apps Script Drive permissions and redeploy.");
  }
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Kolkata", "yyyy-MM-dd");
  return {
    ok: true,
    fileName: "Deal-Magsil-Sheets-" + stamp + ".xlsx",
    base64: Utilities.base64Encode(response.getContent()),
  };
}


/* =========================================================
   READ STAMP
========================================================= */

function readStamp_() {

  const folder =
    getOrCreateFolder_();


  const candidates =
    [];


  const it =
    folder.getFiles();


  while (
    it.hasNext()
  ) {

    const f =
      it.next();


    if (
      String(
        f.getName()
      ).indexOf(
        STAMP_NAME
      ) === 0 &&
      !f.isTrashed()
    ) {

      candidates.push(
        f
      );

    }
  }


  if (
    !candidates.length
  ) {
    return null;
  }


  const file =
    candidates[
      candidates.length - 1
    ];


  try {

    file.setSharing(
      DriveApp.Access
        .ANYONE_WITH_LINK,

      DriveApp.Permission
        .VIEW
    );

  } catch (_) {}


  const blob = file.getBlob();
  const mimeType = blob.getContentType() || "image/png";
  const dataUrl = "data:" + mimeType + ";base64," + Utilities.base64Encode(blob.getBytes());

  return {
    fileId: file.getId(),
    folderId: folder.getId(),
    url: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1200",
    dataUrl: dataUrl,
  };
}


/* =========================================================
   DRIVE FOLDER
========================================================= */

function getOrCreateFolder_() {

  const folders =
    DriveApp.getFoldersByName(
      FOLDER_NAME
    );


  if (
    folders.hasNext()
  ) {

    return folders.next();

  }


  return DriveApp.createFolder(
    FOLDER_NAME
  );
}


/* =========================================================
   SPREADSHEET
========================================================= */

function getSpreadsheet_() {

  try {

    const active =
      SpreadsheetApp
        .getActiveSpreadsheet();


    if (active) {

      PropertiesService
        .getScriptProperties()
        .setProperty(
          PROP_SPREADSHEET_ID,
          active.getId()
        );


      return active;
    }

  } catch (_) {}


  const props =
    PropertiesService
      .getScriptProperties();


  const id =
    props.getProperty(
      PROP_SPREADSHEET_ID
    );


  if (id) {

    try {

      return SpreadsheetApp
        .openById(id);

    } catch (_) {}

  }


  const ss =
    SpreadsheetApp.create(
      "Deal Magsil Billing Data"
    );


  props.setProperty(
    PROP_SPREADSHEET_ID,
    ss.getId()
  );


  return ss;
}


/* =========================================================
   CREATE SHEETS
========================================================= */

function ensureSheets_(
  ss
) {

  Object.keys(
    HEADERS
  ).forEach(
    function (name) {

      let sheet =
        ss.getSheetByName(
          name
        );


      if (!sheet) {

        sheet =
          ss.insertSheet(
            name
          );

      }


      const headers =
        HEADERS[name];


      if (
        sheet.getLastRow() ===
        0
      ) {

        sheet
          .getRange(
            1,
            1,
            1,
            headers.length
          )
          .setValues([
            headers,
          ]);

      }

    }
  );


  const first =
    ss.getSheets()[0];


  if (
    first.getName() ===
      "Sheet1" &&

    Object.keys(
      HEADERS
    ).indexOf(
      first.getName()
    ) < 0 &&

    ss.getSheets().length >
      1
  ) {

    ss.deleteSheet(
      first
    );

  }
}


/* =========================================================
   GET ROWS
========================================================= */

function getRows_(
  sheet
) {

  if (!sheet) {
    return [];
  }


  const values =
    sheet
      .getDataRange()
      .getValues();


  if (
    values.length < 2
  ) {
    return [];
  }


  const headers =
    values[0].map(
      String
    );


  return values
    .slice(1)
    .filter(
      function (row) {

        return row.some(
          function (v) {
            return v !== "";
          }
        );

      }
    )
    .map(
      function (row) {

        const obj = {};


        headers.forEach(
          function (
            h,
            i
          ) {

            obj[h] =
              row[i];

          }
        );


        return obj;

      }
    );
}


/* =========================================================
   CLEAR DATA
========================================================= */

function clearData_(
  sheet
) {

  if (
    sheet.getLastRow() >
    1
  ) {

    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() -
          1,
        sheet.getLastColumn()
      )
      .clearContent();

  }
}


/* =========================================================
   JSON PARSER
========================================================= */

function parseJson_(
  value,
  fallback
) {

  try {

    return value
      ? JSON.parse(
          String(value)
        )
      : fallback;

  } catch (_) {

    return fallback;

  }
}


/* =========================================================
   DECODE PAYLOAD
========================================================= */

function decodePayload_(
  value
) {

  if (!value) {
    return {};
  }


  const text =
    Utilities
      .newBlob(
        Utilities.base64DecodeWebSafe(
          value
        )
      )
      .getDataAsString(
        "UTF-8"
      );


  return JSON.parse(
    text
  );
}


/* =========================================================
   STARTER COMPANY
========================================================= */

function starterCompany_() {

  return {

    name:
      "DEAL MAGSIL",

    tagline:
      "PRECAST CONCRETE & PAVING SOLUTIONS",

    address:
      "Plot A/7, A/8 ADDA Industrial Estate, Kanyapur, Asansol - 713305",

    phone:
      "+91 9332331442",

    email:
      "abhradey11@gmail.com",

    gstin:
      "",

    state:
      "WEST BENGAL",

    stateCode:
      "19",

    pan:
      "",

    bankHolder:
      "DEAL MAGSIL",

    bankName:
      "",

    accountNo:
      "",

    branch:
      "",

    ifsc:
      "",

    jurisdiction:
      "ASANSOL",

    stampImage:
      "",

    stampDriveFileId:
      "",

    stampDriveFolderId:
      "",

    googleDriveUploadUrl:
      "",
  };
}


/* =========================================================
   STARTER PRODUCTS
========================================================= */

function starterProducts_() {

  return [

    [
      "paving-blocks",
      "Paving Blocks",
      "",
      "Pcs",
      0,
      18,
      "Paving",
      "true",
    ],

    [
      "concrete-cobbles",
      "Concrete Cobbles",
      "",
      "Pcs",
      0,
      18,
      "Paving",
      "true",
    ],

    [
      "flagstones",
      "Flagstones",
      "",
      "Pcs",
      0,
      18,
      "Paving",
      "true",
    ],

    [
      "kerbstones",
      "Kerbstones",
      "",
      "Pcs",
      0,
      18,
      "Precast",
      "true",
    ],

    [
      "drain-covers",
      "Drain Covers",
      "",
      "Pcs",
      0,
      18,
      "Precast",
      "true",
    ],

    [
      "grass-pavers",
      "Grass Pavers & Grids",
      "",
      "Pcs",
      0,
      18,
      "Paving",
      "true",
    ],

    [
      "landscaping-tiles",
      "Landscaping Tiles",
      "",
      "Pcs",
      0,
      18,
      "Paving",
      "true",
    ],

    [
      "paveit",
      "PAVEIT",
      "",
      "Pcs",
      0,
      18,
      "Paving",
      "true",
    ],

    [
      "cement-block",
      "Cement Block",
      "",
      "Pcs",
      0,
      18,
      "Precast",
      "true",
    ],

    [
      "rcc-pillar",
      "RCC Pillar",
      "",
      "Pcs",
      0,
      18,
      "Precast",
      "true",
    ],

  ].map(
    function (r) {

      return {

        id:
          r[0],

        name:
          r[1],

        hsn:
          r[2],

        unit:
          r[3],

        rate:
          r[4],

        gstRate:
          r[5],

        category:
          r[6],

        active:
          true,

      };

    }
  );
}


/* =========================================================
   FILE EXTENSION
========================================================= */

function extension_(
  mimeType
) {

  if (
    mimeType ===
    "image/jpeg"
  ) {
    return ".jpg";
  }


  if (
    mimeType ===
    "image/webp"
  ) {
    return ".webp";
  }


  return ".png";
}


/* =========================================================
   JSONP
========================================================= */

function jsonp_(
  data,
  callback
) {

  const json =
    JSON.stringify(
      data
    ).replace(
      /<\//g,
      "<\\/"
    );


  if (!callback) {

    return ContentService
      .createTextOutput(
        json
      )
      .setMimeType(
        ContentService.MimeType.JSON
      );

  }


  return ContentService
    .createTextOutput(
      String(
        callback
      ).replace(
        /[^a-zA-Z0-9_$]/g,
        ""
      ) +
        "(" +
        json +
        ")"
    )
    .setMimeType(
      ContentService.MimeType.JAVASCRIPT
    );
}


/* =========================================================
   HTML
========================================================= */

function html_(
  message
) {

  return HtmlService
    .createHtmlOutput(
      "<!doctype html>" +
        "<html>" +
        "<body>" +
        "<pre>" +
        escapeHtml_(
          message
        ) +
        "</pre>" +
        "</body>" +
        "</html>"
    );
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml_(
  value
) {

  return String(
    value
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}

/* =========================================================
   GOOGLE DRIVE BACKUP / RESTORE
   Backups are complete spreadsheet copies in a dedicated folder.
   The stamp file is not moved or modified. Restore keeps the live
   spreadsheet ID so the app's configured backend remains unchanged.
========================================================= */

const BACKUP_FOLDER_PROP = "DEAL_MAGSIL_BACKUP_FOLDER_ID";
const BACKUP_RETENTION_DAYS = 30;
const BACKUP_FOLDER_NAME = "Deal Magsil Backups";

function assertOwner_(username) {
  if (!username || String(username) === "employee") {
    throw new Error("OWNER_ONLY: Only the owner can access backups or restore data.");
  }
}

function getBackupFolder_() {
  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty(BACKUP_FOLDER_PROP);
  if (savedId) {
    try { return DriveApp.getFolderById(savedId); } catch (_) {}
  }
  const folders = DriveApp.getFoldersByName(BACKUP_FOLDER_NAME);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(BACKUP_FOLDER_NAME);
  props.setProperty(BACKUP_FOLDER_PROP, folder.getId());
  return folder;
}

function spreadsheetSnapshot_(ss) {
  const sheets = ss.getSheets().map(function(sheet) {
    const values = sheet.getDataRange().getValues();
    return {
      name: sheet.getName(),
      rows: Math.max(0, values.length - (values.length ? 1 : 0)),
      columns: values.length ? values[0].length : 0,
      headers: values.length ? values[0].map(String) : []
    };
  });
  return { spreadsheetId: ss.getId(), sheetCount: sheets.length, sheets: sheets };
}

function createBackup_(kind) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = getSpreadsheet_();
    ensureSheets_(ss);
    SpreadsheetApp.flush();
    const folder = getBackupFolder_();
    const now = new Date();
    const stamp = Utilities.formatDate(now, Session.getScriptTimeZone() || "Asia/Kolkata", "yyyy-MM-dd_HH-mm-ss");
    const prefix = kind === "pre-restore" ? "SAFETY" : (kind === "daily" ? "DAILY" : "MANUAL");
    const file = DriveApp.getFileById(ss.getId()).makeCopy("Deal-Magsil-" + prefix + "-Backup-" + stamp, folder);
    const snapshot = spreadsheetSnapshot_(ss);
    file.setDescription(JSON.stringify({
      app: "Deal Magsil Billing",
      kind: kind,
      createdAt: now.toISOString(),
      sourceSpreadsheetId: ss.getId(),
      snapshot: snapshot
    }));
    const verify = SpreadsheetApp.openById(file.getId());
    const verifySnapshot = spreadsheetSnapshot_(verify);
    if (verifySnapshot.sheetCount !== snapshot.sheetCount ||
        snapshot.sheets.some(function(s) {
          const other = verifySnapshot.sheets.find(function(v) { return v.name === s.name; });
          return !other || other.rows !== s.rows || JSON.stringify(other.headers) !== JSON.stringify(s.headers);
        })) {
      file.setTrashed(true);
      throw new Error("Backup verification failed. The backup was not retained.");
    }
    if (kind === "daily" || kind === "manual") cleanupOldBackups_();
    return {
      ok: true, fileId: file.getId(), name: file.getName(),
      createdAt: now.toISOString(), kind: kind,
      sheetCount: verifySnapshot.sheetCount,
      verified: true
    };
  } finally {
    lock.releaseLock();
  }
}

function listBackups_() {
  const folder = getBackupFolder_();
  const files = folder.getFiles();
  const result = [];
  while (files.hasNext()) {
    const file = files.next();
    if (file.isTrashed() || !/Deal-Magsil-(DAILY|MANUAL|SAFETY)-Backup-/.test(file.getName())) continue;
    let description = {};
    try { description = JSON.parse(file.getDescription() || "{}"); } catch (_) {}
    result.push({
      fileId: file.getId(),
      name: file.getName(),
      createdAt: file.getDateCreated().toISOString(),
      kind: description.kind || "unknown",
      size: file.getSize(),
      verified: Boolean(description.snapshot)
    });
  }
  result.sort(function(a, b) { return b.createdAt.localeCompare(a.createdAt); });
  return result;
}

function cleanupOldBackups_() {
  const folder = getBackupFolder_();
  const files = folder.getFiles();
  const cutoff = Date.now() - BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const candidates = [];
  while (files.hasNext()) {
    const file = files.next();
    if (file.isTrashed() || !/^Deal-Magsil-(DAILY|MANUAL)-Backup-/.test(file.getName())) continue;
    candidates.push(file);
  }
  // Never delete the newest valid backup; safety copies are never included.
  candidates.sort(function(a, b) { return b.getDateCreated().getTime() - a.getDateCreated().getTime(); });
  candidates.slice(1).forEach(function(file) {
    if (file.getDateCreated().getTime() < cutoff) file.setTrashed(true);
  });
}

function restoreBackup_(fileId) {
  if (!fileId) throw new Error("Select a backup to restore.");
  const folder = getBackupFolder_();
  const backupFile = DriveApp.getFileById(fileId);
  if (backupFile.isTrashed() || !backupFile.getParents().hasNext()) throw new Error("Backup file is unavailable.");
  let inFolder = false;
  const parents = backupFile.getParents();
  while (parents.hasNext()) if (parents.next().getId() === folder.getId()) inFolder = true;
  if (!inFolder || !/^Deal-Magsil-(DAILY|MANUAL|SAFETY)-Backup-/.test(backupFile.getName())) {
    throw new Error("The selected file is not a recognized Deal Magsil backup.");
  }

  const backup = SpreadsheetApp.openById(fileId);
  const backupNames = backup.getSheets().map(function(s) { return s.getName(); });
  const required = Object.keys(HEADERS);
  if (required.some(function(name) { return backupNames.indexOf(name) < 0; })) {
    throw new Error("Backup validation failed: one or more required sheets are missing. Live data was not changed.");
  }
  const backupSnapshot = spreadsheetSnapshot_(backup);
  if (!backupSnapshot.sheetCount || backupSnapshot.sheets.some(function(s) { return !s.name || s.columns < 1; })) {
    throw new Error("Backup validation failed. Live data was not changed.");
  }

  // Create and verify a safety copy before any destructive operation.
  const safety = createBackup_("pre-restore");
  if (!safety.verified) throw new Error("Safety backup could not be verified; restore cancelled.");

  const live = getSpreadsheet_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    // Google Sheets requires at least one sheet to exist at all times.
    // A temporary tab lets us remove the old tabs without changing the
    // spreadsheet ID used by the deployed app.
    const temporary = live.insertSheet("__RESTORE_TEMP__");
    const originalSheets = live.getSheets().filter(function(sheet) {
      return sheet.getSheetId() !== temporary.getSheetId();
    });
    originalSheets.forEach(function(sheet) { live.deleteSheet(sheet); });
    backup.getSheets().forEach(function(source) {
      const copied = source.copyTo(live);
      copied.setName(source.getName());
    });
    live.deleteSheet(temporary);
    SpreadsheetApp.flush();

    const restoredSnapshot = spreadsheetSnapshot_(live);
    const mismatch = backupSnapshot.sheetCount !== restoredSnapshot.sheetCount ||
      backupSnapshot.sheets.some(function(s) {
        const actual = restoredSnapshot.sheets.find(function(v) { return v.name === s.name; });
        return !actual || actual.rows !== s.rows || JSON.stringify(actual.headers) !== JSON.stringify(s.headers);
      });
    if (mismatch) {
      throw new Error("Restore verification failed. A safety backup was created: " + safety.name + ". Contact the administrator before further edits.");
    }
    return {
      ok: true, restored: true, backupName: backupFile.getName(),
      restoredAt: new Date().toISOString(), verified: true,
      safetyBackup: safety.name, sheetCount: restoredSnapshot.sheetCount
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Run this function once manually from the Apps Script editor.
 * It creates/replaces the daily trigger and runs an initial backup.
 */
function setupDailyBackupTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === "runDailyBackup") ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger("runDailyBackup").timeBased().everyDays(1).atHour(2).create();
  return createBackup_("manual");
}

function runDailyBackup() {
  return createBackup_("daily");
}
