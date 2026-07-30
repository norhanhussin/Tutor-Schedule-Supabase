// ======================================
// TABLE
// ======================================

const TABLE = "students";

// ======================================
// GET ALL STUDENTS
// ======================================

async function getStudents() {

    const { data, error } = await client
        .from(TABLE)
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: true });

    if (error) throw error;

    return data || [];

}

// ======================================
// GET STUDENT
// ======================================

async function getStudent(id) {

    const { data, error } = await client
        .from(TABLE)
        .select("*")
        .eq("id", id)
        .eq("user_id", currentUser.id)
        .single();

    if (error) throw error;

    return data;

}

// ======================================
// ADD STUDENT
// ======================================

async function addStudent(student) {

    const { data, error } = await client
        .from(TABLE)
        .insert([
            {
                user_id: currentUser.id,
                name: student.name,
                sessions: student.sessions
            }
        ])
        .select()
        .single();

    if (error) throw error;

    return data;

}

// ======================================
// UPDATE STUDENT
// ======================================

async function updateStudent(id, student) {

    const { data, error } = await client
        .from(TABLE)
        .update({
            name: student.name,
            sessions: student.sessions
        })
        .eq("id", id)
        .eq("user_id", currentUser.id)
        .select()
        .single();

    if (error) throw error;

    return data;

}

// ======================================
// DELETE STUDENT
// ======================================

async function deleteStudentAPI(id) {

    const { error } = await client
        .from(TABLE)
        .delete()
        .eq("id", id)
        .eq("user_id", currentUser.id);

    if (error) throw error;

}

// ======================================
// OPTIONAL
// ======================================

async function deleteStudent(id) {
    return deleteStudentAPI(id);
}