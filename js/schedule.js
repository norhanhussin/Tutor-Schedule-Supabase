function findScheduleConflicts(sessions, existingStudents, excludedStudentId = null, candidateName = "مواعيد مكررة داخل جدول الطالب") {
    const conflicts = new Map();
    const addConflict = (name, session) => {
        const day = session.date
            ? (new Date(`${session.date}T12:00:00`).getDay() + 1) % 7
            : Number(session.day);
        conflicts.set(`${name}|${day}|${session.time}`, { name, day, time: session.time });
    };

    for (let first = 0; first < sessions.length; first++) {
        for (let second = first + 1; second < sessions.length; second++) {
            if (areSessionsAtSameTime(sessions[first], sessions[second])) {
                addConflict(candidateName, sessions[first]);
            }
        }
    }

    (existingStudents || []).forEach(existingStudent => {
        if (existingStudent.id === excludedStudentId || existingStudent.deleted_at || existingStudent.is_paused) return;
        (existingStudent.sessions || []).forEach(existingSession => {
            sessions.forEach(session => {
                if (!areSessionsAtSameTime(session, existingSession)) return;
                const fixedDate = session.date || existingSession.date;
                if (fixedDate && !isStudentAvailableOnDate(existingStudent, fixedDate)) return;
                addConflict(existingStudent.name, session);
            });
        });
    });

    return [...conflicts.values()];
}

function areSessionsAtSameTime(first, second) {
    if (!first.time || String(first.time).slice(0, 5) !== String(second.time || "").slice(0, 5)) return false;
    if (!isScheduledSession(first) || !isScheduledSession(second)) return false;

    if (first.date && second.date) return first.date === second.date;
    if (first.date) return (new Date(`${first.date}T12:00:00`).getDay() + 1) % 7 === Number(second.day);
    if (second.date) return (new Date(`${second.date}T12:00:00`).getDay() + 1) % 7 === Number(first.day);
    return Number(first.day) === Number(second.day);
}

function isScheduledSession(session) {
    if (!session.date) return true;
    const today = getLocalDateKey(new Date());
    if (session.date < today) return false;
    if (session.date === today && String(session.time).slice(0, 5) <= new Date().toTimeString().slice(0, 5)) return false;
    return !["cancelled", "postponed"].includes(getSessionStatus(session, session.date));
}
