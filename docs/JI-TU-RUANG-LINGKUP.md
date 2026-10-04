# Ji-Tu — Ruang Lingkup & Peta Implementasi

Dokumen ini menerjemahkan dokumen kerja penelitian *"Implementasi SIGINT Berbasis
SDR untuk Monitoring dan Analisis Karakteristik Sinyal Nirkabel pada Skenario
OMSP"* menjadi spesifikasi kerja untuk fork **Ji-Tu** (turunan
[smittix/intercept](https://github.com/smittix/intercept), Apache-2.0).

Dokumen penelitian adalah acuan ilmiah; file ini adalah acuan teknis. Perubahan
scope penelitian harus dicerminkan di sini.

> Status platform: Ji-Tu **bukan instrumen terkalibrasi**. Platform ini
> menggabungkan alat yang sudah ada dan dikembangkan dengan bantuan AI, sehingga
> setiap hasil wajib divalidasi dengan pembanding independen, dan setiap angka
> diverifikasi ulang sebelum dijadikan klaim.

## 1. Tujuan dan posisi

Ji-Tu diposisikan sebagai **alat uji berbasis signal intelligence** untuk
**evaluasi kinerja platform pada testbed** yang meniru skenario pengamanan objek
vital, di bawah payung Operasi Militer Selain Perang (OMSP). Kontribusi penelitian
bukan "membangun sistem SIGINT", melainkan mengukur kinerja rangkaian terintegrasi
secara kuantitatif pada perangkat berbiaya rendah.

Keabsahan klaim ditentukan oleh **sumber data** (testbed kampus atas izin), bukan
afiliasi institusi. Komunikasi taktis modern umumnya terenkripsi dan tidak didekode
alat open-source; karena itu Ji-Tu tidak menyentuh isi komunikasi.

## 2. Definisi "karakteristik sinyal"

Yang dianalisis adalah **parameter luar pancaran**, bukan isi komunikasi. Ini
membuat penelitian terukur sekaligus aman secara regulasi.

| Parameter | Satuan | Catatan |
|---|---|---|
| Frekuensi pusat | MHz | |
| Penyimpangan frekuensi | ppm | relatif ke referensi (E1) |
| Lebar pita | kHz/MHz | |
| RSSI / SNR | dB | |
| Duty cycle | % | |
| Durasi burst | ms | |
| Jeda antarkedatangan | ms/s | inter-arrival |
| Laju pesan | pesan/menit | |

## 3. Modul yang dipakai (fokus) — spesifikasi Track B

Dokumen menetapkan **fokus 2-3 modul**, bukan seluruh fitur. Pemetaan ke mode nav
Ji-Tu (lihat `templates/partials/nav.html`):

**Inti (ditonjolkan):**
- Deteksi UAV: `drone` (Drone Intel) — Remote ID ASTM F3411 via WiFi/BLE dan sweep
  energi RF. Pendukung: `wifi`, `bluetooth`, `wifi_locate`, `bt_locate`.
- TSCM baseline-anomali: `tscm`, `tscmsurvey`.
- Kesadaran situasi: `adsb` (Aircraft), `ais` (Vessels).
- Karakterisasi sinyal: `subghz`, `waterfall`, Signal ID, `activity`.
- Sumber daya perangkat lapangan (E5): `system` (Health).

**Di luar fokus (disembunyikan/diturunkan di Track B):** grup `space` (satellite,
weathersat, sstv, wefax, sstv_general, spaceweather, meteor), grup `lora`
(meshtastic, meshcore), serta `aprs`, `gps`, `radiosonde`, `pager`, `sensor`,
`rtlamr`, `morse`, `ook`, `spystations`, `websdr`.

Penyembunyian bersifat reversibel dan tidak menghapus kode modul.

## 4. Perangkat keras

| Perangkat | Rentang | Peran |
|---|---|---|
| RTL-SDR | 24–1766 MHz, lebar pita 2,4 MHz | ADS-B, AIS, ISM sub-GHz, baseline |
| HackRF | 1 MHz–6 GHz | sweep drone 2,4/5,8 GHz |
| Raspberry Pi | — | agent lapangan (akuisisi + pemrosesan) |

Rujukan perangkat lengkap: [HARDWARE.md](HARDWARE.md).

## 5. Topologi sistem (5 tahap) — spesifikasi Track D

```
Sumber RF -> Sensor (akuisisi USB) -> Agent Raspberry Pi (pemrosesan)
          -> ZeroTier (overlay terenkripsi) -> Controller laptop (analisis)
```

Ji-Tu sudah mendukung remote agent + controller (`routes/controller.py`,
`intercept_agent.py`). Track D menyiapkan konfigurasi/panduan deploy di atas
overlay ZeroTier. Rujukan: [DISTRIBUTED_AGENTS.md](DISTRIBUTED_AGENTS.md).

## 6. Eksperimen E1–E5 — spesifikasi Track C

| Kode | Eksperimen | Metrik utama | Keluaran yang perlu dicatat Ji-Tu |
|---|---|---|---|
| E1 | Kalibrasi penyimpangan frekuensi RTL-SDR & HackRF terhadap referensi | ppm, stabilitas | ppm per perangkat, deret waktu |
| E2 | ADS-B & AIS vs data pembanding publik | rasio target, jangkauan, interval pembaruan | log kontak + timestamp |
| E3 | Deteksi UAV (variasi jarak/ketinggian; Remote ID vs energi RF) | P<sub>d</sub>, P<sub>fa</sub>, waktu deteksi | event deteksi + ground truth |
| E4 | Baseline & anomali (emisi ISM uji terjadwal acak/blind) | P<sub>d</sub>, latensi anomali | baseline RF + event anomali |
| E5 | Sumber daya Raspberry Pi | utilisasi CPU/RAM, suhu, throttling | telemetri sistem |

Track C memastikan parameter Bagian 2 dan metrik di atas tercatat dan dapat
diekspor (mis. CSV) dengan timestamp dan penanda eksperimen, agar P<sub>d</sub>/P<sub>fa</sub>
dapat dihitung objektif (jadwal emisi uji dibuat blind terhadap pengamat).

**Sudah tersedia:** endpoint ekspor CSV `GET /jitu/observations/export.csv`
(`routes/jitu.py`), dibangun di atas store `utils/observations.py`. Parameter:
`exp` (penanda eksperimen), `source` (mis. `adsb,ais,drone`), `since`/`until`
(epoch) atau `hours`. Kolom: timestamp, source, identifier, entity, RSSI, lat/lon,
plus turunan `inter_arrival_s` dan `group_msg_rate_per_min`. Melayani E2 langsung
dan E3/E4 pada level event.

**Belum (increment berikut):** parameter yang tidak ada di store observasi —
penyimpangan frekuensi (ppm, E1), lebar pita, duty cycle, durasi burst — perlu
instrumentasi per-mode (subghz/waterfall/kalibrasi). Sengaja tidak dipalsukan.

## 7. Keamanan dan kepatuhan

- **Versi:** Ji-Tu pada v2.33.77 (`config.py`), di atas syarat minimum v2.33.14+.
- **Autentikasi controller:** `routes/controller.py` menerapkan
  `require_controller_auth()` pada `before_request`; celah endpoint tanpa auth di
  versi lama sudah tertutup. Rujukan: [SECURITY.md](SECURITY.md).
- **Operasional deploy:** pasang API key tiap agent, ganti password admin, batasi
  akses port ke overlay ZeroTier.
- **Jangkar hukum OMSP:** tugas "mengamankan objek vital nasional yang bersifat
  strategis" (Pasal 7 ayat (2) huruf b angka 5, UU TNI perubahan UU 3/2025).
  Peran siber TNI bersifat membantu; posisikan sebagai konteks pendukung dan
  periksa status putusan MK terbaru sebelum naskah dikirim.
- **Etika:** semua pengujian atas izin pengelola area; emitter uji memakai
  perangkat ISM legal; tidak mendekode isi komunikasi.

## 8. Peta kerja

| Track | Isi | Status |
|---|---|---|
| A | Dokumen scope ini | selesai |
| B | Fokus modul UI (Bagian 3) | selesai — CSS fokus di `static/css/core/variables.css` |
| C | Pencatatan & ekspor karakteristik sinyal (Bagian 6) | sebagian — ekspor CSV observasi selesai (`routes/jitu.py`); instrumentasi per-mode (ppm/lebar pita/duty/burst) belum |
| D | Panduan deploy topologi 5 tahap (Bagian 5) | selesai — [JI-TU-DEPLOY-TOPOLOGI.md](JI-TU-DEPLOY-TOPOLOGI.md) |

Perubahan khusus fork dicatat di [../CHANGELOG.Ji-Tu.md](../CHANGELOG.Ji-Tu.md).
