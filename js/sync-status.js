function setSyncStatus(state, message) {
    let indicator = document.querySelector("[data-sync-status]");
    if (!indicator) {
        indicator = document.createElement("div");
        indicator.className = "sync-status";
        indicator.setAttribute("data-sync-status", "");
        indicator.setAttribute("role", "status");
        indicator.setAttribute("aria-live", "polite");
        document.body.append(indicator);
    }

    indicator.dataset.state = state;
    indicator.innerHTML = `<span class="sync-status-dot" aria-hidden="true"></span><span>${escapeSyncText(message)}</span>`;
}

function escapeSyncText(value) {
    return String(value).replace(/[&<>'"]/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
    }[character]));
}

async function trackSupabaseRequest(request, type = "read") {
    if (!navigator.onLine) {
        const error = new Error("لا يوجد اتصال بالإنترنت");
        setSyncStatus("offline", error.message);
        throw error;
    }

    if (type === "write") setSyncStatus("saving", "جاري الحفظ...");

    try {
        const result = await request();
        if (result?.error) throw result.error;
        setSyncStatus(type === "write" ? "saved" : "connected", type === "write" ? "تم الحفظ على Supabase" : "متصل بـ Supabase");
        return result;
    } catch (error) {
        setSyncStatus(navigator.onLine ? "error" : "offline", navigator.onLine ? `تعذر الاتصال بـ Supabase: ${error.message}` : "انقطع الاتصال بالإنترنت");
        throw error;
    }
}

window.addEventListener("offline", () => setSyncStatus("offline", "لا يوجد اتصال بالإنترنت"));
window.addEventListener("online", async () => {
    setSyncStatus("checking", "جاري التحقق من الاتصال...");
    if (typeof checkSupabaseConnection === "function" && typeof currentUser !== "undefined" && currentUser?.id) {
        try {
            await checkSupabaseConnection();
        } catch {
            return;
        }
    }
});

setSyncStatus("checking", "جاري الاتصال بـ Supabase...");
