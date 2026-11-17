let salaryStudents = [];
let salaryDate = new Date();
let salaryMonth = new Date();
let selectedStudentId = "all";
let monthlySort = "name";
let attendanceFilter = "all";
let salaryView = "day";
let salaryStatusTimer;
const SESSION_STATUS_LABELS = {
    pending: "لم يُسجّل",
    attended: "حضر",
    absent: "غاب",
    cancelled: "أُلغيت",
    postponed: "تأجلت"
};

const salaryDays = [
    "السبت",
    "الأحد",
    "الاثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة"
];

window.addEventListener("load", () => {
    setupBackToTop();
    initializeSalary();
});

function setupBackToTop() {
    const button = document.getElementById("backToTop");
    if (!button) return;
    window.addEventListener("scroll", () => button.classList.toggle("is-visible", window.scrollY > 420));
    button.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
}

async function initializeSalary() {
    const { data: { session } } = await client.auth.getSession();

    if (!session) {
        document.getElementById("salaryLogin").classList.remove("hidden");
        return;
    }

    currentUser = session.user;
    document.getElementById("salaryShell").classList.remove("hidden");
    document.getElementById("salaryDate").value = toDateKey(salaryDate);
    document.getElementById("salaryDate").onchange = event => {
        salaryDate = fromDateKey(event.target.value);
        renderSalary();
    };
    document.getElementById("previousDateBtn").onclick = () => changeDate(-1);
    document.getElementById("nextDateBtn").onclick = () => changeDate(1);
    document.getElementById("extraSessionDate").value = toDateKey(salaryDate);
    document.getElementById("extraSessionForm").onsubmit = addExtraSession;
    document.getElementById("salaryMonth").value = toMonthKey(salaryMonth);
    document.getElementById("salaryMonth").onchange = event => {
        salaryMonth = fromMonthKey(event.target.value);
        renderMonthlySummary();
    };
    document.getElementById("studentFilter").onchange = event => {
        selectedStudentId = event.target.value;
        renderSalary();
    };
    document.getElementById("attendanceFilter").onchange = event => {
        attendanceFilter = event.target.value;
        renderSalary();
    };
    document.getElementById("monthlySort").onchange = event => {
        monthlySort = event.target.value;
        renderMonthlySummary();
    };
    document.getElementById("exportMonthlyBtn").onclick = exportMonthlyReport;
    document.getElementById("exportMonthlyBtn").onclick = exportMonthlyReport;
    document.querySelectorAll(".view-switch").forEach(button => {
        button.onclick = () => setSalaryView(button.dataset.view);
    });
    setSalaryView(salaryView);

    try {
        salaryStudents = await getStudents();
        renderStudentFilter();
        renderSalary();
    } catch (error) {
        showSalaryStatus(error.message);
    }
}

function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function toMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function fromDateKey(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function fromMonthKey(value) {
    const [year, month] = value.split("-").map(Number);
    return new Date(year, month - 1, 1);
}

function changeDate(amount) {
    salaryDate.setDate(salaryDate.getDate() + amount);
    document.getElementById("salaryDate").value = toDateKey(salaryDate);
    renderSalary();
}

function getDateDayIndex(date) {
    return (date.getDay() + 1) % 7;
}

function formatSalaryDate(date) {
    return `${salaryDays[getDateDayIndex(date)]}، ${date.toLocaleDateString("ar-EG", {
        day: "numeric",
        month: "long",
        year: "numeric"
    })}`;
}

function getSessionPrice(session) {
    return session.price === undefined
        ? 80
        : Math.max(0, Number(session.price) || 0);
}

function renderStudentFilter() {
    const filter = document.getElementById("studentFilter");
    filter.innerHTML = '<option value="all">كل الطلاب</option>' + salaryStudents
        .map(student => `<option value="${escapeHTML(student.id)}">${escapeHTML(student.name)}</option>`)
        .join("");
    filter.value = selectedStudentId;
}

function getDailySessions() {
    const dayIndex = getDateDayIndex(salaryDate);
    const dateKey = toDateKey(salaryDate);
    const sessions = [];

    salaryStudents.forEach(student => {
        if (selectedStudentId !== "all" && String(student.id) !== String(selectedStudentId)) return;
        (student.sessions || []).forEach((session, sessionIndex) => {
            if (session.date === dateKey || (!session.date && Number(session.day) === dayIndex)) {
                if (!isStudentAvailableOnDate(student, dateKey)) return;
                const status = getSessionStatus(session, dateKey);
                if (attendanceFilter !== "all" && status !== attendanceFilter) return;
                sessions.push({ student, session, sessionIndex, dateKey });
            }
        });
    });

    return sessions.sort((a, b) => String(a.session.time || "23:59").localeCompare(String(b.session.time || "23:59")));
}

function renderSalary() {
    const sessions = getDailySessions();
    const list = document.getElementById("salaryList");
    const dateKey = toDateKey(salaryDate);
    let completed = 0;
    let absent = 0;
    let total = 0;

    document.getElementById("salaryDateTitle").textContent = formatSalaryDate(salaryDate);
    document.getElementById("salarySessionsStat").textContent = sessions.length;

    list.innerHTML = "";
    sessions.forEach(item => {
        const status = getSessionStatus(item.session, dateKey);
        const price = getSessionPrice(item.session);
        if (status === "attended") {
            completed++;
            total += price;
        }
        if (status === "absent") absent++;

        const row = document.createElement("article");
        row.className = `salary-row ${status === "attended" ? "is-completed" : "is-pending"} grid items-center gap-4 rounded-2xl border border-line bg-panel-raised p-4 shadow-lg transition hover:border-accent/30 md:grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(8rem,auto)_auto]`;
        row.innerHTML = `
            <label class="attendance-control flex items-center gap-3">
                <span class="checkmark ${status === "attended" ? "border-sage bg-sage text-canvas" : status === "absent" ? "border-danger text-danger" : "border-line text-muted"} grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 font-bold">${status === "attended" ? "✓" : status === "absent" ? "!" : "·"}</span>
                <span>
                    <strong class="font-display font-bold text-ink">${escapeHTML(item.student.name)}</strong>
                    <small class="mt-1 block text-sm text-accent">${formatTime(item.session.time)}${item.session.extra ? " · جلسة إضافية" : ""}</small>
                </span>
            </label>
            <label class="session-status-control flex min-w-32 flex-col gap-1 text-sm text-muted">
                <span>حالة الجلسة</span>
                <select class="session-status rounded-lg border border-line bg-canvas px-3 py-2 text-ink">
                    ${Object.entries(SESSION_STATUS_LABELS).map(([value, label]) => `<option value="${value}" ${status === value ? "selected" : ""}>${label}</option>`).join("")}
                </select>
            </label>
            <label class="price-control flex items-center gap-2 text-sm text-muted">
                <span>السعر</span>
                <input class="session-price rounded-lg border border-line bg-canvas px-3 py-2 text-center text-ink" type="number" min="0" step="10" value="${price}" inputmode="decimal">
                <span>ج.م</span>
            </label>
            <button class="icon-btn save-salary rounded-lg border border-accent/30 px-4 py-2 font-bold text-accent transition hover:bg-accent/10" type="button">حفظ</button>
        `;

        row.querySelector(".session-status").onchange = () => saveSalaryEntry(item, row);
        row.querySelector(".save-salary").onclick = () => saveSalaryEntry(item, row);
        list.appendChild(row);
    });

    document.getElementById("completedSessionsStat").textContent = completed;
    document.getElementById("absentSessionsStat").textContent = absent;
    document.getElementById("dailyTotalStat").textContent = `${total.toLocaleString("ar-EG")} ج.م`;

    if (sessions.length === 0) {
        const message = attendanceFilter === "attended"
            ? "لا توجد جلسات تم حضورها بهذا الفلتر"
            : attendanceFilter === "absent"
                ? "لا توجد جلسات مسجلة كغياب بهذا الفلتر"
                : attendanceFilter === "cancelled"
                    ? "لا توجد جلسات ملغاة بهذا الفلتر"
                    : attendanceFilter === "postponed"
                        ? "لا توجد جلسات مؤجلة بهذا الفلتر"
                : "لا توجد جلسات مجدولة لهذا اليوم";
        list.innerHTML = `<div class="empty empty-state rounded-2xl border border-dashed border-line bg-panel/50 p-7 text-center text-muted"><strong>${message}</strong><small class="mt-2 block text-muted">يمكنك إضافة جلسة إضافية من القسم بالأسفل</small></div>`;
    }

    renderMonthlySummary();
}

async function addExtraSession(event) {
    event.preventDefault();
    const name = document.getElementById("extraStudentName").value.trim();
    const dateKey = document.getElementById("extraSessionDate").value;
    const time = document.getElementById("extraSessionTime").value;
    const price = Math.max(0, Number(document.getElementById("extraSessionPrice").value) || 0);
    const submitButton = event.target.querySelector('button[type="submit"]');
    if (!name || !dateKey || !time) return;

    submitButton.disabled = true;
    submitButton.textContent = "جاري الإضافة...";

    const extraSession = {
        date: dateKey,
        time,
        price,
        extra: true,
        attendance: { [dateKey]: "attended" }
    };
    const existingStudent = salaryStudents.find(student =>
        !student.deleted_at && student.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase()
    );
    if (existingStudent?.is_paused) {
        submitButton.disabled = false;
        submitButton.textContent = "إضافة وحساب الجلسة";
        showSalaryStatus("هذا الطالب متوقف مؤقتًا، أعيديه للجدول قبل إضافة جلسة");
        return;
    }

    try {
        if (existingStudent) {
            const sessions = [...(existingStudent.sessions || []), extraSession];
            await updateStudent(existingStudent.id, { name: existingStudent.name, sessions });
            existingStudent.sessions = sessions;
        } else {
            const newStudent = await addStudent({ name, sessions: [extraSession] });
            salaryStudents.push(newStudent);
        }
        document.getElementById("extraSessionForm").reset();
        document.getElementById("extraSessionDate").value = dateKey;
        showSalaryStatus("تمت إضافة الجلسة الإضافية وحسابها");
        renderSalary();
    } catch (error) {
        submitButton.disabled = false;
        submitButton.textContent = "إضافة وحساب الجلسة";
        showSalaryStatus(error.message);
    }

    submitButton.disabled = false;
    submitButton.textContent = "إضافة وحساب الجلسة";
}

function renderMonthlySummary() {
    const container = document.getElementById("monthlySummary");
    if (!container) return;
    const allSummaries = getMonthlySummaries(salaryMonth);
    const summaries = allSummaries.filter(row =>
        selectedStudentId === "all" || String(row.id) === String(selectedStudentId)
    );
    const monthTotal = summaries.reduce((sum, row) => sum + row.total, 0);
    const rows = summaries
        .sort((a, b) => monthlySort === "total" ? b.total - a.total : monthlySort === "count" ? b.count - a.count : a.name.localeCompare(b.name, "ar"))
        .map(row => `<div class="monthly-row grid items-center gap-3 border-b border-line px-4 py-3"><strong class="font-bold text-ink">${escapeHTML(row.name)}</strong><span class="text-sm text-muted">حضر ${row.count} · غاب ${row.absent} · أُلغي ${row.cancelled} · تأجل ${row.postponed} · دون تسجيل ${row.pending}</span><b class="font-display font-bold text-accent">${row.total.toLocaleString("ar-EG")} ج.م</b></div>`)
        .join("");

    const completedSessions = summaries.reduce((sum, row) => sum + row.count, 0);
    const averagePrice = completedSessions ? Math.round(monthTotal / completedSessions) : 0;
    const previousSummaries = getMonthlySummaries(new Date(salaryMonth.getFullYear(), salaryMonth.getMonth() - 1, 1))
        .filter(row => selectedStudentId === "all" || String(row.id) === String(selectedStudentId));
    const previousTotal = previousSummaries.reduce((sum, row) => sum + row.total, 0);
    container.innerHTML = rows
        ? `<div class="monthly-total rounded-t-2xl border-b border-accent/20 bg-accent/5 p-5"><span class="text-muted">إجمالي الشهر</span><strong class="my-1 block font-display text-3xl font-bold text-accent">${monthTotal.toLocaleString("ar-EG")} ج.م</strong><small class="text-sm text-muted">${completedSessions} جلسة حاضرة · متوسط ${averagePrice.toLocaleString("ar-EG")} ج.م · ${summaries.reduce((sum, row) => sum + row.absent, 0)} غياب · ${summaries.reduce((sum, row) => sum + row.cancelled, 0)} إلغاء · ${summaries.reduce((sum, row) => sum + row.postponed, 0)} تأجيل</small></div>${rows}`
        : '<div class="empty empty-state rounded-2xl border border-dashed border-line bg-panel/50 p-7 text-center text-muted">لا يوجد طلاب حتى الآن</div>';
    renderMonthComparison(monthTotal, previousTotal);
    renderMonthlyCalendar();
}

function renderMonthlyCalendar() {
    const calendar = document.getElementById("monthlyCalendar");
    if (!calendar) return;
    const year = salaryMonth.getFullYear();
    const month = salaryMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = getDateDayIndex(new Date(year, month, 1));
    const cells = [];
    for (let index = 0; index < firstDayIndex; index++) cells.push('<div class="calendar-day is-empty min-h-12 rounded-lg"></div>');
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateKey = toDateKey(date);
        let scheduled = 0;
        let completed = 0;
        salaryStudents.forEach(student => (student.sessions || []).forEach(session => {
            if (selectedStudentId !== "all" && String(student.id) !== String(selectedStudentId)) return;
            const matches = session.date === dateKey || (!session.date && Number(session.day) === getDateDayIndex(date));
            if (!matches || !isStudentAvailableOnDate(student, dateKey)) return;
            scheduled++;
            if (getSessionStatus(session, dateKey) === "attended") completed++;
        }));
        const classes = ["calendar-day", completed ? "has-completed" : "", scheduled && !completed ? "has-pending" : "", "min-h-12 rounded-lg border border-line bg-panel-raised p-1 text-center transition hover:border-accent/40"].filter(Boolean).join(" ");
        cells.push(`<div class="${classes}"><b class="font-bold text-ink">${day}</b>${scheduled ? `<small class="mt-1 block text-xs text-muted">${completed}/${scheduled}</small>` : ""}</div>`);
    }
    calendar.innerHTML = `<div class="calendar-heading">${salaryMonth.toLocaleDateString("ar-EG", { month: "long", year: "numeric" })}</div><div class="calendar-weekdays">${salaryDays.map(day => `<span>${day.slice(0, 3)}</span>`).join("")}</div><div class="calendar-grid">${cells.join("")}</div>`;
}

function getMonthlySummaries(date) {
    const monthKey = toMonthKey(date);
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return salaryStudents.map(student => {
        const summary = { id: student.id, name: student.name, count: 0, total: 0, absent: 0, cancelled: 0, postponed: 0, pending: 0 };
        const addSession = (session, dateKey) => {
            if (!isStudentAvailableOnDate(student, dateKey)) return;
            const status = getSessionStatus(session, dateKey);
            if (status === "attended") {
                summary.count++;
                summary.total += getSessionPrice(session);
            } else {
                summary[status]++;
            }
        };
        (student.sessions || []).forEach(session => {
            if (session.date) {
                if (session.date.startsWith(monthKey)) addSession(session, session.date);
                return;
            }
            for (let day = 1; day <= daysInMonth; day++) {
                const dateKey = toDateKey(new Date(year, month, day));
                if (Number(session.day) === getDateDayIndex(new Date(year, month, day))) {
                    addSession(session, dateKey);
                }
            }
        });
        return summary;
    });
}

function renderMonthComparison(currentTotal, previousTotal) {
    const difference = currentTotal - previousTotal;
    const direction = difference > 0 ? "زيادة" : difference < 0 ? "نقصان" : "بدون تغيير";
    document.getElementById("monthComparison").innerHTML = `الشهر السابق: <strong>${previousTotal.toLocaleString("ar-EG")} ج.م</strong> · ${direction}: <strong>${Math.abs(difference).toLocaleString("ar-EG")} ج.م</strong>`;
}

function exportMonthlyReport() {
    const rows = getMonthlySummaries(salaryMonth)
        .filter(row => selectedStudentId === "all" || String(row.id) === String(selectedStudentId));
    const csv = [
        "الطالب,حضور,غياب,إلغاء,تأجيل,دون تسجيل,الإجمالي (ج.م)",
        ...rows.map(row => [
            row.name, row.count, row.absent, row.cancelled, row.postponed, row.pending, row.total
        ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    link.download = `salary-${toMonthKey(salaryMonth)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

async function saveSalaryEntry(item, row) {
    const priceInput = row.querySelector(".session-price");
    const saveButton = row.querySelector(".save-salary");
    const updatedSessions = (item.student.sessions || []).map(session => ({ ...session }));
    const updatedSession = { ...updatedSessions[item.sessionIndex] };
    const attendance = { ...(updatedSession.attendance || {}) };
    const status = row.querySelector(".session-status").value;
    attendance[item.dateKey] = status;
    updatedSession.attendance = attendance;
    updatedSession.price = Math.max(0, Number(priceInput.value) || 0);
    updatedSessions[item.sessionIndex] = updatedSession;
    saveButton.disabled = true;
    saveButton.textContent = "جاري الحفظ";
    row.classList.add("is-saving");

    try {
        await updateStudent(item.student.id, { name: item.student.name, sessions: updatedSessions });
        item.student.sessions = updatedSessions;
        showSalaryStatus("تم حفظ الجلسة والسعر");
        renderSalary();
    } catch (error) {
        saveButton.disabled = false;
        saveButton.textContent = "حفظ";
        row.classList.remove("is-saving");
        showSalaryStatus(error.message);
    }
}

function showSalaryStatus(message) {
    const statusElement = document.getElementById("salaryStatus");
    clearTimeout(salaryStatusTimer);
    statusElement.textContent = message;
    statusElement.classList.add("is-visible");
    salaryStatusTimer = setTimeout(() => statusElement.classList.remove("is-visible"), 3500);
}

function setSalaryView(view) {
    salaryView = view;
    document.querySelectorAll(".view-switch").forEach(button => {
        button.classList.toggle("active", button.dataset.view === view);
    });
    document.querySelectorAll(".salary-daily-item").forEach(element => {
        element.classList.toggle("salary-view-hidden", view !== "day");
    });
    document.querySelectorAll(".salary-monthly-item").forEach(element => {
        element.classList.toggle("salary-view-hidden", view !== "month");
    });
}

function formatTime(time) {
    if (!time) return "بدون وقت";
    const [hoursText, minutesText = "00"] = String(time).split(":");
    const hours = Number(hoursText);
    return `${hours % 12 || 12}:${minutesText} ${hours >= 12 ? "م" : "ص"}`;
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
