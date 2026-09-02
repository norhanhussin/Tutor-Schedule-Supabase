// ======================================
// GLOBAL VARIABLES
// ======================================

let students = [];
let currentUser = null;
let isRegister = false;
let editingId = null;
let editingStudent = null;
let selectedDayIndex = null;

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

    await checkLogin();

};

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

    await loadStudents();

}

// ======================================
// LOGIN UI
// ======================================

function showLogin() {

    document.getElementById("authBox").classList.remove("hidden");
    document.getElementById("appShell").classList.add("hidden");
    const auth = document.getElementById("authBox");

    auth.innerHTML = `

<div class="wrap auth-layout">

    <div class="auth-hero">

        <span class="hero-badge">
            Tutor Schedule
        </span>

        <h1>
            لوحة المدرس
        </h1>

        <p>
            أدر مواعيدك بسهولة، أضف الطلاب، نظم الجلسات،
            وتابع جدولك اليومي من أي جهاز.
        </p>

    </div>

    <div class="focus-card auth-card">

        <h2 id="authTitle">
            تسجيل الدخول
        </h2>

        <form id="loginForm">

<label>البريد الإلكتروني</label>

<input
type="email"
id="email"
placeholder="example@email.com"
required
>

<label>كلمة المرور</label>

<input
type="password"
id="password"
required
>

<div id="confirmPasswordBox" style="display:none;">

<label>تأكيد كلمة المرور</label>

<input
type="password"
id="confirmPassword"
>

</div>

<div class="modal-actions">

<button
type="button"
class="btn secondary"
id="toggleBtn">

إنشاء حساب

</button>

<button
class="btn"
type="submit"
id="submitBtn">

دخول

</button>

</div>

</form>

        <div class="status-msg" id="authMessage"></div>

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

    if (isRegister)
        await register();
    else
        await login();

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

        students = await getStudents();

        renderStudents();

        updateStats();

        renderFocusLists();

    }

    catch (err) {

        console.error(err);

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
            class="tab ${isActive ? "active" : ""} ${isToday ? "is-today" : ""}"
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

        students.forEach(student => {

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

            box.innerHTML = '<div class="empty">لا توجد مواعيد</div>';
            return;

        }

        const list = document.createElement("div");
        list.className = "schedule-list";

        matches.forEach(item => {

            const row = document.createElement("div");
            row.className = "sess-row";
            row.innerHTML = `

                <span class="sess-name">${item.name}</span>
                <span class="sess-time">${formatTimeTo12H(item.time)}</span>

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

    title.innerText = `جدول ${dayName}`;

    const matchingSessions = [];

    students.forEach(student => {

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

        <div class="empty">

        لا توجد مواعيد لهذا اليوم

        </div>`;

        return;

    }

    const list = document.createElement("div");
    list.className = "schedule-list";

    matchingSessions.forEach(item => {

        const row = document.createElement("div");
        row.className = "sess-row";
        row.innerHTML = `

        <span class="sess-name">${item.studentName}</span>
        <span class="sess-time">${formatTimeTo12H(item.time)}</span>

        `;

        list.appendChild(row);

    });

    container.appendChild(list);

}

// ======================================
// UPDATE STATS
// ======================================

function updateStats() {

    document.getElementById("totalStudentsStat").innerText =
        students.length;

    const todayIndex = getTodayIndex();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIndex = (getTodayIndex() + 1) % 7;

    let todaySessionsStat = 0;
    let tomorrowSessionsStat = 0;

    students.forEach(student => {

        (student.sessions || []).forEach(session => {

            if (Number(session.day) === todayIndex)
                todaySessionsStat++;

            if (Number(session.day) === tomorrowIndex)
                tomorrowSessionsStat++;

        });

    });

    document.getElementById("todaySessionsStat").innerText =
        todaySessionsStat;

    document.getElementById("tomorrowSessionsStat").innerText =
        tomorrowSessionsStat;

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

    if (students.length === 0) {

        container.innerHTML =

            `<div class="empty empty-state">

        لا يوجد طلاب حتى الآن

        </div>`;

        renderDayFilter();
        renderDayView();
        renderFocusLists();
        return;

    }

    const todayIndex = getTodayIndex();
    const tomorrowIndex = (todayIndex + 1) % 7;

    students.forEach(student => {

        const card =
            document.createElement("div");

        const hasTodaySession = (student.sessions || []).some(session => Number(session.day) === todayIndex);
        const hasTomorrowSession = (student.sessions || []).some(session => Number(session.day) === tomorrowIndex);

        card.className = `student-card ${hasTodaySession ? "is-today" : ""} ${hasTomorrowSession ? "is-tomorrow" : ""}`;

        let sessionsHTML = "";

        sortSessionsByTime(student.sessions || []).forEach(session => {

            const isExtraSession = Boolean(session.date);
            const isCurrentDay = !isExtraSession && Number(session.day) === selectedDayIndex;

            sessionsHTML += `

            <span class="pill ${isCurrentDay ? "pill-active" : ""}">

                ${isExtraSession ? "جلسة إضافية" : DAYS[Number(session.day)]}

                ${formatTimeTo12H(session.time)}

            </span>

            `;

        });

        const labels = [];

        if (hasTodaySession) labels.push("اليوم");
        if (hasTomorrowSession) labels.push("غدًا");

        const statusHTML = labels.length
            ? `<div class="student-meta">${labels.map(label => `<span class="day-badge">${label}</span>`).join("")}</div>`
            : `<div class="student-meta"><span class="day-badge muted">بدون جلسات قريبة</span></div>`;

        card.innerHTML = `

<div class="student-head">

<div class="student-name-wrap">

<div class="student-name">

${student.name}

</div>

${statusHTML}

</div>

<div class="student-actions">

<button
class="icon-btn"
onclick="editStudent('${student.id}')">

تعديل

</button>

<button
class="icon-btn danger"
onclick="removeStudent('${student.id}')">

حذف

</button>

</div>

</div>

<div class="student-sessions">

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

    if (!confirm("هل تريد حذف الطالب؟"))
        return;

    try {

        await deleteStudentAPI(id);

        await loadStudents();

    }

    catch (err) {

        alert(err.message);

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

<div class="session-row" data-session-index="${sessionIndex}">

<button
type="button"
class="removeSession" style="width: 52px; min-width: 52px;">

×

</button>

<input
type="time"
class="sessionTime"
value="${session.time || "09:00"}"
style="width: 180px; min-width: 180px;">

<select class="sessionDay" style="width: 220px; min-width: 220px; max-width: 100%;">

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

<div class="overlay">

<div class="modal">

<h2>

${student ? "تعديل الطالب" : "إضافة طالب"}

</h2>

<form id="studentForm">

<label>

اسم الطالب

</label>

<input
id="studentName"
value="${student?.name || ""}"
required>

<div id="sessionsContainer">

            ${sessions.map((session, index) => createSessionRow(session, student ? index : "")).join("")}

</div>

<button
type="button"
class="btn"
id="addSessionBtn">

+ إضافة ميعاد آخر

</button>

<div class="modal-actions">

<button
type="button"
class="btn"
onclick="closeModal()">

إلغاء

</button>

<button
type="submit"
class="btn">

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

    const name =
        document
            .getElementById("studentName")
            .value
            .trim();

    if (!name) {

        alert("اكتبي اسم الطالب");

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

        alert("أضيفي ميعاد واحد على الأقل");

        return;

    }

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

        alert(err.message);

    }

}