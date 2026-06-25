function parseMap(value) {
    if (!value) {
        return {};
    }
    return value
        .replace(/[{}]/g, "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .reduce((result, entry) => {
            const separator = entry.indexOf("=");
            if (separator === -1) {
                return result;
            }
            const key = entry.slice(0, separator).trim();
            const count = Number(entry.slice(separator + 1).trim());
            result[key] = Number.isFinite(count) ? count : 0;
            return result;
        }, {});
}

function makeChart(id, type, dataMap, colors) {
    const element = document.getElementById(id);
    if (!element || !window.Chart) {
        return;
    }
    const labels = Object.keys(dataMap);
    const values = Object.values(dataMap);
    new Chart(element, {
        type,
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: type === "line" ? "bottom" : "right"
                }
            },
            scales: type === "line" ? {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            } : {}
        }
    });
}

function renderCharts() {
    const body = document.body;
    makeChart("riskChart", "doughnut", parseMap(body.dataset.risk), ["#14b8a6", "#f59e0b", "#ef4444", "#7f1d1d"]);
    makeChart("trafficChart", "doughnut", parseMap(body.dataset.traffic), ["#64748b", "#2563eb", "#9333ea", "#b45309"]);
    makeChart("hourlyChart", "line", parseMap(body.dataset.hourly), ["#0f766e"]);
}

function escapeText(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function prependLog(log) {
    const body = document.getElementById("recentLogBody");
    if (!body) {
        return;
    }
    const row = document.createElement("tr");
    const time = log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : new Date().toLocaleTimeString();
    row.innerHTML = `
        <td>${escapeText(time)}</td>
        <td>${escapeText(log.ipAddress)}</td>
        <td class="path-cell">${escapeText(log.requestUri)}</td>
        <td><span class="badge risk-${escapeText(String(log.riskLevel).toLowerCase())}">${escapeText(log.riskScore)} / ${escapeText(log.riskLevel)}</span></td>
        <td><span class="badge type-${escapeText(String(log.trafficType).toLowerCase())}">${escapeText(log.trafficType)}</span></td>
        <td>${escapeText(log.source)}</td>
    `;
    body.prepend(row);
    while (body.children.length > 50) {
        body.lastElementChild.remove();
    }
}

function connectLiveLogs() {
    const status = document.getElementById("liveStatus");
    if (!window.StompJs) {
        if (status) {
            status.textContent = "Live unavailable";
        }
        return;
    }

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const client = new StompJs.Client({
        brokerURL: `${protocol}://${window.location.host}/ws`,
        reconnectDelay: 5000,
        onConnect: () => {
            if (status) {
                status.textContent = "Live";
                status.classList.add("connected");
            }
            client.subscribe("/topic/security-logs", (message) => {
                prependLog(JSON.parse(message.body));
            });
        },
        onWebSocketClose: () => {
            if (status) {
                status.textContent = "Reconnecting";
                status.classList.remove("connected");
            }
        }
    });
    client.activate();
}

window.addEventListener("DOMContentLoaded", () => {
    renderCharts();
    connectLiveLogs();
});
