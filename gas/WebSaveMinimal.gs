/**
 * Web 予約の保存だけ行う最小 GAS（日付ルールなし）。
 * 1. script.google.com で新規プロジェクト → このファイルだけ貼り付け
 * 2. Web アプリとしてデプロイ
 * 3. Vercel に RESERVATION_SAVE_FALLBACK_URL=（その URL）を設定
 *
 * 本番の LINE / 予約確認は従来の ProductionCode.full.gs の URL のままにしてください。
 */
const SPREADSHEET_ID = '1ISLUbviLoKa2bM9twkMpFJKzsp4sHJBcuuRaCC5I60k';
const SHEET_NAME = 'reservations';
const TIME_ZONE = 'Asia/Tokyo';

function doPost(e) {
  try {
    const bodyText = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const data = JSON.parse(bodyText);

    if (!data.date && data.pickupDate) data.date = data.pickupDate;
    if (!data.time && data.pickupTime) data.time = data.pickupTime;
    if (!data.name && data.customer && data.customer.name) data.name = data.customer.name;
    if (!data.phone && data.customer && data.customer.phone) data.phone = data.customer.phone;

    const result = saveWebReservation_(data);
    return jsonOutput_(result);
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err) });
  }
}

function saveWebReservation_(data) {
  const date = normalizeDateString_(data.date || data.pickupDate || '');
  const time = normalizeTimeDisplay_(data.time || data.pickupTime || '');
  const name = String(data.name || '').trim();
  const phone = normalizePhoneDisplay_(data.phone || '');
  const items = normalizeItems_(data.items);
  const reservationNo =
    String(data.reservationNo || '').trim() || createReservationNo_();

  if (!date) throw new Error('date is required');
  if (!time) throw new Error('time is required');
  if (!name) throw new Error('name is required');
  if (!phone) throw new Error('phone is required');
  if (!items.length) throw new Error('items is required');

  const summary = summarizeItems_(items);
  const itemCount = items.length;
  const totalQty =
    data.totalQty != null && data.totalQty !== ''
      ? Number(data.totalQty)
      : summary.totalQty;
  const totalAmount =
    data.total != null && data.total !== ''
      ? Number(data.total)
      : summary.totalAmount;

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  const rowIndex = sheet.getLastRow() + 1;
  const createdAt = nowJstString_();

  sheet.getRange(rowIndex, 1, 1, 20).setValues([[
    new Date(),
    reservationNo,
    date,
    getWeekdayJa_(date),
    time,
    name,
    phone,
    String(data.userId || ''),
    String(data.status || '受付済み'),
    itemCount,
    totalQty,
    totalAmount,
    summary.bentoQty,
    summary.bentoAmount,
    summary.extraKaraageQty,
    summary.extraKaraageAmount,
    summary.orderLines.join('\n'),
    JSON.stringify(items),
    createdAt,
    ''
  ]]);

  return { ok: true, reservationNo: reservationNo, method: 'WebSaveMinimal' };
}

function normalizeItems_(items) {
  if (!Array.isArray(items)) return [];

  return items.map(function (item) {
    const qty = Number(item.qty || item.quantity || 0);
    const price = Number(item.price || 0);
    return {
      itemType: item.itemType || '',
      menuKey: item.menuKey || item.id || '',
      menuName: item.menuName || item.name || '',
      riceSize: item.riceSize || item.selectedOptionLabel || '',
      qty: qty,
      price: price,
      total: Number(item.total || qty * price)
    };
  }).filter(function (item) {
    return item.qty > 0;
  });
}

function summarizeItems_(items) {
  var totalQty = 0;
  var totalAmount = 0;
  var bentoQty = 0;
  var bentoAmount = 0;
  var extraKaraageQty = 0;
  var extraKaraageAmount = 0;
  var orderLines = [];

  items.forEach(function (item) {
    var qty = Number(item.qty || 0);
    var total = Number(item.total || 0);
    var name = String(item.menuName || item.menuKey || '商品');

    totalQty += qty;
    totalAmount += total;
    orderLines.push('・' + name + ' ×' + qty + '個');

    if (String(item.menuKey || '') === 'extra_karaage') {
      extraKaraageQty += qty;
      extraKaraageAmount += total;
    } else if (String(item.itemType || '') !== 'drink') {
      bentoQty += qty;
      bentoAmount += total;
    }
  });

  return {
    totalQty: totalQty,
    totalAmount: totalAmount,
    bentoQty: bentoQty,
    bentoAmount: bentoAmount,
    extraKaraageQty: extraKaraageQty,
    extraKaraageAmount: extraKaraageAmount,
    orderLines: orderLines
  };
}

function normalizeDateString_(value) {
  if (!value) return '';
  var str = String(value).trim().replace(/\//g, '-');
  var m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return str;
  return m[1] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[3]).padStart(2, '0');
}

function normalizeTimeDisplay_(value) {
  var str = String(value || '').trim();
  var hhmm = str.match(/^(\d{1,2}):(\d{2})/);
  if (!hhmm) return str;
  return String(hhmm[1]).padStart(2, '0') + ':' + hhmm[2];
}

function normalizePhoneDisplay_(value) {
  return String(value || '').replace(/[^\d]/g, '');
}

function getWeekdayJa_(ymd) {
  var date = ymdToDate_(ymd);
  var labels = ['日', '月', '火', '水', '木', '金', '土'];
  return labels[date.getDay()];
}

function ymdToDate_(ymd) {
  var m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

function nowJstString_() {
  return Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
}

function createReservationNo_() {
  var now = Utilities.formatDate(new Date(), TIME_ZONE, 'yyyyMMddHHmmss');
  var rand = Math.floor(1000 + Math.random() * 9000);
  return 'WEB-' + now + '-' + rand;
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
