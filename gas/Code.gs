/**
 * Google Apps Script reservation webhook.
 * Deploy as Web App and set RESERVATION_SAVE_URL to the deployment URL.
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

  return handleCreateReservation_(body);
}

var RESERVATION_COLUMNS_ = {
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

function handleCreateReservation_(body) {
  const sheet = getReservationSheet_();
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
      message: "該当する予約が見つかりませんでした",
    });
  }

  return jsonResponse_({
    ok: true,
    found: true,
    reservation: match.reservation,
    rowNumber: match.rowNumber,
  });
}

function handleUpdateReservation_(body) {
  const reservationNo = String(
    body.reservationNo || body.reservation_no || body.receptionNo || "",
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
  const sheet = getReservationSheet_();
  const row = located.row.slice();
  const cols = RESERVATION_COLUMNS_;

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

  return jsonResponse_({
    ok: true,
    reservationNo: reservationNo,
    reservation_no: reservationNo,
    reservation: rowToReservation_(row),
  });
}

function handleCancelReservation_(body) {
  const reservationNo = String(
    body.reservationNo || body.reservation_no || body.receptionNo || "",
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

  const sheet = getReservationSheet_();
  const row = located.row.slice();
  row[RESERVATION_COLUMNS_.status] = body.status || "キャンセル";

  sheet.getRange(located.rowNumber, 1, 1, row.length).setValues([row]);

  return jsonResponse_({
    ok: true,
    reservationNo: reservationNo,
    reservation_no: reservationNo,
    reservation: rowToReservation_(row),
  });
}

function normalizePhone_(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function isCanceledStatus_(status) {
  const text = String(status || "").trim();
  if (!text) {
    return false;
  }

  return text.indexOf("キャンセル") >= 0 || text.toLowerCase() === "cancelled";
}

function isHeaderRow_(row) {
  if (!row || !row.length) {
    return false;
  }

  const first = String(row[0] || "").trim().toLowerCase();
  const phoneHeader = String(row[RESERVATION_COLUMNS_.phone] || "").trim();

  if (
    first === "受付番号" ||
    first === "reservationno" ||
    first === "reservation no" ||
    first === "reservation_no"
  ) {
    return true;
  }

  return phoneHeader === "電話" || phoneHeader === "phone" || phoneHeader === "tel";
}

function getSheetRows_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = Math.max(sheet.getLastColumn(), 11);

  if (lastRow <= 0) {
    return [];
  }

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  const rows = [];
  let startIndex = 0;

  if (values.length > 0 && isHeaderRow_(values[0])) {
    startIndex = 1;
  }

  for (var i = startIndex; i < values.length; i++) {
    rows.push({
      rowNumber: i + 1,
      row: values[i],
    });
  }

  return rows;
}

function rowToReservation_(row) {
  const cols = RESERVATION_COLUMNS_;
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

  return {
    reservationNo: String(row[cols.reservationNo] || "").trim(),
    reservation_no: String(row[cols.reservationNo] || "").trim(),
    date: String(row[cols.date] || "").trim(),
    pickupDate: String(row[cols.date] || "").trim(),
    time: String(row[cols.time] || "").trim(),
    pickupTime: String(row[cols.time] || "").trim(),
    name: String(row[cols.name] || "").trim(),
    customerName: String(row[cols.name] || "").trim(),
    phone: normalizePhone_(row[cols.phone]),
    note: String(row[cols.note] || "").trim(),
    items: items,
    totalQty: Number(row[cols.totalQty] || 0),
    totalQuantity: Number(row[cols.totalQty] || 0),
    total: Number(row[cols.total] || 0),
    totalAmount: Number(row[cols.total] || 0),
    status: String(row[cols.status] || "受付済み").trim() || "受付済み",
    submittedAt: String(row[cols.submittedAt] || "").trim(),
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
  const sheet = getReservationSheet_();
  const normalizedPhone = normalizePhone_(phone);
  const rows = getSheetRows_(sheet);
  var latest = null;

  rows.forEach(function (entry) {
    const reservation = rowToReservation_(entry.row);

    if (!reservation.phone || reservation.phone !== normalizedPhone) {
      return;
    }

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
        reservation: reservation,
      };
    }
  });

  return latest;
}

function findRowByReservationNo_(reservationNo) {
  const sheet = getReservationSheet_();
  const target = String(reservationNo || "").trim();
  const rows = getSheetRows_(sheet);

  for (var i = 0; i < rows.length; i++) {
    const currentNo = String(
      rows[i].row[RESERVATION_COLUMNS_.reservationNo] || "",
    ).trim();

    if (currentNo && currentNo === target) {
      return rows[i];
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

function getReservationSheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty(
    "SPREADSHEET_ID",
  );

  if (!spreadsheetId) {
    throw new Error("SPREADSHEET_ID script property is not set");
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet =
    spreadsheet.getSheetByName("予約") ||
    spreadsheet.getSheetByName("Reservations") ||
    spreadsheet.getSheets()[0];

  if (!sheet) {
    throw new Error("Reservation sheet was not found");
  }

  return sheet;
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
