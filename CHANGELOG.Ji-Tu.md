# Changelog Ji-Tu

Catatan perubahan khusus fork **Ji-Tu** di atas basis
[smittix/intercept](https://github.com/smittix/intercept) (Apache-2.0).
Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/).
Riwayat perubahan upstream tetap di [CHANGELOG.md](CHANGELOG.md).

Basis fork: upstream `main` @ `7ff4f1d4`, di-fetch 2026-10-04.

## [Unreleased]

### Added
- Inisialisasi fork Ji-Tu dari `smittix/intercept`.
- Blok atribusi fork pada `README.md` (sesuai Pasal 4 Apache-2.0).
- Dokumen ruang lingkup `docs/JI-TU-RUANG-LINGKUP.md` yang menyelaraskan Ji-Tu
  dengan dokumen penelitian SIGINT/OMSP (modul, parameter sinyal, eksperimen E1-E5).
- Panduan deploy topologi 5 tahap `docs/JI-TU-DEPLOY-TOPOLOGI.md`
  (agent Raspberry Pi + ZeroTier + controller).
- Mode fokus UI: menyembunyikan modul di luar lingkup penelitian lewat blok CSS
  di `static/css/core/variables.css` (reversibel).
- Endpoint ekspor riset `GET /jitu/observations/export.csv` (`routes/jitu.py`):
  CSV observasi bertanda eksperimen dengan turunan jeda antarkedatangan dan laju
  pesan, dibangun di atas `utils/observations.py`.
- Jalur pengukuran karakteristik sinyal: `POST /jitu/measurements` (tabel
  `jitu_measurements`) dan `GET /jitu/measurements/export.csv` untuk parameter yang
  tidak ada di store observasi (ppm/lebar pita/duty/burst) — untuk E1/E4.
- Tombol "Unduh CSV" pada mode Activity untuk ekspor observasi dari UI.
- Instalasi terpisah per peran di `setup.sh`: `--role=controller` (web/dashboard
  saja, tanpa tool SDR) dan `--role=agent` dengan pilihan single/multi perangkat
  (`--device=rtlsdr|hackrf|ubertooth|wifi|gps`), environment agent lean via
  `requirements-agent.txt` (tanpa Flask), dan service systemd `ji-tu-agent`.
  Aditif: alur instalasi default tidak berubah.
- Tutorial menyeluruh berbahasa Indonesia `docs/PANDUAN-UNJAYA.md` untuk alur
  agent-controller Unjaya (controller, ZeroTier, agent single/multi perangkat,
  registrasi, operasi dashboard, ekspor data E1-E5, keamanan, pemecahan masalah).
- README: bagian Dokumentasi dipisah menjadi Panduan Unjaya (Indonesia) dan
  Referensi upstream (Inggris); About repo GitHub diperbarui ke Ji-Tu/Unjaya
  (deskripsi, homepage, topik).

### Changed
- Rebrand visual ke Unjaya: logo header, dashboard, dan login memakai
  `static/img/logo-unjaya.png`; favicon diwarnai ulang hijau.
- Palet warna mengikuti logo Unjaya (hijau `#006030` pada tema terang,
  `#2fae6e` pada tema gelap; keduanya lolos WCAG AA). Token diselaraskan di
  semua tema dan tier, termasuk salinan token di tiap CSS dashboard.
- Tema default diubah dari gelap ke terang; pengalih terang/gelap tetap ada.
- Skala data-viz (gradien kekuatan sinyal, heat tile, skala space-weather)
  sengaja dipertahankan agar maknanya tidak berubah.
- Nama tampilan produk diganti menjadi **Ji-Tu (Powered by iNTERCEPT)**: wordmark
  header, judul halaman, subtitle dashboard, dan kotak About. Atribusi "Powered by
  iNTERCEPT" dan tautan ke smittix/intercept dipertahankan. Identifier kode (kunci
  localStorage, nama logger, variabel `window.INTERCEPT_*`, path `/controller`,
  kelas CSS) tidak diubah.

### Notes
- Basis upstream bersifat receive-only (penerimaan sinyal siaran publik).
  Penambahan kemampuan transmisi aktif atau jamming memerlukan landasan
  perizinan spektrum dan izin lab tersendiri sebelum diaktifkan.
- Setiap berkas sumber yang diubah dari upstream sebaiknya memuat catatan
  singkat bahwa berkas tersebut dimodifikasi untuk Ji-Tu (Pasal 4(b) Apache-2.0).
