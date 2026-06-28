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
    body.phone || "",
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
  return jsonResponse_({
    ok: true,
    found: false,
    reservation: null,
    message: "Implement lookup logic for your sheet layout.",
  });
}

function handleUpdateReservation_(body) {
  return jsonResponse_({
    ok: false,
    message: "Implement update logic for your sheet layout.",
  });
}

function handleCancelReservation_(body) {
  return jsonResponse_({
    ok: false,
    message: "Implement cancel logic for your sheet layout.",
  });
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
