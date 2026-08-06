/**
 * Production GAS fix: replace getLatestReservation_ in the LINE bot script.
 *
 * Root cause:
 * - Web reservations have an empty LINE user ID column.
 * - The old logic required userId to match even when phone was provided,
 *   so WEB rows were skipped during LINE reservation checks.
 *
 * Fix:
 * - When phone is available, search by phone across LINE and WEB rows.
 * - When only userId is available, resolve the last used phone from history.
 * - Fall back to userId-only matching for LINE-native reservations.
 */

function phonesMatchForLookup_(left, right) {
  const a = String(left || "").replace(/[^\d]/g, "");
  const b = String(right || "").replace(/[^\d]/g, "");

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

function resolveLookupPhoneForReservation_(rawValues, displayValues, userId, phone) {
  let lookupPhone = String(phone || "").replace(/[^\d]/g, "");

  if (lookupPhone || !userId) {
    return lookupPhone;
  }

  for (let i = rawValues.length - 1; i >= 0; i--) {
    const row = rawValues[i];
    const display = displayValues[i];
    const rowUserId = String(display[7] || row[7] || "").trim();

    if (rowUserId !== userId) {
      continue;
    }

    const rowPhoneDisplay = normalizePhoneDisplay_(display[6] || row[6] || "");
    const rowPhoneDigits = String(rowPhoneDisplay || "").replace(/[^\d]/g, "");

    if (rowPhoneDigits) {
      return rowPhoneDigits;
    }
  }

  return "";
}

function buildLatestReservationPayload_(row, display, index) {
  const items = safeParseJson_(row[17] || "[]") || [];
  const reservationNo = String(display[1] || row[1] || "").trim();
  const source = reservationNo.toUpperCase().indexOf("WEB-") === 0 ? "WEB" : "LINE";

  return {
    ok: true,
    found: true,
    reservation: {
      savedAt: display[0] || row[0],
      reservationNo: reservationNo,
      reservation_no: reservationNo,
      source: source,
      orderSource: source,
      date: normalizeDateString_(display[2] || row[2] || ""),
      pickupDate: normalizeDateString_(display[2] || row[2] || ""),
      weekday: String(display[3] || row[3] || ""),
      time: normalizeTimeDisplay_(display[4] || row[4] || ""),
      pickupTime: normalizeTimeDisplay_(display[4] || row[4] || ""),
      name: String(display[5] || row[5] || ""),
      customerName: String(display[5] || row[5] || ""),
      phone: normalizePhoneDisplay_(display[6] || row[6] || ""),
      userId: String(display[7] || row[7] || "").trim(),
      status: normalizeStatus_(display[8] || row[8] || ""),
      itemCount: Number(row[9] || 0),
      totalQty: Number(row[10] || 0),
      totalQuantity: Number(row[10] || 0),
      total: Number(row[11] || 0),
      totalAmount: Number(row[11] || 0),
      bentoQty: Number(row[12] || 0),
      bentoAmount: Number(row[13] || 0),
      extraKaraageQty: Number(row[14] || 0),
      extraKaraageAmount: Number(row[15] || 0),
      orderLines: String(display[16] || row[16] || ""),
      items: Array.isArray(items) ? items.map(normalizeItem_) : [],
      itemsJson: String(row[17] || "[]"),
      createdAt: String(display[18] || row[18] || ""),
      updatedAt: String(display[19] || row[19] || ""),
    },
    rowNumber: index + 2,
  };
}

function getLatestReservation_(paramsOrUserId) {
  try {
    const params =
      typeof paramsOrUserId === "object" && paramsOrUserId !== null
        ? paramsOrUserId
        : { userId: paramsOrUserId };

    const userId = String(params.userId || "").trim();
    const requestedPhone = String(
      params.phone ||
        params.lookupPhone ||
        params.customerPhone ||
        params.tel ||
        "",
    ).replace(/[^\d]/g, "");

    if (!userId && !requestedPhone) {
      return {
        ok: false,
        found: false,
        error: "phone or userId is required",
      };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      return { ok: true, found: false };
    }

    setupReservationsSheet_(sheet);

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return { ok: true, found: false };
    }

    const rawValues = sheet.getRange(2, 1, lastRow - 1, 20).getValues();
    const displayValues = sheet.getRange(2, 1, lastRow - 1, 20).getDisplayValues();
    const ACTIVE_STATUSES = ["受付済み", "変更済み", "準備中"];
    const lookupPhone = resolveLookupPhoneForReservation_(
      rawValues,
      displayValues,
      userId,
      requestedPhone,
    );

    if (lookupPhone) {
      for (let i = rawValues.length - 1; i >= 0; i--) {
        const row = rawValues[i];
        const display = displayValues[i];
        const status = normalizeStatus_(display[8] || row[8] || "");

        if (!ACTIVE_STATUSES.includes(status)) {
          continue;
        }

        const rowPhoneDisplay = normalizePhoneDisplay_(display[6] || row[6] || "");
        const rowPhoneDigits = String(rowPhoneDisplay || "").replace(/[^\d]/g, "");

        if (!phonesMatchForLookup_(rowPhoneDigits, lookupPhone)) {
          continue;
        }

        return buildLatestReservationPayload_(row, display, i);
      }
    }

    if (userId) {
      for (let i = rawValues.length - 1; i >= 0; i--) {
        const row = rawValues[i];
        const display = displayValues[i];
        const status = normalizeStatus_(display[8] || row[8] || "");
        const rowUserId = String(display[7] || row[7] || "").trim();

        if (!ACTIVE_STATUSES.includes(status)) {
          continue;
        }

        if (rowUserId !== userId) {
          continue;
        }

        return buildLatestReservationPayload_(row, display, i);
      }
    }

    return { ok: true, found: false };
  } catch (err) {
    return { ok: false, found: false, error: String(err) };
  }
}
