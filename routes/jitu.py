"""Ji-Tu research export endpoints.

Fork-specific routes that serve the testbed study in docs/JI-TU-RUANG-LINGKUP.md.
Built on the existing observation store (utils/observations.py), so nothing in
the capture path changes: this reads what the modes already record and exports it
with an experiment tag and derived timing metrics for E2/E3/E4 analysis.

Signal parameters that the observation store does not hold (frequency offset ppm,
bandwidth, duty cycle, burst duration) need per-mode instrumentation; they are the
next increment of Track C and are intentionally absent here rather than faked.
"""

from __future__ import annotations

import csv
import io
import time
from datetime import datetime, timezone

from flask import Blueprint, Response, request

from utils import observations

jitu_bp = Blueprint("jitu", __name__, url_prefix="/jitu")

_EXPORT_PAGE = 1000          # observations.query() clamps to this
_EXPORT_MAX_ROWS = 20000     # bound memory for a single export


def _clean_tag(value: str | None) -> str:
    """Experiment tag, limited to a safe short token (e.g. E2, baseline-01)."""
    if not value:
        return ""
    keep = [c for c in value.strip() if c.isalnum() or c in "-_."]
    return "".join(keep)[:32]


def _fetch_all(sources, since, until):
    """All observations in the window, paging past query()'s 1000-row clamp.

    Pages by a descending ts cursor. Rows sharing the boundary timestamp may be
    dropped at a page edge; acceptable for a bounded testbed export.
    """
    rows: list[dict] = []
    cursor_until = until
    while len(rows) < _EXPORT_MAX_ROWS:
        batch = observations.query(
            source=sources or None, since=since, until=cursor_until, limit=_EXPORT_PAGE
        )
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < _EXPORT_PAGE:
            break
        cursor_until = batch[-1]["ts"] - 1e-6  # newest-first: last row is oldest
    return rows[:_EXPORT_MAX_ROWS]


def _derive(rows):
    """Add inter_arrival_s (per row, same source+identifier) and
    group_msg_rate_per_min (per source+identifier over the exported span)."""
    by_key: dict[tuple, list[dict]] = {}
    for r in rows:
        by_key.setdefault((r["source"], r["identifier"]), []).append(r)
    for group in by_key.values():
        group.sort(key=lambda r: r["ts"])  # ascending for gaps
        prev = None
        for r in group:
            r["inter_arrival_s"] = None if prev is None else round(r["ts"] - prev, 3)
            prev = r["ts"]
        span = group[-1]["ts"] - group[0]["ts"]
        rate = round(len(group) / (span / 60.0), 3) if span > 0 else None
        for r in group:
            r["group_msg_rate_per_min"] = rate
    return rows


@jitu_bp.route("/observations/export.csv", methods=["GET"])
def export_observations_csv() -> Response:
    """Export observations as CSV for research analysis.

    Query params:
      exp     experiment tag written into every row (e.g. E2)
      source  comma-separated modes (e.g. adsb,ais,drone); empty = all
      hours   window size ending now (default 1); ignored if since/until given
      since   epoch seconds (overrides hours)
      until   epoch seconds (default now)
    """
    exp = _clean_tag(request.args.get("exp"))
    sources = [s.strip() for s in (request.args.get("source") or "").split(",") if s.strip()]

    now = time.time()
    try:
        until = float(request.args["until"]) if request.args.get("until") else now
    except (TypeError, ValueError):
        until = now
    if request.args.get("since"):
        try:
            since = float(request.args["since"])
        except (TypeError, ValueError):
            since = None
    else:
        try:
            hours = float(request.args.get("hours", "1"))
        except (TypeError, ValueError):
            hours = 1.0
        since = until - max(0.0, hours) * 3600.0

    rows = _derive(_fetch_all(sources, since, until))
    rows.sort(key=lambda r: r["ts"])  # chronological for analysis

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "experiment", "ts_iso", "ts_epoch", "source", "identifier", "entity",
        "rssi_db", "lat", "lon", "inter_arrival_s", "group_msg_rate_per_min", "summary",
    ])
    for r in rows:
        iso = datetime.fromtimestamp(r["ts"], tz=timezone.utc).isoformat()
        writer.writerow([
            exp, iso, round(r["ts"], 3), r["source"], r["identifier"], r.get("entity"),
            r.get("rssi"), r.get("lat"), r.get("lon"),
            r.get("inter_arrival_s"), r.get("group_msg_rate_per_min"), r.get("summary"),
        ])

    stamp = datetime.fromtimestamp(now, tz=timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    fname = f"jitu_obs_{exp or 'all'}_{stamp}.csv"
    return Response(
        buf.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


# =============================================================================
# Signal-characteristic measurements (parameters the observation store lacks)
#
# The observation store holds a sighting plus RSSI. The study also needs the
# external transmission parameters that only specific producers can supply:
# frequency offset (ppm, E1 calibration), bandwidth, duty cycle, burst duration.
# This is their data path: any mode or an external calibration/anomaly script
# POSTs a measurement, and the CSV export feeds analysis. No capture-path code
# is edited here, so nothing is faked; producers hook in where the value exists.
# =============================================================================

_MEASURE_NUM = (
    "freq_mhz", "ppm", "bandwidth_hz", "rssi_db", "snr_db", "duty_cycle", "burst_ms",
)


def _num(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _str_or_none(value, limit):
    return str(value)[:limit] if value is not None else None


def _ensure_measurements_table() -> None:
    from utils.database import get_db

    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS jitu_measurements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts REAL NOT NULL,
                experiment TEXT, device TEXT, source TEXT,
                freq_mhz REAL, ppm REAL, bandwidth_hz REAL,
                rssi_db REAL, snr_db REAL, duty_cycle REAL, burst_ms REAL,
                note TEXT
            )
            """
        )


@jitu_bp.route("/measurements", methods=["POST"])
def add_measurement():
    """Record one signal-characteristic measurement (JSON body).

    Fields (all optional except that at least one numeric should be given):
      experiment, device, source, note (text)
      freq_mhz, ppm, bandwidth_hz, rssi_db, snr_db, duty_cycle, burst_ms (numeric)
      ts (epoch seconds; defaults to now)
    """
    from utils.database import get_db

    data = request.get_json(silent=True) or {}
    row = {
        "ts": _num(data.get("ts")) or time.time(),
        "experiment": _clean_tag(data.get("experiment")),
        "device": _str_or_none(data.get("device"), 64),
        "source": _str_or_none(data.get("source"), 64),
        "note": _str_or_none(data.get("note"), 200),
    }
    for k in _MEASURE_NUM:
        row[k] = _num(data.get(k))

    _ensure_measurements_table()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO jitu_measurements "
            "(ts, experiment, device, source, freq_mhz, ppm, bandwidth_hz, "
            " rssi_db, snr_db, duty_cycle, burst_ms, note) VALUES "
            "(:ts, :experiment, :device, :source, :freq_mhz, :ppm, :bandwidth_hz, "
            " :rssi_db, :snr_db, :duty_cycle, :burst_ms, :note)",
            row,
        )
    return {"status": "ok", "ts": row["ts"], "experiment": row["experiment"]}, 201


@jitu_bp.route("/measurements/export.csv", methods=["GET"])
def export_measurements_csv() -> Response:
    """Export recorded measurements as CSV. Params: exp, since/until (epoch) or
    hours (default 24)."""
    from utils.database import get_db

    exp = _clean_tag(request.args.get("exp"))
    now = time.time()
    try:
        until = float(request.args["until"]) if request.args.get("until") else now
    except (TypeError, ValueError):
        until = now
    if request.args.get("since"):
        since = _num(request.args.get("since"))
    else:
        since = until - max(0.0, _num(request.args.get("hours")) or 24.0) * 3600.0

    _ensure_measurements_table()
    conds, params = ["ts >= ?", "ts <= ?"], [since if since is not None else 0.0, until]
    if exp:
        conds.append("experiment = ?")
        params.append(exp)
    with get_db() as conn:
        rows = conn.execute(
            "SELECT ts, experiment, device, source, freq_mhz, ppm, bandwidth_hz, "
            "rssi_db, snr_db, duty_cycle, burst_ms, note FROM jitu_measurements "
            f"WHERE {' AND '.join(conds)} ORDER BY ts ASC",
            params,
        ).fetchall()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "ts_iso", "ts_epoch", "experiment", "device", "source", "freq_mhz", "ppm",
        "bandwidth_hz", "rssi_db", "snr_db", "duty_cycle", "burst_ms", "note",
    ])
    for raw in rows:
        r = dict(raw)
        iso = datetime.fromtimestamp(r["ts"], tz=timezone.utc).isoformat()
        writer.writerow([
            iso, round(r["ts"], 3), r["experiment"], r["device"], r["source"],
            r["freq_mhz"], r["ppm"], r["bandwidth_hz"], r["rssi_db"], r["snr_db"],
            r["duty_cycle"], r["burst_ms"], r["note"],
        ])

    stamp = datetime.fromtimestamp(now, tz=timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    fname = f"jitu_measurements_{exp or 'all'}_{stamp}.csv"
    return Response(
        buf.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )
