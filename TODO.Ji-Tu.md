# TODO Ji-Tu

Pekerjaan yang **belum** dikerjakan pada deployment Ji-Tu Unjaya (controller +
dua agent). Diperbarui 2026-10-23. Yang sudah selesai dicatat di
[CHANGELOG.Ji-Tu.md](CHANGELOG.Ji-Tu.md).

Topologi acuan: controller `10.141.41.99:5050`, agent Ji-Tu-01
`10.141.41.17:8020` (RTL-SDR + Ubertooth + GPS u-blox 7), agent Ji-Tu-02
`10.141.41.18:8020` (HackRF One + WiFi Alfa AR9271), semuanya lewat overlay
ZeroTier.

## Hardening keamanan

- [ ] **Jadikan auth agent fail-closed.** `_check_ip_allowed()` di
  `intercept_agent.py` mengembalikan `True` ketika `allowed_ips` kosong,
  sedangkan agent mendengar di `0.0.0.0:8020` dan prosesnya berjalan sebagai
  root. Saat ini termitigasi karena `allowed_ips` sudah diisi di kedua agent,
  tetapi default ini membuat agent yang dideploy tanpa konfigurasi terbuka penuh
  bagi siapa pun yang dapat menjangkau portnya. Ubah agar menolak saat daftar
  kosong.
- [ ] **Batasi `:8020` dan `:5050` ke subnet ZeroTier** (aturan firewall, atau
  bind ke IP overlay alih-alih `0.0.0.0`). Perhatian: aturan firewall yang salah
  dapat memutus SSH ke mesin remote. Pasang aturan yang menjaga SSH lebih dulu
  dan verifikasi setiap langkah sebelum menerapkan kebijakan tolak.
- [ ] **Matikan `rpcbind` (:111) di Ji-Tu-01** bila tidak ada NFS/RPC yang
  memakainya. Port ini terbuka ke subnet dan tidak dibutuhkan oleh peran agent.
- [ ] **Tinjau konteks atribut di komponen lain.** `createMessageCard` di
  `static/js/components/signal-cards.js` (kartu pager) masih memakai
  `escapeHtml` untuk argumen `onclick` `muteAddress('...')` dengan
  `msg.address`. Pesan pager juga data RF, jadi vektornya sejenis dengan XSS
  APRS yang sudah ditutup di v2.34.9. Gunakan `escapeAttr` pada konteks
  atribut.
- [ ] **Periksa posture CSRF pada rute proxy.** Sebagian API JSON ditandai
  `csrf.exempt` dan mengandalkan cookie sesi. Pastikan rute POST proxy ke agent
  tidak dapat dipicu lintas situs.

## Operasional lapangan

- [ ] **Dapatkan GPS fix di Ji-Tu-01.** u-blox 7 ada di `/dev/ttyACM0` dan gpsd
  sudah berjalan, tetapi per 2026-10-23 status masih 22 satelit terlihat, 0
  terkunci, `fix_mode=1`. Perlu antena dengan pandangan langit terbuka. Posisi
  akan terisi otomatis begitu fix diperoleh.
- [ ] **Selaraskan versi agent bila diinginkan.** Controller di
  `ji-tu-v2.34.9`, kedua agent masih `ji-tu-v2.34.8`. Tambalan XSS hanya
  menyentuh JS yang disajikan controller, jadi agent tidak terdampak secara
  fungsi; penyelarasan hanya untuk keseragaman versi.
- [ ] **Kapabilitas agent dapat basi setelah perangkat dicabut.** Ketika HackRF
  dilepas dari Ji-Tu-02, `/capabilities` masih melaporkan `HackRF One` dan mode
  `sweep` hingga service di-restart, sehingga dashboard tetap menawarkan sweep
  yang akan gagal saat dijalankan. Pilihan: restart `ji-tu-agent` setiap kali
  perangkat berubah, atau tambahkan deteksi ulang kapabilitas secara berkala.

## Catatan tetap

- Transmisi (TX) memancarkan RF nyata. Pastikan izin frekuensi dan regulasi
  terpenuhi sebelum benar-benar memancar. Basis upstream bersifat receive-only.
