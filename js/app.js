// ======================================
// GLOBAL VARIABLES
// ======================================

let students = [];
let currentUser = null;
let isRegister = false;
let editingId = null;
let editingStudent = null;
let selectedDayIndex = null;
let studentSearchQuery = "";
let appStatusTimer;
let notificationTimer;
const notifiedSessions = new Set();

const DAYS = [
    "السبت",
    "الأحد",
    "الاثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة"
];

// ======================================
// START APP
// ======================================

window.onload = async () => {

    setupBackToTop();
    await checkLogin();

};

function setupBackToTop() {
    const button = document.getElementById("backToTop");
    if (!button) return;
    window.addEventListener("scroll", () => button.classList.toggle("is-visible", window.scrollY > 420));
    button.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
}

// ======================================
// CHECK LOGIN
// ======================================

async function checkLogin() {

    const {
        data: { session }
    } = await client.auth.getSession();

    if (!session) {

        showLogin();
        return;

    }

    currentUser = session.user;

    showApp();

    if (await loadStudents()) offerMonthlyBackupReminder();

}

function showMessage(message, title = "تنبيه") {
    const modal = document.getElementById("modalRoot");

    modal.innerHTML = `
        <div class="overlay message-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-canvas/80 p-5 backdrop-blur-md">
            <div class="modal message-modal w-full max-w-md rounded-3xl border border-line bg-panel p-6 shadow-2xl" role="dialog" aria-modal="true">
                <h2 class="mb-3 text-center font-display text-2xl font-bold">${title}</h2>
                <p class="message-text text-muted leading-8">${escapeHTML(message)}</p>
                <div class="modal-actions mt-5 flex gap-3">
                    <button type="button" class="btn flex-1 rounded-xl bg-accent px-5 py-3 font-bold text-canvas transition hover:brightness-110" id="messageCloseBtn">حسنًا</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById("messageCloseBtn").onclick = closeModal;
}

function setAppStatus(message, isError = false) {
    const status = document.getElementById("statusMsg");
    if (!status) return;
    clearTimeout(appStatusTimer);
    status.textContent = message;
    status.classList.toggle("is-error", isError);
    status.classList.add("is-visible");
    appStatusTimer = setTimeout(() => status.classList.remove("is-visible"), 3500);
}

function showConfirm(message, title = "تأكيد العملية") {
    return new Promise(resolve => {
        const modal = document.getElementById("modalRoot");

        modal.innerHTML = `
            <div class="overlay message-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-canvas/80 p-5 backdrop-blur-md">
                <div class="modal message-modal w-full max-w-md rounded-3xl border border-line bg-panel p-6 shadow-2xl" role="dialog" aria-modal="true">
                    <h2 class="mb-3 text-center font-display text-2xl font-bold">${title}</h2>
                    <p class="message-text text-muted leading-8">${escapeHTML(message)}</p>
                    <div class="modal-actions mt-5 flex gap-3">
                        <button type="button" class="btn secondary flex-1 rounded-xl border border-line px-5 py-3 font-bold" id="confirmCancelBtn">إلغاء</button>
                        <button type="button" class="btn danger-btn flex-1 rounded-xl bg-danger px-5 py-3 font-bold text-white" id="confirmOkBtn">حذف</button>
                    </div>
                </div>
            </div>
        `;

        const finish = result => {
            closeModal();
            resolve(result);
        };

        document.getElementById("confirmCancelBtn").onclick = () => finish(false);
        document.getElementById("confirmOkBtn").onclick = () => finish(true);
    });
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
// ======================================
// LOGIN UI
// ======================================

function showLogin() {

    document.getElementById("authBox").classList.remove("hidden");
    document.getElementById("appShell").classList.add("hidden");
    const auth = document.getElementById("authBox");

    auth.innerHTML = `

<div class="wrap auth-layout mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-8 md:grid-cols-[1.2fr_.9fr]">

    <div class="auth-hero relative px-5 py-8">

        <span class="hero-badge mb-4 inline-flex rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-bold text-accent">
            Tutor Schedule
        </span>

        <h1 class="font-display font-extrabold leading-tight">
            لوحة المدرس
        </h1>

        <p class="max-w-xl text-lg leading-9 text-muted">
            أدر مواعيدك بسهولة، أضف الطلاب، نظم الجلسات،
            وتابع جدولك اليومي من أي جهاز.
        </p>

    </div>

    <div class="focus-card auth-card rounded-3xl border border-line bg-panel-raised p-7 shadow-2xl">

        <h2 class="mb-6 text-center font-display text-2xl font-bold" id="authTitle">
            تسجيل الدخول
        </h2>

        <form id="loginForm">

<label class="mb-2 block text-sm font-bold text-muted">البريد الإلكتروني</label>

<input
type="email"
id="email"
class="mb-4 w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink shadow-inner outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
placeholder="example@email.com"
required
>

<label class="mb-2 block text-sm font-bold text-muted">كلمة المرور</label>

<input
type="password"
id="password"
class="mb-4 w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink shadow-inner outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
required
>

<div id="confirmPasswordBox" style="display:none;">

<label class="mb-2 block text-sm font-bold text-muted">تأكيد كلمة المرور</label>

<input
type="password"
id="confirmPassword"
class="mb-4 w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink shadow-inner outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
>

</div>

<div class="modal-actions mt-4 flex gap-3">

<button
type="button"
class="btn secondary flex-1 rounded-xl border border-line px-5 py-3 font-bold transition hover:border-accent"
id="toggleBtn">

إنشاء حساب

</button>

<button
class="btn flex-1 rounded-xl bg-accent px-5 py-3 font-bold text-canvas shadow-lg transition hover:brightness-110"
type="submit"
id="submitBtn">

دخول

</button>

</div>

</form>

        <div class="status-msg text-center text-muted" id="authMessage"></div>

    </div>

</div>

`;

    document
        .getElementById("toggleBtn")
        .onclick = toggleAuthMode;

    document
        .getElementById("loginForm")
        .onsubmit = submitAuth;

}

// ======================================
// TOGGLE LOGIN / REGISTER
// ======================================

function toggleAuthMode() {

    isRegister = !isRegister;

    document.getElementById("authTitle").innerText =
        isRegister ? "إنشاء حساب" : "تسجيل الدخول";

    document.getElementById("submitBtn").innerText =
        isRegister ? "إنشاء" : "دخول";

    document.getElementById("toggleBtn").innerText =
        isRegister
            ? "العودة لتسجيل الدخول"
            : "إنشاء حساب";

    document.getElementById("confirmPasswordBox").style.display =
        isRegister ? "block" : "none";

    document.getElementById("authMessage").innerHTML = "";

}

// ======================================
// SUBMIT AUTH
// ======================================

async function submitAuth(e) {

    e.preventDefault();
    const submitButton = document.getElementById("submitBtn");
    const originalText = submitButton.innerText;
    submitButton.disabled = true;
    submitButton.innerText = "جاري التنفيذ...";

    try {
        if (isRegister)
            await register();
        else
            await login();
    } finally {
        submitButton.disabled = false;
        submitButton.innerText = originalText;
    }

}

// ======================================
// LOGIN
// ======================================

async function login() {

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;

    const msg =
        document.getElementById("authMessage");

    const { error } =
        await client.auth.signInWithPassword({

            email,
            password

        });

    if (error) {

        msg.innerHTML = error.message;
        return;

    }

    location.reload();

}

// ======================================
// REGISTER
// ======================================

async function register() {

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;

    const msg =
        document.getElementById("authMessage");
    const confirmPassword =
        document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {

        msg.innerHTML =
            "كلمتا المرور غير متطابقتين";

        return;

    }
    const { error } =
        await client.auth.signUp({

            email,
            password

        });

    if (error) {

        msg.innerHTML = error.message;
        return;

    }

    msg.innerHTML =
        "تم إنشاء الحساب بنجاح ✔";

}

// ======================================
// SHOW APP
// ======================================

function showApp() {

    document.getElementById("authBox").innerHTML = "";
    document.getElementById("authBox").classList.add("hidden");

    document.getElementById("appShell").classList.remove("hidden");

    document.getElementById("logoutBtn").onclick = logout;
    document.getElementById("studentSearch").oninput = event => {
        studentSearchQuery = event.target.value.trim().toLocaleLowerCase();
        renderStudents();
    };
    document.getElementById("exportBackupBtn").onclick = exportBackup;
    document.getElementById("importBackupInput").onchange = importBackup;
    document.getElementById("notificationsBtn").onclick = enableNotifications;
    updateNotificationStatus();
    notificationTimer = setInterval(checkUpcomingSessions, 60000);
    checkUpcomingSessions();

}

// ======================================
// LOGOUT
// ======================================

async function logout() {

    await client.auth.signOut();

    location.reload();

}
// ======================================
// LOAD STUDENTS
// ======================================

async function loadStudents() {

    try {

        setAppStatus("جاري تحميل البيانات...");

        students = await getStudents();

        renderStudents();
        renderPausedStudents();
        renderArchivedStudents();

        updateStats();

        renderFocusLists();
        setAppStatus("تم تحديث البيانات");
        return true;

    }

    catch (err) {

        console.error(err);
        setAppStatus("تعذر تحميل البيانات", true);
        return false;

    }

}

// ======================================
// HELPERS
// ======================================

function getTodayIndex() {

    const today = new Date();
    return (today.getDay() + 1) % 7;

}

function formatTimeTo12H(time) {

    if (!time) return "";

    const [hoursText, minutesText = "00"] = String(time).split(":");
    const hours = Number(hoursText);
    const minutes = Number(minutesText);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {

        return time;

    }

    const suffix = hours >= 12 ? "م" : "ص";
    const normalizedHour = hours % 12 || 12;
    const normalizedMinutes = String(minutes).padStart(2, "0");

    return `${normalizedHour}:${normalizedMinutes} ${suffix}`;

}

function sortSessionsByTime(sessions = []) {

    return [...sessions].sort((a, b) => {

        const aTime = String(a?.time || "23:59").split(":");
        const bTime = String(b?.time || "23:59").split(":");

        const aMinutes = Number(aTime[0]) * 60 + Number(aTime[1] || 0);
        const bMinutes = Number(bTime[0]) * 60 + Number(bTime[1] || 0);

        return aMinutes - bMinutes;

    });

}

function renderDayFilter() {

    const ribbon = document.getElementById("ribbon");

    if (!ribbon) return;

    const currentDayIndex = selectedDayIndex ?? getTodayIndex();

    ribbon.innerHTML = DAYS.map((day, index) => {

        const isActive = index === currentDayIndex;
        const isToday = index === getTodayIndex();

        return `

        <button
            type="button"
            class="tab ${isActive ? "active" : ""} ${isToday ? "is-today" : ""} min-w-20 rounded-xl border border-line bg-panel-raised px-4 py-3 font-bold transition hover:-translate-y-0.5"
            data-day-index="${index}">

            ${day}

        </button>

        `;

    }).join("");

    ribbon.querySelectorAll(".tab").forEach(button => {

        button.onclick = () => {

            selectedDayIndex = Number(button.dataset.dayIndex);
            renderDayFilter();
            renderDayView();

            document.getElementById("dayView")?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        };

    });

}

function renderFocusLists() {

    const listMap = [
        { id: "todayList", dayIndex: getTodayIndex() },
        { id: "tomorrowList", dayIndex: (getTodayIndex() + 1) % 7 }
    ];

    listMap.forEach(({ id, dayIndex }) => {

        const box = document.getElementById(id);

        if (!box) return;

        const matches = [];

        const sessionDate = getUpcomingDateForDay(dayIndex);
        const sessionDateKey = getLocalDateKey(sessionDate);
        students.forEach(student => {
            if (!isStudentAvailableOnDate(student, sessionDateKey)) return;

            sortSessionsByTime(student.sessions || []).forEach(session => {

                if (Number(session.day) === dayIndex) {

                    matches.push({
                        name: student.name,
                        time: session.time
                    });

                }

            });

        });

        matches.sort((a, b) => {

            const aMinutes = Number(String(a.time || "23:59").split(":")[0]) * 60 + Number(String(a.time || "23:59").split(":")[1] || 0);
            const bMinutes = Number(String(b.time || "23:59").split(":")[0]) * 60 + Number(String(b.time || "23:59").split(":")[1] || 0);

            return aMinutes - bMinutes;

        });

        box.innerHTML = "";

        if (matches.length === 0) {

            box.innerHTML = '<div class="empty rounded-xl border border-dashed border-line p-4 text-center text-muted">لا توجد مواعيد</div>';
            return;

        }

        const list = document.createElement("div");
        list.className = "schedule-list flex flex-col gap-2";

        matches.forEach(item => {

            const row = document.createElement("div");
            row.className = "sess-row flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas/40 px-4 py-3";
            row.innerHTML = `

                <span class="sess-name font-bold text-ink">${escapeHTML(item.name)}</span>
                <span class="sess-time rounded-full bg-accent/10 px-3 py-1 font-bold text-accent">${formatTimeTo12H(item.time)}</span>

            `;

            list.appendChild(row);

        });

        box.appendChild(list);

    });

}

function renderDayView() {

    const container = document.getElementById("dayView");
    const title = document.getElementById("dayViewTitle");

    if (!container || !title) return;

    const currentDayIndex = selectedDayIndex ?? getTodayIndex();
    const dayName = DAYS[currentDayIndex];
    const selectedDateKey = getLocalDateKey(getUpcomingDateForDay(currentDayIndex));

    title.innerText = `جدول ${dayName}`;

    const matchingSessions = [];

    students.forEach(student => {
        if (!isStudentAvailableOnDate(student, selectedDateKey)) return;

        sortSessionsByTime(student.sessions || []).forEach(session => {

            if (Number(session.day) === currentDayIndex) {

                matchingSessions.push({

                    studentName: student.name,
                    time: session.time

                });

            }

        });

    });

    matchingSessions.sort((a, b) => {

        const aMinutes = Number(String(a.time || "23:59").split(":")[0]) * 60 + Number(String(a.time || "23:59").split(":")[1] || 0);
        const bMinutes = Number(String(b.time || "23:59").split(":")[0]) * 60 + Number(String(b.time || "23:59").split(":")[1] || 0);

        return aMinutes - bMinutes;

    });

    container.innerHTML = "";

    if (matchingSessions.length === 0) {

        container.innerHTML = `

        <div class="empty rounded-xl border border-dashed border-line p-4 text-center text-muted">

        لا توجد مواعيد لهذا اليوم

        </div>`;

        return;

    }

    const list = document.createElement("div");
    list.className = "schedule-list flex flex-col gap-2";

    matchingSessions.forEach(item => {

        const row = document.createElement("div");
        row.className = "sess-row flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas/40 px-4 py-3";
        row.innerHTML = `

        <span class="sess-name font-bold text-ink">${escapeHTML(item.studentName)}</span>
        <span class="sess-time rounded-full bg-accent/10 px-3 py-1 font-bold text-accent">${formatTimeTo12H(item.time)}</span>

        `;

        list.appendChild(row);

    });

    container.appendChild(list);

}

// ======================================
// UPDATE STATS
// ======================================

function updateStats() {

    const activeStudents = students.filter(student => !student.is_paused && !student.deleted_at);
    document.getElementById("totalStudentsStat").innerText = activeStudents.length;

    const todayIndex = getTodayIndex();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIndex = (getTodayIndex() + 1) % 7;

    let todaySessionsStat = 0;
    let tomorrowSessionsStat = 0;

    const todayDateKey = getLocalDateKey(new Date());
    const tomorrowDateKey = getLocalDateKey(tomorrow);
    activeStudents.forEach(student => {

        (student.sessions || []).forEach(session => {

            if (Number(session.day) === todayIndex && isStudentAvailableOnDate(student, todayDateKey))
                todaySessionsStat++;

            if (Number(session.day) === tomorrowIndex && isStudentAvailableOnDate(student, tomorrowDateKey))
                tomorrowSessionsStat++;

        });

    });

    document.getElementById("todaySessionsStat").innerText =
        todaySessionsStat;

    document.getElementById("tomorrowSessionsStat").innerText =
        tomorrowSessionsStat;

}

function getUpcomingDateForDay(dayIndex) {
    const date = new Date();
    const daysAhead = (dayIndex - getTodayIndex() + 7) % 7;
    date.setDate(date.getDate() + daysAhead);
    return date;
}

// ======================================
// RENDER STUDENTS
// ======================================

function renderStudents() {

    const container =
        document.getElementById("studentList");

    container.innerHTML = "";

    if (selectedDayIndex === null) {

        selectedDayIndex = getTodayIndex();

    }

    const activeStudents = students.filter(student => !student.is_paused && !student.deleted_at);
    const visibleStudents = activeStudents.filter(student =>
        !studentSearchQuery || student.name.toLocaleLowerCase().includes(studentSearchQuery)
    );

    if (activeStudents.length === 0) {

        container.innerHTML =

            `<div class="empty empty-state rounded-2xl border border-dashed border-line bg-panel/50 p-7 text-center text-muted">

        لا يوجد طلاب حتى الآن

        </div>`;

        renderDayFilter();
        renderDayView();
        renderFocusLists();
        return;

    }

    if (visibleStudents.length === 0) {
        container.innerHTML = '<div class="empty empty-state rounded-2xl border border-dashed border-line bg-panel/50 p-7 text-center text-muted"><strong>لا يوجد طالب بهذا الاسم</strong><small class="mt-2 block text-muted">جربي كلمة بحث مختلفة</small></div>';
        renderDayFilter();
        renderDayView();
        renderFocusLists();
        return;
    }

    const todayIndex = getTodayIndex();
    const tomorrowIndex = (todayIndex + 1) % 7;

    visibleStudents.forEach(student => {

        const card =
            document.createElement("div");

        const hasTodaySession = isStudentAvailableOnDate(student, getLocalDateKey(new Date())) && (student.sessions || []).some(session => Number(session.day) === todayIndex);
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const hasTomorrowSession = isStudentAvailableOnDate(student, getLocalDateKey(tomorrowDate)) && (student.sessions || []).some(session => Number(session.day) === tomorrowIndex);

        card.className = `student-card ${hasTodaySession ? "is-today" : ""} ${hasTomorrowSession ? "is-tomorrow" : ""} rounded-2xl border border-line bg-panel-raised p-5 shadow-lg transition hover:-translate-y-0.5 hover:border-accent/40`;

        let sessionsHTML = "";

        sortSessionsByTime(student.sessions || []).forEach(session => {

            const isExtraSession = Boolean(session.date);
            const isCurrentDay = !isExtraSession && Number(session.day) === selectedDayIndex;

            sessionsHTML += `

            <span class="pill ${isCurrentDay ? "pill-active" : ""} rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-sm font-bold text-accent">

                ${isExtraSession ? "جلسة إضافية" : DAYS[Number(session.day)]}

                ${formatTimeTo12H(session.time)}

            </span>

            `;

        });

        const labels = [];

        if (hasTodaySession) labels.push("اليوم");
        if (hasTomorrowSession) labels.push("غدًا");

        const statusHTML = labels.length
            ? `<div class="student-meta flex flex-wrap gap-2">${labels.map(label => `<span class="day-badge rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-bold text-accent">${label}</span>`).join("")}</div>`
            : `<div class="student-meta flex flex-wrap gap-2"><span class="day-badge muted rounded-full border border-line bg-canvas/40 px-3 py-1 text-xs font-bold text-muted">بدون جلسات قريبة</span></div>`;

        card.innerHTML = `

<div class="student-head mb-4 flex items-start justify-between gap-3">

<div class="student-name-wrap flex min-w-0 flex-1 flex-col gap-2">

<div class="student-name font-display text-lg font-bold text-ink">

${escapeHTML(student.name)}

</div>

${statusHTML}

</div>

<div class="student-actions flex items-center gap-2">

<button
class="icon-btn rounded-lg border border-line px-3 py-2 text-muted transition hover:border-sage hover:text-ink"
onclick="editStudent('${student.id}')">

تعديل

</button>

<button
class="icon-btn rounded-lg border border-sage/30 px-3 py-2 text-sage transition hover:bg-sage/10"
onclick="toggleStudentPause('${student.id}', true)">

إيقاف مؤقت

</button>

<button
class="icon-btn danger rounded-lg border border-danger/30 px-3 py-2 text-danger transition hover:bg-danger/10"
onclick="removeStudent('${student.id}')">

حذف

</button>

</div>

</div>

<div class="student-sessions flex flex-wrap gap-2">

${sessionsHTML}

</div>

`;

        container.appendChild(card);

    });

    renderDayFilter();
    renderDayView();
    renderFocusLists();

}
// ======================================
// DELETE STUDENT
// ======================================

async function removeStudent(id) {

    const student = students.find(item => String(item.id) === String(id));
    if (!await showConfirm(`سيُخفى الطالب ${student?.name || ""} من القوائم القادمة، مع الاحتفاظ بسجل حضوره وحسابه القديم. هل تريد المتابعة؟`))
        return;

    try {
        await deleteStudentAPI(id);
        await loadStudents();
        setAppStatus("تم إخفاء الطالب مع الاحتفاظ بسجل حسابه");
    } catch (error) {
        showMessage(error.message, "حدث خطأ");
    }
}

async function restoreStudent(id) {
    const student = students.find(item => String(item.id) === String(id));
    if (!student || !await showConfirm(
        `سيتم إعادة ${student.name} إلى قائمة الطلاب بمواعيده الحالية، مع إبقاء فترة الأرشفة خارج الحسابات. هل تريدين المتابعة؟`,
        "استعادة طالب"
    )) return;

    try {
        await restoreStudentAPI(student);
        await loadStudents();
        setAppStatus("تمت استعادة الطالب مع الحفاظ على سجلاته");
    } catch (error) {
        showMessage(error.message, "تعذرت استعادة الطالب");
    }
}

async function toggleStudentPause(id, shouldPause) {
    const student = students.find(item => String(item.id) === String(id));
    if (!student) return;

    try {
        await setStudentPausedAPI(student, shouldPause);
        await loadStudents();
        setAppStatus(shouldPause ? "تم إيقاف الطالب مؤقتًا" : "تمت إعادة الطالب إلى الجدول");
    } catch (error) {
        showMessage(error.message, "تعذر تحديث حالة الطالب");
    }
}

function renderPausedStudents() {
    const container = document.getElementById("pausedStudentList");
    if (!container) return;

    const pausedStudents = students.filter(student => student.is_paused && !student.deleted_at);
    if (!pausedStudents.length) {
        container.innerHTML = '<div class="empty-state rounded-2xl border border-dashed border-line bg-panel/50 p-5 text-center text-muted">لا يوجد طلاب متوقفون حاليًا</div>';
        return;
    }

    container.innerHTML = pausedStudents.map(student => `
        <article class="student-card flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-panel-raised p-5 shadow-lg">
            <div>
                <h3 class="font-display text-lg font-bold text-ink">${escapeHTML(student.name)}</h3>
                <span class="mt-1 inline-flex rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-bold text-accent">متوقف مؤقتًا</span>
            </div>
            <button type="button" class="rounded-xl bg-sage px-4 py-2 font-bold text-canvas transition hover:brightness-110" onclick="toggleStudentPause('${student.id}', false)">إعادة للجدول</button>
            <button type="button" class="rounded-xl border border-danger/30 px-4 py-2 font-bold text-danger transition hover:bg-danger/10" onclick="removeStudent('${student.id}')">حذف مع حفظ الحساب</button>
        </article>
    `).join("");
}

function renderArchivedStudents() {
    const container = document.getElementById("archivedStudentList");
    if (!container) return;

    const archivedStudents = students.filter(student => student.deleted_at);
    if (!archivedStudents.length) {
        container.innerHTML = '<div class="empty-state rounded-2xl border border-dashed border-line bg-panel/50 p-5 text-center text-muted">الأرشيف فارغ</div>';
        return;
    }

    container.innerHTML = archivedStudents.map(student => `
        <article class="student-card flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-panel-raised p-5 shadow-lg">
            <div class="min-w-0">
                <h3 class="font-display text-lg font-bold text-ink">${escapeHTML(student.name)}</h3>
                <span class="mt-1 inline-flex rounded-full border border-line bg-canvas/40 px-3 py-1 text-xs font-bold text-muted">محفوظ في الأرشيف</span>
            </div>
            <button type="button" class="rounded-xl bg-sage px-4 py-2 font-bold text-canvas transition hover:brightness-110" onclick="restoreStudent('${student.id}')">استعادة الطالب</button>
        </article>
    `).join("");
}

function offerMonthlyBackupReminder() {
    const reminderKey = "tutorScheduleBackupReminderMonth";
    const monthKey = getLocalDateKey(new Date()).slice(0, 7);
    try {
        if (localStorage.getItem(reminderKey) === monthKey) return;
        localStorage.setItem(reminderKey, monthKey);
    } catch (error) {
        setAppStatus(`تعذر حفظ تذكير النسخة الاحتياطية في هذا المتصفح: ${error.message}`, true);
        return;
    }

    const modal = document.getElementById("modalRoot");
    modal.innerHTML = `
        <div class="overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-canvas/80 p-5 backdrop-blur-md">
            <div class="modal w-full max-w-md rounded-3xl border border-line bg-panel p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="backupReminderTitle">
                <h2 id="backupReminderTitle" class="mb-3 text-center font-display text-2xl font-bold">تذكير النسخة الاحتياطية الشهرية</h2>
                <p class="mb-5 text-center leading-8 text-muted">احتفظي بنسخة من الطلاب والجلسات وسجلات الحضور على جهازك.</p>
                <div class="flex flex-wrap gap-3">
                    <button id="backupReminderDownload" type="button" class="min-w-0 flex-1 rounded-xl bg-accent px-4 py-3 font-bold text-canvas">تنزيل النسخة الآن</button>
                    <button id="backupReminderLater" type="button" class="min-w-0 flex-1 rounded-xl border border-line px-4 py-3 font-bold text-muted">لاحقًا</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById("backupReminderDownload").onclick = () => {
        closeModal();
        exportBackup();
    };
    document.getElementById("backupReminderLater").onclick = closeModal;
}

function exportBackup() {
    const backup = {
        app: "Tutor Schedule",
        version: 1,
        exportedAt: new Date().toISOString(),
        students: students.map(student => ({
            name: student.name,
            sessions: student.sessions || [],
            is_paused: Boolean(student.is_paused),
            paused_periods: student.paused_periods || [],
            archived_periods: student.archived_periods || [],
            deleted_at: student.deleted_at || null
        }))
    };
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    link.download = `tutor-schedule-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setAppStatus("تم تصدير النسخة الاحتياطية");
}

async function importBackup(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;

    try {
        const backup = JSON.parse(await file.text());
        if (!Array.isArray(backup.students) || backup.students.some(student => !student?.name || !Array.isArray(student.sessions))) {
            throw new Error("ملف النسخة الاحتياطية غير صالح");
        }
        if (!await showConfirm(`سيتم إضافة ${backup.students.length} طالب إلى قائمتك الحالية. هل تريد المتابعة؟`, "استيراد نسخة احتياطية")) return;
        setAppStatus("جاري استيراد البيانات...");
        for (const student of backup.students) {
            await addStudent({
                name: String(student.name).trim(),
                sessions: student.sessions,
                is_paused: Boolean(student.is_paused),
                paused_periods: student.paused_periods || [],
                archived_periods: student.archived_periods || [],
                deleted_at: student.deleted_at || null
            });
        }
        await loadStudents();
        setAppStatus("تم استيراد النسخة الاحتياطية");
    } catch (error) {
        setAppStatus(error.message || "تعذر استيراد النسخة الاحتياطية", true);
    }
}

// ======================================
// EDIT STUDENT
// ======================================

async function editStudent(id) {

    try {

        const student = await getStudent(id);

        openModal(student);

    }

    catch (err) {

        console.error(err);

    }

}

// ======================================
// ADD BUTTON
// ======================================

document.addEventListener("click", (e) => {

    if (e.target.id === "addStudentBtn") {

        openModal();

    }

});

// ======================================
// CLOSE MODAL
// ======================================

function closeModal() {

    document.getElementById("modalRoot").innerHTML = "";

    editingId = null;
    editingStudent = null;

}

// ======================================
// SESSION ROW
// ======================================

function createSessionRow(session = {}, sessionIndex = "") {

    return `

<div class="session-row flex flex-wrap items-center gap-3 rounded-xl border border-line bg-canvas/40 p-3" data-session-index="${sessionIndex}">

<button
type="button"
class="removeSession rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-danger transition hover:bg-danger/20" style="width: 52px; min-width: 52px;">

×

</button>

<input
type="time"
class="sessionTime rounded-lg border border-line bg-canvas px-3 py-2 text-center text-ink outline-none focus:border-accent"
value="${session.time || "09:00"}"
style="width: 180px; min-width: 180px;">

<select class="sessionDay rounded-lg border border-line bg-canvas px-3 py-2 text-ink outline-none focus:border-accent" style="width: 220px; min-width: 220px; max-width: 100%;">

${DAYS.map((day, index) => `

<option value="${index}"

${Number(session.day) === index ? "selected" : ""}>

${day}

</option>

`).join("")}

</select>

</div>

`;

}
// ======================================
// OPEN MODAL
// ======================================

function openModal(student = null) {

    editingId = student ? student.id : null;
    editingStudent = student;

    const sessions =
        student?.sessions?.length
            ? student.sessions
            : [{ day: 0, time: "09:00" }];

    const modal = document.getElementById("modalRoot");

    modal.innerHTML = `

<div class="overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-canvas/80 p-5 backdrop-blur-md">

<div class="modal w-full max-w-xl rounded-3xl border border-line bg-panel p-6 shadow-2xl">

<h2 class="mb-5 text-center font-display text-2xl font-bold">

${student ? "تعديل الطالب" : "إضافة طالب"}

</h2>

<form id="studentForm">

<label class="mb-2 block text-sm font-bold text-muted">

اسم الطالب

</label>

<input
id="studentName"
class="mb-4 w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-accent focus:ring-4 focus:ring-accent/10"
value="${student?.name || ""}"
required>

<div id="sessionsContainer" class="my-4 flex flex-col gap-3">

            ${sessions.map((session, index) => createSessionRow(session, student ? index : "")).join("")}

</div>

<button
type="button"
class="btn w-full rounded-xl border border-dashed border-accent/50 bg-accent/5 px-4 py-3 font-bold text-accent transition hover:bg-accent/10"
id="addSessionBtn">

+ إضافة ميعاد آخر

</button>

<div class="modal-actions mt-5 flex gap-3">

<button
type="button"
class="btn flex-1 rounded-xl border border-line bg-panel-raised px-5 py-3 font-bold text-ink transition hover:border-accent"
onclick="closeModal()">

إلغاء

</button>

<button
type="submit"
class="btn flex-1 rounded-xl bg-accent px-5 py-3 font-bold text-canvas transition hover:brightness-110">

${student ? "حفظ التعديل" : "إضافة"}

</button>

</div>

</form>

</div>

</div>

`;

    document
        .getElementById("studentForm")
        .onsubmit = saveStudent;

    document
        .getElementById("addSessionBtn")
        .onclick = () => {

            document
                .getElementById("sessionsContainer")
                .insertAdjacentHTML(
                    "beforeend",
                    createSessionRow()
                );

        };

    document
        .getElementById("sessionsContainer")
        .addEventListener("click", function (e) {

            if (!e.target.classList.contains("removeSession"))
                return;

            if (document.querySelectorAll(".session-row").length > 1) {

                e.target.closest(".session-row").remove();

            }

        });

}
// ======================================
// SAVE STUDENT
// ======================================

async function saveStudent(e) {

    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');

    const name =
        document
            .getElementById("studentName")
            .value
            .trim();

    if (!name) {

    showMessage("اكتبي اسم الطالب", "بيانات ناقصة");

        return;

    }

    const sessions = [];

    document
        .querySelectorAll(".session-row")
        .forEach(row => {

            const originalIndex = row.dataset.sessionIndex;
            const originalSession = originalIndex === ""
                ? null
                : editingStudent?.sessions?.[Number(originalIndex)];

            const day =
                Number(
                    row.querySelector(".sessionDay").value
                );

            const time =
                row.querySelector(".sessionTime").value;

            if (time) {

                sessions.push({
                    ...(originalSession || {}),
                    day,
                    time
                });

            }

        });

    if (sessions.length === 0) {

    showMessage("أضيفي ميعاد واحد على الأقل", "بيانات ناقصة");

        return;

    }

    submitButton.disabled = true;
    submitButton.innerText = editingId ? "جاري الحفظ..." : "جاري الإضافة...";

    const student = {

        name,

        sessions

    };

    try {

        if (editingId) {

            await updateStudent(
                editingId,
                student
            );

        }

        else {

            await addStudent(
                student
            );

        }

        closeModal();

        await loadStudents();

    }

    catch (err) {

        console.error(err);

    showMessage(err.message, "حدث خطأ");

    }

    submitButton.disabled = false;
    submitButton.innerText = editingId ? "حفظ التعديل" : "إضافة";

}

async function enableNotifications() {
    const status = document.getElementById("notificationStatus");
    if (!("Notification" in window)) {
        status.textContent = "المتصفح لا يدعم الإشعارات";
        return;
    }
    const permission = await Notification.requestPermission();
    updateNotificationStatus();
    if (permission === "granted") checkUpcomingSessions();
}

function updateNotificationStatus() {
    const button = document.getElementById("notificationsBtn");
    const status = document.getElementById("notificationStatus");
    if (!button || !status || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
        button.textContent = "إشعارات المواعيد مفعّلة";
        button.classList.add("notifications-enabled");
        status.textContent = "سيصلك تنبيه قبل الموعد بـ15 دقيقة";
    } else if (Notification.permission === "denied") {
        button.textContent = "الإشعارات محظورة من المتصفح";
        status.textContent = "اسمحي بها من إعدادات الموقع لتفعيلها";
    }
}

function checkUpcomingSessions() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const dayIndex = getTodayIndex();
    students.forEach(student => (student.sessions || []).forEach(session => {
        if (student.is_paused || student.deleted_at || !isStudentAvailableOnDate(student, dateKey)) return;
        const matchesToday = session.date === dateKey || (!session.date && Number(session.day) === dayIndex);
        if (!matchesToday || !session.time) return;
        const [hours, minutes] = String(session.time).split(":").map(Number);
        const sessionTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
        const minutesUntil = Math.round((sessionTime - now) / 60000);
        const notificationKey = `${student.id}-${dateKey}-${session.time}`;
        if (minutesUntil >= 14 && minutesUntil <= 15 && !notifiedSessions.has(notificationKey)) {
            new Notification("موعد جلسة قريب", { body: `${student.name} بعد 15 دقيقة · ${formatTimeTo12H(session.time)}` });
            notifiedSessions.add(notificationKey);
        }
    }));
}