/*
 * Ji-Tu: panel status agen di halaman depan (welcome page).
 * Tiap agen menyala/mati + mode/servis yang bisa dioperasikan + tautan cepat.
 * Bisa di-minimize (status disimpan di localStorage). Defensif: diam bila bukan
 * controller / tak ada agent.
 */
(function () {
    "use strict";
    var MODE_LABEL = {
        pager: "Pager", sensor: "433MHz", adsb: "ADS-B", ais: "AIS", acars: "ACARS",
        aprs: "APRS", wifi: "WiFi", bluetooth: "Bluetooth", tscm: "TSCM",
        satellite: "Satelit", dsc: "DSC", rtlamr: "Meters", listening_post: "Listening Post",
        sweep: "Sweep HackRF"
    };
    var COLLAPSE_KEY = "jitu-agents-collapsed";
    var panel = null;

    function esc(s) {
        return String(s).replace(/[&<>"]/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
        });
    }

    function isCollapsed() {
        try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch (e) { return false; }
    }
    function setCollapsed(v) {
        try { localStorage.setItem(COLLAPSE_KEY, v ? "1" : "0"); } catch (e) { /* abaikan */ }
    }
    function applyCollapsed() {
        if (!panel) return;
        var collapsed = isCollapsed();
        var grid = panel.querySelector(".wa-grid");
        var btn = panel.querySelector(".wa-toggle");
        if (grid) grid.style.display = collapsed ? "none" : "";
        if (btn) { btn.textContent = collapsed ? "+" : "–"; btn.title = collapsed ? "Perbesar" : "Perkecil"; }
        panel.classList.toggle("wa-collapsed", collapsed);
    }
    function toggleCollapse() {
        setCollapsed(!isCollapsed());
        applyCollapsed();
    }

    function injectStyle() {
        if (document.getElementById("wa-style")) return;
        var s = document.createElement("style");
        s.id = "wa-style";
        s.textContent = [
            ".welcome-agents{max-width:900px;margin:0 auto 18px;padding:12px 16px;border:1px solid var(--border-color);border-radius:10px;background:var(--bg-secondary);}",
            ".welcome-agents.wa-collapsed{padding:8px 16px;}",
            ".wa-head{font-weight:700;letter-spacing:1px;text-transform:uppercase;font-size:13px;color:var(--text-primary);margin-bottom:10px;display:flex;align-items:center;gap:8px;}",
            ".wa-collapsed .wa-head{margin-bottom:0;}",
            ".wa-head .wa-count{font-weight:500;color:var(--text-secondary);text-transform:none;letter-spacing:0;font-size:12px;}",
            ".wa-toggle{margin-left:auto;background:transparent;border:1px solid var(--border-color);color:var(--text-primary);border-radius:6px;cursor:pointer;width:28px;height:24px;line-height:1;font-size:15px;font-weight:700;flex:0 0 auto;}",
            ".wa-toggle:hover{border-color:var(--accent-cyan);color:var(--accent-cyan);}",
            ".wa-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;}",
            ".wa-card{border:1px solid var(--border-color);border-radius:8px;padding:10px 12px;background:var(--bg-primary);}",
            ".wa-row{display:flex;align-items:center;gap:8px;}",
            ".wa-dot{width:10px;height:10px;border-radius:50%;background:#888;flex:0 0 auto;}",
            ".wa-dot.on{background:var(--accent-cyan);box-shadow:0 0 8px var(--accent-cyan);}",
            ".wa-dot.off{background:var(--accent-red,#e23);}",
            ".wa-name{font-weight:600;color:var(--text-primary);}",
            ".wa-state{margin-left:auto;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text-secondary);}",
            ".wa-url{font-family:var(--font-mono,monospace);font-size:11px;color:var(--text-secondary);margin:4px 0 8px;word-break:break-all;}",
            ".wa-badges{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;}",
            ".wa-badge{font-size:10px;padding:2px 7px;border-radius:10px;background:var(--accent-cyan-dim,rgba(0,96,48,.12));color:var(--accent-cyan);border:1px solid var(--accent-cyan);}",
            ".wa-badge.wa-muted{color:var(--text-secondary);border-color:var(--border-color);background:transparent;}",
            ".wa-links{display:flex;gap:12px;flex-wrap:wrap;}",
            ".wa-link{font-size:12px;color:var(--accent-cyan);text-decoration:none;font-weight:600;}"
        ].join("");
        document.head.appendChild(s);
    }

    function render(agents, sessionData) {
        if (!panel) return;
        if (!agents.length && (!sessionData || !sessionData.manifest)) { panel.style.display = "none"; return; }
        var online = agents.filter(function (a) { return a.healthy === true; }).length;
        var html = "";

        if (sessionData && sessionData.manifest && sessionData.manifest.session_id) {
            var m = sessionData.manifest;
            var ag1 = sessionData.agents && (sessionData.agents["Ji-Tu-01"] || sessionData.agents["10.141.41.17"]);
            var ag2 = sessionData.agents && (sessionData.agents["Ji-Tu-02"] || sessionData.agents["10.141.41.18"]);

            var ag1Bytes = 0;
            if (ag1 && ag1.files) {
                Object.keys(ag1.files).forEach(function (fn) { ag1Bytes += (ag1.files[fn].size || 0); });
            }
            var ag2Bytes = 0;
            if (ag2 && ag2.files) {
                Object.keys(ag2.files).forEach(function (fn) { ag2Bytes += (ag2.files[fn].size || 0); });
            }
            var ag1Mb = (ag1Bytes / (1024 * 1024)).toFixed(1) + " MB";
            var ag2Mb = ag2Bytes > 1024 * 1024 * 1024
                ? (ag2Bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB"
                : (ag2Bytes / (1024 * 1024)).toFixed(0) + " MB";

            html +=
                '<div class="wa-session-box" style="margin-bottom:14px;padding:12px 14px;background:rgba(47,174,110,0.08);border:1px solid rgba(47,174,110,0.3);border-radius:8px;">' +
                    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">' +
                        '<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#2fae6e;box-shadow:0 0 8px #2fae6e;"></span>' +
                        '<strong style="font-size:12px;letter-spacing:1px;color:#2fae6e;text-transform:uppercase;">SESI PEMANTAUAN KONTINU (2 JAM)</strong>' +
                        '<span style="margin-left:auto;font-size:11px;font-family:monospace;color:var(--text-secondary);">' + esc(m.start_time || "14:40 WIB") + " &rarr; " + esc(m.end_time_target || "16:40 WIB") + "</span>" +
                    "</div>" +
                    '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;">' +
                        "<strong>Target Aktif:</strong> Remote Mobil/Keyless 433MHz &bull; Drone RF (915M/2.4G/5.8G) &bull; Drone Wi-Fi Remote ID &bull; Motor Yamaha Y-Connect &bull; Wearables/Ponsel" +
                    "</div>" +
                    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px;font-size:11px;">' +
                        '<div style="background:var(--bg-primary);padding:8px 10px;border-radius:6px;border:1px solid var(--border-color);">' +
                            '<strong style="color:var(--text-primary);display:block;margin-bottom:2px;">Ji-Tu-01 (Sub-GHz & BLE)</strong>' +
                            '<span style="color:var(--accent-cyan);font-weight:600;">' + ag1Mb + " terdata</span> &bull; 3.230+ Perangkat BLE (Apple, Microsoft, Yamaha CCU, Wearables)" +
                        "</div>" +
                        '<div style="background:var(--bg-primary);padding:8px 10px;border-radius:6px;border:1px solid var(--border-color);">' +
                            '<strong style="color:var(--text-primary);display:block;margin-bottom:2px;">Ji-Tu-02 (Drone Intel & Alfa)</strong>' +
                            '<span style="color:var(--accent-cyan);font-weight:600;">' + ag2Mb + " terdata</span> &bull; HackRF Drone RF Sweep & WiFi Remote ID" +
                        "</div>" +
                    "</div>" +
                "</div>";
        }

        html += '<div class="wa-head">Agen Terhubung <span class="wa-count">' +
            online + "/" + agents.length + ' menyala</span><button type="button" class="wa-toggle">–</button></div><div class="wa-grid">';
        agents.forEach(function (a) {
            var healthy = a.healthy === true;
            var caps = a.capabilities || {};
            var modes = Object.keys(caps).filter(function (k) { return caps[k] === true; });
            var badges = modes.length
                ? modes.map(function (m) { return '<span class="wa-badge">' + esc(MODE_LABEL[m] || m) + "</span>"; }).join("")
                : '<span class="wa-badge wa-muted">tak ada mode</span>';
            var links = '<a class="wa-link" href="/controller/manage">Kelola</a>' +
                ' <a class="wa-link" href="/controller/monitor">Monitor</a>';
            if (caps.sweep === true) links += ' <a class="wa-link" href="/controller/sweep">Spektrum HackRF</a>';
            html +=
                '<div class="wa-card">' +
                    '<div class="wa-row"><span class="wa-dot ' + (healthy ? "on" : "off") + '"></span>' +
                        '<span class="wa-name">' + esc(a.name) + "</span>" +
                        '<span class="wa-state">' + (healthy ? "menyala" : "mati") + "</span></div>" +
                    '<div class="wa-url">' + esc(a.base_url || "") + "</div>" +
                    '<div class="wa-badges">' + badges + "</div>" +
                    '<div class="wa-links">' + links + "</div>" +
                "</div>";
        });
        html += "</div>";
        panel.innerHTML = html;
        panel.style.display = "block";
        var btn = panel.querySelector(".wa-toggle");
        if (btn) btn.onclick = toggleCollapse;
        applyCollapsed();
    }

    function refresh() {
        Promise.all([
            fetch("/controller/agents?refresh=true").then(function (r) { return r.ok ? r.json() : null; }),
            fetch("/controller/session/status").then(function (r) { return r.ok ? r.json() : null; })
        ])
        .then(function (results) {
            var agResult = results[0];
            var sessResult = results[1];
            if (!agResult && !sessResult) { if (panel) panel.style.display = "none"; return; }
            render((agResult && agResult.agents) || [], sessResult || null);
        })
        .catch(function () { if (panel) panel.style.display = "none"; });
    }

    function start() {
        panel = document.getElementById("agentsStatusPanel");
        if (!panel) return;
        injectStyle();
        refresh();
        setInterval(refresh, 15000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
