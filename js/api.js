// ======================================
// TABLE
// ======================================

const TABLE = "students";

// ======================================
// GET ALL STUDENTS
// ======================================

async function getStudents() {

    const { data } = await trackSupabaseRequest(() => client
        .from(TABLE)
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: true }));

    return data || [];

}

// ======================================
// GET STUDENT
// ======================================

async function getStudent(id) {

    const { data } = await trackSupabaseRequest(() => client
        .from(TABLE)
        .select("*")
        .eq("id", id)
        .eq("user_id", currentUser.id)
        .single());

    return data;

}

// ======================================
// ADD STUDENT
// ======================================

async function addStudent(student) {

    const { data } = await trackSupabaseRequest(() => client
        .from(TABLE)
        .insert([
            {
                user_id: currentUser.id,
                name: student.name,
                sessions: student.sessions,
                is_paused: Boolean(student.is_paused),
                paused_periods: Array.isArray(student.paused_periods) ? student.paused_periods : [],
                archived_periods: Array.isArray(student.archived_periods) ? student.archived_periods : [],
                deleted_at: student.deleted_at || null
            }
        ])
        .select()
        .single(), "write");

    return data;

}

// ======================================
// UPDATE STUDENT
// ======================================

async function updateStudent(id, student) {

    const { data } = await trackSupabaseRequest(() => client
        .from(TABLE)
        .update({
            name: student.name,
            sessions: student.sessions
        })
        .eq("id", id)
        .eq("user_id", currentUser.id)
        .select()
        .single(), "write");

    return data;

}

async function checkSupabaseConnection() {
    await trackSupabaseRequest(() => client
        .from(TABLE)
        .select("id")
        .eq("user_id", currentUser.id)
        .limit(1));
}

// ======================================
// DELETE STUDENT
// ======================================

async function deleteStudentAPI(id) {
    const today = getLocalDateKey(new Date());
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = getLocalDateKey(tomorrowDate);
    const { data: student } = await trackSupabaseRequest(() => client
        .from(TABLE)
        .select("archived_periods,deleted_at")
        .eq("id", id)
        .eq("user_id", currentUser.id)
        .single());

    const periods = Array.isArray(student.archived_periods) ? [...student.archived_periods] : [];
    if (student.deleted_at) {
        const nextArchivedDate = addLocalDays(student.deleted_at, 1);
        const activePeriod = periods.find(period => !period.end);
        if (activePeriod) activePeriod.start = nextArchivedDate;
        else periods.push({ start: nextArchivedDate, end: null });
    } else {
        periods.push({ start: tomorrow, end: null });
    }
    await trackSupabaseRequest(() => client
        .from(TABLE)
        .update({ deleted_at: today, archived_periods: periods })
        .eq("id", id)
        .eq("user_id", currentUser.id), "write");

}

async function restoreStudentAPI(student) {
    const today = getLocalDateKey(new Date());
    const periods = Array.isArray(student.archived_periods)
        ? student.archived_periods.map(period => ({ ...period }))
        : [];
    if (!periods.length && student.deleted_at) {
        const previousArchiveStart = addLocalDays(student.deleted_at, 1);
        if (today > previousArchiveStart) periods.push({ start: previousArchiveStart, end: today });
    }
    const activePeriod = periods.find(period => !period.end);

    if (activePeriod) {
        activePeriod.end = today;
        if (activePeriod.end <= activePeriod.start) periods.splice(periods.indexOf(activePeriod), 1);
    }

    const { data } = await trackSupabaseRequest(() => client
        .from(TABLE)
        .update({ deleted_at: null, archived_periods: periods })
        .eq("id", student.id)
        .eq("user_id", currentUser.id)
        .select()
        .single(), "write");
    return data;
}

async function setStudentPausedAPI(student, shouldPause) {
    const today = getLocalDateKey(new Date());
    const periods = Array.isArray(student.paused_periods)
        ? student.paused_periods.map(period => ({ ...period }))
        : [];
    const activePeriod = periods.find(period => !period.end);

    if (shouldPause && !activePeriod) {
        periods.push({ start: today, end: null });
    } else if (!shouldPause && activePeriod) {
        activePeriod.end = today;
    }

    const { data } = await trackSupabaseRequest(() => client
        .from(TABLE)
        .update({ is_paused: shouldPause, paused_periods: periods })
        .eq("id", student.id)
        .eq("user_id", currentUser.id)
        .select()
        .single(), "write");
    return data;
}

function getLocalDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function addLocalDays(dateKey, days) {
    const [year, month, day] = dateKey.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);
    return getLocalDateKey(date);
}

function isStudentPausedOnDate(student, dateKey) {
    const periods = Array.isArray(student.paused_periods) ? student.paused_periods : [];
    if (periods.some(period =>
        dateKey >= period.start && (!period.end || dateKey < period.end)
    )) return true;

    return Boolean(student.is_paused && dateKey >= getLocalDateKey(new Date()));
}

function isStudentAvailableOnDate(student, dateKey) {
    const archivePeriods = Array.isArray(student.archived_periods) ? student.archived_periods : [];
    const archivedOnDate = archivePeriods.some(period =>
        dateKey >= period.start && (!period.end || dateKey < period.end)
    );
    if (archivedOnDate) return false;
    if (student.deleted_at && dateKey > student.deleted_at) return false;
    return !isStudentPausedOnDate(student, dateKey);
}

function getSessionStatus(session, dateKey) {
    const value = session.attendance?.[dateKey];
    if (value === true) return "attended";
    if (value === false || value == null) return "pending";
    return ["attended", "absent", "cancelled", "postponed"].includes(value)
        ? value
        : "pending";
}

function setSessionStatus(session, dateKey, status) {
    const attendance = { ...(session.attendance || {}) };
    attendance[dateKey] = status;
    return { ...session, attendance };
}

// ======================================
// OPTIONAL
// ======================================

async function deleteStudent(id) {
    return deleteStudentAPI(id);
}