// --- SUPABASE CONFIG ---
const supabaseUrl = "https://vperhicspxbziznahdbt.supabase.co";
const supabaseKey = "sb_publishable_xW20rjud5lWihgcYxczUug_2JTlw4M0";
const sb = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let authMode = 'LOGIN';

// --- VIEW CONTROLLER ---
function showView(view) {
    const allViews = document.querySelectorAll('.view-section');
    allViews.forEach(v => {
        v.classList.remove('active');
    });
    const target = document.getElementById(`view-${view}`);
    if (target) target.classList.add('active');
}

function toggleAuthMode(mode) {
    authMode = mode;
    document.getElementById('btn-tab-login').className = authMode === 'LOGIN' ? 'flex-1 py-3 text-xs font-black rounded-xl bg-black text-white shadow-lg' : 'flex-1 py-3 text-xs font-black rounded-xl text-slate-400';
    document.getElementById('btn-tab-register').className = authMode === 'REGISTER' ? 'flex-1 py-3 text-xs font-black rounded-xl bg-black text-white shadow-lg' : 'flex-1 py-3 text-xs font-black rounded-xl text-slate-400';
    document.getElementById('container-name').style.display = authMode === 'REGISTER' ? 'block' : 'none';
    document.getElementById('btn-auth-submit').innerText = authMode === 'LOGIN' ? 'Masuk' : 'Daftar Sekarang';
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// --- AUTH LOGIC ---
async function init() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) await checkUserProfile(session.user);
    else {
        showView('auth');
        document.getElementById('loader').style.display = 'none';
    }

    sb.auth.onAuthStateChange(async (event, session) => {
        if (session) await checkUserProfile(session.user);
        else {
            currentUser = null;
            showView('auth');
            document.getElementById('loader').style.display = 'none';
        }
    });
}

async function checkUserProfile(user) {
    try {
        const { data, error } = await sb.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
            if (!data.is_approved && !data.is_admin) {
                await sb.auth.signOut();
                alert("🔒 Akses Tertunda: Harap tunggu persetujuan Admin.");
                return;
            }
            currentUser = { ...user, profile: data };
            renderApp();
        } else {
            await sb.auth.signOut();
        }
    } catch (e) {
        console.error(e);
        showView('auth');
    }
}

// Handler Submit
document.getElementById('form-auth').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const fullName = document.getElementById('auth-name').value;

    if (authMode === 'LOGIN') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
    } else {
        const { error } = await sb.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
        if (error) alert(error.message);
        else alert("✅ Daftar berhasil. Tunggu ACC Admin!");
    }
};

function handleLogout() { sb.auth.signOut(); }

// --- APP LOGIC ---
async function renderApp() {
    showView('app');
    document.getElementById('loader').style.display = 'none';
    document.getElementById('admin-badge').classList.toggle('hidden', !currentUser.profile.is_admin);
    
    document.getElementById('btn-admin-portal').onclick = () => {
        if (currentUser.profile.is_admin) {
            openModal('modal-admin');
            fetchPendingUsers();
        }
    };
    
    document.getElementById('cal-date').value = new Date().toISOString().split('T')[0];
    fetchAppData();
}

async function fetchAppData() {
    const { data: cal } = await sb.from('calories').select('*').eq('user_id', currentUser.id).order('date', { ascending: false });
    const { data: wo } = await sb.from('workouts').select('*').eq('user_id', currentUser.id).order('date', { ascending: false });

    renderCalories(cal || []);
    renderWorkouts(wo || []);
    updateStats(cal || [], wo || []);
    lucide.createIcons(); // Refresh icons
}

function renderCalories(data) {
    const container = document.getElementById('list-calories');
    container.innerHTML = data.length ? data.map(c => `
        <div class="p-5 bg-white/40 border border-white/80 rounded-3xl flex justify-between items-center group hover:bg-white/90 transition-all">
          <div><p class="font-bold">${c.name}</p><p class="text-[10px] font-black text-slate-400">${c.date}</p></div>
          <div class="text-right"><p class="text-2xl font-black">${c.amount}</p><p class="text-[8px] font-black text-slate-400">KCAL</p></div>
        </div>
    `).join('') : '<p class="text-center py-20 opacity-20 font-black">BELUM ADA LOG</p>';
}

function renderWorkouts(data) {
    const container = document.getElementById('list-workouts');
    container.innerHTML = data.length ? data.map(w => `
        <div class="p-5 bg-white/40 border border-white/80 rounded-3xl flex justify-between items-center group hover:bg-white/90 transition-all">
          <div><p class="font-bold">${w.exercise}</p><p class="text-[10px] font-black text-blue-500">${w.date}</p></div>
          <div class="text-right"><p class="text-2xl font-black">${w.weight}</p><p class="text-[8px] font-black text-slate-400">KG</p></div>
        </div>
    `).join('') : '<p class="text-center py-20 opacity-20 font-black">BELUM ADA SESI</p>';
}

function updateStats(cal, wo) {
    const today = new Date().toISOString().split('T')[0];
    const todayKcal = cal.filter(c => c.date === today).reduce((s, c) => s + Number(c.amount), 0);
    document.getElementById('txt-today-kcal').innerText = todayKcal;
    document.getElementById('txt-total-logs').innerText = cal.length;
    document.getElementById('txt-total-workouts').innerText = wo.length;

    const pcent = Math.min(todayKcal / 2500, 1);
    document.getElementById('txt-progress-pcent').innerText = Math.round(pcent * 100) + '%';
    document.getElementById('progress-circle').style.strokeDashoffset = 364.4 - (pcent * 364.4);
}

// Pastikan ini Global agar bisa dipanggil dari HTML
window.saveCalorie = async (e) => {
    e.preventDefault();
    const name = document.getElementById('cal-name').value;
    const amount = Number(document.getElementById('cal-amount').value);
    const date = document.getElementById('cal-date').value;

    const { error } = await sb.from('calories').insert([{ user_id: currentUser.id, name, amount, date, time: '12:00' }]);
    if (!error) { closeModal('modal-calorie'); fetchAppData(); }
};

// --- ADMIN LOGIC (Global) ---
window.fetchPendingUsers = async () => {
    const { data } = await sb.from('profiles').select('*').eq('is_approved', false);
    const container = document.getElementById('list-pending-users');
    container.innerHTML = data.length ? data.map(u => `
        <div class="p-6 bg-white border border-slate-100 rounded-3xl flex justify-between items-center shadow-lg">
          <div><p class="font-black text-slate-800 uppercase">${u.full_name || 'User'}</p><p class="text-xs text-slate-400">${u.email}</p></div>
          <button onclick="approveUser('${u.id}')" class="bg-emerald-500 text-white text-[10px] font-black px-6 py-3 rounded-2xl uppercase tracking-widest shadow-xl active:scale-95 transition-all">ACC USER</button>
        </div>
    `).join('') : '<div class="text-center py-10 opacity-20 font-black">SEMUA TER-ACC</div>';
};

window.approveUser = async (id) => {
    const { error } = await sb.from('profiles').update({ is_approved: true }).eq('id', id);
    if (!error) fetchPendingUsers();
    else alert(error.message);
};

// Inisiasi
init();
lucide.createIcons();
