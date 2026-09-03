let salaryStudents = [];
let salaryDate = new Date();
let salaryMonth = new Date();
let selectedStudentId = "all";
let monthlySort = "name";
let attendanceFilter = "all";
let salaryView = "day";
let salaryStatusTimer;

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
                const attended = Boolean(session.attendance?.[dateKey]);
                if (attendanceFilter === "completed" && !attended) return;
                if (attendanceFilter === "pending" && attended) return;
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
    let total = 0;

    document.getElementById("salaryDateTitle").textContent = formatSalaryDate(salaryDate);
    document.getElementById("salarySessionsStat").textContent = sessions.length;

    list.innerHTML = "";
    sessions.forEach(item => {
        const attended = Boolean(item.session.attendance?.[dateKey]);
        const price = getSessionPrice(item.session);
        if (attended) {
            completed++;
            total += price;
        }

        const row = document.createElement("article");
        row.className = `salary-row ${attended ? "is-completed" : "is-pending"}`;
        row.innerHTML = `
            <label class="attendance-control">
                <input type="checkbox" class="attendance-checkbox" ${attended ? "checked" : ""}>
                <span class="checkmark">✓</span>
                <span>
                    <strong>${escapeHTML(item.student.name)}</strong>
                    <small>${formatTime(item.session.time)}${item.session.extra ? " · جلسة إضافية" : ""}</small>
                </span>
            </label>
            <label class="price-control">
                <span>السعر</span>
                <input class="session-price" type="number" min="0" step="10" value="${price}" inputmode="decimal">
                <span>ج.م</span>
            </label>
            <button class="icon-btn save-salary" type="button">حفظ</button>
        `;

        row.querySelector(".attendance-checkbox").onchange = () => saveSalaryEntry(item, row);
        row.querySelector(".save-salary").onclick = () => saveSalaryEntry(item, row);
        list.appendChild(row);
    });

    document.getElementById("completedSessionsStat").textContent = completed;
    document.getElementById("dailyTotalStat").textContent = `${total.toLocaleString("ar-EG")} ج.م`;

    if (sessions.length === 0) {
        const message = attendanceFilter === "completed"
            ? "لا توجد جلسات تم حضورها بهذا الفلتر"
            : attendanceFilter === "pending"
                ? "ممتاز، لا توجد جلسات معلقة بهذا الفلتر"
                : "لا توجد جلسات مجدولة لهذا اليوم";
        list.innerHTML = `<div class="empty empty-state"><strong>${message}</strong><small>يمكنك إضافة جلسة إضافية من القسم بالأسفل</small></div>`;
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
        attendance: { [dateKey]: true }
    };
    const existingStudent = salaryStudents.find(student => student.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase());

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
    const summaries = getMonthlySummaries(salaryMonth);
    const monthTotal = summaries.reduce((sum, row) => sum + row.total, 0);
    const rows = summaries
        .filter(row => selectedStudentId === "all" || String(row.id) === String(selectedStudentId))
        .sort((a, b) => monthlySort === "total" ? b.total - a.total : monthlySort === "count" ? b.count - a.count : a.name.localeCompare(b.name, "ar"))
        .map(row => `<div class="monthly-row"><strong>${escapeHTML(row.name)}</strong><span>${row.count} جلسة</span><b>${row.total.toLocaleString("ar-EG")} ج.م</b></div>`)
        .join("");

    const completedSessions = summaries.reduce((sum, row) => sum + row.count, 0);
    const averagePrice = completedSessions ? Math.round(monthTotal / completedSessions) : 0;
    container.innerHTML = rows
        ? `<div class="monthly-total"><span>إجمالي الشهر</span><strong>${monthTotal.toLocaleString("ar-EG")} ج.م</strong><small>${completedSessions} جلسة · متوسط ${averagePrice.toLocaleString("ar-EG")} ج.م</small></div>${rows}`
        : '<div class="empty empty-state">لا يوجد طلاب حتى الآن</div>';
    renderMonthComparison(monthTotal);
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
    for (let index = 0; index < firstDayIndex; index++) cells.push('<div class="calendar-day is-empty"></div>');
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateKey = toDateKey(date);
        let scheduled = 0;
        let completed = 0;
        salaryStudents.forEach(student => (student.sessions || []).forEach(session => {
            if (selectedStudentId !== "all" && String(student.id) !== String(selectedStudentId)) return;
            const matches = session.date === dateKey || (!session.date && Number(session.day) === getDateDayIndex(date));
            if (!matches) return;
            scheduled++;
            if (session.attendance?.[dateKey]) completed++;
        }));
        const classes = ["calendar-day", completed ? "has-completed" : "", scheduled && !completed ? "has-pending" : ""].filter(Boolean).join(" ");
        cells.push(`<div class="${classes}"><b>${day}</b>${scheduled ? `<small>${completed}/${scheduled}</small>` : ""}</div>`);
    }
    calendar.innerHTML = `<div class="calendar-heading">${salaryMonth.toLocaleDateString("ar-EG", { month: "long", year: "numeric" })}</div><div class="calendar-weekdays">${salaryDays.map(day => `<span>${day.slice(0, 3)}</span>`).join("")}</div><div class="calendar-grid">${cells.join("")}</div>`;
}

function getMonthlySummaries(date) {
    const monthKey = toMonthKey(date);
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return salaryStudents.map(student => {
        let count = 0;
        let total = 0;
        (student.sessions || []).forEach(session => {
            if (session.date) {
                if (session.date.startsWith(monthKey) && session.attendance?.[session.date]) {
                    count++;
                    total += getSessionPrice(session);
                }
                return;
            }
            for (let day = 1; day <= daysInMonth; day++) {
                const dateKey = toDateKey(new Date(year, month, day));
                if (Number(session.day) === getDateDayIndex(new Date(year, month, day)) && session.attendance?.[dateKey]) {
                    count++;
                    total += getSessionPrice(session);
                }
            }
        });
        return { id: student.id, name: student.name, count, total };
    });
}

function renderMonthComparison(currentTotal) {
    const previousMonth = new Date(salaryMonth.getFullYear(), salaryMonth.getMonth() - 1, 1);
    const previousTotal = getMonthlySummaries(previousMonth).reduce((sum, row) => sum + row.total, 0);
    const difference = currentTotal - previousTotal;
    const direction = difference > 0 ? "زيادة" : difference < 0 ? "نقصان" : "بدون تغيير";
    document.getElementById("monthComparison").innerHTML = `الشهر السابق: <strong>${previousTotal.toLocaleString("ar-EG")} ج.م</strong> · ${direction}: <strong>${Math.abs(difference).toLocaleString("ar-EG")} ج.م</strong>`;
}

function exportMonthlyReport() {
    const rows = getMonthlySummaries(salaryMonth)
        .filter(row => selectedStudentId === "all" || String(row.id) === String(selectedStudentId));
    const csv = ["الطالب,عدد الجلسات,الإجمالي (ج.م)", ...rows.map(row => `"${row.name.replace(/"/g, '""')}",${row.count},${row.total}`)].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    link.download = `salary-${toMonthKey(salaryMonth)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

async function saveSalaryEntry(item, row) {
    const checkbox = row.querySelector(".attendance-checkbox");
    const priceInput = row.querySelector(".session-price");
    const saveButton = row.querySelector(".save-salary");
    const updatedSessions = (item.student.sessions || []).map(session => ({ ...session }));
    const updatedSession = { ...updatedSessions[item.sessionIndex] };
    const attendance = { ...(updatedSession.attendance || {}) };
    attendance[item.dateKey] = checkbox.checked;
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
