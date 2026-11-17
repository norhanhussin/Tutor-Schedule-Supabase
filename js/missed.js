let missedStudents = [];

window.addEventListener("load", initializeMissedSessions);

async function initializeMissedSessions() {
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
        document.getElementById("missedShell").classList.add("hidden");
        document.getElementById("missedLogin").classList.remove("hidden");
        return;
    }

    currentUser = session.user;
    const monthInput = document.getElementById("missedMonth");
    const today = new Date();
    monthInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    monthInput.addEventListener("change", renderMissedSessions);

    try {
        missedStudents = await getStudents();
        renderMissedSessions();
    } catch (error) {
        document.getElementById("missedStatus").textContent = `تعذر تحميل الجلسات: ${error.message}`;
        document.getElementById("missedStatus").classList.add("text-danger");
    }
}

function isSessionDue(dateKey, time) {
    const today = getLocalDateKey(new Date());
    if (dateKey < today) return true;
    if (dateKey > today) return false;
    return String(time || "00:00") <= new Date().toTimeString().slice(0, 5);
}

function renderMissedSessions() {
    const monthKey = document.getElementById("missedMonth").value;
    const container = document.getElementById("missedList");
    const count = document.getElementById("missedCount");
    const status = document.getElementById("missedStatus");
    status.textContent = "";
    if (!monthKey) {
        count.textContent = "";
        container.innerHTML = "";
        return;
    }

    const [year, month] = monthKey.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const missed = [];

    missedStudents.forEach(student => {
        const sessions = [];
        (student.sessions || []).forEach(session => {
            if (session.date) {
                const sessionStatus = getSessionStatus(session, session.date);
                if (!session.date.startsWith(monthKey)
                    || !isStudentAvailableOnDate(student, session.date)
                    || !isSessionDue(session.date, session.time)
                    || !["pending", "absent"].includes(sessionStatus)) return;
                sessions.push({ date: session.date, time: session.time, status: sessionStatus });
                return;
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month - 1, day);
                const dateKey = getLocalDateKey(date);
                const sessionStatus = getSessionStatus(session, dateKey);
                if (Number(session.day) !== (date.getDay() + 1) % 7
                    || !isStudentAvailableOnDate(student, dateKey)
                    || !isSessionDue(dateKey, session.time)
                    || !["pending", "absent"].includes(sessionStatus)) continue;
                sessions.push({ date: dateKey, time: session.time, status: sessionStatus });
            }
        });

        if (sessions.length) {
            sessions.sort((a, b) => a.date.localeCompare(b.date) || String(a.time).localeCompare(String(b.time)));
            missed.push({ name: student.name, sessions });
        }
    });

    const total = missed.reduce((sum, student) => sum + student.sessions.length, 0);
    count.textContent = `${missed.length} طالب · ${total} جلسة فائتة`;

    if (!missed.length) {
        container.innerHTML = '<div class="rounded-2xl border border-dashed border-line bg-panel/50 p-8 text-center text-muted">لا توجد جلسات فائتة في هذا الشهر حتى الآن</div>';
        return;
    }

    container.innerHTML = missed.map(student => `
        <article class="rounded-2xl border border-line bg-panel-raised p-5 shadow-lg">
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 class="font-display text-lg font-bold text-ink">${escapeHTML(student.name)}</h2>
                <span class="rounded-full border border-danger/30 bg-danger/10 px-3 py-1 text-sm font-bold text-danger">${student.sessions.length} جلسة فائتة</span>
            </div>
            <ul class="grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
                ${student.sessions.map(session => `
                    <li class="rounded-xl border border-line bg-canvas/40 px-4 py-3 text-sm text-muted">
                        <time datetime="${session.date}">${new Date(`${session.date}T12:00:00`).toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })}</time>
                        <span class="ms-2 font-bold text-accent">${formatMissedTime(session.time)}</span>
                        <span class="ms-2 rounded-full px-2 py-1 text-xs font-bold ${session.status === "absent" ? "bg-danger/10 text-danger" : "bg-accent/10 text-accent"}">${session.status === "absent" ? "غياب" : "لم يُسجّل"}</span>
                    </li>
                `).join("")}
            </ul>
        </article>
    `).join("");
}

function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
    }[character]));
}

function formatMissedTime(time) {
    if (!time) return "";
    const [hoursText, minutesText = "00"] = String(time).split(":");
    const hours = Number(hoursText);
    if (!Number.isFinite(hours)) return time;
    return `${hours % 12 || 12}:${minutesText} ${hours >= 12 ? "م" : "ص"}`;
}
