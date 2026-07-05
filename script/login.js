// Base URL daripada Oracle APEX anda
const API_CUSTOMER = 'https://oracleapex.com/ords/merendanghikers/customer/';
const API_STAFF = 'https://oracleapex.com/ords/merendanghikers/staff/';
const API_GUIDE = 'https://oracleapex.com/ords/merendanghikers/guide/';

// ==========================================
// 1. PROSES LOGIN CUSTOMER
// ==========================================
async function prosesCustomerLogin(event) {
    event.preventDefault(); 

    const emailInput = document.getElementById('custEmail') || document.querySelector('[type="email"]');
    const passInput = document.getElementById('custPass') || document.querySelector('[type="password"]');

    if (!emailInput || !passInput) {
        alert("Ralat: Input e-mel atau password tidak dijumpai.");
        return;
    }

    const email = emailInput.value.trim().toLowerCase();
    const password = passInput.value;

    try {
        // cache: 'no-store' memastikan data paling baru pendaftaran ditarik dari APEX
        const response = await fetch(API_CUSTOMER, { cache: 'no-store' });
        if (!response.ok) throw new Error("Gagal menghubungi server APEX");

        const data = await response.json();
        const customers = data.items || []; 

        // Menyokong semakan jika APEX hantar format Huruf Besar mahupun Huruf Kecil
        const userMaju = customers.find(c => {
            const dbEmail = c.CUSTOMER_EMAIL || c.customer_email;
            const dbPass = c.CUSTOMER_PASS || c.customer_pass;
            
            if (dbEmail && dbPass) {
                return (dbEmail.toLowerCase() === email) && (String(dbPass) === String(password));
            }
            return false;
        });

        if (userMaju) {
            const nameFinal = userMaju.CUSTOMER_NAME || userMaju.customer_name;
            const idFinal = userMaju.CUSTOMER_ID || userMaju.customer_id;

            sessionStorage.setItem('loggedInUser', nameFinal);
            sessionStorage.setItem('customerId', idFinal);
            
            alert(`Selamat kembali, ${nameFinal}!`);
            window.location.href = 'Customer.html'; 
        } else {
            alert("E-mel atau Kata Laluan salah. Sila cuba lagi.");
        }

    } catch (error) {
        console.error("Ralat Login Customer:", error);
        alert("Sistem mengalami gangguan teknikal semasa log masuk.");
    }
}

// ==========================================
// 2. PROSES REGISTRATION CUSTOMER (VERSI FIX HURUF BESAR)
// ==========================================
async function prosesCustomerRegister(event) {
    event.preventDefault();

    const nameInput = document.getElementById('regName');
    const phoneInput = document.getElementById('regPhone');
    const emailInput = document.getElementById('regEmail');
    const passInput = document.getElementById('regPass');

    // Menghasilkan ID rawak (Contoh: C521)
    const randomId = 'C' + Math.floor(100 + Math.random() * 900); 

    // Menggunakan HURUF BESAR pada key objek supaya sepadan tepat dengan struktur DB APEX anda
    const newCustomer = {
        CUSTOMER_ID: randomId, 
        CUSTOMER_NAME: nameInput.value.trim(),
        CUSTOMER_PHONE: phoneInput.value.trim(),
        CUSTOMER_EMAIL: emailInput.value.trim(),
        CUSTOMER_PASS: passInput.value
    };

    try {
        const response = await fetch(API_CUSTOMER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCustomer)
        });

        if (response.ok || response.status === 201) {
            alert("Pendaftaran akaun berjaya! Sila log masuk menggunakan e-mel dan password tadi.");
            location.reload(); // Refresh halaman untuk kembali ke skrin login asli
        } else {
            const err = await response.text();
            console.error("Respon Gagal dari APEX:", err);
            alert("Gagal mendaftar. Format data tidak diterima oleh Oracle APEX.");
        }
    } catch (error) {
        console.error("Ralat Register:", error);
        alert("Ralat sambungan ke database ketika mendaftar.");
    }
}

// ==========================================
// 3. PROSES LOGIN STAFF & GUIDE
// ==========================================
// ==========================================
// 3. PROSES LOGIN STAFF & GUIDE (VERSI FIX)
// ==========================================
async function prosesStaffGuideLogin(event) {
    event.preventDefault();

    const idInput = document.getElementById('staffGuideId');
    const passInput = document.getElementById('staffPass');

    const inputId = idInput.value.trim().toUpperCase(); 
    const password = passInput.value;

    try {
        if (inputId.startsWith('S')) {
            const response = await fetch(API_STAFF, { cache: 'no-store' });
            if (!response.ok) throw new Error("Gagal hubungi server Staff");
            
            const data = await response.json();
            const staffs = data.items || [];

            const staffFound = staffs.find(s => {
                const dbId = s.STAFF_ID || s.staff_id;
                const dbPass = s.STAFF_PASS || s.staff_pass;
                return String(dbId).toUpperCase() === inputId && String(dbPass) === String(password);
            });

            if (staffFound) {
                const sName = staffFound.STAFF_NAME || staffFound.staff_name;
                const sId = staffFound.STAFF_ID || staffFound.staff_id;
                
                // Simpan kedua-dua format kunci sesyen untuk mengelakkan ralat dashboard luar
                sessionStorage.setItem('staffId', sId);
                sessionStorage.setItem('loggedInUser', sName);
                
                alert(`Log Masuk Staff Berjaya. Selamat bertugas, ${sName}!`);
                window.location.href = 'Staff.html';
            } else {
                alert("ID Staff atau Password salah.");
            }

        } else if (inputId.startsWith('G')) {
            const response = await fetch(API_GUIDE, { cache: 'no-store' });
            if (!response.ok) throw new Error("Gagal hubungi server Guide");

            const data = await response.json();
            const guides = data.items || [];

            const guideFound = guides.find(g => {
                const dbId = g.GUIDE_ID || g.guide_id;
                const dbPass = g.GUIDE_PASS || g.guide_pass;
                return String(dbId).toUpperCase() === inputId && String(dbPass) === String(password);
            });

            if (guideFound) {
                const gName = guideFound.GUIDE_NAME || guideFound.guide_name;
                const gId = guideFound.GUIDE_ID || guideFound.guide_id;
                
                // Simpan pelbagai format sesyen untuk memastikan kelancaran dashboard Guide.html
                sessionStorage.setItem('guideId', gId);
                sessionStorage.setItem('loggedInUser', gName);
                sessionStorage.setItem('username', gName);
                
                alert(`Log Masuk Guide Berjaya. Selamat bertugas, ${gName}!`);
                window.location.href = 'Guide.html';
            } else {
                alert("ID Guide atau Password salah.");
            }

        } else {
            alert("Format ID salah! ID Staff bermula dengan 'S' manakala ID Guide bermula dengan 'G'.");
        }

    } catch (error) {
        console.error("Ralat Login Staff/Guide:", error);
        alert("Sistem mengalami ralat sambungan.");
    }
}

// ==========================================
// 4. FUNGSI KAWALAN ANTARAMUKA (UI / TABS)
// ==========================================
function tukarTab(jenis) {
    const panelCust = document.getElementById('panel-customer');
    const panelStaff = document.getElementById('panel-staff');
    const panelRegister = document.getElementById('panel-register');
    const tabs = document.querySelectorAll('.tab-btn');

    tabs.forEach(t => t.classList.remove('active'));

    if (jenis === 'customer') {
        if (panelCust) panelCust.classList.add('active');
        if (panelStaff) panelStaff.classList.remove('active');
        if (panelRegister) panelRegister.classList.remove('active');
        document.querySelector('.tab-menu .tab-btn:nth-child(1)').classList.add('active');
    } else {
        if (panelStaff) panelStaff.classList.add('active');
        if (panelCust) panelCust.classList.remove('active');
        if (panelRegister) panelRegister.classList.remove('active');
        document.querySelector('.tab-menu .tab-btn:nth-child(2)').classList.add('active');
    }
}

function tukarKeRegister(mahuRegister) {
    const panelCust = document.getElementById('panel-customer');
    const panelRegister = document.getElementById('panel-register');
    const panelStaff = document.getElementById('panel-staff');

    if (mahuRegister) {
        if (panelCust) panelCust.classList.remove('active');
        if (panelStaff) panelStaff.classList.remove('active');
        if (panelRegister) panelRegister.classList.add('active');
    } else {
        if (panelRegister) panelRegister.classList.remove('active');
        if (panelStaff) panelStaff.classList.remove('active');
        if (panelCust) panelCust.classList.add('active');
    }
}

function togglePasswordVisibility(inputId, iconElement) {
    const passwordInput = document.getElementById(inputId);
    if (passwordInput) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            iconElement.classList.remove('fa-eye');
            iconElement.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            iconElement.classList.remove('fa-eye-slash');
            iconElement.classList.add('fa-eye');
        }
    }
}