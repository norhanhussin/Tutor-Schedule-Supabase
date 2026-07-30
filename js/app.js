// ======================================
// GLOBAL VARIABLES
// ======================================

let students = [];
let currentUser = null;
let isRegister = false;
let editingId = null;
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

<div class="focus-card auth-card">

<h2 id="authTitle">

تسجيل الدخول

</h2>

<form id="loginForm">

<label>

البريد الإلكتروني

</label>

<input
type="email"
id="email"
placeholder="example@email.com"
required>

<label>

كلمة المرور

</label>

<input
type="password"
id="password"
required>

<div class="modal-actions">

<button
type="button"
class="btn"
id="toggleBtn">

إنشاء حساب

</button>

<button
type="submit"
class="btn"
id="submitBtn">

دخول

</button>

</div>

</form>

<div id="authMessage"></div>

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
        isRegister
            ? "إنشاء حساب"
            : "تسجيل الدخول";

    document.getElementById("submitBtn").innerText =
        isRegister
            ? "إنشاء"
            : "دخول";

    document.getElementById("toggleBtn").innerText =
        isRegister
            ? "العودة لتسجيل الدخول"
            : "إنشاء حساب";

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

function renderDayView() {

    const container = document.getElementById("dayView");
    const title = document.getElementById("dayViewTitle");

    if (!container || !title) return;

    const currentDayIndex = selectedDayIndex ?? getTodayIndex();
    const dayName = DAYS[currentDayIndex];

    title.innerText = `جدول ${dayName}`;

    const matchingSessions = [];

    students.forEach(student => {

        (student.sessions || []).forEach(session => {

            if (Number(session.day) === currentDayIndex) {

                matchingSessions.push({

                    studentName: student.name,
                    time: session.time

                });

            }

        });

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

        `<div class="empty">

        لا يوجد طلاب

        </div>`;

        renderDayFilter();
        renderDayView();
        return;

    }

    students.forEach(student => {

        const card =
            document.createElement("div");

        card.className = "student-card";

        let sessionsHTML = "";

        (student.sessions || []).forEach(session => {

            sessionsHTML += `

            <span class="pill">

                ${DAYS[Number(session.day)]}

                ${formatTimeTo12H(session.time)}

            </span>

            `;

        });

        card.innerHTML = `

<div class="student-head">

<div class="student-name">

${student.name}

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

}

// ======================================
// SESSION ROW
// ======================================

function createSessionRow(session = {}) {

    return `

<div class="session-row">

<select class="sessionDay">

${DAYS.map((day, index) => `

<option value="${index}"

${Number(session.day)===index?"selected":""}>

${day}

</option>

`).join("")}

</select>

<input
type="time"
class="sessionTime"
value="${session.time || "09:00"}">

<button
type="button"
class="removeSession">

×

</button>

</div>

`;

}
// ======================================
// OPEN MODAL
// ======================================

function openModal(student = null) {

    editingId = student ? student.id : null;

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

${sessions.map(session => createSessionRow(session)).join("")}

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

            const day =
                Number(
                    row.querySelector(".sessionDay").value
                );

            const time =
                row.querySelector(".sessionTime").value;

            if (time) {

                sessions.push({

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