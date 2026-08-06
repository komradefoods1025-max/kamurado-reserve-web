const SPREADSHEET_ID = '1ISLUbviLoKa2bM9twkMpFJKzsp4sHJBcuuRaCC5I60k';

const SHEET_NAME = 'reservations';
const DAILY_MENU_SHEET_NAME = 'daily_menu';
const MENU_STATUS_SHEET_NAME = 'menu_status';
const CLOSED_DAYS_SHEET_NAME = 'closed_days';
const PENDING_SHEET_NAME = 'pending_orders';

const STATUS_OPTIONS = ['受付済み', '変更済み', '準備中', '受取済み', 'キャンセル', 'キャンセル済み'];

function normalizeStatus_(value) {
  const status = String(value || '').trim();

  if (status === 'キャンセル済み') return 'キャンセル';
  if (status === 'cancel') return 'キャンセル';
  if (status === 'changed') return '変更済み';
  if (status === 'received') return '受取済み';

  return status || '受付済み';
}

const NOTIFY_EMAIL = 'comrade.toda@gmail.com';

const LINE_CHANNEL_ACCESS_TOKEN =
  PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '';

const STORE_NOTIFY_LINE_ID =
  PropertiesService.getScriptProperties().getProperty('STORE_NOTIFY_LINE_ID') || '';

const RESERVATION_DEADLINE_HOUR = 22;
const DEFAULT_BOOKABLE_DATE_COUNT = 31;
const REGULAR_CLOSED_WEEKDAYS = [];
const TIME_ZONE = 'Asia/Tokyo';

const EXTRA_KARAAGE_KEY = 'extra_karaage';

function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = params.action || '';

    if (action === 'getBookingConfig') {
      return jsonOutput_(getBookingConfig_(Number(params.count || DEFAULT_BOOKABLE_DATE_COUNT)));
    }

    if (action === 'getDailyMenu') {
      return jsonOutput_(getDailyMenu_(params.date || ''));
    }

    if (action === 'getMenuStatuses') {
      return jsonOutput_(getMenuStatuses_());
    }

    if (action === 'savePending') {
      return jsonOutput_(savePending_(params));
    }

    if (action === 'getPending') {
      return jsonOutput_(getPending_(params.userId || ''));
    }

    if (action === 'clearPending') {
      return jsonOutput_(clearPending_(params.userId || ''));
    }

    if (action === 'getReminderTargets') {
      return jsonOutput_(getReminderTargets_(Number(params.minutes || 5)));
    }

    if (action === 'markReminderSent') {
      return jsonOutput_(markReminderSent_(params.userId || ''));
    }

    if (action === 'getLatestReservation') {
      return jsonOutput_(getLatestReservation_(params));
    }

    if (action === 'getReservations') {
      return jsonOutput_(getReservations_(params));
    }

    if (action === 'updateReservation') {
      return jsonOutput_(updateReservation_(params));
    }

    if (action === 'cancelReservation') {
      return jsonOutput_(cancelReservation_(params));
    }

    const normalizedStatus = normalizeStatus_(params.status || '');

    if (normalizedStatus === 'キャンセル') {
      return jsonOutput_(cancelReservation_(params));
    }

    if (normalizedStatus === '変更済み') {
      return jsonOutput_(updateReservation_(params));
    }

    if (params.reservationNo) {
      saveToSheet_(params);
      return jsonOutput_({ ok: true, method: 'GET' });
    }

    return ContentService
      .createTextOutput('ok')
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    console.error('doGet error:', err);
    return jsonOutput_({
      ok: false,
      method: 'GET',
      error: String(err)
    });
  }
}

function doPost(e) {
  try {
    const bodyText = e && e.postData && e.postData.contents
      ? e.postData.contents
      : '{}';

    const data = JSON.parse(bodyText);
    const action = String(data.action || '').trim();

    if (!data.date && data.pickupDate) data.date = data.pickupDate;
    if (!data.time && data.pickupTime) data.time = data.pickupTime;
    if (!data.name && data.customerName) data.name = data.customerName;
    if (!data.phone && data.customer && data.customer.phone) data.phone = data.customer.phone;
    if (!data.name && data.customer && data.customer.name) data.name = data.customer.name;
    if (!data.note && data.customer && data.customer.note) data.note = data.customer.note;
    if (!data.total && data.totalAmount != null) data.total = data.totalAmount;
    if (!data.totalQty && data.totalQuantity != null) data.totalQty = data.totalQuantity;
    if (!data.itemCount && Array.isArray(data.items)) data.itemCount = data.items.length;

    if (action === 'savePending') {
      return jsonOutput_(savePending_(data));
    }

    if (action === 'clearPending') {
      return jsonOutput_(clearPending_(data.userId || ''));
    }

    if (action === 'getLatestReservation') {
      return jsonOutput_(getLatestReservation_(data));
    }

    if (action === 'getReservations') {
      return jsonOutput_(getReservations_(data));
    }

    if (action === 'updateReservation') {
      return jsonOutput_(updateReservation_(data));
    }

    if (action === 'cancelReservation') {
      return jsonOutput_(cancelReservation_(data));
    }

    if (action === 'saveReservation') {
      if (!data.reservationNo) {
        data.reservationNo = createReservationNo_();
      }

      if (!data.status) {
        data.status = '受付済み';
      }

      saveToSheet_(data);

      return jsonOutput_({
        ok: true,
        method: 'POST',
        reservationNo: data.reservationNo
      });
    }

    const normalizedStatus = normalizeStatus_(data.status || '');

    if (normalizedStatus === 'キャンセル') {
      return jsonOutput_(cancelReservation_(data));
    }

    if (normalizedStatus === '変更済み') {
      return jsonOutput_(updateReservation_(data));
    }

    // Web新規予約は action なしで来るため、ここで新規予約として保存する
    if (!data.reservationNo) {
      data.reservationNo = createReservationNo_();
    }

    if (!data.status) {
      data.status = '受付済み';
    }

    saveToSheet_(data);

    return jsonOutput_({
      ok: true,
      method: 'POST',
      reservationNo: data.reservationNo
    });
  } catch (err) {
    console.error('doPost error:', err);
    return jsonOutput_({
      ok: false,
      method: 'POST',
      error: String(err)
    });
  }
}

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getBookingConfig_(count) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let closedSheet = ss.getSheetByName(CLOSED_DAYS_SHEET_NAME);

  if (!closedSheet) {
    closedSheet = ss.insertSheet(CLOSED_DAYS_SHEET_NAME);
    setupClosedDaysSheet_(closedSheet);
  }

  const specificClosedDates = getSpecificClosedDateSet_(closedSheet);
  const dates = [];

  let current = getEarliestBookableDate_();
  let guard = 0;

  while (dates.length < count && guard < 120) {
    if (!isClosedDate_(current, specificClosedDates)) {
      dates.push({
        date: current,
        label: formatDateLabel_(current)
      });
    }
    current = addDaysToYmd_(current, 1);
    guard++;
  }

  return {
    ok: true,
    deadlineHour: RESERVATION_DEADLINE_HOUR,
    dates
  };
}

function getDailyMenu_(dateStr) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(DAILY_MENU_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(DAILY_MENU_SHEET_NAME);
    setupDailyMenuSheet_(sheet);
  }

  const targetDate = normalizeDateString_(dateStr);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return { ok: true, found: false };
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map((v) => String(v).trim());

  const rows = values.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });

  for (const row of rows) {
    const applyDate = normalizeDateString_(row.date || row.適用日 || '');
    const menuName = row.menuName || row.商品名 || '';
    const price = row.price || row.単価 || 0;
    const description = row.description || row.説明 || '';
    const imageUrl = row.imageUrl || row.画像URL || '';
    const status = String(row.status || '').trim();
    const visibleRaw = row.visible !== undefined ? row.visible : row.有効;

    const visible =
      visibleRaw === '' || visibleRaw === null || visibleRaw === undefined
        ? true
        : normalizeBoolean_(visibleRaw);

    if (applyDate === targetDate && visible && menuName) {
      return {
        ok: true,
        found: true,
        menuName: String(menuName),
        price: Number(price || 0),
        description: description ? String(description) : '',
        imageUrl: imageUrl ? String(imageUrl) : '',
        visible: true,
        soldOut: status === '売り切れ'
      };
    }
  }

  return {
    ok: true,
    found: false
  };
}

function getMenuStatuses_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(MENU_STATUS_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(MENU_STATUS_SHEET_NAME);
    setupMenuStatusSheet_(sheet);
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return {
      ok: true,
      statuses: {}
    };
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map((v) => String(v).trim());

  const rows = values.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });

  const statuses = {};

  rows.forEach((row) => {
    const menuKey = String(row.menuKey || row.キー || '').trim();
    if (!menuKey) return;

    const statusText = String(row.status || '').trim();
    const visibleRaw = row.visible !== undefined ? row.visible : row.表示;
    const visible =
      visibleRaw === '' || visibleRaw === null || visibleRaw === undefined
        ? true
        : normalizeBoolean_(visibleRaw);

    statuses[menuKey] = {
      menuKey: menuKey,
      menuName: String(row.menuName || row.商品名 || '').trim(),
      status: statusText,
      soldOut: statusText === '売り切れ',
      visible: visible
    };
  });

  return {
    ok: true,
    statuses: statuses
  };
}

function saveToSheet_(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  setupReservationsSheet_(sheet);

  const normalized = normalizeReservationData_(data);
  validateReservationData_(normalized);

  const summary = buildSummaryFromReservation_(normalized);

  const itemCount = normalized.itemCount !== ''
    ? normalized.itemCount
    : normalized.items.length;

  const totalQty = normalized.totalQty !== ''
    ? normalized.totalQty
    : summary.totalQty;

  const totalAmount = normalized.total !== ''
    ? normalized.total
    : summary.totalAmount;

  const orderLinesText = summary.orderLines.join('\n');

  const rowIndex = sheet.getLastRow() + 1;
  ensureReservationTextColumns_(sheet, rowIndex);

  sheet.getRange(rowIndex, 1, 1, 20).clearDataValidations();
  SpreadsheetApp.flush();

  sheet.getRange(rowIndex, 1, 1, 20).setValues([[
    new Date(),
    normalized.reservationNo,
    String(normalized.date || ''),
    getWeekdayJa_(normalized.date),
    String(normalized.time || ''),
    normalized.name,
    String(normalized.phone || ''),
    normalized.userId,
    '受付済み',
    itemCount,
    totalQty,
    totalAmount,
    summary.bentoQty,
    summary.bentoAmount,
    summary.extraKaraageQty,
    summary.extraKaraageAmount,
    orderLinesText,
    JSON.stringify(normalized.items),
    normalized.createdAt,
    ''
  ]]);

  styleReservationsSheet_(sheet);
  applyStatusValidation_(sheet);
  sortReservationsSheet_(sheet);

  sendReservationEmailByType_('new', normalized, summary);
  notifyStoreByLine_('new', normalized, summary);
}

function savePending_(params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(PENDING_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(PENDING_SHEET_NAME);
  }

  setupPendingSheet_(sheet);

  const userId = params.userId || '';
  if (!userId) return { ok: false, error: 'userId is required' };

  const row = findPendingRowByUserId_(sheet, userId);
  const values = [[
    userId,
    'active',
    params.step || '',
    Number(params.lastActionAtMillis || 0),
    params.lastActionAt || '',
    false,
    '',
    params.date || '',
    params.time || '',
    params.itemsJson || '[]',
    params.currentSelectionJson || 'null',
    params.name || '',
    params.phone || '',
    params.availableDatesJson || '[]',
    params.availableDateOptionsJson || '[]',
    params.historyJson || '[]',
    params.flowType || 'new',
    params.editingReservationNo || '',
    params.editingStatus || '',
    params.dailyMenuJson || '{}',
    params.menuStatusesJson || '{}',
    nowJstString_()
  ]];

  if (row > 0) {
    sheet.getRange(row, 1, 1, 22).setValues(values);
  } else {
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, 22).setValues(values);
  }

  return { ok: true };
}

function getPending_(userId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PENDING_SHEET_NAME);

  if (!sheet || !userId) {
    return { ok: true, found: false };
  }

  setupPendingSheet_(sheet);

  const row = findPendingRowByUserId_(sheet, userId);
  if (row <= 0) {
    return { ok: true, found: false };
  }

  const values = sheet.getRange(row, 1, 1, 22).getValues()[0];
  const status = values[1];

  if (status !== 'active') {
    return { ok: true, found: false };
  }

  return {
    ok: true,
    found: true,
    userId: values[0],
    status: values[1],
    step: values[2],
    lastActionAtMillis: values[3],
    lastActionAt: values[4],
    reminderSent: values[5],
    remindedAt: values[6],
    date: values[7],
    time: values[8],
    itemsJson: values[9],
    currentSelectionJson: values[10],
    name: values[11],
    phone: values[12],
    availableDatesJson: values[13],
    availableDateOptionsJson: values[14],
    historyJson: values[15],
    flowType: values[16],
    editingReservationNo: values[17],
    editingStatus: values[18],
    dailyMenuJson: values[19],
    menuStatusesJson: values[20],
    updatedAt: values[21]
  };
}

function clearPending_(userId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PENDING_SHEET_NAME);

  if (!sheet || !userId) {
    return { ok: true };
  }

  setupPendingSheet_(sheet);

  const row = findPendingRowByUserId_(sheet, userId);
  if (row <= 0) {
    return { ok: true };
  }

  sheet.getRange(row, 2, 1, 6).setValues([[
    'completed',
    '',
    0,
    '',
    true,
    nowJstString_()
  ]]);

  return { ok: true };
}

function getReminderTargets_(minutes) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PENDING_SHEET_NAME);

  if (!sheet) {
    return { ok: true, targets: [] };
  }

  setupPendingSheet_(sheet);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { ok: true, targets: [] };
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 21).getValues();
  const nowMs = Date.now();
  const limitMs = minutes * 60 * 1000;

  const targets = [];

  values.forEach((row) => {
    const userId = row[0];
    const status = row[1];
    const step = row[2];
    const lastActionAtMillis = Number(row[3] || 0);
    const reminderSent = row[5];

    if (!userId) return;
    if (status !== 'active') return;
    if (reminderSent === true) return;
    if (!lastActionAtMillis) return;

    if (nowMs - lastActionAtMillis >= limitMs) {
      targets.push({
        userId,
        step,
        stepLabel: stepLabel_(step)
      });
    }
  });

  return {
    ok: true,
    targets
  };
}

function markReminderSent_(userId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PENDING_SHEET_NAME);

  if (!sheet || !userId) {
    return { ok: true };
  }

  const row = findPendingRowByUserId_(sheet, userId);
  if (row <= 0) {
    return { ok: true };
  }

  sheet.getRange(row, 6, 1, 2).setValues([[
    true,
    nowJstString_()
  ]]);

  return { ok: true };
}

function stepLabel_(step) {
  switch (step) {
    case 'waiting_date': return '受取日選択中';
    case 'waiting_time': return '受取時間選択中';
    case 'waiting_menu': return '商品選択中';
    case 'waiting_rice_size': return 'ご飯量選択中';
    case 'waiting_drink_confirm': return 'ドリンク確認中';
    case 'waiting_drink_menu': return 'ドリンク選択中';
    case 'waiting_qty': return '個数選択中';
    case 'menu_or_review': return '商品追加または確認待ち';
    case 'waiting_name': return 'お名前入力待ち';
    case 'waiting_phone': return '電話番号入力待ち';
    case 'confirm': return '予約確認中';
    case 'change_menu': return '予約変更中';
    case 'change_waiting_date': return '変更日選択中';
    case 'change_waiting_time': return '変更時間選択中';
    case 'change_waiting_name': return '変更後の名前入力待ち';
    case 'change_waiting_phone': return '変更後の電話番号入力待ち';
    default: return '';
  }
}

function findPendingRowByUserId_(sheet, userId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(userId)) {
      return i + 2;
    }
  }
  return -1;
}
function getReservations_(paramsOrUserId) {
  try {
    const params =
      typeof paramsOrUserId === 'object' && paramsOrUserId !== null
        ? paramsOrUserId
        : { userId: paramsOrUserId };

    const userId = String(params.userId || '').trim();

    const requestedPhone = String(
      params.phone ||
      params.lookupPhone ||
      params.customerPhone ||
      params.tel ||
      ''
    ).replace(/[^\d]/g, '');

    if (!userId && !requestedPhone) {
      return {
        ok: false,
        found: false,
        reservations: [],
        error: 'phone or userId is required'
      };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      return {
        ok: true,
        found: false,
        reservations: []
      };
    }

    setupReservationsSheet_(sheet);

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return {
        ok: true,
        found: false,
        reservations: []
      };
    }

    const rowCount = lastRow - 1;
    const rawValues = sheet.getRange(2, 1, rowCount, 20).getValues();
    const displayValues = sheet.getRange(2, 1, rowCount, 20).getDisplayValues();

    const activeStatuses = ['受付済み', '変更済み', '準備中'];
    let lookupPhone = requestedPhone;

    // LINEユーザーIDから、その人が最後に利用した電話番号を取得する
    if (!lookupPhone && userId) {
      for (let i = rawValues.length - 1; i >= 0; i--) {
        const row = rawValues[i];
        const display = displayValues[i];

        const rowUserId = String(display[7] || row[7] || '').trim();
        if (rowUserId !== userId) continue;

        const rowPhoneDisplay = normalizePhoneDisplay_(
          display[6] || row[6] || ''
        );
        const rowPhoneDigits = String(rowPhoneDisplay || '').replace(/[^\d]/g, '');

        if (rowPhoneDigits) {
          lookupPhone = rowPhoneDigits;
          break;
        }
      }
    }

    if (!lookupPhone) {
      return {
        ok: true,
        found: false,
        reservations: []
      };
    }

    const reservations = [];

    for (let i = 0; i < rawValues.length; i++) {
      const row = rawValues[i];
      const display = displayValues[i];

      const status = normalizeStatus_(display[8] || row[8] || '');
      if (!activeStatuses.includes(status)) continue;

      const rowPhoneDisplay = normalizePhoneDisplay_(
        display[6] || row[6] || ''
      );
      const rowPhoneDigits = String(rowPhoneDisplay || '').replace(/[^\d]/g, '');

      if (rowPhoneDigits !== lookupPhone) continue;

      const reservationNo = String(display[1] || row[1] || '').trim();
      const items = safeParseJson_(row[17] || '[]') || [];

      const source = reservationNo.toUpperCase().startsWith('WEB-')
        ? 'WEB'
        : 'LINE';

      reservations.push({
        savedAt: display[0] || row[0],
        reservationNo: reservationNo,
        reservation_no: reservationNo,
        source: source,
        orderSource: source,
        date: normalizeDateString_(display[2] || row[2] || ''),
        pickupDate: normalizeDateString_(display[2] || row[2] || ''),
        weekday: String(display[3] || row[3] || ''),
        time: normalizeTimeDisplay_(display[4] || row[4] || ''),
        pickupTime: normalizeTimeDisplay_(display[4] || row[4] || ''),
        name: String(display[5] || row[5] || ''),
        customerName: String(display[5] || row[5] || ''),
        phone: rowPhoneDisplay,
        userId: String(display[7] || row[7] || '').trim(),
        status: status,
        itemCount: Number(row[9] || 0),
        totalQty: Number(row[10] || 0),
        totalQuantity: Number(row[10] || 0),
        total: Number(row[11] || 0),
        totalAmount: Number(row[11] || 0),
        bentoQty: Number(row[12] || 0),
        bentoAmount: Number(row[13] || 0),
        extraKaraageQty: Number(row[14] || 0),
        extraKaraageAmount: Number(row[15] || 0),
        orderLines: String(display[16] || row[16] || ''),
        items: Array.isArray(items) ? items.map(normalizeItem_) : [],
        itemsJson: String(row[17] || '[]'),
        createdAt: String(display[18] || row[18] || ''),
        updatedAt: String(display[19] || row[19] || ''),
        rowNumber: i + 2
      });
    }

    reservations.sort(function(a, b) {
      const aKey = String(a.date || '') + ' ' + String(a.time || '');
      const bKey = String(b.date || '') + ' ' + String(b.time || '');
      return aKey.localeCompare(bKey);
    });

    return {
      ok: true,
      found: reservations.length > 0,
      phone: lookupPhone,
      count: reservations.length,
      reservations: reservations
    };
  } catch (err) {
    console.error('getReservations_ error:', err);

    return {
      ok: false,
      found: false,
      reservations: [],
      error: String(err)
    };
  }
}

function getLatestReservation_(paramsOrUserId) {
  try {
    const params =
      typeof paramsOrUserId === 'object' && paramsOrUserId !== null
        ? paramsOrUserId
        : { userId: paramsOrUserId };

    const userId = String(params.userId || '').trim();

    const phone = String(
      params.phone ||
      params.lookupPhone ||
      params.customerPhone ||
      params.tel ||
      ''
    ).replace(/[^\d]/g, '');

    if (!userId && !phone) {
      return {
        ok: false,
        found: false,
        error: 'phone or userId is required'
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
    const ACTIVE_STATUSES = ['受付済み', '変更済み', '準備中'];

    for (let i = rawValues.length - 1; i >= 0; i--) {
      const row = rawValues[i];
      const display = displayValues[i];

      const status = normalizeStatus_(display[8] || row[8] || '');
      const rowUserId = String(display[7] || row[7] || '').trim();

      const rowPhoneDisplay = normalizePhoneDisplay_(display[6] || row[6] || '');
      const rowPhoneDigits = String(rowPhoneDisplay || '').replace(/[^\d]/g, '');

      if (!ACTIVE_STATUSES.includes(status)) continue;

      if (userId && rowUserId !== userId) continue;
      if (phone && rowPhoneDigits !== phone) continue;

      const items = safeParseJson_(row[17] || '[]') || [];

      return {
        ok: true,
        found: true,
        reservation: {
          savedAt: display[0] || row[0],
          reservationNo: String(display[1] || row[1] || ''),
          reservation_no: String(display[1] || row[1] || ''),
          date: normalizeDateString_(display[2] || row[2] || ''),
          pickupDate: normalizeDateString_(display[2] || row[2] || ''),
          weekday: String(display[3] || row[3] || ''),
          time: normalizeTimeDisplay_(display[4] || row[4] || ''),
          pickupTime: normalizeTimeDisplay_(display[4] || row[4] || ''),
          name: String(display[5] || row[5] || ''),
          customerName: String(display[5] || row[5] || ''),
          phone: rowPhoneDisplay,
          userId: rowUserId,
          status: status,
          itemCount: Number(row[9] || 0),
          totalQty: Number(row[10] || 0),
          totalQuantity: Number(row[10] || 0),
          total: Number(row[11] || 0),
          totalAmount: Number(row[11] || 0),
          bentoQty: Number(row[12] || 0),
          bentoAmount: Number(row[13] || 0),
          extraKaraageQty: Number(row[14] || 0),
          extraKaraageAmount: Number(row[15] || 0),
          orderLines: String(display[16] || row[16] || ''),
          items: Array.isArray(items) ? items.map(normalizeItem_) : [],
          itemsJson: String(row[17] || '[]'),
          createdAt: String(display[18] || row[18] || ''),
          updatedAt: String(display[19] || row[19] || '')
        },
        rowNumber: i + 2
      };
    }

    return { ok: true, found: false };
  } catch (err) {
    return { ok: false, found: false, error: String(err) };
  }
}

function updateReservation_(params) {
  try {
    const reservationNo = String(params.reservationNo || '').trim();
    const userId = String(params.userId || '').trim();

    if (!reservationNo) {
      return { ok: false, error: 'reservationNo is required' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      return { ok: false, error: 'reservations sheet not found' };
    }

    setupReservationsSheet_(sheet);

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return { ok: false, error: 'reservation sheet is empty' };
    }

    const values = sheet.getRange(2, 1, lastRow - 1, 20).getValues();

    let targetRow = -1;
    for (let i = 0; i < values.length; i++) {
      const rowReservationNo = String(values[i][1] || '').trim();
      const rowUserId = String(values[i][7] || '').trim();

      if (rowReservationNo !== reservationNo) continue;
      if (userId && rowUserId !== userId) continue;

      targetRow = i + 2;
      break;
    }

    if (targetRow < 0) {
      return { ok: false, error: 'target reservation not found' };
    }

    const normalized = normalizeReservationData_(params);
    validateReservationData_(normalized);

    const summary = buildSummaryFromReservation_(normalized);
    const itemCount = normalized.itemCount !== ''
      ? normalized.itemCount
      : normalized.items.length;
    const totalQty = normalized.totalQty !== ''
      ? normalized.totalQty
      : summary.totalQty;
    const totalAmount = normalized.total !== ''
      ? normalized.total
      : summary.totalAmount;
    const orderLinesText = summary.orderLines.join('\n');

    ensureReservationTextColumns_(sheet, targetRow);

    sheet.getRange(targetRow, 3, 1, 18).setValues([[
      String(normalized.date || ''),
      getWeekdayJa_(normalized.date),
      String(normalized.time || ''),
      normalized.name,
      String(normalized.phone || ''),
      normalized.userId,
      normalizeStatus_(normalized.status || '変更済み'),
      itemCount,
      totalQty,
      totalAmount,
      summary.bentoQty,
      summary.bentoAmount,
      summary.extraKaraageQty,
      summary.extraKaraageAmount,
      orderLinesText,
      JSON.stringify(normalized.items),
      normalized.createdAt || '',
      params.updatedAt || nowJstString_()
    ]]);

    styleReservationsSheet_(sheet);
    applyStatusValidation_(sheet);
    sortReservationsSheet_(sheet);

    if (normalizeYesNo_(params.notifyMail)) {
      sendReservationEmailByType_('change', normalized, summary);
    }

    notifyStoreByLine_('change', normalized, summary);

    return {
      ok: true,
      reservationNo,
      rowNumber: targetRow
    };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function cancelReservation_(params) {
  try {
    const reservationNo = String(
      params.reservationNo ||
      params.reservation_no ||
      params.receptionNo ||
      ''
    ).trim();

    const userId = String(params.userId || '').trim();
    const phone = String(
      params.phone ||
      params.lookupPhone ||
      params.customerPhone ||
      ''
    ).replace(/[^\d]/g, '');

    if (!reservationNo) {
      return { ok: false, error: 'reservationNo is required' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      return { ok: false, error: 'reservations sheet not found' };
    }

    setupReservationsSheet_(sheet);

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return { ok: false, error: 'reservation sheet is empty' };
    }

    const values = sheet.getRange(2, 1, lastRow - 1, 20).getValues();
    const displayValues = sheet.getRange(2, 1, lastRow - 1, 20).getDisplayValues();

    const matchedRows = [];

    for (let i = 0; i < values.length; i++) {
      const rowReservationNo = String(values[i][1] || '').trim();
      const rowUserId = String(values[i][7] || '').trim();

      const rowPhoneDisplay = normalizePhoneDisplay_(
        displayValues[i][6] || values[i][6] || ''
      );
      const rowPhoneDigits = String(rowPhoneDisplay || '').replace(/[^\d]/g, '');

      if (rowReservationNo !== reservationNo) continue;
      if (userId && rowUserId !== userId) continue;
      if (phone && rowPhoneDigits !== phone) continue;

      matchedRows.push(i + 2);
    }

    if (!matchedRows.length) {
      return { ok: false, error: 'target reservation not found' };
    }

    const firstIndex = matchedRows[0] - 2;
    const row = values[firstIndex];
    const display = displayValues[firstIndex];
    const items = safeParseJson_(row[17] || '[]') || [];

    const reservation = {
      reservationNo: String(display[1] || row[1] || ''),
      date: normalizeDateString_(display[2] || row[2] || ''),
      time: normalizeTimeDisplay_(display[4] || row[4] || ''),
      name: String(display[5] || row[5] || ''),
      phone: normalizePhoneDisplay_(display[6] || row[6] || ''),
      userId: String(display[7] || row[7] || ''),
      status: 'キャンセル',
      createdAt: String(display[18] || row[18] || ''),
      items: Array.isArray(items) ? items.map(normalizeItem_) : []
    };

    const summary = buildSummaryFromReservation_(reservation);
    const now = nowJstString_();

    matchedRows.forEach((targetRow) => {
      sheet.getRange(targetRow, 9).setValue('キャンセル');
      sheet.getRange(targetRow, 20).setValue(now);
    });

    styleReservationsSheet_(sheet);
    applyStatusValidation_(sheet);
    sortReservationsSheet_(sheet);

    sendReservationEmailByType_('cancel', reservation, summary);
    notifyStoreByLine_('cancel', reservation, summary);

    return {
      ok: true,
      reservationNo,
      updatedRows: matchedRows.length
    };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function normalizeReservationData_(data) {
  let items = [];

  if (Array.isArray(data.items) && data.items.length > 0) {
    items = data.items.map(normalizeItem_);
  } else if (typeof data.itemsJson === 'string' && data.itemsJson) {
    const parsed = safeParseJson_(data.itemsJson);
    if (Array.isArray(parsed) && parsed.length > 0) {
      items = parsed.map(normalizeItem_);
    }
  } else if (typeof data.items === 'string' && data.items) {
    const parsed = safeParseJson_(data.items);
    if (Array.isArray(parsed) && parsed.length > 0) {
      items = parsed.map(normalizeItem_);
    }
  }

  if (items.length === 0) {
    const qty = toNumberOrBlank_(data.qty);
    const price = toNumberOrBlank_(data.price);
    const total = toNumberOrBlank_(data.total);

    items = [{
      itemType: data.itemType || '',
      menuKey: data.menuKey || '',
      menuName: data.menuName || data.menu || '',
      riceSize: data.riceSize || '',
      qty: qty,
      price: price,
      total: total !== '' ? total : (qty !== '' && price !== '' ? qty * price : '')
    }];
  }

  const explicitOrderLines = splitLines_(data.orderLines || '');
  const explicitFoodLines = splitLines_(data.foodLines || '');
  const explicitDrinkLines = splitLines_(data.drinkLines || '');

  return {
    reservationNo: data.reservationNo || '',
    date: normalizeDateString_(data.date || ''),
    time: normalizeTimeDisplay_(data.time || ''),
    name: data.name || '',
    phone: normalizePhoneDisplay_(data.phone || ''),
    userId: data.userId || '',
    status: data.status || '受付済み',
    createdAt: data.createdAt || nowJstString_(),
    itemCount: toNumberOrBlank_(data.itemCount),
    totalQty: toNumberOrBlank_(data.totalQty),
    total: toNumberOrBlank_(data.total),
    hasDrink: normalizeYesNo_(data.hasDrink),
    hasLargeRice: normalizeYesNo_(data.hasLargeRice),
    largeRiceQty: toNumberOrBlank_(data.largeRiceQty),
    orderLines: explicitOrderLines,
    foodLines: explicitFoodLines,
    drinkLines: explicitDrinkLines,
    items: items
  };
}

function splitLines_(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => String(line || '').trim())
    .filter(Boolean);
}

function normalizeYesNo_(value) {
  const v = String(value || '').trim().toLowerCase();
  return v === 'yes' || v === 'true' || v === '1';
}

function normalizeItem_(item) {
  const qty =
    item.qty !== undefined && item.qty !== null && item.qty !== ''
      ? item.qty
      : item.quantity;

  const menuName =
    item.menuName ||
    item.name ||
    item.title ||
    '';

  const menuKey =
    item.menuKey ||
    item.id ||
    '';

  const riceSize =
    item.riceSize ||
    item.selectedOptionLabel ||
    '';

  const price =
    item.price !== undefined && item.price !== null && item.price !== ''
      ? item.price
      : 0;

  const total =
    item.total !== undefined && item.total !== null && item.total !== ''
      ? item.total
      : (Number(qty || 0) * Number(price || 0));

  return {
    itemType: item.itemType || '',
    menuKey: menuKey,
    menuName: menuName,
    riceSize: riceSize,
    qty: toNumberOrBlank_(qty),
    price: toNumberOrBlank_(price),
    total: toNumberOrBlank_(total)
  };
}

function buildSummaryFromReservation_(reservation) {
  const summary = summarizeReservationItems_(reservation.items);

  if (Array.isArray(reservation.orderLines) && reservation.orderLines.length > 0) {
    summary.orderLines = reservation.orderLines;
  }

  if (Array.isArray(reservation.foodLines) && reservation.foodLines.length > 0) {
    summary.foodLines = reservation.foodLines;
  } else {
    summary.foodLines = summary.orderLines.filter((line) => !String(line).includes('drink_'));
  }

  if (Array.isArray(reservation.drinkLines) && reservation.drinkLines.length > 0) {
    summary.drinkLines = reservation.drinkLines;
  }

  if (reservation.largeRiceQty !== '') {
    summary.largeRiceQty = Number(reservation.largeRiceQty || 0);
  } else if (reservation.hasLargeRice && summary.largeRiceQty === 0) {
    summary.largeRiceQty = summary.bentoQty;
  }

  if (
    reservation.hasDrink &&
    summary.drinkQty === 0 &&
    Array.isArray(reservation.drinkLines) &&
    reservation.drinkLines.length > 0
  ) {
    const drinkQtyFromLines = reservation.drinkLines.reduce((sum, line) => {
      const m = String(line).match(/×(\d+)個/);
      return sum + Number(m ? m[1] : 0);
    }, 0);
    summary.drinkQty = drinkQtyFromLines;
  }

  return summary;
}

function validateReservationData_(reservation) {
  const required = [
    'reservationNo',
    'date',
    'time',
    'name',
    'phone'
  ];

  required.forEach((key) => {
    if (!String(reservation[key] || '').trim()) {
      throw new Error(key + ' is required');
    }
  });

  if (!Array.isArray(reservation.items) || reservation.items.length === 0) {
    throw new Error('items is required');
  }
}

function summarizeReservationItems_(items) {
  let totalQty = 0;
  let totalAmount = 0;
  let bentoQty = 0;
  let bentoAmount = 0;
  let extraKaraageQty = 0;
  let extraKaraageAmount = 0;
  let drinkQty = 0;
  let drinkAmount = 0;
  let largeRiceQty = 0;

  const orderLines = [];

  (items || []).forEach((item) => {
    const qty = Number(item.qty || 0);
    const price = Number(item.price || 0);
    const total = Number(item.total || qty * price);
    const displayName = getDisplayMenuName_(item);

    totalQty += qty;
    totalAmount += total;

    orderLines.push(
      `・${displayName} ×${qty}個　¥${Number(total).toLocaleString('ja-JP')}`
    );

    if (isDrinkItem_(item)) {
      drinkQty += qty;
      drinkAmount += total;
      return;
    }

    if (isExtraKaraageItem_(item)) {
      extraKaraageQty += qty;
      extraKaraageAmount += total;
      return;
    }

    bentoQty += qty;
    bentoAmount += total;

    if (item.riceSize === '大盛り') {
      largeRiceQty += qty;
    }
  });

  return {
    totalQty,
    totalAmount,
    bentoQty,
    bentoAmount,
    extraKaraageQty,
    extraKaraageAmount,
    drinkQty,
    drinkAmount,
    largeRiceQty,
    orderLines,
    foodLines: orderLines.filter((line, idx) => !isDrinkItem_(items[idx] || {})),
    drinkLines: orderLines.filter((line, idx) => isDrinkItem_(items[idx] || {}))
  };
}

function isExtraKaraageItem_(item) {
  const menuKey = String(item.menuKey || '').trim();
  const menuName = String(item.menuName || '').trim();

  if (menuKey === EXTRA_KARAAGE_KEY) return true;
  if (menuName === '追加唐揚げ') return true;
  if (menuName === '唐揚げ追加') return true;

  return false;
}

function isDrinkItem_(item) {
  const itemType = String(item.itemType || '').trim().toLowerCase();
  const menuKey = String(item.menuKey || '').trim().toLowerCase();
  const menuName = String(item.menuName || '').trim().toLowerCase();

  if (itemType === 'drink') return true;
  if (itemType === 'ドリンク') return true;
  if (menuKey.startsWith('drink_')) return true;

  if (
    menuName.includes('烏龍茶') ||
    menuName.includes('ウーロン茶') ||
    menuName.includes('ウーロン') ||
    menuName.includes('コーラ') ||
    menuName.includes('いろはす') ||
    menuName.includes('お茶') ||
    menuName.includes('ジュース') ||
    menuName.includes('ソーダ') ||
    menuName.includes('コーヒー') ||
    menuName.includes('麦茶')
  ) {
    return true;
  }

  return false;
}

function getDisplayMenuName_(item) {
  const baseName = String(item && item.menuName ? item.menuName : '商品');
  const riceSize = String(item && item.riceSize ? item.riceSize : '').trim();

  if (riceSize === '小盛り' && !baseName.includes('ご飯小盛り')) {
    return `${baseName}（ご飯小盛り）`;
  }

  if (riceSize === '大盛り' && !baseName.includes('ご飯大盛り')) {
    return `${baseName}（ご飯大盛り）`;
  }

  if (riceSize === '普通' && !baseName.includes('ご飯普通')) {
    return `${baseName}（ご飯普通）`;
  }

  return baseName;
}

function sendReservationEmailByType_(type, reservation, summary) {
  if (!NOTIFY_EMAIL) return;

  try {
    const lines = summary.orderLines.join('\n');

    let subjectPrefix = '新規ランチ予約';
    let intro = '新しいランチ予約が入りました。';

    if (type === 'change') {
      subjectPrefix = 'ランチ予約変更';
      intro = 'ご予約が変更されました。';
    } else if (type === 'cancel') {
      subjectPrefix = 'ランチ予約キャンセル';
      intro = 'ご予約がキャンセルされました。';
    }

    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: `【${subjectPrefix}】${reservation.reservationNo}`,
      body:
        `${intro}\n\n` +
        `受付番号：${reservation.reservationNo}\n` +
        `受取日：${reservation.date}（${getWeekdayJa_(reservation.date)}）\n` +
        `受取時間：${reservation.time}\n` +
        `ご注文内容：\n${lines}\n` +
        `合計個数：${summary.totalQty}個\n` +
        `注文合計：¥${Number(summary.totalAmount).toLocaleString('ja-JP')}\n` +
        `弁当個数：${summary.bentoQty}個\n` +
        `弁当金額：¥${Number(summary.bentoAmount).toLocaleString('ja-JP')}\n` +
        `大盛り個数：${summary.largeRiceQty}個\n` +
        `ドリンク個数：${summary.drinkQty}個\n` +
        `追加唐揚げ個数：${summary.extraKaraageQty}個\n` +
        `追加唐揚げ金額：¥${Number(summary.extraKaraageAmount).toLocaleString('ja-JP')}\n` +
        `お名前：${reservation.name}\n` +
        `電話番号：${reservation.phone}\n` +
        `LINEユーザーID：${reservation.userId || ''}\n` +
        `受付時間：${reservation.createdAt || ''}\n` +
        `ステータス：${reservation.status || ''}`
    });
  } catch (err) {
    console.error('sendReservationEmailByType_ error:', err);
  }
}

function notifyStoreByLine_(type, reservation, summary) {
  if (!LINE_CHANNEL_ACCESS_TOKEN || !STORE_NOTIFY_LINE_ID) {
    console.log('LINE通知未設定: LINE_CHANNEL_ACCESS_TOKEN または STORE_NOTIFY_LINE_ID がありません');
    return;
  }

  try {
    let title = '🍱 新しいランチ予約が入りました。';

    if (type === 'change') {
      title = '🔁 ご予約が変更されました。';
    } else if (type === 'cancel') {
      title = '⚠️ ご予約がキャンセルされました。';
    }

    const orderLines = summary && Array.isArray(summary.orderLines)
      ? summary.orderLines.join('\n')
      : '';

    const message =
      `${title}\n\n` +
      `受付番号：${reservation.reservationNo || ''}\n` +
      `受取日：${reservation.date || ''}${reservation.date ? '（' + getWeekdayJa_(reservation.date || '') + '）' : ''}\n` +
      `受取時間：${reservation.time || ''}\n` +
      `お名前：${reservation.name || ''}\n` +
      `電話番号：${reservation.phone || ''}\n\n` +
      `ご注文内容：\n${orderLines || '取得できませんでした'}\n\n` +
      `合計個数：${summary ? Number(summary.totalQty || 0) : 0}個\n` +
      `注文合計：¥${Number(summary ? summary.totalAmount || 0 : 0).toLocaleString('ja-JP')}\n` +
      `弁当個数：${summary ? Number(summary.bentoQty || 0) : 0}個\n` +
      `ドリンク個数：${summary ? Number(summary.drinkQty || 0) : 0}個\n` +
      `追加唐揚げ個数：${summary ? Number(summary.extraKaraageQty || 0) : 0}個\n` +
      `ステータス：${reservation.status || ''}`;

    const payload = {
      to: STORE_NOTIFY_LINE_ID,
      messages: [
        {
          type: 'text',
          text: truncateLineText_(message, 4500)
        }
      ]
    };

    const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    const body = response.getContentText();

    if (code < 200 || code >= 300) {
      console.error('LINE通知エラー:', code, body);
    }
  } catch (err) {
    console.error('notifyStoreByLine_ error:', err);
  }
}

function truncateLineText_(text, maxLength) {
  const value = String(text || '');
  const limit = Number(maxLength || 4500);

  if (value.length <= limit) return value;

  return value.slice(0, limit) + '\n…';
}

function getEarliestBookableDate_() {
  const now = new Date();
  const today = Utilities.formatDate(now, TIME_ZONE, 'yyyy-MM-dd');
  return addDaysToYmd_(today, 1);
}

function isClosedDate_(ymd, specificClosedDates) {
  const date = ymdToDate_(ymd);
  const weekday = date.getDay();

  if (REGULAR_CLOSED_WEEKDAYS.includes(weekday)) {
    return true;
  }

  return specificClosedDates.has(ymd);
}

function getSpecificClosedDateSet_(sheet) {
  const set = new Set();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return set;

  const values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();

  for (const row of values) {
    const ymd = normalizeDateString_(row[0]);
    const enabled = normalizeBoolean_(row[2]);
    if (ymd && enabled) set.add(ymd);
  }

  return set;
}

function setupReservationsSheet_(sheet) {
  const headers = [
    '保存日時',
    '予約番号',
    '予約日',
    '曜日',
    '受け取り時間',
    'お名前',
    '連絡先',
    'LINEユーザーID',
    'ステータス',
    '商品種類数',
    '合計個数',
    '注文合計',
    '弁当個数',
    '弁当金額',
    '追加唐揚げ個数',
    '追加唐揚げ金額',
    '注文内容',
    'itemsJson',
    '受付時間',
    '更新時間'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
}

function setupDailyMenuSheet_(sheet) {
  const headers = ['date', 'menuName', 'price', 'description', 'imageUrl', 'status', 'visible'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
}

function setupMenuStatusSheet_(sheet) {
  const headers = ['menuKey', 'menuName', 'status', 'visible'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
}

function setupClosedDaysSheet_(sheet) {
  const headers = ['休業日', '理由', '有効'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
}

function setupPendingSheet_(sheet) {
  const headers = [
    'userId',
    'status',
    'step',
    'lastActionAtMillis',
    'lastActionAt',
    'reminderSent',
    'remindedAt',
    'date',
    'time',
    'itemsJson',
    'currentSelectionJson',
    'name',
    'phone',
    'availableDatesJson',
    'availableDateOptionsJson',
    'historyJson',
    'flowType',
    'editingReservationNo',
    'editingStatus',
    'dailyMenuJson',
    'menuStatusesJson',
    'updatedAt'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
}

function styleReservationsSheet_(sheet) {
  const lastRow = Math.max(sheet.getLastRow(), 1);
  const lastCol = 20;

  sheet.setFrozenRows(1);

  const headerRange = sheet.getRange(1, 1, 1, lastCol);
  headerRange
    .setFontWeight('bold')
    .setBackground('#1F2937')
    .setFontColor('#FFFFFF')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  if (lastRow >= 2) {
    const bodyRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
    const statusValues = sheet.getRange(2, 9, lastRow - 1, 1).getDisplayValues();
    const backgrounds = [];

    for (let i = 0; i < statusValues.length; i++) {
      const status = String(statusValues[i][0] || '').trim();

      let rowColor = '#FFFFFF';

      if (status === '変更' || status === '変更済み') {
        rowColor = '#FFF2CC';
      } else if (status === 'キャンセル' || status === 'キャンセル済み') {
        rowColor = '#F4CCCC';
      }

      backgrounds.push(new Array(lastCol).fill(rowColor));
    }

    bodyRange
      .setVerticalAlignment('middle')
      .setBackgrounds(backgrounds);

    sheet.getRange(2, 3, lastRow - 1, 1).setNumberFormat('@');
    sheet.getRange(2, 5, lastRow - 1, 1).setNumberFormat('@');
    sheet.getRange(2, 7, lastRow - 1, 1).setNumberFormat('@');

    sheet.getRange(2, 3, lastRow - 1, 3).setHorizontalAlignment('center');
    sheet.getRange(2, 9, lastRow - 1, 1).setHorizontalAlignment('center');
    sheet.getRange(2, 10, lastRow - 1, 6).setHorizontalAlignment('right');

    sheet.getRange(2, 12, lastRow - 1, 1).setNumberFormat('¥#,##0');
    sheet.getRange(2, 14, lastRow - 1, 1).setNumberFormat('¥#,##0');
    sheet.getRange(2, 16, lastRow - 1, 1).setNumberFormat('¥#,##0');

    sheet.getRange(2, 10, lastRow - 1, 1).setNumberFormat('0');
    sheet.getRange(2, 11, lastRow - 1, 1).setNumberFormat('0');
    sheet.getRange(2, 13, lastRow - 1, 1).setNumberFormat('0');
    sheet.getRange(2, 15, lastRow - 1, 1).setNumberFormat('0');
  }

  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 170);
  sheet.setColumnWidth(3, 110);
  sheet.setColumnWidth(4, 70);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 120);
  sheet.setColumnWidth(7, 130);
  sheet.setColumnWidth(8, 160);
  sheet.setColumnWidth(9, 100);
  sheet.setColumnWidth(10, 100);
  sheet.setColumnWidth(11, 90);
  sheet.setColumnWidth(12, 100);
  sheet.setColumnWidth(13, 90);
  sheet.setColumnWidth(14, 100);
  sheet.setColumnWidth(15, 110);
  sheet.setColumnWidth(16, 120);
  sheet.setColumnWidth(17, 260);
  sheet.setColumnWidth(18, 260);
  sheet.setColumnWidth(19, 150);
  sheet.setColumnWidth(20, 150);

  if (sheet.getFilter()) {
    sheet.getFilter().remove();
  }
  sheet.getRange(1, 1, lastRow, lastCol).createFilter();
}

function applyStatusValidation_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS_OPTIONS, true)
    .setAllowInvalid(false)
    .build();

  sheet.getRange(2, 9, lastRow - 1, 1).setDataValidation(rule);
}

function sortReservationsSheet_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 2) return;

  sheet.getRange(2, 1, lastRow - 1, 20).sort([
    { column: 3, ascending: true },
    { column: 5, ascending: true },
    { column: 2, ascending: true }
  ]);
}

function ensureReservationTextColumns_(sheet, rowIndex) {
  sheet.getRange(rowIndex, 3).setNumberFormat('@');
  sheet.getRange(rowIndex, 5).setNumberFormat('@');
  sheet.getRange(rowIndex, 7).setNumberFormat('@');
}

function safeParseJson_(text) {
  try {
    return JSON.parse(text);
  } catch (_err) {
    return null;
  }
}

function toNumberOrBlank_(value) {
  if (value === '' || value === null || value === undefined) return '';
  const num = Number(value);
  return isNaN(num) ? '' : num;
}

function normalizeDateString_(value) {
  if (!value) return '';

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(value, TIME_ZONE, 'yyyy-MM-dd');
  }

  const str = String(value).trim().replace(/\//g, '-');
  const m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return str;

  return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
}

function normalizeTimeDisplay_(value) {
  if (value === '' || value === null || value === undefined) return '';

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(value, TIME_ZONE, 'HH:mm');
  }

  const str = String(value).trim();
  if (!str) return '';

  const hhmm = str.match(/^(\d{1,2}):(\d{2})/);
  if (hhmm) {
    return `${String(hhmm[1]).padStart(2, '0')}:${hhmm[2]}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, TIME_ZONE, 'HH:mm');
  }

  return str;
}

function normalizePhoneDisplay_(value) {
  if (value === '' || value === null || value === undefined) return '';

  const digits = String(value).replace(/[^\d]/g, '');
  if (!digits) return String(value).trim();

  if (digits.startsWith('0')) return digits;

  if (digits.length === 9 || digits.length === 10) {
    return '0' + digits;
  }

  return digits;
}

function normalizeBoolean_(value) {
  if (value === true) return true;
  if (value === false) return false;

  const str = String(value).trim().toUpperCase();
  return ['TRUE', '1', 'YES', 'ON', '有効'].includes(str);
}

function nowJstString_() {
  return Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
}

function formatDateLabel_(ymd) {
  const d = ymdToDate_(ymd);
  const md = `${d.getMonth() + 1}/${d.getDate()}`;
  const wd = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${md}(${wd})`;
}

function getWeekdayJa_(ymd) {
  if (!ymd) return '';
  const d = ymdToDate_(ymd);
  return ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
}

function ymdToDate_(ymd) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDaysToYmd_(ymd, days) {
  const date = ymdToDate_(ymd);
  date.setDate(date.getDate() + days);
  return Utilities.formatDate(date, TIME_ZONE, 'yyyy-MM-dd');
}

function onEdit(e) {
  try {
    if (!e || !e.range) return;

    const sheet = e.range.getSheet();
    if (!sheet) return;
    if (sheet.getName() !== SHEET_NAME) return;

    const row = e.range.getRow();
    const col = e.range.getColumn();

    if (row < 2) return;
    if (col !== 9) return;

    applyReservationRowColor_(sheet, row);
  } catch (err) {
    console.error('onEdit error:', err);
  }
}

function applyReservationRowColor_(sheet, row) {
  const status = String(sheet.getRange(row, 9).getDisplayValue() || '').trim();
  const range = sheet.getRange(row, 1, 1, 20);

  let rowColor = '#FFFFFF';

  if (status === '変更' || status === '変更済み') {
    rowColor = '#FFF2CC';
  } else if (status === 'キャンセル' || status === 'キャンセル済み') {
    rowColor = '#F4CCCC';
  }

  range.setBackground(rowColor);
}

function createReservationNo_() {
  const tz = Session.getScriptTimeZone() || 'Asia/Tokyo';
  const now = Utilities.formatDate(new Date(), tz, 'yyyyMMddHHmmss');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return 'WEB-' + now + '-' + rand;
}
function testLineNotify() {
  notifyStoreByLine_(
    'new',
    {
      reservationNo: 'TEST-001',
      date: '2026-06-03',
      time: '12:00',
      name: 'テスト',
      phone: '09000000000',
      status: '受付済み'
    },
    {
      orderLines: ['・からあげ弁当（ご飯普通） ×1個　¥700'],
      totalQty: 1,
      totalAmount: 700,
      bentoQty: 1,
      drinkQty: 0,
      extraKaraageQty: 0
    }
  );
}