# Ji-Tu — Panduan Deploy Topologi 5 Tahap

Panduan deploy testbed sesuai Bagian 5 [JI-TU-RUANG-LINGKUP.md](JI-TU-RUANG-LINGKUP.md).
Melengkapi [DISTRIBUTED_AGENTS.md](DISTRIBUTED_AGENTS.md) dengan overlay ZeroTier
dan pengerasan keamanan untuk skenario lapangan.

## Alur

```
Sumber RF -> Sensor (USB) -> Agent Raspberry Pi -> ZeroTier (overlay) -> Controller laptop
```

| Tahap | Komponen | Peran |
|---|---|---|
| 1 | Sumber RF | emisi yang diamati (UAV, ISM uji, ADS-B/AIS publik) |
| 2 | Sensor | RTL-SDR (24-1766 MHz) / HackRF (1 MHz-6 GHz) via USB |
| 3 | Agent | Raspberry Pi menjalankan `intercept_agent.py` (port 8020) |
| 4 | ZeroTier | overlay terenkripsi antar-situs |
| 5 | Controller | instance Ji-Tu penuh (port 5050), analisis + agregasi |

## 1. Controller (laptop)

Instal peran controller (web/dashboard saja, tanpa tool SDR lokal):

```bash
./setup.sh --role=controller
sudo ./start.sh            # server di http://localhost:5050
```

Halaman kelola agent ada di `/controller/manage`, monitor multi-agent di
`/controller/monitor`.

## 2. Agent (Raspberry Pi)

Instal peran agent. Agent bisa **single-device** (mis. satu Pi RTL-SDR, satu Pi
HackRF) atau **multi-device**. Instalasi hanya memasang tool perangkat yang
dipilih, environment agent lean (tanpa Flask), dan opsi service systemd
`ji-tu-agent`:

```bash
./setup.sh --role=agent                        # interaktif: single/multi + perangkat
./setup.sh --role=agent --device=rtlsdr        # non-interaktif, satu perangkat
./setup.sh --role=agent --device="rtlsdr gps"  # beberapa perangkat
```

Perangkat yang dikenali: `rtlsdr`, `hackrf`, `ubertooth`, `wifi`, `gps`.

Lalu konfigurasikan agent:

1. Salin `intercept_agent.cfg`, sesuaikan:
   - `[agent] name` = nama node (mis. `pi-perimeter-1`), `port = 8020`.
   - `[agent] allowed_ips` = IP **persis** controller (pencocokan eksak, bukan CIDR; pisah koma untuk beberapa), atau kosongkan untuk izinkan semua peer overlay.
   - `[controller] url` = `http://<ip-zerotier-controller>:5050`.
   - `[controller] api_key` = kunci rahasia bersama (wajib diisi, lihat Keamanan).
   - `[controller] push_enabled = true`, `push_interval` sesuai kebutuhan.
2. Jalankan `intercept_agent.py` pada Pi dengan SDR terpasang, atau lewat
   service: `sudo systemctl start ji-tu-agent`.

## 3. ZeroTier (overlay)

1. Buat satu network ZeroTier; catat Network ID.
2. Install `zerotier-one` di controller dan tiap Pi; `zerotier-cli join <network-id>`.
3. Authorize tiap anggota di kontrol ZeroTier; catat IP overlay (mis. `10.244.x.x`).
4. Gunakan IP overlay pada `[controller] url` dan `allowed_ips` agent.

Overlay membuat trafik agent-controller terenkripsi dan tidak terekspos ke LAN
publik, sesuai topologi dokumen penelitian.

## 4. Keamanan (wajib sebelum lapangan)

- **API key tiap agent**: isi `[controller] api_key`; controller memaksa auth di
  `routes/controller.py` (`require_controller_auth`).
- **Batasi IP**: `allowed_ips` agent hanya rentang ZeroTier; jangan `allow_cors`
  kecuali perlu.
- **Ganti password admin** controller; jangan pakai default.
- **Jangan ekspos port 8020/5050** ke internet; akses hanya lewat overlay.
- Rujukan: [SECURITY.md](SECURITY.md). Versi Ji-Tu v2.33.77 sudah menutup celah
  endpoint tanpa auth pada versi < v2.33.14.

## 5. Pemetaan ke eksperimen

- E2 (ADS-B & AIS), E3 (UAV), E4 (baseline/anomali): agent di perimeter mengirim
  observasi ke controller untuk analisis dan ekspor.
- E5 (sumber daya): pantau CPU/RAM/suhu Pi lewat mode `system` (Health) pada agent.

> Catatan: validasi end-to-end (agent -> ZeroTier -> controller) harus diuji di
> lingkungan nyata; angka throughput/latensi diverifikasi, bukan diasumsikan.
