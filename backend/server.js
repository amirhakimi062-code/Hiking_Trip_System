const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================================
// ⚠️ SILA PASTIKAN BASE URL DI BAWAH ADALAH BETUL MENGIKUT MODUL APEX ANDA
// ============================================================================
const APEX_BASE_URL = 'https://oracleapex.com/ords/hikingtrip/auth'; 
// Contoh format asal: https://oracleapex.com/ords/hikingtrip/auth/
// ============================================================================


// 1. API UNTUK LOG MASUK (LOGIN)
app.post('/api/login', async (req, res) => {
    try {
        const { role, identity, password } = req.body;

        // URL dipanjangkan dengan sub-path login/
        const urlDenganParams = `${APEX_BASE_URL}/login/?p_role=${encodeURIComponent(role)}&p_identity=${encodeURIComponent(identity)}&p_password=${encodeURIComponent(password)}`;
        
        const response = await fetch(urlDenganParams, { method: 'GET' });

        if (response.status === 200) {
            res.status(200).json({ ok: true, mesej: `Log Masuk Berjaya! Selamat datang ke sistem Merendang Hikers.` });
        } else {
            res.status(401).json({ ok: false, ralat: "Log masuk gagal. Sila semak semula emel/ID dan password anda." });
        }
    } catch (error) {
        res.status(500).json({ ralat: "Ralat Server: " + error.message });
    }
});


// 2. API UNTUK DAFTAR AKAUN CUSTOMER BARU (REGISTER) - KEMAS KINI STRUKTUR JSON
// 1. Pastikan route ini sepadan dengan BACKEND_REGISTER_URL di LoginPage.html anda
app.post('/api/register', async (req, res) => {
    // Ambil data JSON yang dihantar oleh borang HTML anda
    const { nama, telefon, email, password } = req.body; 

    try {
        // Tembak ke Oracle APEX menggunakan HEADERS (kerana Source Type APEX anda adalah HTTP HEADER)
        const response = await fetch('https://oracleapex.com/ords/hikingtrip/auth/register/', {
            method: 'POST',
            headers: {
                'name': nama,
                'phone': telefon,
                'email': email,
                'pass': password
            }
        });

        // Dapatkan text respon mentah terlebih dahulu untuk mengelakkan crash jika APEX hantar HTML
        const responseText = await response.text();
        
        try {
            const data = JSON.parse(responseText);
            
            // Semak status kejayaan daripada Oracle APEX
            if (data.status === "success") {
                return res.json({ ok: true, mesej: "Akaun Berjaya Dicipta dalam Database Oracle APEX!" });
            } else {
                return res.json({ ok: false, ralat: data.message || "Gagal mendaftar di APEX." });
            }
        } catch (jsonErr) {
            // Jika APEX hantar HTML ralat (bukan JSON), kita tangkap di sini supaya frontend tidak crash
            console.error("Respon daripada APEX bukan JSON:", responseText);
            return res.status(500).json({ ok: false, ralat: "Pelayan Oracle APEX memulangkan ralat dalam format HTML." });
        }

    } catch (error) {
        console.error("Ralat pada Node.js:", error);
        return res.status(500).json({ ok: false, ralat: "Ralat sambungan dalaman pelayan backend." });
    }
});


// Menghidupkan server backend pada port 3000
app.listen(3000, () => {
    console.log("======================================================================");
    console.log("Server backend LOGIN & REGISTER Merendang Hikers aktif di port 3000");
    console.log("======================================================================");
});