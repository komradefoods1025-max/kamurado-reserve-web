#!/usr/bin/env bash
# 店内メニュー画像を、写真下部の商品名（オーバーレイ）に合わせて NN.jpg に同期する。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS="${STORE_MENU_ASSETS:-$HOME/.cursor/projects/Users-isaokato-Documents-GitHub-kamurado-reserve-web/assets}"
OUT="$ROOT/public/store-menu"

if [[ ! -d "$ASSETS" ]]; then
  echo "Assets not found: $ASSETS" >&2
  exit 1
fi

mkdir -p "$OUT"

copy() {
  local n="$1"
  local src="$2"
  local out="$OUT/$(printf '%02d' "$n").jpg"
  if [[ ! -f "$ASSETS/$src" ]]; then
    echo "SKIP $n — missing $src" >&2
    return 1
  fi
  sips -s format jpeg "$ASSETS/$src" --out "$out" >/dev/null 2>&1 \
    || cp "$ASSETS/$src" "$out"
  echo "OK  $(printf '%02d' "$n").jpg <- $src"
}

copy 1  "001________-a4872937-16ad-4e4f-a47d-da6ba31af467.png"
copy 2  "02____-a2365588-502d-4f92-824e-bfa005b1dc69.png"
copy 3  "03__________-64ddcb2b-f3d1-407e-b90d-5ff4e7331909.png"
copy 4  "04_______-e5df18fc-d52f-431b-87f1-014b965a778d.png"
copy 5  "05___-686ec5a8-617b-47bc-b9fb-c1f6dc1478f3.png"
copy 6  "07_____________-5e3b1e2e-eb99-4db3-ad4a-9d5464371d7e.png"
copy 7  "08_____________-89a6186e-f6ce-4bdc-a677-fdce81a30336.png"
copy 8  "06_________-15cd32b1-31db-4b71-9e59-4e474fdf8f10.png"
copy 9  "10_____-bf1ed485-edd8-44df-825b-81f2f1d3ba49.png"
copy 10 "09______-7ff65379-e07c-43be-a0e0-42b708657653.png"
# 11〜20: ファイル名順ではなくオーバーレイの商品名で対応
copy 11 "02_________-38fc23b8-8f7d-4c58-8811-e045798a45a5.png"   # ポテトサラダ
copy 12 "_________-aab607e4-9347-495b-a12b-516c20c7f34c.png"       # チョレギサラダ
copy 13 "03______________-bd1d7fbd-dcf3-4d82-98ef-fc8a6164ea9e.png" # かむらどの特製からあげ
copy 14 "01________-880a8639-6d87-48e6-8f83-90fb636f5eda.png"       # フライドポテト
copy 15 "02________________________-919e0045-94a4-4588-b10e-9988f2311ebf.png"
copy 16 "04_________-16315bbc-5312-40a2-9e66-a9a8fbcacad9.png"       # 里芋のから揚げ
copy 17 "02_________-9527b83c-a399-455e-a271-8ce2a2d53f32.png"       # キムチチャーハン
copy 18 "01__________-7d194865-5e56-48bb-ac53-9e97340373d3.png"     # 明太バターライス
copy 19 "03________-5fb4c249-449d-4534-b78e-f482a3b34250.png"       # 高菜チャーハン
copy 20 "04________-b0ad3264-c989-4de5-a881-71455ed3bb07.png"       # おにぎり各種

# 21〜22: 焼きそば（Desktop のモバイルオーダー用フォルダ）
NOODLE_DIR="${STORE_MENU_NOODLE_DIR:-$HOME/Desktop/かむらど/画像フォルダー/モバイルオーダー/05_モバイルオーダー/①メニュー画像/008_麺}"
if [[ -d "$NOODLE_DIR" ]]; then
  for pair in \
    "21:03_牛すじ焼きそば.jpg" \
    "22:01_ソース焼そば.jpg"; do
    n="${pair%%:*}"
    src="${pair#*:}"
  if [[ -f "$NOODLE_DIR/$src" ]]; then
    sips -s format jpeg "$NOODLE_DIR/$src" --out "$OUT/$(printf '%02d' "$n").jpg" >/dev/null 2>&1 \
      || cp "$NOODLE_DIR/$src" "$OUT/$(printf '%02d' "$n").jpg"
    echo "OK  $(printf '%02d' "$n").jpg <- $NOODLE_DIR/$src"
  else
    echo "SKIP $n — missing $NOODLE_DIR/$src" >&2
  fi
  done
else
  echo "SKIP 21-22 — noodle dir not found: $NOODLE_DIR" >&2
fi

# 23: ねぎ塩焼きそば（assets の PNG を優先、なければ Desktop）
if ! copy 23 "02__________-c4910eda-8ef5-45ae-8a28-65804cf2df83.png" 2>/dev/null; then
  if [[ -f "$NOODLE_DIR/02_ねぎ塩焼きそば.jpg" ]]; then
    sips -s format jpeg "$NOODLE_DIR/02_ねぎ塩焼きそば.jpg" --out "$OUT/23.jpg" >/dev/null 2>&1 \
      || cp "$NOODLE_DIR/02_ねぎ塩焼きそば.jpg" "$OUT/23.jpg"
    echo "OK  23.jpg <- $NOODLE_DIR/02_ねぎ塩焼きそば.jpg"
  else
    echo "SKIP 23 — negi shio image not found" >&2
  fi
fi

# 24〜29: お好み焼き
copy 24 "06__________-d76ede67-175f-4089-b9bc-2d1c8e5796d7.png" || true
copy 25 "02____-3779d3d1-9d0d-4841-a4a6-17fb6cb105f8.png" || true
copy 26 "04______-db995e00-0651-45d9-a2e2-2a016138e893.png" || true
copy 27 "03_____-c3e022a7-3dd2-44fe-b88e-bcbb8704e007.png" || true
copy 28 "05______-6ed5d88f-5ac6-489f-8305-2ea9bbfba19e.png" || true
copy 29 "01___-b95cb6b6-2e28-4434-b878-ae863a220029.png" || true

# 30〜42: 鉄板焼き
copy 30 "02____________-ecd8764a-78e9-40ed-8a54-4eda07114532.png" || true
copy 31 "07___________02-fa2dd756-f49a-4b17-9724-bd6b4401096c.png" || true
copy 32 "06_____________02-8065351f-f7a7-4361-b14d-ceb431daef67.png" || true
copy 33 "03_______-5f3c5280-18bd-4356-bafd-fa257d1c5191.png" || true
copy 34 "05____________-a88d8b34-a48f-487b-9f8d-cda9ab6a38bd.png" || true
copy 35 "011____________-a6deee5a-af20-4e9c-932b-773bf27c77db.png" || true
copy 36 "01_________-767c24a3-a8ef-40d6-b9ea-20f78fc0b6f2.png" || true
copy 37 "08________-a95285c7-1972-47ab-b637-575855f8cb6c.png" || true
copy 38 "09_____________-c4fbf7ba-9b3c-4f78-89b6-2ee0335d9793.png" || true
copy 39 "013__________-acd19f8e-697a-4bc2-bc67-2a304e3928bf.png" || true
copy 40 "012_________________-09eb31f4-38d3-4d73-bcd7-7d28f22ae0aa.png" || true
copy 41 "010_________________-1bcf41da-6a1f-42c6-abe3-2977c8b161b7.png" || true
copy 42 "014________________02-6add56e1-c929-4824-94b6-4c4b9aebd53b.png" || true

# 43: チキン南蛮
copy 43 "__________2026-11-09_1.35.16-539e2453-4eaa-4ef9-86ad-e622b54a33c0.png" || true

# 47〜53: もんじゃ焼き
copy 47 "01___-18f2c159-b91c-4531-a8a4-9127af8e9501.png" || true  # 豚玉
copy 48 "03_____-66721f7b-2846-41ae-889c-c3b4bb4cb6da.png" || true  # ミックス
copy 49 "04_________-792a046a-737b-488a-8df2-87f23ceea65b.png" || true  # ベビースター
copy 50 "06_____-74f03687-77b6-4ff3-9091-30b5c4858d5d.png" || true  # 牛すじ
copy 51 "________-8da49ebf-21cb-4f67-b63c-76f5d67ccbee.png" || true  # 明太もちチーズ
copy 52 "05______-d29a7a59-06d4-4b82-9777-39165ee4ce14.png" || true  # ねぎ塩豚
copy 53 "08_____________-78a3772d-d1d9-408d-a533-e79d419cdea7.png" || true  # カレーチーズ

ls -la "$OUT"
