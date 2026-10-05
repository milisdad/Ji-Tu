# Ji-Tu - Prosedur Sinkronisasi Upstream & Update Deployment

Cara menjaga fork **Ji-Tu** tetap selaras dengan upstream
[smittix/intercept](https://github.com/smittix/intercept) yang sering di-update,
tanpa mengganggu mesin yang berjalan (agent/controller).

## Prinsip

1. **Pisahkan dev dan deployment.** Semua sinkronisasi dilakukan di **clone dev**,
   lalu di-push. Mesin deployment hanya menarik **tag yang sudah diuji**.
2. **Merge, bukan rebase.** Fork sudah publik dan dideploy, jadi jangan rewrite
   history / force-push.
3. **Deploy dari tag.** Tandai rilis teruji `ji-tu-vX`; mesin deployment pin ke tag
   itu, bukan `main` mentah. Anda yang menentukan kapan update.

## 1. Sinkronisasi di clone dev

### Cara otomatis (disarankan)

```bash
scripts/sync-upstream.sh            # fetch + merge upstream/main + penyelarasan aman + audit + validasi
scripts/sync-upstream.sh --recolor  # + terapkan pemetaan token aksen lama -> hijau Ji-Tu
scripts/sync-upstream.sh --no-merge # hanya audit + penyelarasan + validasi (mis. setelah resolusi konflik)
```

Skrip ini:
- memastikan tree bersih + remote `upstream` ada,
- fetch dan menampilkan divergensi (ahead/behind, tag upstream terbaru),
- merge `upstream/main` (berhenti dan menampilkan file konflik bila ada),
- **penyelarasan aman otomatis**: `data-theme="light"` pada `<html>` baru, versi
  `pyproject.toml` disamakan ke `config.py`,
- **audit (lapor, tidak auto-fix)**: warna cyan/token lama, teks brand `iNTERCEPT`,
  `<html>` tanpa tema, dan mode nav baru yang belum difokuskan,
- **validasi**: `py_compile`, `bash -n setup.sh`, Jinja lint, manifest JSON.

Skrip **tidak** commit/tag/push - Anda review dulu.

### Cara manual

```bash
git fetch upstream --tags
git merge upstream/main --no-edit
# selesaikan konflik bila ada, lalu jalankan penyelarasan:
scripts/sync-upstream.sh --no-merge --recolor
```

## 2. Standar penyelarasan Ji-Tu

Konten baru dari upstream harus memenuhi standar berikut (dicek skrip):

| Aspek | Standar Ji-Tu |
|---|---|
| Brand | Teks tampil `iNTERCEPT` -> `Ji-Tu` (identifier kode, `Powered by iNTERCEPT`, link smittix dibiarkan) |
| Palet | Aksen cyan/teal -> hijau Unjaya; data-viz (gradien sinyal, skala altitude, legenda GNSS) dibiarkan |
| Tema | Semua `<html>` default `data-theme="light"` |
| Fokus modul | Mode di luar lingkup disembunyikan via blok di `static/css/core/variables.css` |
| Versi | `pyproject.toml` = `config.py` VERSION |

### Pemetaan warna aksen (untuk perbaikan manual)

Token aksen biru/teal lama -> hijau Unjaya (lindungi baris `gradient`/`--heat`):

```
#4aa3ff|#4a9eff|#35919f|#2e7d8a -> #2fae6e      (hijau terang, tema gelap)
#1f5fa8|#1e6470                  -> #006030      (hijau Unjaya, tema terang)
#6bb3ff|#3a9aaa                  -> #40c98a      (hover gelap)
#2c73bf|#25808e                  -> #00703a      (hover terang)
74,163,255 / 74,158,255 / 53,145,159 / 46,125,138 -> 47,174,110
31,95,168 / 30,100,112                             -> 0,96,48
```

`#00d4ff`/`#00ff88`: **tinjau per kasus** - bila chrome -> pakai `var(--accent-cyan)`
/`var(--accent-green)`; bila data-viz (skala/legenda/gradien) -> biarkan.

## 3. Resolusi konflik

Konflik biasanya di file yang Ji-Tu ubah inline (mis. `variables.css`, template
yang di-rename, `app.py`, `setup.sh`). Pola resolusi:
- Ambil perubahan **fungsional upstream**.
- Pertahankan blok **Ji-Tu** (sering ditandai `<!-- ji-tu:... -->` atau komentar
  `# Ji-Tu`).
- Setelah `git add` + `git commit`, jalankan `scripts/sync-upstream.sh --no-merge`
  untuk penyelarasan + validasi.

## 4. Rilis (tag)

Setelah review + uji lokal:

```bash
git add -A
git commit -m "Selaraskan konten upstream <versi> ke standar Ji-Tu"
git tag ji-tu-v<versi>          # mis. ji-tu-v2.33.79
git push origin main --tags
```

## 5. Update mesin deployment (tanpa gangguan)

Lakukan saat **maintenance window**. Pin ke **tag teruji**, bukan `main`.

```bash
# AGENT (Raspberry Pi)
cd ~/Ji-Tu && git fetch --tags && git checkout ji-tu-v<versi>
sudo systemctl restart ji-tu-agent

# CONTROLLER (laptop/PC)
cd ~/Ji-Tu && git fetch --tags && git checkout ji-tu-v<versi>
sudo pkill -f gunicorn
setsid bash -lc "sudo ./start.sh > ~/jitu-ctrl-run.log 2>&1" </dev/null >/dev/null 2>&1 &
```

Aman karena state tidak ikut ter-update:
- konfig live agent ada di `~/intercept_agent.cfg` (DI LUAR repo), jadi `checkout`/`pull` tidak menyentuhnya (service menunjuk ke path eksternal ini; dibuat otomatis oleh `setup.sh --role=agent`),
- `.env`, `instance/` (DB + password), `venv/` di-gitignore,
- agent punya systemd `Restart=on-failure`; downtime hanya sepersekian menit.

Idealnya uji dulu di instance staging sebelum menyentuh produksi.

## 6. Rollback

Kembali ke tag sebelumnya bila ada masalah:

```bash
git checkout ji-tu-v<versi-sebelumnya>
# lalu restart service seperti di atas
```
