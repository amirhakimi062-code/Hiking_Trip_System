// Konfigurasi URL Base REST API Oracle APEX ORDS
const API_BASE_URL = "https://oracleapex.com/ords/merendanghikers";

// State Global untuk menyimpan data aplikasi
let globalBookings = [];
let globalGuides = [];
let globalLocations = [];
let globalPayments = [];
let globalCustomers = [];
let globalBookingDetails = [];

// Init apabila halaman selesai dimuatkan
document.addEventListener("DOMContentLoaded", () => {
    fetchAllData();
});

// Fungsi untuk menarik semua data serentak daripada Oracle APEX
async function fetchAllData() {
    try {
        const [resCust, resBook, resDetail, resLoc, resPay, resGuide] = await Promise.all([
            fetch(`${API_BASE_URL}/customer/`).then(r => r.json()),
            fetch(`${API_BASE_URL}/booking/`).then(r => r.json()),
            fetch(`${API_BASE_URL}/booking_detail/`).then(r => r.json()),
            fetch(`${API_BASE_URL}/location_hiking/`).then(r => r.json()),
            fetch(`${API_BASE_URL}/payment/`).then(r => r.json()),
            fetch(`${API_BASE_URL}/guide/`).then(r => r.json())
        ]);

        globalCustomers = resCust.items || [];
        globalBookings = resBook.items || [];
        globalBookingDetails = resDetail.items || [];
        globalLocations = resLoc.items || [];
        globalPayments = resPay.items || [];
        globalGuides = resGuide.items || [];

        // Susun log tempahan & muatkan ke UI
        renderBookingLog();
        renderGuideManagement();
        renderLocationDropdown();
        renderAnalytics();

    } catch (error) {
        console.error("Ralat semasa menarik data dari Oracle APEX:", error);
        alert("Gagal memuatkan data dari pangkalan data APEX.");
    }
}

/* ==========================================================================
   1. CUSTOMER BOOKING LOG (DENGAN LOGIK RE-ASSIGN GUIDE & KLIK BARIS)
   ========================================================================== */
function renderBookingLog() {
    const tbodyActive = document.getElementById("bookingTableBody");
    const tbodyHistory = document.getElementById("historyTableBody");
    
    if (!tbodyActive || !tbodyHistory) return;

    // Susun mengikut BOOKING_DATE (Paling awal diletakkan paling atas)
    const sortedBookings = [...globalBookings].sort((a, b) => new Date(a.booking_date) - new Date(b.booking_date));

    tbodyActive.innerHTML = "";
    tbodyHistory.innerHTML = "";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let activeCount = 0;
    let historyCount = 0;

    sortedBookings.forEach(booking => {
        const cust = globalCustomers.find(c => c.customer_id === booking.customer_id);
        const leaderName = cust ? cust.customer_name : "N/A";

        const detail = globalBookingDetails.find(d => d.booking_id === booking.booking_id);
        
        let destination = "N/A";
        // PERUBAHAN: Jika tiada guide_id (tempahan baru), set kepada kosong / null value (-)
        let guideName = `<span style="color:#bbb;">-</span>`; 
        let tripDateStr = "N/A";
        let isTripPast = false;

        if (detail) {
            const loc = globalLocations.find(l => l.location_id === detail.location_id);
            destination = loc ? loc.location_name : "N/A";

            // Papar nama guide jika sudah diagihkan oleh staf
            if (detail.guide_id) {
                const g = globalGuides.find(guide => guide.guide_id === detail.guide_id);
                guideName = g ? `<strong style="color:var(--primary-color);">${g.guide_name}</strong>` : detail.guide_id;
            }

            if (detail.trip_date) {
                const tDate = new Date(detail.trip_date);
                tripDateStr = tDate.toLocaleDateString('ms-MY');
                
                // Semak status tarikh trip mendaki
                tDate.setHours(0,0,0,0);
                if (tDate < today) {
                    isTripPast = true;
                }
            }
        }

        const payment = detail ? globalPayments.find(p => p.payment_id === detail.payment_id) : null;
        const totalPayment = payment ? `RM ${parseFloat(payment.total_amount).toFixed(2)}` : "N/A";
        const paymentStatus = payment ? payment.payment_status : "PENDING";
        const rawTripDate = detail && detail.trip_date ? detail.trip_date : "";

        // Bina Baris Jadual (TR)
        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        tr.title = "Klik untuk lihat perincian penuh kumpulan & sewaan";
        tr.addEventListener("click", (e) => {
            if (e.target.tagName !== 'BUTTON' && e.target.parentElement.tagName !== 'BUTTON') {
                showBookingDetailModal(booking.booking_id);
            }
        });

        if (!isTripPast) {
            // --- MASUK KE TABLE TEMPAHAN AKTIF ---
            activeCount++;
            const isAssigned = detail && detail.guide_id;
            const btnClass = isAssigned ? "btn-sm btn-accent" : "btn-sm";
            const btnText = isAssigned ? `<i class="fa-solid fa-arrows-rotate"></i> Tukar Guide` : `<i class="fa-solid fa-user-plus"></i> Assign Guide`;

            tr.innerHTML = `
                <td>${new Date(booking.booking_date).toLocaleDateString('ms-MY')}</td>
                <td><strong style="color:var(--primary-color); text-decoration:underline;">${booking.booking_id}</strong></td>
                <td>${booking.customer_id}</td>
                <td>${leaderName}</td>
                <td>${destination}</td>
                <td>${guideName}</td>
                <td>${tripDateStr}</td>
                <td>${totalPayment}</td>
                <td><span class="status-badge ${paymentStatus.toLowerCase()}">${paymentStatus}</span></td>
                <td>
                    <button class="btn ${btnClass}" onclick="checkAvailableGuidesForTrip('${booking.booking_id}', '${rawTripDate}')" ${!rawTripDate ? 'disabled' : ''}>${btnText}</button>
                </td>
            `;
            tbodyActive.appendChild(tr);
        } else {
            // --- MASUK KE TABLE BOOKING HISTORY (TRIP SELESAI) ---
            historyCount++;
            tr.innerHTML = `
                <td>${new Date(booking.booking_date).toLocaleDateString('ms-MY')}</td>
                <td><strong style="color:var(--primary-color); text-decoration:underline;">${booking.booking_id}</strong></td>
                <td>${booking.customer_id}</td>
                <td>${leaderName}</td>
                <td>${destination}</td>
                <td>${guideName}</td>
                <td>${tripDateStr}</td>
                <td>${totalPayment}</td>
                <td><span class="status-badge ${paymentStatus.toLowerCase()}">${paymentStatus}</span></td>
            `;
            tbodyHistory.appendChild(tr);
        }
    });

    if (activeCount === 0) {
        tbodyActive.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:20px; color:#666;">Tiada trip aktif atau akan datang.</td></tr>`;
    }
    if (historyCount === 0) {
        tbodyHistory.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px; color:#666;">Tiada rekod sejarah trip yang sudah lepas.</td></tr>`;
    }
}

/* ==========================================================================
   FUNGSI MODAL: DETAIL PENUH PESERTA & KELENGKAPAN SEWAAN
   ========================================================================== */
function showBookingDetailModal(bookingId) {
    const booking = globalBookings.find(b => b.booking_id === bookingId);
    if (!booking) return;

    const cust = globalCustomers.find(c => c.customer_id === booking.customer_id);
    const detail = globalBookingDetails.find(d => d.booking_id === bookingId);
    
    // Cari data pembayaran berdasarkan detail atau booking_id
    const payment = detail ? globalPayments.find(p => p.payment_id === detail.payment_id || p.booking_id === bookingId) : null;

    let destination = "N/A";
    let guideName = "Belum Diagihkan";

    if (detail) {
        const loc = globalLocations.find(l => l.location_id === detail.location_id);
        if (loc) destination = loc.location_name;

        if (detail.guide_id) {
            const g = globalGuides.find(guide => guide.guide_id === detail.guide_id);
            if (g) guideName = g.guide_name;
        }
    }

    // Ekstrak nilai-nilai utama untuk paparan ringkas
    const leaderName = cust ? cust.customer_name : "N/A";
    const paymentId = payment ? payment.payment_id : (detail && detail.payment_id ? detail.payment_id : "N/A");
    const emergencyContactStr = detail && detail.emergency_contact ? detail.emergency_contact : "N/A";
    const totalPax = detail ? detail.pax : 1;
    const paymentStatus = payment ? payment.payment_status : (booking.status || "PENDING");
    const totalAmount = payment ? parseFloat(payment.total_amount).toFixed(2) : (booking.total_price ? parseFloat(booking.total_price).toFixed(2) : "0.00");

    // REKA BENTUK MODAL BAHARU: Berstruktur Grid, Bersih & Mudah Dibaca oleh Staf
    let modalContent = `
        <div style="grid-column: span 2; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px;">
            <span style="font-size:0.8rem; color:#64748b; font-weight:600; display:block; letter-spacing: 0.05em;">ORACLE APEX DATA LOG</span>
            <h4 style="margin:0; color:var(--primary-color, #1e293b); font-size:1.4rem;">BOOKING DETAILS</h4>
        </div>
        
        <div style="padding: 5px; display: flex; flex-direction: column; gap: 10px; border-right: 1px solid #f1f5f9;">
            <h5 style="margin:0; color:var(--primary-color, #0f172a); font-size:1rem; border-bottom:2px solid #cbd5e1; padding-bottom:5px;"><i class="fa-solid fa-folder-open"></i> Resit & Profil</h5>
            
            <p style="margin:0; font-size:0.95rem;"><strong>Booking ID:</strong> <span style="font-family: monospace; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${booking.booking_id}</span></p>
            <p style="margin:0; font-size:0.95rem;"><strong>Payment ID:</strong> <span style="font-family: monospace; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${paymentId}</span></p>
            <p style="margin:0; font-size:0.95rem;"><strong>Nama Leader:</strong> ${leaderName}</p>
            <p style="margin:0; font-size:0.95rem;"><strong>No. Tel:</strong> ${cust ? cust.customer_phone : '-'}</p>
            <p style="margin:0; font-size:0.95rem;"><strong>Email:</strong> ${cust ? cust.customer_email : '-'}</p>
        </div>

        <div style="padding: 5px; display: flex; flex-direction: column; gap: 10px;">
            <h5 style="margin:0; color:var(--primary-color, #0f172a); font-size:1rem; border-bottom:2px solid #cbd5e1; padding-bottom:5px;"><i class="fa-solid fa-mountain-sun"></i> Perincian Trip</h5>
            
            <p style="margin:0; font-size:0.95rem;"><strong>Destinasi:</strong> ${destination}</p>
            <p style="margin:0; font-size:0.95rem;"><strong>Tarikh Trip:</strong> ${detail && detail.trip_date ? new Date(detail.trip_date).toLocaleDateString('ms-MY', {year: 'numeric', month: 'long', day: 'numeric'}) : 'N/A'}</p>
            <p style="margin:0; font-size:0.95rem;"><strong>Malim Gunung:</strong> <span style="color:#2563eb; font-weight:600;">${guideName}</span></p>
            <p style="margin:0; font-size:0.95rem;"><strong>Jumlah Peserta:</strong> <strong style="font-size:1.05rem; color:#0f172a;">${totalPax} Pax</strong></p>
        </div>

        <div style="grid-column: span 2; background: #fafafa; border: 1px dashed #cbd5e1; padding: 12px; border-radius: 6px; margin-top: 5px;">
            <h6 style="margin:0 0 5px 0; font-size:0.85rem; color:#475569; text-transform: uppercase; letter-spacing: 0.05em;"><i class="fa-solid fa-phone-vibrate"></i> Emergency Contact & Leader Equipment Info</h6>
            <p style="margin:0; font-size:0.95rem; color:#1e293b; line-height:1.5;">${emergencyContactStr}</p>
        </div>

        <div style="grid-column: span 2; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <span style="font-size:0.8rem; color:#64748b; display:block; font-weight:600;">STATUS PEMBAYARAN</span>
                <span class="status-badge ${paymentStatus.toLowerCase()}" style="display:inline-block; margin-top:4px; font-weight:700; padding:4px 10px; border-radius:4px; font-size:0.85rem;">
                    ${paymentStatus.toUpperCase()}
                </span>
            </div>
            <div style="text-align:right;">
                <span style="font-size:0.8rem; color:#64748b; display:block; font-weight:600;">TOTAL AMAUN KESELURUHAN</span>
                <strong style="color:#b91c1c; font-size:1.4rem; font-family: sans-serif;">RM ${totalAmount}</strong>
            </div>
        </div>
    `;

    const modalData = document.getElementById("modalDataContent");
    if (modalData) {
        modalData.innerHTML = modalContent;
        // Paparkan modal di tengah skrin menggunakan susun atur flexbox
        document.getElementById("detailsModal").style.display = "flex";
    }
}


async function assignGuideToBooking(bookingId, guideId) {
    try {
        // 1. Hantar data ke Oracle APEX ORDS
        // Nota: Sila pastikan template URL ini sepadan dengan ORDS REST Handler anda
        const response = await fetch(`${API_BASE_URL}/booking_detail/${bookingId}`, {
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guide_id: guideId })
        });

        if (!response.ok) throw new Error("Gagal mengemaskini di database.");

        alert(`Guide berjaya ditugaskan kepada Tempahan ${bookingId}!`);
        
        // 2. [AUTO UPDATE UI] Kemaskini state global secara lokal tanpa reload page
        const detailIndex = globalBookingDetails.findIndex(d => d.booking_id === bookingId);
        if (detailIndex !== -1) {
            globalBookingDetails[detailIndex].guide_id = guideId;
        }

        // 3. Render semula log tempahan & analitik untuk paparan real-time
        renderBookingLog();
        renderAnalytics(); // Graf tugasan guide juga akan auto-update
        closeDetailsModal();

    } catch (e) {
        console.warn("Menggunakan logik Mock Success kerana API offline/belum siap:", e);
        
        // LOGIK MOCK SUCCESS (Paparan tetap akan auto-update untuk tujuan testing UI)
        const detailIndex = globalBookingDetails.findIndex(d => d.booking_id === bookingId);
        if (detailIndex !== -1) {
            globalBookingDetails[detailIndex].guide_id = guideId;
        }
        
        alert(`[Mock Success] Guide ID ${guideId} ditugaskan ke Booking ID ${bookingId}`);
        
        // Render semula UI serta-merta
        renderBookingLog();
        renderAnalytics();
        closeDetailsModal();
    }
}

/* ==========================================================================
   2. GUIDE MANAGEMENT & AVAILABILITY TRACKER
   ========================================================================== */
function renderGuideManagement() {
    // Fungsi default tracker mengikut input tarikh di HTML
    checkGuideAvailability();
}

// Semakan Guide berdasarkan fungsi input kalendar/tarikh di dashboard
function checkGuideAvailability() {
    const dateInput = document.getElementById("checkDateInput").value; // Format: YYYY-MM-DD
    if (!dateInput) return;

    // Tapis guide yang sibuk berdasarkan TRIP_DATE di jadual BOOKING_DETAIL
    const busyGuideIds = globalBookingDetails
        .filter(d => d.trip_date && d.trip_date.startsWith(dateInput))
        .map(d => d.guide_id);

    const tbody = document.querySelector("#panel-guides table tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    globalGuides.forEach(g => {
        const isBusy = busyGuideIds.includes(g.guide_id);
        const statusText = isBusy ? "Sibuk (On Trip)" : "Tersedia (Free)";
        const statusClass = isBusy ? "status-busy" : "status-free";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${g.guide_id}</td>
            <td><strong>${g.guide_name}</strong><br><small>${g.guide_email}</small></td>
            <td>${g.guide_phone}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
        `;
        tbody.appendChild(tr);
    });

    const statusBox = document.getElementById("guideStatusResult");
    if (statusBox) {
        const freeCount = globalGuides.length - busyGuideIds.length;
        statusBox.innerHTML = `<i class="fa-solid fa-circle-check"></i> Terdapat <strong>${freeCount} / ${globalGuides.length}</strong> Guide tersedia pada tarikh ${dateInput}.`;
    }
}

// Semakan Guide yang free apabila butang "Assign Guide" di klik dari log tempahan
function checkAvailableGuidesForTrip(bookingId, tripDate) {
    if (!tripDate) {
        alert("Tarikh trip tidak sah atau tiada. Sila pastikan tempahan mempunyai tarikh.");
        return;
    }

    const detail = globalBookingDetails.find(d => d.booking_id === bookingId);
    const currentGuideId = detail ? detail.guide_id : null;

    let modalContent = `
        <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px;">
            <span style="font-size:0.8rem; color:#64748b; font-weight:600; display:block; letter-spacing: 0.05em;">GUIDE ASSIGNMENT</span>
            <h4 style="margin:0; color:var(--primary-color, #1e293b); font-size:1.4rem;">Pilih Malim Gunung</h4>
            <p style="margin: 5px 0 0 0; font-size: 0.9rem; color: #475569;">
                Tempahan ID: <strong style="color:var(--primary-color);">${bookingId}</strong> <br>
                Tarikh Ekspedisi: <strong>${new Date(tripDate).toLocaleDateString('ms-MY', {year: 'numeric', month: 'long', day: 'numeric'})}</strong>
            </p>
        </div>
        
        <div style="max-height: 300px; overflow-y: auto; padding-right: 5px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem;">
                <thead>
                    <tr style="background:#f1f5f9; text-align:left; border-bottom: 2px solid #cbd5e1;">
                        <th style="padding: 10px;">ID Guide</th>
                        <th style="padding: 10px;">Nama Penuh</th>
                        <th style="padding: 10px; text-align:center;">Tindakan</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Loop semua senarai guide yang sedia ada dalam globalGuides
    if (globalGuides.length === 0) {
        modalContent += `<tr><td colspan="3" style="padding: 15px; text-align:center; color:#ef4444;">Tiada rekod Malim Gunung ditemui dalam sistem.</td></tr>`;
    } else {
        globalGuides.forEach(guide => {
            const isCurrentlyAssigned = currentGuideId === guide.guide_id;
            
            modalContent += `
                <tr style="border-bottom: 1px solid #e2e8f0; ${isCurrentlyAssigned ? 'background:#ecfdf5;' : ''}">
                    <td style="padding: 10px; font-family: monospace;">${guide.guide_id}</td>
                    <td style="padding: 10px; font-weight: ${isCurrentlyAssigned ? 'bold' : 'normal'};">
                        ${guide.guide_name} ${isCurrentlyAssigned ? '<span style="color:#10b981; font-size:0.8rem;">(Ditugaskan Kini)</span>' : ''}
                    </td>
                    <td style="padding: 10px; text-align:center;">
                        <button class="btn btn-sm ${isCurrentlyAssigned ? 'btn-disabled' : 'btn-accent'}" 
                                style="${isCurrentlyAssigned ? 'background:#94a3b8; cursor:not-allowed;' : 'background:#2563eb; color:white;'}"
                                ${isCurrentlyAssigned ? 'disabled' : ''}
                                onclick="assignGuideToBooking('${bookingId}', '${guide.guide_id}', '${guide.guide_name}')">
                            ${isCurrentlyAssigned ? 'Semasa' : 'Assign'}
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    modalContent += `
                </tbody>
            </table>
        </div>
    `;

    const modalData = document.getElementById("modalDataContent");
    if (modalData) {
        modalData.innerHTML = modalContent;
        // Buka modal seperti biasa
        document.getElementById("detailsModal").style.display = "flex";
    }
}

async function assignGuideToBooking(bookingId, guideId, guideName) {
    if (!confirm(`Adakah anda pasti untuk menugaskan ${guideName} (${guideId}) untuk Tempahan ${bookingId}?`)) {
        return;
    }

    try {
        // Cari rekod asal booking_detail supaya kita tidak hilangkan data lain seperti lokasi, tarikh dsb
        const detailRecord = globalBookingDetails.find(d => d.booking_id === bookingId);
        
        if (!detailRecord) {
            throw new Error("Rekod perincian tempahan (BOOKING_DETAIL) tidak ditemui dalam sistem.");
        }

        // TUKAR: Kemas kini guide_id baharu ke dalam rekod
        detailRecord.guide_id = guideId;

        // API URL PUT bergantung kepada konfigurasi Oracle ORDS anda. 
        // Selalunya kita memerlukan ID Primary Key untuk PUT, jadi kita hantar menggunakan booking_id
        const updateUrl = `${API_BASE_URL}/booking_detail/${bookingId}`;
        
        // Letak butang dalam mod loading
        document.body.style.cursor = 'wait';

        // Panggilan PUT ke pangkalan data Oracle
        const response = await fetch(updateUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(detailRecord) 
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || 'Gagal menyimpan tugasan Guide di Oracle APEX.');
        }

        // BERJAYA: Berikan maklum balas, tutup modal dan muat semula jadual
        alert(`Berjaya! Malim Gunung ${guideName} telah ditetapkan untuk Tempahan ${bookingId}.`);
        closeDetailsModal();
        
        // Muat semula (Refresh) semua data di belakang tabir supaya UI jadual mendapat data terkini
        await fetchAllData(); 
        
    } catch (error) {
        console.error("Ralat Menukar Guide:", error);
        alert(`Ralat sistem: ${error.message}`);
    } finally {
        document.body.style.cursor = 'default';
    }
}


/* ==========================================================================
   3. EDIT PRICES & TRAILS
   ========================================================================== */
function renderLocationDropdown() {
    const select = document.getElementById("editLocationSelect");
    if (!select) return;

    select.innerHTML = "";
    globalLocations.forEach(loc => {
        const opt = document.createElement("option");
        opt.value = loc.location_id;
        opt.textContent = loc.location_name;
        select.appendChild(opt);
    });
    loadLocationPricing();
}

// =====================================================================
// 1. FUNGSI MEMAPARKAN HARGA SEMASA APABILA LOKASI DIPILIH
// =====================================================================
function loadLocationPricing() {
    const select = document.getElementById("editLocationSelect");
    const priceInput = document.getElementById("editPricePax");

    // Jika elemen tiada dalam HTML, hentikan fungsi
    if (!select || !priceInput) return;

    const selectedLocId = select.value;
    
    // Cari data lokasi yang sepadan daripada array globalLocations
    const location = globalLocations.find(l => (l.location_id || l.LOCATION_ID) == selectedLocId);

    if (location) {
        // Masukkan harga semasa ke dalam kotak input
        priceInput.value = location.price_per_pax || location.PRICE_PER_PAX || 0;
    } else {
        priceInput.value = 0;
    }
}

// =====================================================================
// 2. FUNGSI MENYIMPAN DATA HARGA BAHARU KE TABLE LOCATION_HIKING (PUT)
// =====================================================================
async function saveLocationRates(event) {
    if (event) event.preventDefault();

    const select = document.getElementById("editLocationSelect");
    const locId = select.value;
    const newPrice = document.getElementById("editPricePax").value;
    const saveBtn = document.getElementById("btnSaveRates");

    if (!locId) {
        alert("Sila pilih lokasi terlebih dahulu!");
        return;
    }

    // Cari data asal lokasi
    const originalLocation = globalLocations.find(l => (l.location_id || l.LOCATION_ID) == locId);
    if (!originalLocation) return;

    // Bina objek data (payload)
    // Nota: permit_fee diambil daripada data asal database supaya ia tidak hilang/menjadi null
    const payload = {
        location_id: locId,
        location_name: originalLocation.location_name || originalLocation.LOCATION_NAME,
        price_per_pax: parseFloat(newPrice) || 0,
        permit_fee: originalLocation.permit_fee || originalLocation.PERMIT_FEE || 0
    };

    try {
        // Tukar butang kepada mod "Loading"
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        }

        // Hantar request UPDATE menggunakan method PUT ke API Oracle APEX ORDS
        const response = await fetch(`${API_BASE_URL}/location_hiking/${locId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Sila semak sekatan database atau handler ORDS anda.');
        }

        alert("Harga lokasi berjaya dikemas kini!");

        // Ambil semula data terbaharu daripada database
        await fetchAllData(); 
        
        // Kekalkan pilihan lokasi pada dropdown dan papar harga baharu
        if (select) {
            select.value = locId;
            loadLocationPricing();
        }

    } catch (error) {
        console.error("Ralat simpan harga lokasi:", error);
        alert(`Gagal menyimpan harga: ${error.message}`);
    } finally {
        // Kembalikan butang kepada keadaan asal
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Location Rates';
        }
    }
}

/* ==========================================================================
   4. EXECUTIVE DATA ANALYTICS DASHBOARDS
   ========================================================================== */
let guideChartInstance = null;
let destinationChartInstance = null;
let paymentChartInstance = null;
let salesChartInstance = null;

function renderAnalytics() {
    // ----------------------------------------------------------------------
    // --- Graf 1: Guide Task Allocation Frequency (Bar Chart) ---
    // ----------------------------------------------------------------------
    const guideCounts = {};
    
    // Set awal semua nama guide kepada 0 tugasan
    globalGuides.forEach(g => { guideCounts[g.guide_name] = 0; });
    
    // Kira secara dinamik daripada state global booking details terkini
    globalBookingDetails.forEach(d => {
        const g = globalGuides.find(guide => guide.guide_id === d.guide_id);
        if (g) {
            guideCounts[g.guide_name] = (guideCounts[g.guide_name] || 0) + 1;
        }
    });

    const canvasGuides = document.getElementById("chartGuides");
    if (canvasGuides) {
        // Hancurkan instance lama jika ada untuk apply data auto-update yang baharu
        if (guideChartInstance) {
            guideChartInstance.destroy();
        }

        guideChartInstance = new Chart(canvasGuides, {
            type: 'bar',
            data: {
                labels: Object.keys(guideCounts),
                datasets: [{
                    label: 'Jumlah Trip Ditugaskan',
                    data: Object.values(guideCounts),
                    backgroundColor: '#2d6a4f'
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1 // Memandangkan jumlah trip adalah nombor bulat (integer)
                        }
                    }
                }
            }
        });
    }

    // ----------------------------------------------------------------------
    // --- Graf 2: Top Destination Choices ---
    // ----------------------------------------------------------------------
    const destCounts = {};
    globalLocations.forEach(l => { destCounts[l.location_name] = 0; });
    
    globalBookingDetails.forEach(d => {
        const l = globalLocations.find(loc => loc.location_id === d.location_id);
        if (l) {
            destCounts[l.location_name] += 1; 
        }
    });

    const canvasDest = document.getElementById("chartDestinations");
    if (canvasDest) {
        if (destinationChartInstance) {
            destinationChartInstance.destroy();
        }

        destinationChartInstance = new Chart(canvasDest, {
            type: 'doughnut',
            data: {
                labels: Object.keys(destCounts),
                datasets: [{
                    data: Object.values(destCounts),
                    backgroundColor: ['#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#6f42c1']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // ----------------------------------------------------------------------
    // --- Graf 3: Preferred Payment Methods (Pie Chart) ---
    // ----------------------------------------------------------------------
    const payMethods = {};
    globalPayments.forEach(p => {
        payMethods[p.payment_method] = (payMethods[p.payment_method] || 0) + 1;
    });

    const canvasPay = document.getElementById("chartPayments");
    if (canvasPay) {
        if (paymentChartInstance) {
            paymentChartInstance.destroy();
        }

        paymentChartInstance = new Chart(canvasPay, {
            type: 'pie',
            data: {
                labels: Object.keys(payMethods),
                datasets: [{
                    data: Object.values(payMethods),
                    backgroundColor: ['#fd7e14', '#6f42c1', '#e83e8c']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // --- Graf 4: BULANAN GROSS SALES PERFORMANCE ---
    updateMonthlySalesChart();
}

// FUNGSI BARU: Dipanggil setiap kali halaman dimuatkan ATAU staff menukar dropdown tahun
function updateMonthlySalesChart() {
    const yearSelect = document.getElementById("filterSalesYear");
    const selectedYear = yearSelect ? parseInt(yearSelect.value) : 2026; 

    const monthlySales = Array(12).fill(0);
    const monthLabels = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];

    // Hanya kira bayaran yang BERJAYA (PAYMENT_STATUS = 'PAID').
    // Row dengan status lain (contohnya PENDING / FAILED) akan diabaikan
    // supaya Gross Sales tidak "over-count" bayaran yang belum/tidak berjaya.
    globalPayments.forEach(p => {
        const isPaid = p.payment_status && p.payment_status.toUpperCase() === "PAID";

        if (isPaid && p.payment_date) {
            const payDate = new Date(p.payment_date);
            const year = payDate.getFullYear();

            if (year === selectedYear) {
                const month = payDate.getMonth();
                monthlySales[month] += parseFloat(p.total_amount || 0);
            }
        }
    });

    const canvasSales = document.getElementById("chartSales");
    if (!canvasSales) return;

    if (salesChartInstance) {
        salesChartInstance.destroy();
    }

    salesChartInstance = new Chart(canvasSales, {
        type: 'bar', 
        data: {
            labels: monthLabels,
            datasets: [{
                label: `Gross Sales (RM) - Tahun ${selectedYear}`,
                data: monthlySales,
                backgroundColor: '#1b4332',
                borderColor: '#2d6a4f',
                borderWidth: 1
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'RM ' + value.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

/* ==========================================================================
   FUNGSI UTILITI TAB (DIKEMAS KINI UNTUK NAVIGASI TAB BARU)
   ========================================================================== */
function switchTab(tabName) {
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".tab-link").forEach(b => b.classList.remove("active"));

    const targetPanel = document.getElementById(`panel-${tabName}`);
    const targetBtn = document.getElementById(`tabBtn-${tabName}`);

    if (targetPanel) targetPanel.classList.add("active");
    if (targetBtn) targetBtn.classList.add("active");
}

function closeDetailsModal() {
    document.getElementById("detailsModal").style.display = "none";
}