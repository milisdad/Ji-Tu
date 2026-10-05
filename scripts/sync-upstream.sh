#!/usr/bin/env bash
# =============================================================================
# sync-upstream.sh - Sinkronkan fork Ji-Tu dengan upstream smittix/intercept,
# lalu selaraskan konten baru ke standar Ji-Tu (brand, palet hijau, tema light).
#
# JALANKAN DI CLONE DEV, BUKAN DI MESIN DEPLOYMENT (agent/controller).
# Skrip TIDAK commit/tag/push - setelah review & uji, lakukan manual.
#
# Pemakaian:
#   scripts/sync-upstream.sh [--ref REF] [--recolor] [--no-merge]
#     --ref REF    merge dari ref tertentu (default: upstream/main)
#     --recolor    terapkan pemetaan token aksen cyan/teal lama -> hijau Ji-Tu
#                  (melindungi gradien / --heat; TIDAK menyentuh #00d4ff/#00ff88
#                   data-viz, itu hanya dilaporkan)
#     --no-merge   lewati merge, hanya audit + penyelarasan + validasi
#
# Prosedur lengkap: docs/JI-TU-SYNC.md
# =============================================================================

set -uo pipefail

REF="upstream/main"
DO_MERGE=1
DO_RECOLOR=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ref) REF="$2"; shift 2 ;;
    --recolor) DO_RECOLOR=1; shift ;;
    --no-merge) DO_MERGE=0; shift ;;
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Opsi tak dikenal: $1"; exit 2 ;;
  esac
done

cd "$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "[x] Bukan repo git"; exit 1; }

say()  { echo -e "\033[0;34m[*]\033[0m $*"; }
ok()   { echo -e "\033[0;32m[v]\033[0m $*"; }
warn() { echo -e "\033[1;33m[!]\033[0m $*"; }
die()  { echo -e "\033[0;31m[x]\033[0m $*"; exit 1; }

# --- 1. Preflight -----------------------------------------------------------
say "Preflight"
[[ -n "$(git status --porcelain --untracked-files=no)" ]] && \
  die "Working tree ada perubahan belum di-commit. Commit/stash dulu."

if ! git remote | grep -qx upstream; then
  say "Menambah remote upstream (smittix/intercept)"
  git remote add upstream https://github.com/smittix/intercept.git
  git remote set-url --push upstream DISABLE_PUSH_TO_UPSTREAM
fi
ok "Tree bersih, remote upstream ada"

# --- 2. Fetch + divergensi --------------------------------------------------
say "Fetch upstream"
git fetch upstream --tags --quiet || die "git fetch gagal"
AHEAD=$(git rev-list --count "${REF}..HEAD" 2>/dev/null || echo "?")
BEHIND=$(git rev-list --count "HEAD..${REF}" 2>/dev/null || echo "?")
LATEST_TAG=$(git tag --list 'v*' --sort=-v:refname | head -1)
say "Ji-Tu ahead: ${AHEAD} commit | behind ${REF}: ${BEHIND} | tag upstream terbaru: ${LATEST_TAG:-?}"
if [[ "$BEHIND" == "0" && "$DO_MERGE" == "1" ]]; then
  ok "Sudah sejajar dengan ${REF}; tidak ada yang di-merge."
  DO_MERGE=0
fi

# --- 3. Merge ---------------------------------------------------------------
if [[ "$DO_MERGE" == "1" ]]; then
  say "Merge ${REF} (strategi merge, bukan rebase)"
  if ! git merge "$REF" --no-edit -m "Merge upstream iNTERCEPT ke Ji-Tu (${REF})"; then
    warn "KONFLIK merge. File konflik:"
    git diff --name-only --diff-filter=U | sed 's/^/    /'
    echo
    warn "Selesaikan konflik (ambil perubahan upstream, pertahankan blok Ji-Tu"
    warn "bertanda <!-- ji-tu:... -->), lalu: git add <file> && git commit"
    warn "Kemudian jalankan ulang dengan --no-merge untuk penyelarasan + validasi."
    exit 1
  fi
  ok "Merge selesai tanpa konflik"
fi

# --- 4. Penyelarasan aman (auto-fix) ----------------------------------------
say "Penyelarasan aman"

# 4a. data-theme=\"light\" pada <html> yang belum punya (default tema terang)
python3 - <<'PY'
import os, re
n=0
for root,_,fns in os.walk('templates'):
    for fn in fns:
        if not fn.endswith('.html'): continue
        p=os.path.join(root,fn); data=open(p,'rb').read()
        def repl(m):
            line=m.group(0)
            return line if b'data-theme' in line else line.replace(b'<html lang="en"', b'<html lang="en" data-theme="light"',1)
        new=re.sub(rb'<html lang="en"[^>]*>', repl, data, count=1)
        if new!=data: open(p,'wb').write(new); n+=1
print(f"    data-theme=light ditambahkan ke {n} template")
PY

# 4b. pyproject version <- config.py VERSION
CFGVER=$(grep -oE '^VERSION *= *"[^"]+"' config.py 2>/dev/null | grep -oE '[0-9][^"]*')
if [[ -n "${CFGVER:-}" ]]; then
  if ! grep -q "^version = \"${CFGVER}\"" pyproject.toml 2>/dev/null; then
    sed -i -E "s/^version = \"[^\"]+\"/version = \"${CFGVER}\"/" pyproject.toml
    ok "pyproject version -> ${CFGVER} (selaras config.py)"
  else
    ok "pyproject version sudah ${CFGVER}"
  fi
fi

# 4c. (opsional) pemetaan token aksen cyan/teal lama -> hijau Ji-Tu
if [[ "$DO_RECOLOR" == "1" ]]; then
  say "Recolor token aksen lama -> hijau Ji-Tu (lindungi gradien/--heat)"
  python3 - <<'PY'
import os
HEX={'#4aa3ff':'#2fae6e','#6bb3ff':'#40c98a','#1f5fa8':'#006030','#2c73bf':'#00703a',
     '#35919f':'#2fae6e','#3a9aaa':'#40c98a','#2e7d8a':'#2fae6e','#1e6470':'#006030',
     '#25808e':'#00703a','#4a9eff':'#2fae6e'}
RGB={'74, 163, 255':'47, 174, 110','31, 95, 168':'0, 96, 48','53, 145, 159':'47, 174, 110',
     '46, 125, 138':'47, 174, 110','30, 100, 112':'0, 96, 48','74, 158, 255':'47, 174, 110'}
roots=['static/css','templates']
tot=0
for base in roots:
    for root,_,fns in os.walk(base):
        for fn in fns:
            if not (fn.endswith('.css') or fn.endswith('.html')): continue
            p=os.path.join(root,fn)
            if p.endswith('core/variables.css'):  # token sumber ditangani terpisah
                pass
            s=open(p,encoding='utf-8',errors='surrogateescape').read(); out=[]; c=0
            for line in s.splitlines(keepends=True):
                if 'gradient' in line or '--heat' in line:
                    out.append(line); continue
                nl=line
                for a,b in HEX.items(): nl=nl.replace(a,b)
                for a,b in RGB.items(): nl=nl.replace(a,b)
                c+=(nl!=line); out.append(nl)
            if c: open(p,'w',encoding='utf-8',errors='surrogateescape').write(''.join(out)); tot+=c
print(f"    baris token aksen diubah: {tot}")
PY
fi
ok "Penyelarasan aman selesai"

# --- 5. Audit (lapor untuk review manual) -----------------------------------
say "Audit (perlu review manual)"

CYAN=$(grep -rnE '#00d4ff|#00ff88' static/css templates static/js 2>/dev/null \
  | grep -viE 'var\(--|gradient|--heat|--severity-low|--neon-green|#00(d4ff|ff88)[0-9a-fA-F]' | wc -l)
[[ "$CYAN" -gt 0 ]] && warn "#00d4ff/#00ff88 muncul ${CYAN} baris (periksa: chrome -> hijaukan, data-viz -> biarkan)" || ok "tak ada cyan #00d4ff/#00ff88 non-data-viz"

OLDTOK=$(grep -rnE '#4aa3ff|#1f5fa8|#2e7d8a|#4a9eff|74, ?163, ?255|31, ?95, ?168|46, ?125, ?138' static/css templates 2>/dev/null | grep -viE 'var\(--' | wc -l)
[[ "$OLDTOK" -gt 0 ]] && warn "token aksen lama tersisa ${OLDTOK} baris (jalankan dgn --recolor atau perbaiki manual)" || ok "tak ada token aksen biru/teal lama"

BRAND=$(grep -rniE 'iNTERCEPT' templates 2>/dev/null \
  | grep -viE 'window\.INTERCEPT|intercept-(ui-tier|theme|animations)|intercept_(handshake|nav)|intercept:notice|InterceptTime|InterceptNav|smittix|Powered by iNTERCEPT|intercept\.(map|pending|notices)|Intercepting|intercepted|Intercept JS|MILITARY INTERCEPT|Military Intercept' | wc -l)
[[ "$BRAND" -gt 0 ]] && { warn "teks brand 'iNTERCEPT' kandidat rename ${BRAND} baris:"; grep -rniE 'iNTERCEPT' templates | grep -viE 'window\.INTERCEPT|intercept-(ui-tier|theme|animations)|intercept_(handshake|nav)|intercept:notice|InterceptTime|InterceptNav|smittix|Powered by iNTERCEPT|intercept\.(map|pending|notices)|Intercepting|intercepted|Intercept JS|MILITARY INTERCEPT|Military Intercept' | sed 's/^/    /' | head; } || ok "tak ada teks brand iNTERCEPT perlu rename"

NOHTML=$(grep -rnE '<html lang="en"' templates | grep -vc 'data-theme')
[[ "$NOHTML" -gt 0 ]] && warn "${NOHTML} <html> tanpa data-theme" || ok "semua <html> punya data-theme"

# mode nav baru yang belum difokuskan (untuk pertimbangan sembunyikan)
say "Mode nav yang ADA tapi tidak ada di blok fokus (tinjau perlu disembunyikan?):"
NAVMODES=$(grep -oE "mode_item\('[a-z_]+'" templates/partials/nav.html 2>/dev/null | grep -oE "'[a-z_]+'" | tr -d "'" | sort -u)
FOCUS=$(grep -oE 'data-mode="[a-z_]+"' static/css/core/variables.css 2>/dev/null | grep -oE '"[a-z_]+"' | tr -d '"' | sort -u)
KEEP="adsb ais aprs gps radiosonde drone tscm tscmsurvey activity signalid wifi bluetooth bt_locate wifi_locate subghz waterfall system"
for m in $NAVMODES; do
  echo " $KEEP " | grep -q " $m " && continue
  echo "$FOCUS" | grep -qx "$m" && continue
  echo "    - $m (baru? pertimbangkan tambah ke blok fokus variables.css)"
done

# --- 6. Validasi ------------------------------------------------------------
say "Validasi"
python3 -m py_compile app.py routes/jitu.py routes/__init__.py 2>/dev/null && ok "py_compile OK" || warn "py_compile ADA error"
bash -n setup.sh 2>/dev/null && ok "setup.sh sintaks OK" || warn "setup.sh sintaks error"
python3 -c "import json;json.load(open('static/manifest.json'))" 2>/dev/null && ok "manifest.json valid" || warn "manifest.json invalid"
python3 - <<'PY' 2>/dev/null && ok "templates Jinja OK" || warn "ada template Jinja error"
from jinja2 import Environment, FileSystemLoader
import os,sys
e=Environment(loader=FileSystemLoader('templates')); bad=0
for r,_,fs in os.walk('templates'):
    for x in fs:
        if x.endswith('.html'):
            try: e.get_template(os.path.relpath(os.path.join(r,x),'templates'))
            except Exception: bad+=1
sys.exit(1 if bad else 0)
PY

# --- 7. Langkah berikutnya --------------------------------------------------
echo
ok "Selesai. LANGKAH BERIKUTNYA (manual, setelah review + uji):"
cat <<'NEXT'
    1) Tinjau peringatan [!] di atas dan perbaiki bila perlu.
    2) Uji lokal: ./setup.sh (atau jalankan app) dan cek fitur Ji-Tu + fitur baru upstream.
    3) Catat di CHANGELOG.Ji-Tu.md, lalu:
         git add -A
         git commit -m "Selaraskan konten upstream <versi> ke standar Ji-Tu"
         git tag ji-tu-v<versi>
         git push origin main --tags
    4) Update deployment via tag saat maintenance (lihat docs/JI-TU-SYNC.md).
NEXT
