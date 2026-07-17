/**
 * Google Apps Script reservation webhook.
 * Deploy as Web App and set RESERVATION_SAVE_URL to the deployment URL.
 *
 * LINE bot should call the same endpoint with:
 *   { "action": "getLatestReservation", "phone": "09012345678" }
 * or
 *   { "action": "checkReservation", "phone": "09012345678" }
 *
 * If you already have a doPost implementation, rename its body to doPostCore_
 * and keep this wrapper so error.stack is returned to the web app.
 */
function doPost(e) {
  try {
    return doPostCore_(e);
  } catch (error) {
    const message = error && error.message ? String(error.message) : String(error);
    const stack = error && error.stack ? String(error.stack) : String(error);

    Logger.log("[doPost] uncaught error: " + message);
    Logger.log(stack);

    return jsonResponse_(
      {
        ok: false,
        error: message,
        message: message,
        stack: stack,
      },
      500,
    );
  }
}

function doPostCore_(e) {
  const body = parseRequestBody_(e);
  const action = String(body.action || "").trim();

  if (action === "getLatestReservation" || action === "checkReservation") {
    return handleGetLatestReservation_(body);
  }

  if (action === "updateReservation") {
    return handleUpdateReservation_(body);
  }

  if (action === "cancelReservation") {
    return handleCancelReservation_(body);
  }

  if (!action && normalizePhone_(body.phone || body.lookupPhone || body.tel)) {
    return handleGetLatestReservation_(body);
  }

  return handleCreateReservation_(body);
}

var DEFAULT_RESERVATION_COLUMNS_ = {
  reservationNo: 0,
  date: 1,
  time: 2,
  name: 3,
  phone: 4,
  note: 5,
  items: 6,
  totalQty: 7,
  total: 8,
  status: 9,
  submittedAt: 10,
};

var COLUMN_HEADER_ALIASES_ = {
  reservationNo: ["受付番号", "reservationno", "reservation_no", "reservation no", "no"],
  date: ["受取日", "date", "pickupdate", "pickup_date", "日付"],
  time: ["受取時間", "time", "pickuptime", "pickup_time", "時間"],
  name: ["氏名", "name", "customername", "customer_name", "お名前"],
  phone: ["電話", "phone", "tel", "telephone", "電話番号", "mobile"],
  note: ["備考", "note", "memo"],
  items: ["注文", "items", "itemsjson", "items_json", "order", "menu"],
  totalQty: ["数量", "totalqty", "totalquantity", "total_quantity", "qty"],
  total: ["金額", "total", "totalamount", "total_amount", "amount"],
  status: ["ステータス", "status", "状態"],
  submittedAt: ["送信日時", "submittedat", "createdat", "created_at", "timestamp", "日時"],
};

function handleCreateReservation_(body) {
  const sheet = getPrimaryReservationSheet_();
  const items = normalizeItems_(body.items);
  const reservationNo =
    String(body.reservationNo || "").trim() ||
    Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyyMMddHHmmss");

  const row = [
    reservationNo,
    body.date || body.pickupDate || "",
    body.time || body.pickupTime || "",
    body.name || "",
    normalizePhone_(body.phone || body.lookupPhone || ""),
    body.note || "",
    JSON.stringify(items),
    Number(body.totalQty || body.totalQuantity || 0),
    Number(body.total || body.totalAmount || 0),
    body.status || "受付済み",
    body.submittedAt || new Date().toISOString(),
  ];

  Logger.log("[handleCreateReservation_] appendRow columns=" + row.length);
  Logger.log("[handleCreateReservation_] items=" + JSON.stringify(items));

  sheet.appendRow(row);

  return jsonResponse_({
    ok: true,
    reservationNo: reservationNo,
    reservation_no: reservationNo,
  });
}

function handleGetLatestReservation_(body) {
  const phone = normalizePhone_(
    body.phone || body.lookupPhone || body.customerPhone || body.tel || body.telephone,
  );

  if (!phone) {
    return jsonResponse_({
      ok: false,
      found: false,
      reservation: null,
      message: "電話番号を入力してください",
    });
  }

  const match = findLatestReservationByPhone_(phone);

  if (!match) {
    return jsonResponse_({
      ok: true,
      found: false,
      reservation: null,
      latestReservation: null,
      message: "該当する予約が見つかりませんでした",
    });
  }

  return jsonResponse_({
    ok: true,
    found: true,
    reservation: match.reservation,
    latestReservation: match.reservation,
    rowNumber: match.rowNumber,
    sheetName: match.sheetName,
  });
}

function handleUpdateReservation_(body) {
  const reservationNo = String(
    body.reservationNo || body.reservation_no || body.receptionNo || body["受付番号"] || "",
  ).trim();

  if (!reservationNo) {
    return jsonResponse_({
      ok: false,
      message: "受付番号が見つかりません",
    });
  }

  const located = findRowByReservationNo_(reservationNo);

  if (!located) {
    return jsonResponse_({
      ok: false,
      message: "該当する予約が見つかりませんでした",
    });
  }

  const items = normalizeItems_(body.items);
  const sheet = located.sheet;
  const row = located.row.slice();
  const cols = located.columns;

  row[cols.date] = body.date || body.pickupDate || row[cols.date] || "";
  row[cols.time] = body.time || body.pickupTime || row[cols.time] || "";
  row[cols.name] = body.name || row[cols.name] || "";
  row[cols.phone] = normalizePhone_(body.phone || row[cols.phone] || "");
  row[cols.note] = body.note != null ? String(body.note) : String(row[cols.note] || "");
  row[cols.items] = JSON.stringify(items);
  row[cols.totalQty] = Number(
    body.totalQty || body.totalQuantity || row[cols.totalQty] || 0,
  );
  row[cols.total] = Number(body.total || body.totalAmount || row[cols.total] || 0);
  row[cols.status] = body.status || "変更済み";

  sheet.getRange(located.rowNumber, 1, 1, row.length).setValues([row]);

  const reservation = rowToReservation_(row, cols);

  return jsonResponse_({
    ok: true,
    reservationNo: reservationNo,
    reservation_no: reservationNo,
    reservation: reservation,
    latestReservation: reservation,
  });
}

function handleCancelReservation_(body) {
  const reservationNo = String(
    body.reservationNo || body.reservation_no || body.receptionNo || body["受付番号"] || "",
  ).trim();

  if (!reservationNo) {
    return jsonResponse_({
      ok: false,
      message: "受付番号が見つかりません",
    });
  }

  const located = findRowByReservationNo_(reservationNo);

  if (!located) {
    return jsonResponse_({
      ok: false,
      message: "該当する予約が見つかりませんでした",
    });
  }

  const sheet = located.sheet;
  const row = located.row.slice();
  row[located.columns.status] = body.status || "キャンセル";

  sheet.getRange(located.rowNumber, 1, 1, row.length).setValues([row]);

  const reservation = rowToReservation_(row, located.columns);

  return jsonResponse_({
    ok: true,
    reservationNo: reservationNo,
    reservation_no: reservationNo,
    reservation: reservation,
    latestReservation: reservation,
  });
}

function normalizePhone_(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function phonesMatch_(left, right) {
  const a = normalizePhone_(left);
  const b = normalizePhone_(right);

  if (!a || !b) {
    return false;
  }

  if (a === b) {
    return true;
  }

  if (a.length >= 10 && b.length >= 10 && a.slice(-10) === b.slice(-10)) {
    return true;
  }

  return false;
}

function looksLikePhone_(value) {
  const phone = normalizePhone_(value);
  return phone.length >= 10 && phone.length <= 11 && phone.charAt(0) === "0";
}

function isCanceledStatus_(status) {
  const text = String(status || "").trim();
  if (!text) {
    return false;
  }

  return text.indexOf("キャンセル") >= 0 || text.toLowerCase() === "cancelled";
}

function normalizeHeaderLabel_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]/g, "");
}

function buildColumnMapFromHeader_(headerRow) {
  const map = {};
  const defaults = DEFAULT_RESERVATION_COLUMNS_;

  for (var key in defaults) {
    map[key] = defaults[key];
  }

  if (!headerRow || !headerRow.length) {
    return map;
  }

  for (var col = 0; col < headerRow.length; col++) {
    const label = normalizeHeaderLabel_(headerRow[col]);
    if (!label) {
      continue;
    }

    for (var field in COLUMN_HEADER_ALIASES_) {
      const aliases = COLUMN_HEADER_ALIASES_[field];
      for (var i = 0; i < aliases.length; i++) {
        if (label === aliases[i]) {
          map[field] = col;
        }
      }
    }
  }

  return map;
}

function isHeaderRow_(row) {
  if (!row || !row.length) {
    return false;
  }

  var matchedHeaders = 0;

  for (var col = 0; col < row.length; col++) {
    const label = normalizeHeaderLabel_(row[col]);
    if (!label) {
      continue;
    }

    for (var field in COLUMN_HEADER_ALIASES_) {
      const aliases = COLUMN_HEADER_ALIASES_[field];
      for (var i = 0; i < aliases.length; i++) {
        if (label === aliases[i]) {
          matchedHeaders += 1;
        }
      }
    }
  }

  return matchedHeaders >= 2;
}

function extractPhoneFromRow_(row, columns) {
  const mappedPhone = normalizePhone_(row[columns.phone]);
  if (looksLikePhone_(mappedPhone)) {
    return mappedPhone;
  }

  for (var i = 0; i < row.length; i++) {
    const candidate = normalizePhone_(row[i]);
    if (looksLikePhone_(candidate)) {
      return candidate;
    }
  }

  return "";
}

function getSheetRows_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = Math.max(sheet.getLastColumn(), 11);

  if (lastRow <= 0) {
    return [];
  }

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  const rows = [];
  var startIndex = 0;
  var columns = DEFAULT_RESERVATION_COLUMNS_;

  if (values.length > 0 && isHeaderRow_(values[0])) {
    columns = buildColumnMapFromHeader_(values[0]);
    startIndex = 1;
  }

  for (var i = startIndex; i < values.length; i++) {
    rows.push({
      rowNumber: i + 1,
      row: values[i],
      columns: columns,
    });
  }

  return rows;
}

function rowToReservation_(row, columns) {
  const cols = columns || DEFAULT_RESERVATION_COLUMNS_;
  const itemsRaw = row[cols.items];
  var items = [];

  if (typeof itemsRaw === "string" && itemsRaw.trim()) {
    try {
      var parsed = JSON.parse(itemsRaw);
      items = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      items = [];
    }
  } else if (Array.isArray(itemsRaw)) {
    items = itemsRaw;
  }

  const reservationNo = String(row[cols.reservationNo] || "").trim();
  const date = String(row[cols.date] || "").trim();
  const time = String(row[cols.time] || "").trim();
  const name = String(row[cols.name] || "").trim();
  const phone = extractPhoneFromRow_(row, cols);
  const note = String(row[cols.note] || "").trim();
  const status = String(row[cols.status] || "受付済み").trim() || "受付済み";
  const submittedAt = String(row[cols.submittedAt] || "").trim();

  return {
    reservationNo: reservationNo,
    reservation_no: reservationNo,
    receptionNo: reservationNo,
    受付番号: reservationNo,
    date: date,
    pickupDate: date,
    pickup_date: date,
    time: time,
    pickupTime: time,
    pickup_time: time,
    name: name,
    customerName: name,
    customer_name: name,
    phone: phone,
    note: note,
    items: items,
    totalQty: Number(row[cols.totalQty] || 0),
    totalQuantity: Number(row[cols.totalQty] || 0),
    total_quantity: Number(row[cols.totalQty] || 0),
    total: Number(row[cols.total] || 0),
    totalAmount: Number(row[cols.total] || 0),
    total_amount: Number(row[cols.total] || 0),
    status: status,
    submittedAt: submittedAt,
  };
}

function compareSubmittedAt_(left, right) {
  const leftTime = Date.parse(String(left || ""));
  const rightTime = Date.parse(String(right || ""));

  if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime)) {
    return leftTime - rightTime;
  }

  return String(left || "").localeCompare(String(right || ""));
}

function findLatestReservationByPhone_(phone) {
  const normalizedPhone = normalizePhone_(phone);
  const sheets = getReservationSheets_();
  var latest = null;

  sheets.forEach(function (sheet) {
    const rows = getSheetRows_(sheet);

    rows.forEach(function (entry) {
      const reservation = rowToReservation_(entry.row, entry.columns);
      const rowPhone = extractPhoneFromRow_(entry.row, entry.columns);

      if (!rowPhone || !phonesMatch_(rowPhone, normalizedPhone)) {
        return;
      }

      reservation.phone = normalizePhone_(rowPhone);

      if (isCanceledStatus_(reservation.status)) {
        return;
      }

      if (
        !latest ||
        compareSubmittedAt_(latest.reservation.submittedAt, reservation.submittedAt) < 0 ||
        (
          compareSubmittedAt_(latest.reservation.submittedAt, reservation.submittedAt) === 0 &&
          entry.rowNumber > latest.rowNumber
        )
      ) {
        latest = {
          rowNumber: entry.rowNumber,
          sheetName: sheet.getName(),
          sheet: sheet,
          reservation: reservation,
        };
      }
    });
  });

  return latest;
}

function findRowByReservationNo_(reservationNo) {
  const target = String(reservationNo || "").trim();
  const sheets = getReservationSheets_();

  for (var s = 0; s < sheets.length; s++) {
    const sheet = sheets[s];
    const rows = getSheetRows_(sheet);

    for (var i = 0; i < rows.length; i++) {
      const currentNo = String(
        rows[i].row[rows[i].columns.reservationNo] || "",
      ).trim();

      if (currentNo && currentNo === target) {
        return {
          rowNumber: rows[i].rowNumber,
          row: rows[i].row,
          columns: rows[i].columns,
          sheet: sheet,
        };
      }
    }
  }

  return null;
}

function normalizeItems_(items) {
  if (!items) {
    return [];
  }

  if (typeof items === "string") {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      throw new Error("items was a string but could not be parsed as JSON");
    }
  }

  if (!Array.isArray(items)) {
    throw new Error("items must be an array, received: " + typeof items);
  }

  return items.map(function (item) {
    return {
      itemType: item.itemType || "",
      menuKey: item.menuKey || item.id || "",
      menuName: item.menuName || item.name || "",
      riceSize: item.riceSize || item.selectedOptionLabel || "",
      qty: Number(item.qty || item.quantity || 0),
      price: Number(item.price || 0),
      total: Number(item.total || 0),
    };
  });
}

function parseRequestBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Request body is empty");
  }

  return JSON.parse(e.postData.contents);
}

function getReservationSpreadsheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty(
    "SPREADSHEET_ID",
  );

  if (!spreadsheetId) {
    throw new Error("SPREADSHEET_ID script property is not set");
  }

  return SpreadsheetApp.openById(spreadsheetId);
}

function getPrimaryReservationSheet_() {
  const spreadsheet = getReservationSpreadsheet_();
  const sheet =
    spreadsheet.getSheetByName("予約") ||
    spreadsheet.getSheetByName("Reservations") ||
    spreadsheet.getSheets()[0];

  if (!sheet) {
    throw new Error("Reservation sheet was not found");
  }

  return sheet;
}

function getReservationSheets_() {
  const spreadsheet = getReservationSpreadsheet_();
  const preferredNames = ["予約", "Reservations", "WEB", "Web", "LINE", "Line"];
  const sheets = [];
  const seen = {};

  preferredNames.forEach(function (name) {
    const sheet = spreadsheet.getSheetByName(name);
    if (sheet && !seen[sheet.getName()]) {
      sheets.push(sheet);
      seen[sheet.getName()] = true;
    }
  });

  spreadsheet.getSheets().forEach(function (sheet) {
    if (!seen[sheet.getName()]) {
      sheets.push(sheet);
      seen[sheet.getName()] = true;
    }
  });

  return sheets;
}

function jsonResponse_(payload, statusCode) {
  const output = ContentService.createTextOutput(
    JSON.stringify(payload),
  ).setMimeType(ContentService.MimeType.JSON);

  if (statusCode) {
    return output;
  }

  return output;
}

/**
 * Helper for LINE bot projects in the same GAS project.
 * Usage: lookupReservationByPhoneForLine_("09012345678")
 */
function lookupReservationByPhoneForLine_(phone) {
  return handleGetLatestReservation_({ phone: phone });
}
