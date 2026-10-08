/*
 * Ji-Tu: sinkron kesadaran HackRF remote untuk panel SUBGHZ.
 *
 * Halaman SUBGHZ mengoperasikan HackRF LOKAL di mesin ini. Pada controller yang
 * murni dashboard (tanpa HackRF lokal) ia menampilkan "HackRF Tools Missing".
 * Skrip ini menambah banner informatif bila ada agent terdaftar yang PUNYA
 * HackRF, lalu mengarahkan operator ke halaman Spektrum HackRF remote.
 *
 * Self-contained & defensif: tidak melakukan apa-apa bila panel SUBGHZ tak ada,
 * /controller/agents tak tersedia (instalasi node tunggal), atau tak ada agent
 * ber-HackRF.
 */
(function () {
    "use strict";
    var handled = false;

    function hackrfAgents(agents) {
        return (agents || []).filter(function (a) {
            var caps = a.capabilities || {};
            if (caps.sweep === true) return true;
            var devs = (a.interfaces && a.interfaces.devices) || [];
            return devs.some(function (d) {
                var t = String(d.sdr_type || d.driver || "").toLowerCase();
                var n = String(d.name || "").toLowerCase();
                return t === "hackrf" || n.indexOf("hackrf") !== -1;
            });
        });
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"]/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
        });
    }

    function render(section, agents) {
        var hint = document.getElementById("subghzRemoteHint");
        if (!hint) {
            hint = document.createElement("div");
            hint.id = "subghzRemoteHint";
            section.parentNode.insertBefore(hint, section.nextSibling);
        }
        hint.style.cssText =
            "margin-top:10px;padding:10px 12px;border:1px solid var(--accent-cyan);" +
            "border-radius:6px;background:var(--accent-cyan-dim,rgba(0,96,48,.12));" +
            "font-size:12px;line-height:1.5;color:var(--text-primary);";
        var names = agents
            .map(function (a) { return escapeHtml(a.name); })
            .join(", ");
        hint.innerHTML =
            "HackRF terdeteksi di agent <b>" + names + "</b> " +
            "(perangkat di node remote, bukan di controller ini). " +
            '<a href="/controller/sweep" style="color:var(--accent-cyan);font-weight:600;text-decoration:none;">' +
            "Buka Spektrum HackRF Remote &rarr;</a>";
    }

    function handle(section) {
        if (handled) return;
        handled = true;
        fetch("/controller/agents")
            .then(function (res) { return res.ok ? res.json() : null; })
            .then(function (j) {
                if (!j) return;
                var agents = hackrfAgents(j.agents || []);
                if (agents.length) render(section, agents);
            })
            .catch(function () { /* bukan controller / tanpa akses: abaikan */ });
    }

    function tryFind() {
        var section = document.getElementById("subghzDeviceStatus");
        if (section) { handle(section); return true; }
        return false;
    }

    function start() {
        if (tryFind()) return;
        var obs = new MutationObserver(function () {
            if (handled || tryFind()) obs.disconnect();
        });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(function () { obs.disconnect(); }, 60000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
