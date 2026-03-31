// --- PUSAT KONEKSI SUPABASE (LEBIH KUAT) ---
const supabaseUrl = "https://vperhicspxbziznahdbt.supabase.co";
const supabaseKey = "sb_publishable_xW20rjud5lWihgcYxczUug_2JTlw4M0";
const sb = supabase.createClient(supabaseUrl, supabaseKey);

async function getUserProfile(uid) {
    try {
        const { data, error } = await sb.from('profiles').select('*').eq('id', uid).single();
        if (error) throw error;
        return data;
    } catch (e) {
        console.error("Gagal Ambil Profil:", e.message);
        return null;
    }
}
