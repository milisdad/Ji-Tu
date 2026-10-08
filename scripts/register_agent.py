#!/usr/bin/env python3
"""Daftarkan (atau perbarui) sebuah agent pada controller INI.

Jalankan DI MESIN CONTROLLER (bukan dari jarak jauh), memakai Python venv repo:

    venv/bin/python scripts/register_agent.py Ji-Tu-01 http://10.141.41.17:8020 --api-key <KEY>

Catatan penting (temuan deployment):
- Controller menarik /capabilities dari agent; agent HARUS mengizinkan IP controller
  ini di `allowed_ips` (exact IP, bukan CIDR), kalau tidak capabilities gagal diambil.
- Untuk push data dari agent, `--api-key` WAJIB dan nilainya harus sama dengan
  `api_key` pada [controller] di konfig agent. Tanpa itu controller menolak push.
- Idempoten: jika nama agent sudah ada, datanya diperbarui, bukan diduplikasi.
"""
from __future__ import annotations

import argparse
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)
sys.path.insert(0, _ROOT)
os.chdir(_ROOT)

from utils.agent_client import AgentClient  # noqa: E402
from utils.database import create_agent, get_agent_by_name, update_agent  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description="Daftarkan agent ke controller ini.")
    ap.add_argument("name", help="Nama unik agent, mis. Ji-Tu-01")
    ap.add_argument("base_url", help="URL agent, mis. http://10.141.41.17:8020")
    ap.add_argument("--api-key", default=None,
                    help="Shared secret; WAJIB jika agent memakai push.")
    ap.add_argument("--description", default=None)
    args = ap.parse_args()

    caps = ifaces = None
    try:
        data = AgentClient(args.base_url, api_key=args.api_key).get_capabilities()
        caps = data.get("modes", {})
        ifaces = {"devices": data.get("devices", [])}
    except Exception as exc:  # noqa: BLE001
        print(
            f"PERINGATAN: gagal ambil capabilities ({type(exc).__name__}: {exc}). "
            "Agent tetap didaftarkan. Cek allowed_ips agent memuat IP controller ini "
            "dan jaringan overlay (ZeroTier) tersambung.",
            file=sys.stderr,
        )

    existing = get_agent_by_name(args.name)
    if existing:
        update_agent(
            existing["id"],
            base_url=args.base_url,
            api_key=args.api_key,
            description=args.description,
            capabilities=caps,
            interfaces=ifaces,
            update_last_seen=caps is not None,
        )
        agent_id = existing["id"]
        print(f"DIPERBARUI: {args.name} (id={agent_id})")
    else:
        agent_id = create_agent(
            name=args.name,
            base_url=args.base_url,
            api_key=args.api_key,
            description=args.description,
            capabilities=caps,
            interfaces=ifaces,
        )
        if caps is not None:
            update_agent(agent_id, update_last_seen=True)
        print(f"DIDAFTARKAN: {args.name} (id={agent_id})")

    if caps:
        print("  mode  :", ",".join(k for k, v in caps.items() if v))
    if ifaces and ifaces.get("devices"):
        print("  device:", ", ".join(str(d.get("name")) for d in ifaces["devices"]))
    if not args.api_key:
        print(
            "  CATATAN: tanpa --api-key, PUSH dari agent akan DITOLAK controller. "
            "Isi api_key sama di konfig agent lalu ulangi dengan --api-key."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
