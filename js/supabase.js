// =====================================
// SUPABASE CONFIG
// =====================================

const SUPABASE_URL = "https://mscreszczwflifwvsttg.supabase.co";

const SUPABASE_ANON_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zY3Jlc3pjendmbGlmd3ZzdHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMzIzMTAsImV4cCI6MjEwMDgwODMxMH0.OiICfZ-MWsyO-1ngiGcIecKij9HMkx18R92-2opgWTQ";


const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);