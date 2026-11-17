let missedStudents = [];

window.addEventListener("load", initializeMissedSessions);

async function initializeMissedSessions() {
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
        setSyncStatus("checking", "سجّلي الدخول لبدء الاتصال بـ Supabase");
        document.getElementById("missedShell").classList.add("hidden");
        document.getElementById("missedLogin").classList.remove("hidden");
        return;
    }

    currentUser = session.user;
    const monthInput = document.getElementById("missedMonth");
    const today = new Date();
    monthInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    monthInput.addEventListener("change", renderMissedSessions);
    document.getElementById("missedList").addEventListener("click", event => {
        const button = event.target.closest(".mark-compensated-btn");
        if (button) markMissedSessionCompensated(button);
    });

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
        (student.sessions || []).forEach((session, sessionIndex) => {
            if (session.date) {
                const sessionStatus = getSessionStatus(session, session.date);
                if (!session.date.startsWith(monthKey)
                    || !isStudentAvailableOnDate(student, session.date)
                    || !isSessionDue(session.date, session.time)
                    || !["pending", "absent"].includes(sessionStatus)) return;
                sessions.push({ date: session.date, time: session.time, status: sessionStatus, sessionIndex });
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
                sessions.push({ date: dateKey, time: session.time, status: sessionStatus, sessionIndex });
            }
        });

        if (sessions.length) {
            sessions.sort((a, b) => a.date.localeCompare(b.date) || String(a.time).localeCompare(String(b.time)));
            missed.push({ id: student.id, name: student.name, sessions });
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
                        <button class="mark-compensated-btn mt-3 w-full rounded-lg bg-sage px-3 py-2 font-bold text-canvas transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60" type="button" data-student-id="${escapeHTML(student.id)}" data-session-index="${session.sessionIndex}" data-session-date="${session.date}">تم تعويض الجلسة</button>
                    </li>
                `).join("")}
            </ul>
        </article>
    `).join("");
}

async function markMissedSessionCompensated(button) {
    const student = missedStudents.find(item => String(item.id) === button.dataset.studentId);
    const sessionIndex = Number(button.dataset.sessionIndex);
    const dateKey = button.dataset.sessionDate;
    const session = student?.sessions?.[sessionIndex];
    const status = session && getSessionStatus(session, dateKey);

    if (!student || !session || !["pending", "absent"].includes(status)
        || !isSessionDue(dateKey, session.time)
        || !isStudentAvailableOnDate(student, dateKey)) {
        showMissedStatus("لم تعد هذه الجلسة ضمن الجلسات الفائتة. حدّثي الصفحة للتحقق من حالتها.", true);
        return;
    }

    button.disabled = true;
    button.textContent = "جاري الحفظ...";
    const updatedSessions = student.sessions.map((item, index) =>
        index === sessionIndex ? setSessionStatus(item, dateKey, "attended") : item
    );

    try {
        const savedStudent = await updateStudent(student.id, {
            name: student.name,
            sessions: updatedSessions
        });
        student.sessions = savedStudent.sessions;
        renderMissedSessions();
        showMissedStatus("تم تسجيل الجلسة كحضور، واحتُسبت في السالاري.");
    } catch (error) {
        button.disabled = false;
        button.textContent = "تم تعويض الجلسة";
        showMissedStatus(`تعذر تسجيل تعويض الجلسة: ${error.message}`, true);
    }
}

function showMissedStatus(message, isError = false) {
    const status = document.getElementById("missedStatus");
    status.textContent = message;
    status.classList.toggle("text-danger", isError);
    status.classList.toggle("text-sage", !isError);
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
