<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="static/img/logo-unjaya-white.png">
    <img src="static/img/logo-unjaya.png" alt="Universitas Jenderal Achmad Yani Yogyakarta (Unjaya)" width="320">
  </picture>
</p>

<h1 align="center">Ji-Tu</h1>
<p align="center"><em>Powered by iNTERCEPT</em></p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.9+-blue.svg" alt="Python 3.9+">
  <img src="https://img.shields.io/badge/license-Apache--2.0-green.svg" alt="Lisensi Apache 2.0">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux-lightgrey.svg" alt="Platform">
</p>

<p align="center">
  <strong>Ji-Tu (Powered by iNTERCEPT)</strong> - Platform Signal Intelligence<br>
  Antarmuka berbasis web untuk perangkat software-defined radio (SDR).
</p>

<p align="center">
  <img src="docs/images/intercept-main.png" alt="Tangkapan layar Ji-Tu">
</p>

<p align="center">
  Dukung pengembang proyek aslinya (iNTERCEPT)
</p>

<p align="center">
  <a href="https://www.buymeacoffee.com/smittix" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>
</p>

---

<!-- ji-tu:fork-notice:start -->
> **Catatan fork - Ji-Tu.** Repositori ini adalah turunan (fork) dari
> [smittix/intercept](https://github.com/smittix/intercept) ("iNTERCEPT"), yang
> dilisensikan Apache-2.0. Ji-Tu dipelihara di lingkungan Universitas Jenderal
> Achmad Yani Yogyakarta (Unjaya) dan dimodifikasi untuk menyesuaikan perangkat
> pendukung signal intelligence yang dimiliki serta kasus pengujian internal.
> Karya asli adalah hak cipta para kontributor iNTERCEPT. Perubahan khusus Ji-Tu
> dicatat di [CHANGELOG.Ji-Tu.md](CHANGELOG.Ji-Tu.md); teks lisensi penuh ada di
> [LICENSE](LICENSE).
<!-- ji-tu:fork-notice:end -->

---

## Yang membedakan Ji-Tu: arsitektur agent-controller (implementasi Unjaya)

Berbeda dari repo asli [smittix/intercept](https://github.com/smittix/intercept)
yang umumnya dijalankan pada satu mesin, implementasi di Unjaya memisahkan
**Agent** dan **Controller**:

- **Agent** - Raspberry Pi dengan perangkat SDR (RTL-SDR, HackRF, Ubertooth,
  WiFi, GPS) dan akses internet. Bisa **single-device** (mis. satu Pi khusus
  RTL-SDR, satu Pi khusus HackRF) atau **multi-device**. Agent menangkap sinyal
  dan mengirimkannya ke controller. Tiap agent otomatis melaporkan hanya mode
  yang perangkatnya tersedia.
- **Controller** - komputer/laptop berisi dashboard yang mengendalikan banyak
  agent. Tidak memerlukan perangkat SDR lokal.
- **ZeroTier** - overlay terenkripsi yang menghubungkan controller ke agent.

Alur lima tahap: Sumber RF → Sensor (USB) → Agent (Raspberry Pi) → ZeroTier →
Controller (laptop).

Instalasi terpisah per peran (lihat [Deploy Topologi](docs/JI-TU-DEPLOY-TOPOLOGI.md)):

```bash
# Controller (laptop) - dashboard saja, tanpa tool SDR lokal
./setup.sh --role=controller
sudo ./start.sh

# Agent (Raspberry Pi) - pilih single/multi perangkat
./setup.sh --role=agent                        # interaktif
./setup.sh --role=agent --device=rtlsdr        # satu perangkat
./setup.sh --role=agent --device="rtlsdr gps"  # beberapa perangkat
```

Penyelarasan dengan studi SIGINT/OMSP Unjaya: [Ruang Lingkup](docs/JI-TU-RUANG-LINGKUP.md).

---

## Fitur

- **Dekode Pager** - POCSAG/FLEX via rtl_fm + multimon-ng
- **Sensor 433MHz** - Stasiun cuaca, TPMS, perangkat IoT via rtl_433
- **Penganalisis Sub-GHz** - Perekaman RF dan dekode protokol untuk pita ISM 300-928 MHz via HackRF
- **Pelacakan Pesawat** - ADS-B via dump1090 dengan peta dan radar real-time
- **Pelacakan Kapal** - Pelacakan kapal AIS dengan pemantauan marabahaya VHF DSC
- **Pesan ACARS** - Pesan datalink pesawat via acarsdec
- **VDL2** - Dekode datalink pesawat VHF Data Link Mode 2 via dumpvdl2
- **Listening Post** - Pemindai frekuensi wideband dengan pemantauan audio real-time
- **Satelit Cuaca** - Dekode citra NOAA APT dan Meteor LRPT via SatDump dengan penjadwal otomatis
- **WebSDR** - Mendengarkan HF/gelombang pendek jarak jauh via jaringan KiwiSDR
- **ISS SSTV** - Penerimaan citra slow-scan TV dari International Space Station
- **HF SSTV** - SSTV terestrial pada frekuensi gelombang pendek (80m-10m, VHF, UHF)
- **APRS** - Laporan posisi dan telemetri radio paket amatir via direwolf
- **Pelacakan Satelit** - Prediksi lintasan dengan polar plot dan peta ground track
- **Meter Utilitas** - Pembacaan meter listrik, gas, dan air via rtlamr
- **Riwayat ADS-B** - Riwayat pesawat persisten dengan dashboard pelaporan (Postgres opsional)
- **Pemindaian WiFi** - Pengintaian mode monitor via aircrack-ng
- **Pemindaian Bluetooth** - Penemuan perangkat dan deteksi tracker (dengan dukungan Ubertooth)
- **BT Locate** - Pelokasian perangkat Bluetooth SAR dengan pemetaan jejak sinyal bertanda GPS dan peringatan kedekatan
- **WiFi Locate** - Lokasikan titik akses WiFi berdasarkan BSSID dengan meter sinyal real-time, estimasi jarak, dan audio kedekatan
- **GPS** - Pelacakan posisi GPS real-time dengan peta langsung, kecepatan, ketinggian, dan info satelit
- **TSCM** - Kontra-surveilans dengan perbandingan baseline RF dan deteksi ancaman
- **Meshtastic** - Integrasi jaringan mesh LoRa
- **Cuaca Antariksa** - Data surya dan geomagnetik real-time dari NOAA SWPC, NASA SDO, dan HamQSL (tanpa SDR)
- **Spy Stations** - Basis data number station dan jaringan HF diplomatik
- **Remote Agents** - SIGINT terdistribusi dengan node sensor jarak jauh
- **Mode Offline** - Aset terbundel untuk deployment air-gapped/lapangan
- **Drone Intelligence** - Deteksi UAV multi-vektor via ASTM F3411 Remote ID (WiFi/BLE), RF RTL-SDR 433/868 MHz, dan sweep HackRF 2.4/5.8 GHz dengan peta kontak langsung dan skor risiko

---

## Instalasi / Debian / Ubuntu / macOS

### Mulai Cepat

```bash
git clone https://github.com/milisdad/Ji-Tu.git
cd Ji-Tu
./setup.sh          # Menu interaktif (jalankan pertama memunculkan wizard setup)
sudo ./start.sh
```

Saat dijalankan pertama kali, `setup.sh` memunculkan **wizard terpandu** yang mendeteksi OS Anda, memilih profil instalasi, menyiapkan environment Python, dan opsional mengatur variabel environment serta PostgreSQL.

Pada menjalankan berikutnya, ia membuka **menu interaktif**:

```
INTERCEPT Setup Menu
════════════════════════════════════════
  1) Install / Add Modules
  2) System Health Check
  3) Database Setup (ADS-B History)
  4) Update Tools
  5) Environment Configurator
  6) Uninstall / Cleanup
  7) View Status
  0) Exit
```

> **Server produksi vs dev:** `start.sh` otomatis mendeteksi gunicorn + gevent dan menjalankan server produksi dengan cooperative greenlet - menangani banyak klien SSE/WebSocket tanpa memblokir. Jatuh kembali ke server dev Flask bila gunicorn tidak terpasang. Untuk pengembangan lokal cepat, Anda tetap bisa memakai `sudo -E venv/bin/python intercept.py` langsung.

### Profil Instalasi

Pilih apa yang dipasang saat wizard atau lewat menu opsi 1:

| # | Profil | Alat |
|---|--------|------|
| 1 | Core SIGINT | rtl_sdr, multimon-ng, rtl_433, dump1090, acarsdec, dumpvdl2, ffmpeg, gpsd |
| 2 | Maritim & Radio | AIS-catcher, direwolf |
| 3 | Cuaca & Antariksa | SatDump, radiosonde_auto_rx |
| 4 | Keamanan RF | aircrack-ng, HackRF, BlueZ, hcxtools, Ubertooth, SoapySDR |
| 5 | Full SIGINT | Semua di atas |
| 6 | Custom | Daftar centang per alat |

Beberapa profil bisa digabung (mis. masukkan `1 3` untuk Core + Cuaca).

### Opsi CLI

```bash
./setup.sh --non-interactive          # Instalasi penuh tanpa interaksi (seperti perilaku lama)
./setup.sh --profile=core,weather     # Pasang profil tertentu
./setup.sh --health-check             # Periksa kesehatan sistem lalu keluar
./setup.sh --postgres-setup           # Jalankan setup PostgreSQL lalu keluar
./setup.sh --menu                     # Paksa menu interaktif
```

### Docker

```bash
git clone https://github.com/milisdad/Ji-Tu.git
cd Ji-Tu
docker compose --profile basic up -d --build
```

> **Catatan:** Docker memerlukan mode privileged untuk akses USB SDR. Perangkat SDR diteruskan via `/dev/bus/usb`.

Untuk build multi-arsitektur (amd64 + arm64 untuk Raspberry Pi), lihat `build-multiarch.sh` - menangani kompilasi silang dan push registry dalam satu langkah.

### Konfigurasi Environment

Gunakan **Environment Configurator** (menu opsi 5) untuk mengatur variabel `INTERCEPT_*` secara interaktif. Pengaturan disimpan ke file `.env` yang otomatis dibaca `start.sh` saat startup.

Anda juga bisa membuat atau menyunting `.env` secara manual:

```bash
# .env (dimuat otomatis oleh start.sh)
INTERCEPT_PORT=5050
INTERCEPT_ADSB_AUTO_START=true
INTERCEPT_DEFAULT_LAT=51.5074
INTERCEPT_DEFAULT_LON=-0.1278
```

### Riwayat ADS-B (Opsional)

Fitur riwayat ADS-B menyimpan pesan pesawat ke PostgreSQL untuk analisis jangka panjang.

**Setup otomatis (instalasi lokal):**

```bash
./setup.sh --postgres-setup
# Atau pakai menu opsi 3: Database Setup
```

Ini akan memasang PostgreSQL bila perlu, membuat database/user/tabel, dan menulis pengaturan koneksi ke `.env`.

**Docker:**

```bash
docker compose --profile history up -d
```

Setel variabel environment berikut (di `.env`):

```bash
INTERCEPT_ADSB_HISTORY_ENABLED=true
INTERCEPT_ADSB_DB_HOST=adsb_db
INTERCEPT_ADSB_DB_PORT=5432
INTERCEPT_ADSB_DB_NAME=intercept_adsb
INTERCEPT_ADSB_DB_USER=intercept
INTERCEPT_ADSB_DB_PASSWORD=intercept
```

Untuk menyimpan data Postgres di penyimpanan eksternal, setel `PGDATA_PATH` (default `./pgdata`):

```bash
PGDATA_PATH=/mnt/usbpi1/intercept/pgdata
```

Lalu buka **/adsb/history** untuk dashboard pelaporan.

### Pemeriksaan Kesehatan Sistem

Verifikasi instalasi Anda lengkap dan berfungsi:

```bash
./setup.sh --health-check
# Atau pakai menu opsi 2
```

Memeriksa alat terpasang, perangkat SDR, ketersediaan port, izin, venv Python, konfigurasi `.env`, dan konektivitas PostgreSQL.

### Membuka Antarmuka

Setelah dijalankan, buka **http://localhost:5050** di browser Anda.

**Tidak ada kata sandi default.** Pada start pertama, Ji-Tu membuat satu kata sandi untuk akun `admin`, mencatatnya di log, dan menuliskannya ke `instance/.initial_password`. Masuk dengan itu, lalu Anda diminta menetapkan kata sandi sendiri sebelum antarmuka terbuka.

Untuk menentukan sendiri di awal, setel `INTERCEPT_ADMIN_PASSWORD` sebelum start pertama. Lihat [Keamanan](docs/SECURITY.md#authentication) untuk detail dan alasan penggantian default `admin`/`admin` sebelumnya.

---

## Kebutuhan Perangkat Keras

| Perangkat | Fungsi | Harga |
|-----------|--------|-------|
| **RTL-SDR** | Wajib untuk semua fitur SDR | ~$25-35 |
| **Adapter WiFi** | Harus mendukung mode promiscuous (monitor) | ~$20-40 |
| **Adapter Bluetooth** | Pemindaian perangkat (umumnya bawaan) | - |
| **GPS** | Unit GPS apa pun yang didukung Linux | ~$10 |

Sebagian besar fitur bekerja dengan dongle RTL-SDR dasar (RTL2832U + R820T2).

> :exclamation: **Tidak memakai perangkat RTL-SDR?**
> Ji-Tu mendukung perangkat apa pun yang didukung SoapySDR. Namun Anda harus memasang modul yang sesuai untuk perangkat Anda. Misalnya untuk perangkat SDRplay, pasang `soapysdr-module-sdrplay`.

> :exclamation: **Penggunaan GPS**
> gpsd diperlukan untuk lokasi real-time. Ji-Tu otomatis memeriksa apakah gpsd berjalan di latar saat peta dirender.

---

## Server Discord

<p align="center">
  <a href="https://discord.gg/EyeksEJmWE">Gabung Discord kami</a>
</p>

---

## Dokumentasi

**Panduan Unjaya (Bahasa Indonesia):**

- [Panduan Unjaya (Agent-Controller)](docs/PANDUAN-UNJAYA.md) - tutorial menyeluruh end-to-end: controller, ZeroTier, agent single/multi perangkat, operasi dashboard, ekspor data
- [Ruang Lingkup Ji-Tu](docs/JI-TU-RUANG-LINGKUP.md) - penyelarasan dengan studi SIGINT/OMSP
- [Deploy Topologi Ji-Tu](docs/JI-TU-DEPLOY-TOPOLOGI.md) - topologi 5 tahap (agent + ZeroTier + controller)

**Referensi upstream (bahasa Inggris, bawaan iNTERCEPT):**

- [Usage Guide](docs/USAGE.md) - mekanik rinci tiap mode
- [Hardware Guide](docs/HARDWARE.md) - perangkat SDR, instalasi manual
- [Troubleshooting](docs/TROUBLESHOOTING.md) - masalah umum dan solusinya
- [Distributed Agents](docs/DISTRIBUTED_AGENTS.md) - arsitektur agent (teknis)
- [Webhooks](docs/WEBHOOKS.md) - aturan peringatan dan integrasi webhook
- [Security](docs/SECURITY.md) - keamanan jaringan dan praktik terbaik

---

## Penafian

Proyek ini dikembangkan dengan AI sebagai mitra pengodean, memadukan arahan manusia dengan implementasi berbantuan AI. Tujuannya: membuat Software Defined Radio lebih mudah diakses dengan antarmuka terpadu yang rapi untuk alat SDR umum.

**Perangkat lunak ini hanya untuk tujuan edukasi dan pengujian yang berwenang.**

- Gunakan hanya dengan otorisasi yang sah
- Menyadap komunikasi tanpa persetujuan dapat melanggar hukum
- Anda bertanggung jawab atas kepatuhan terhadap hukum yang berlaku

---

## Lisensi

Lisensi Apache 2.0 - lihat [LICENSE](LICENSE)

## Penulis

Proyek asli (iNTERCEPT) dibuat oleh **smittix** - [GitHub](https://github.com/smittix). Fork Ji-Tu dipelihara di lingkungan Universitas Jenderal Achmad Yani Yogyakarta (Unjaya).

## Penghargaan

[rtl-sdr](https://osmocom.org/projects/rtl-sdr/wiki) |
[multimon-ng](https://github.com/EliasOenal/multimon-ng) |
[rtl_433](https://github.com/merbanan/rtl_433) |
[dump1090](https://github.com/flightaware/dump1090) |
[AIS-catcher](https://github.com/jvde-github/AIS-catcher) |
[acarsdec](https://github.com/TLeconte/acarsdec) |
[direwolf](https://github.com/wb2osz/direwolf) |
[rtlamr](https://github.com/bemasher/rtlamr) |
[dumpvdl2](https://github.com/szpajder/dumpvdl2) |
[aircrack-ng](https://www.aircrack-ng.org/) |
[Leaflet.js](https://leafletjs.com/) |
[SatDump](https://github.com/SatDump/SatDump) |
[Celestrak](https://celestrak.org/) |
[Priyom.org](https://priyom.org/)
