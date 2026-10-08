# Panduan Ji-Tu untuk Unjaya (Agent-Controller)

Tutorial menyeluruh penggunaan **Ji-Tu (Powered by iNTERCEPT)** sesuai implementasi
di Universitas Jenderal Achmad Yani Yogyakarta (Unjaya): satu **controller**
(dashboard) mengendalikan banyak **agent** (Raspberry Pi + SDR) melalui overlay
**ZeroTier**.

Panduan ini menggantikan tutorial satu-mesin bawaan untuk kebutuhan Unjaya.
Untuk mekanik per-mode (ADS-B, AIS, dll.) yang tidak berubah, rujuk
[USAGE.md](USAGE.md) (referensi upstream, bahasa Inggris). Lingkup dan dasar
penelitian ada di [JI-TU-RUANG-LINGKUP.md](JI-TU-RUANG-LINGKUP.md); rincian
topologi di [JI-TU-DEPLOY-TOPOLOGI.md](JI-TU-DEPLOY-TOPOLOGI.md).

## Daftar isi

1. [Ikhtisar arsitektur](#1-ikhtisar-arsitektur)
2. [Prasyarat](#2-prasyarat)
3. [Langkah 1 - Siapkan Controller](#3-langkah-1---siapkan-controller)
4. [Langkah 2 - Siapkan ZeroTier](#4-langkah-2---siapkan-zerotier)
5. [Langkah 3 - Siapkan Agent (single/multi perangkat)](#5-langkah-3---siapkan-agent-singlemulti-perangkat)
6. [Langkah 4 - Daftarkan Agent di Controller](#6-langkah-4---daftarkan-agent-di-controller)
7. [Langkah 5 - Operasikan dari Dashboard](#7-langkah-5---operasikan-dari-dashboard)
8. [Langkah 6 - Ekspor data riset (E1-E5)](#8-langkah-6---ekspor-data-riset-e1-e5)
9. [Keamanan](#9-keamanan)
10. [Pemecahan masalah](#10-pemecahan-masalah)

## 1. Ikhtisar arsitektur

```
Sumber RF -> Sensor (USB) -> Agent (Raspberry Pi) -> ZeroTier -> Controller (laptop)
```

- **Agent**: Raspberry Pi dengan satu atau beberapa perangkat SDR. Bisa
  terspesialisasi: satu Pi khusus RTL-SDR, satu Pi khusus HackRF, dan seterusnya.
  Agent otomatis melaporkan hanya mode yang perangkatnya tersedia.
- **Controller**: laptop/komputer berisi dashboard yang mengagregasi dan
  mengendalikan agent. Tidak perlu SDR lokal.
- **ZeroTier**: jaringan overlay terenkripsi antar lokasi, sehingga controller
  menjangkau agent lewat IP overlay tanpa ekspos ke internet publik.

## 2. Prasyarat

- Controller: Linux atau macOS, Python 3.9+.
- Tiap agent: Raspberry Pi (Debian/Raspberry Pi OS), Python 3.9+, akses internet,
  perangkat SDR terpasang (RTL-SDR / HackRF / Ubertooth / adapter WiFi mode
  monitor / GPS).
- Akun ZeroTier dan satu Network ID.

## 3. Langkah 1 - Siapkan Controller

Di laptop controller:

```bash
git clone https://github.com/milisdad/Ji-Tu.git
cd Ji-Tu
./setup.sh --role=controller      # pasang web/dashboard, tanpa tool SDR
sudo ./start.sh                   # server di http://localhost:5050
```

Pada start pertama, Ji-Tu membuat kata sandi `admin` dan menuliskannya ke
`instance/.initial_password`. Masuk, lalu tetapkan kata sandi sendiri.

## 4. Langkah 2 - Siapkan ZeroTier

Di controller dan setiap agent:

```bash
curl -s https://install.zerotier.com | sudo bash
sudo zerotier-cli join <NETWORK_ID>
```

Setujui setiap anggota di kontrol panel ZeroTier, lalu catat IP overlay tiap
node (mis. `10.244.x.x`). IP inilah yang dipakai controller untuk menjangkau
agent. Semua langkah berikut memakai IP overlay, bukan IP LAN.

## 5. Langkah 3 - Siapkan Agent (single/multi perangkat)

Di tiap Raspberry Pi:

```bash
git clone https://github.com/milisdad/Ji-Tu.git
cd Ji-Tu

# Interaktif: pilih single atau multi, lalu pilih perangkat
./setup.sh --role=agent

# Atau non-interaktif:
./setup.sh --role=agent --device=rtlsdr          # Pi khusus RTL-SDR
./setup.sh --role=agent --device=hackrf          # Pi khusus HackRF
./setup.sh --role=agent --device="rtlsdr gps"    # beberapa perangkat
```

Perangkat yang dikenali: `rtlsdr`, `hackrf`, `ubertooth`, `wifi`, `gps`.
Instalasi hanya memasang tool perangkat yang dipilih, environment agent lean
(tanpa Flask), dan opsi service systemd `ji-tu-agent`.

Konfigurasikan `intercept_agent.cfg`:

```ini
[agent]
name = pi-rtlsdr-1            # nama unik tiap node
port = 8020
allowed_ips = 10.141.41.23   # IP PERSIS controller (pencocokan eksak, BUKAN CIDR; pisah koma untuk beberapa). Kosongkan = izinkan semua

[controller]
url = http://10.244.0.10:5050   # IP ZeroTier controller
api_key = ganti-dengan-kunci-rahasia
push_enabled = true
push_interval = 5
```

Jalankan agent:

```bash
venv/bin/python intercept_agent.py --config intercept_agent.cfg
# atau sebagai service:
sudo systemctl start ji-tu-agent
sudo systemctl status ji-tu-agent
```

Ulangi untuk tiap Pi dengan `name` dan perangkat berbeda (mis. `pi-hackrf-1`,
`pi-gps-1`).

## 6. Langkah 4 - Daftarkan Agent di Controller

Di dashboard controller, buka **`/controller/manage`** dan tambahkan tiap agent:

- **Base URL**: `http://<ip-zerotier-agent>:8020`
- **API key**: sama dengan `intercept_agent.cfg`

Controller akan menarik kapabilitas agent dan menampilkan hanya mode yang
perangkatnya ada. Pantau semua agent di **`/controller/monitor`**.

## 7. Langkah 5 - Operasikan dari Dashboard

- Pemilih agent di dashboard untuk berpindah antar node.
- Controller dapat memulai/menghentikan mode pada agent tertentu (mis. mulai
  ADS-B di `pi-rtlsdr-1`, sweep drone di `pi-hackrf-1`).
- Data dari semua agent teragregasi di controller untuk analisis.

## 8. Langkah 6 - Ekspor data riset (E1-E5)

Untuk rangkaian eksperimen di [JI-TU-RUANG-LINGKUP.md](JI-TU-RUANG-LINGKUP.md):

- **Observasi** (E2/E3/E4): mode Activity punya tombol **"Unduh CSV"**, atau
  langsung `GET /jitu/observations/export.csv?exp=E2&hours=1`. Kolom memuat
  timestamp, source, identifier, RSSI, lat/lon, plus turunan jeda antarkedatangan
  dan laju pesan.
- **Pengukuran** (E1 kalibrasi ppm, lebar pita, duty cycle, burst): kirim via
  `POST /jitu/measurements` (JSON), ekspor via
  `GET /jitu/measurements/export.csv?exp=E1`.

Beri `exp` berbeda tiap eksperimen agar mudah dipisah saat analisis.

## 9. Keamanan

- Isi `api_key` tiap agent; controller memaksa autentikasi pada `/controller/*`.
- `allowed_ips` agent diisi IP persis controller (eksak, bukan CIDR); jangan aktifkan `allow_cors`
  tanpa alasan.
- Ganti kata sandi `admin` controller; jangan pakai default.
- Jangan ekspos port 8020/5050 ke internet; akses hanya lewat overlay ZeroTier.
- Rujuk [SECURITY.md](SECURITY.md).

## 10. Pemecahan masalah

- **Agent tidak muncul / offline di controller**: pastikan `zerotier-cli listnetworks`
  menunjukkan status OK di kedua sisi, dan `http://<ip-zerotier-agent>:8020`
  terjangkau dari controller (`curl`). Periksa `allowed_ips`.
- **Mode tidak muncul untuk sebuah agent**: perangkat/driver belum terpasang di
  Pi itu. Jalankan ulang `./setup.sh --role=agent --device=<perangkat>` dan cek
  `sudo systemctl status ji-tu-agent`.
- **SDR tak terdeteksi**: pada Debian, pastikan driver dan aturan udev terpasang
  (ikut saat instal `rtlsdr`), dan modul kernel yang bentrok di-blacklist.
- **Log agent**: `journalctl -u ji-tu-agent -f`.

## 11. Catatan deployment (temuan lapangan)

Pelajaran dari implementasi nyata controller-agent. Mengikuti ini membuat clone
dan deploy berikutnya mulus.

- **Jalankan controller sebagai service, bukan manual.** `setup.sh --role=controller`
  kini memasang service systemd `jitu` (auto-start + auto-restart, jalan sebagai user
  pemanggil). Kelola dengan `sudo systemctl {start,restart,status} jitu` dan
  `journalctl -u jitu -f`. Menjalankan manual dari terminal (`./start.sh`) rawan:
  proses mati saat sesi tertutup, dan `git checkout` tidak otomatis termuat sampai
  proses di-restart.
- **Ubuntu butuh paket venv.** Sebelum `python3 -m venv`, paket `python3-venv`
  (mis. `python3.12-venv`) harus terpasang. `setup.sh` menanganinya; jika memasang
  manual: `sudo apt install python3-venv python3-pip`.
- **Satu agent bisa melayani banyak controller (mis. primer + cadangan).** Tambahkan
  SEMUA IP controller ke `allowed_ips` agent (eksak, dipisah koma, bukan CIDR).
  Tarik data (PULL/dashboard) cukup izin IP; dorong data (PUSH) perlu api_key cocok.
- **Push mode harus selaras di dua sisi.** Di `intercept_agent.cfg`: `push_enabled=true`,
  `url` menunjuk controller aktif, dan `api_key` **non-kosong**. Controller MENOLAK push
  bila api_key agent kosong atau tidak sama dengan yang tersimpan saat registrasi.
  Endpoint: `POST {url}/controller/api/ingest` dengan header `X-API-Key`.
- **Registrasi agent via CLI (idempoten), dijalankan di mesin controller:**
  ```bash
  venv/bin/python scripts/register_agent.py Ji-Tu-01 http://<ip-agent>:8020 --api-key <key>
  ```
  Alternatif UI: `/controller/manage`.
- **Operasi SDR: pakai halaman controller, bukan halaman SDR lokal.** Controller murni
  dashboard tak punya SDR, jadi menu "Spectrum Waterfall / Local SDR" tidak jalan di
  sana. Operasikan SDR agent lewat `/controller/manage` dan `/controller/monitor`
  (controller mem-proxy start/stop/stream mode ke agent). Spectrum waterfall dan tuning
  real-time BUKAN mode agent; itu fitur SDR lokal yang butuh aplikasi penuh di mesin
  yang SDR-nya tertancap langsung.
- **Pindah/ganti controller.** Ubah `url` push di tiap agent ke controller baru lalu
  `sudo systemctl restart ji-tu-agent`; daftarkan agent di controller baru; pastikan
  `allowed_ips` agent memuat IP controller baru.
- **Baca DB saat service hidup.** SQLite memakai mode WAL; `sqlite3` CLI bisa tampak
  kosong saat service memegang lock. Baca lewat aplikasi (`utils.database.get_db()`),
  bukan hanya file `intercept.db` mentah.
