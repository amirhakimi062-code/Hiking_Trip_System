// URL API Utama daripada Oracle APEX ORDS
const API_BASE = "https://oracleapex.com/ords/merendanghikers";

// 1. SEMAK & AMBIL LOGIN ID DARI SESSIONSTORAGE
const CURRENT_CUSTOMER_ID = sessionStorage.getItem("CUSTOMER_ID") || 
                             sessionStorage.getItem("customer_id") || 
                             sessionStorage.getItem("customerId") || 
                             sessionStorage.getItem("USER_ID");

// 2. SEKATAN KESELAMATAN: Jika tiada sesi login sah, tendang kembali ke LoginPage.html
if (!CURRENT_CUSTOMER_ID) {
    alert("Sesi log masuk tidak ditemui! Sila log masuk terlebih dahulu.");
    window.location.href = "index.html";
}

// Memuatkan data secara automatik apabila halaman selesai dibuka
document.addEventListener("DOMContentLoaded", () => {
    const storedName = sessionStorage.getItem("CUSTOMER_NAME") || 
                       sessionStorage.getItem("customer_name") || 
                       sessionStorage.getItem("customerName");
                       
    if (storedName) {
        const welcomeEl = document.getElementById("welcomeName");
        if (welcomeEl) welcomeEl.innerText = storedName;
    } else {
        const welcomeEl = document.getElementById("welcomeName");
        if (welcomeEl) welcomeEl.innerText = `Hiker (${CURRENT_CUSTOMER_ID})`;
    }

    loadLocations();
    loadBookingHistory();
});

let hikingLocations = [];

// ==========================================
// 1. VIEW LOKASI YANG DISEDIAKAN
// ==========================================
async function loadLocations() {
    try {
        const response = await fetch(`${API_BASE}/location_hiking/`);
        const data = await response.json();
        
        hikingLocations = data.items || [];

        const locationsContainer = document.getElementById("locationsContainer");
        const bookingSelect = document.getElementById("bookingLocation");

        if (locationsContainer) locationsContainer.innerHTML = "";
        if (bookingSelect) bookingSelect.innerHTML = '<option value="" disabled selected>Choose Location...</option>';

        if (hikingLocations.length === 0) {
            if (locationsContainer) locationsContainer.innerHTML = "<p>Tiada lokasi hiking ditawarkan buat masa ini.</p>";
            return;
        }

        hikingLocations.forEach(loc => {
            const locId = loc.location_id || loc.LOCATION_ID;
            const locName = loc.location_name || loc.LOCATION_NAME;
            const pricePax = loc.price_per_pax || loc.PRICE_PER_PAX;
            const imageLoc = loc.image_loc || loc.IMAGE_LOC;

            if (locationsContainer) {
                const card = document.createElement("div");
                card.className = "card";

                // kalau ada IMAGE_LOC, papar gambar. kalau takde/gagal, fallback ke icon
                const imgHtml = imageLoc
                    ? `<img src="${imageLoc}" alt="${locName}" onerror="handleImageError(this)">`
                    : `<i class="fa-solid fa-mountain"></i>`;

                card.innerHTML = `
                    <div class="card-img">${imgHtml}</div>
                    <div class="card-body">
                        <div class="card-title">${locName}</div>
                        <div class="card-price">RM ${parseFloat(pricePax).toFixed(2)} <span style="font-size:0.8rem; font-weight:normal; color:#888;">/ pax</span></div>
                    </div>
                `;
                locationsContainer.appendChild(card);
            }

            if (bookingSelect) {
                const option = document.createElement("option");
                option.value = locId;
                option.textContent = `${locName} (RM ${parseFloat(pricePax).toFixed(2)}/pax)`;
                bookingSelect.appendChild(option);
            }
        });

    } catch (error) {
        console.error("Ralat memuatkan lokasi:", error);
        if (document.getElementById("locationsContainer")) {
            document.getElementById("locationsContainer").innerHTML = "<p style='color:red;'>Gagal memuatkan data lokasi dari pelayan.</p>";
        }
    }
}

// fallback function bila gambar gagal load (link rosak/404)
function handleImageError(imgEl) {
    imgEl.outerHTML = '<i class="fa-solid fa-mountain"></i>';
}

// ==========================================
// 2. VIEW SEJARAH TEMPAHAN
// ==========================================
async function loadBookingHistory() {
    try {
        const [resBookings, resDetails, resPayments, resLocations] = await Promise.all([
            fetch(`${API_BASE}/booking/`).then(r => r.json()),
            fetch(`${API_BASE}/booking_detail/`).then(r => r.json()),
            fetch(`${API_BASE}/payment/`).then(r => r.json()),
            fetch(`${API_BASE}/location_hiking/`).then(r => r.json())
        ]);

        const bookings = resBookings.items || [];
        const details = resDetails.items || [];
        const payments = resPayments.items || [];
        const locations = resLocations.items || [];

        const customerBookings = bookings.filter(b => {
            const bCustId = b.customer_id || b.CUSTOMER_ID;
            return bCustId === CURRENT_CUSTOMER_ID;
        });

        const tbody = document.getElementById("recordsTableBody");
        if (!tbody) return;
        
        tbody.innerHTML = "";

        if (customerBookings.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Tiada rekod tempahan ditemui untuk ID ${CURRENT_CUSTOMER_ID}.</td></tr>`;
            return;
        }

        customerBookings.forEach(booking => {
            const bId = booking.booking_id || booking.BOOKING_ID;

            // 1. CARI DETAIL DAHULU (Supaya kita boleh akses data BOOKING_DETAIL)
            const detail = details.find(d => (d.booking_id || d.BOOKING_ID) === bId) || {};
            
            // 2. AMBIL TRIP_DATE DARI DETAIL (Menyokong huruf kecil/besar untuk Oracle)
            const bDate = detail.trip_date || detail.TRIP_DATE || detail.TRIP_DATE_date;

            const payId = detail.payment_id || detail.PAYMENT_ID;
            const locId = detail.location_id || detail.LOCATION_ID;

            const payment = payments.find(p => (p.payment_id || p.PAYMENT_ID) === payId) || {};
            const location = locations.find(l => (l.location_id || l.LOCATION_ID) === locId) || {};

            const locName = location.location_name || location.LOCATION_NAME || 'N/A';
            const dPax = detail.pax || detail.PAX || 0;
            const dDays = detail.duration_day || detail.DURATION_DAY || 0;
            const pAmount = payment.total_amount || payment.TOTAL_AMOUNT || 0;
            const pStatus = payment.payment_status || payment.PAYMENT_STATUS || 'PENDING';

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${bId}</td>
                <td>${locName}</td>
                <td>${dPax}</td>
                <td>${bDate ? bDate.substring(0, 10) : 'N/A'}</td>
                <td>${dDays} Days</td>
                <td>RM ${parseFloat(pAmount).toFixed(2)}</td>
                <td><span class="status-badge ${pStatus === 'PAID' ? 'status-paid' : 'status-pending'}">${pStatus}</span></td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error("Ralat memuatkan sejarah tempahan:", error);
        if (document.getElementById("recordsTableBody")) {
            document.getElementById("recordsTableBody").innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Gagal memuatkan sejarah tempahan.</td></tr>`;
        }
    }
}

// ==========================================
// 3. PENGIRAAN HARGA LIVE
// ==========================================
let currentCalculatedTotal = 0;

function calculateLiveTotal() {
    const locationId = document.getElementById("bookingLocation").value;
    const duration = parseInt(document.getElementById("durationDays").value) || 1;
    const pax = document.querySelectorAll(".participant-row").length + 1;

    const selectedLoc = hikingLocations.find(l => (l.location_id || l.LOCATION_ID) === locationId);
    const basePrice = selectedLoc ? parseFloat(selectedLoc.price_per_pax || selectedLoc.PRICE_PER_PAX) : 0;

    const locationCost = basePrice * pax;
    
    let equipmentCost = 0;
    document.querySelectorAll(".eq-item").forEach(item => {
        if (item.checked) {
            equipmentCost += parseFloat(item.dataset.fee || 40);
        }
    });

    const permitFee = 50.00; 
    const guideFee = 50.00 * duration; 

    currentCalculatedTotal = locationCost + equipmentCost + permitFee + guideFee;

    if(document.getElementById("summaryPax")) document.getElementById("summaryPax").textContent = `${pax} Pax`;
    if(document.getElementById("summaryLocationCost")) document.getElementById("summaryLocationCost").textContent = `RM ${locationCost.toFixed(2)}`;
    if(document.getElementById("summaryEquipmentCost")) document.getElementById("summaryEquipmentCost").textContent = `RM ${equipmentCost.toFixed(2)}`;
    if(document.getElementById("summaryPermitCost")) document.getElementById("summaryPermitCost").textContent = `RM ${permitFee.toFixed(2)}`;
    if(document.getElementById("summaryGuideCost")) document.getElementById("summaryGuideCost").textContent = `RM ${guideFee.toFixed(2)}`;
    if(document.getElementById("summaryTotalAmount")) document.getElementById("summaryTotalAmount").textContent = `RM ${currentCalculatedTotal.toFixed(2)}`;
}

function addParticipantRow() {
    const container = document.getElementById("participantsContainer");
    if (!container) return;
    const rowId = Date.now();
    
    const div = document.createElement("div");
    div.className = "participant-row form-card";
    div.style = "margin-bottom: 10px; padding: 15px; border-left: 3px solid #bc6c25;";
    div.id = `p-row-${rowId}`;
    
    div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <strong style="color:var(--primary-color)">Ahli Kumpulan</strong>
            <button type="button" style="background:crimson; color:white; border:none; padding:2px 8px; border-radius:4px; cursor:pointer;" onclick="removeParticipantRow('${rowId}')">Buang</button>
        </div>
    `;
    container.appendChild(div);
    calculateLiveTotal();
}

function removeParticipantRow(id) {
    const row = document.getElementById(`p-row-${id}`);
    if (row) row.remove();
    calculateLiveTotal();
}

// ==========================================
// 4. SUBMIT BOOKING (PROCEED TO PAYMENT)
// ==========================================
let temporaryBookingData = null;

function submitBooking(event) {
    event.preventDefault();

    const locationId = document.getElementById("bookingLocation").value;
    if (!locationId) {
        alert("Sila pilih lokasi terlebih dahulu.");
        return;
    }

    const pax = document.querySelectorAll(".participant-row").length + 1;
    const duration = parseInt(document.getElementById("durationDays").value);
    const emergencyContact = document.getElementById("emergencyContact").value;

    let totalEquipmentFee = 0;
    document.querySelectorAll(".eq-item").forEach(item => {
        if (item.checked) totalEquipmentFee += parseFloat(item.dataset.fee);
    });

    const uniqueIdNum = Math.floor(1000 + Math.random() * 9000); 
    const generatedBookingId = "B" + uniqueIdNum;
    const generatedPaymentId = "P" + uniqueIdNum;

   // --- FORMAT TARIKH ISO (YYYY-MM-DD) - format yang diterima oleh ORDS REST API ---

    // 1. Tarikh Hari Ini (Untuk BOOKING_DATE & PAYMENT_DATE) - format ISO 8601 penuh
    const now = new Date();
    const cleanDateStr = now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, '0') + "-" +
        String(now.getDate()).padStart(2, '0') + "T00:00:00Z";

    // 2. Tarikh Trip (input HTML type="date" bagi YYYY-MM-DD, tambah masa untuk ORDS)
    let tripDateFormatted = cleanDateStr;
    const tripInput = document.getElementById("tripDate");
    if (tripInput && tripInput.value) {
        tripDateFormatted = tripInput.value + "T00:00:00Z"; // jadi 2026-07-15T00:00:00Z
    }

    temporaryBookingData = {
        booking: {
            BOOKING_ID: generatedBookingId,
            CUSTOMER_ID: CURRENT_CUSTOMER_ID, 
            BOOKING_DATE: cleanDateStr 
        },
        payment: {
            PAYMENT_ID: generatedPaymentId,
            PAYMENT_METHOD: "ONLINE TRANSFER", 
            TOTAL_AMOUNT: parseFloat(currentCalculatedTotal.toFixed(2)),
            PAYMENT_DATE: cleanDateStr, 
            GUIDE_FEE: parseFloat((50.00 * duration).toFixed(2)),
            PAYMENT_STATUS: "PAID"
        },
        detail: {
            BOOKING_ID: generatedBookingId,
            LOCATION_ID: locationId,
            PAYMENT_ID: generatedPaymentId,
            GUIDE_ID: null, 
            PAX: parseInt(pax),
            SUBTOTAL: parseFloat(currentCalculatedTotal.toFixed(2)),
            DURATION_DAY: parseInt(duration),
            PERMIT_FEE: parseFloat((50.00).toFixed(2)),
            EQUIPMENT_FEE: parseFloat(totalEquipmentFee.toFixed(2)),
            EMERGENCY_CONTACT: emergencyContact,
            TRIP_DATE: tripDateFormatted // Menggunakan format DD-MON-YYYY yang telah ditukar
        }
    };

    const selectedLocName = document.getElementById("bookingLocation").options[document.getElementById("bookingLocation").selectedIndex].text;
    if (document.getElementById("checkoutDetailsText")) {
        document.getElementById("checkoutDetailsText").innerHTML = `
            <strong>ID Tempahan Temp:</strong> ${generatedBookingId}<br>
            <strong>Destinasi:</strong> ${selectedLocName}<br>
            <strong>ID Pelanggan:</strong> ${CURRENT_CUSTOMER_ID}<br>
            <strong>Jumlah Peserta:</strong> ${pax} Orang<br>
            <strong>Tarikh Trip:</strong> ${tripDateFormatted}<br>
            <strong>Tempoh Hari:</strong> ${duration} Hari
        `;
    }
    if (document.getElementById("paymentAmount")) {
        document.getElementById("paymentAmount").value = `RM ${currentCalculatedTotal.toFixed(2)}`;
    }

    switchTab('payment');
}

// ==========================================
// 5. PROSES SIMPAN BERPERINGKAT (KALIS DOUBLE-CLICK)
// ==========================================
async function submitPayment(event) {
    event.preventDefault();
    if (!temporaryBookingData) {
        alert("Tiada transaksi aktif didaftarkan. Sila isi borang tempahan terlebih dahulu.");
        switchTab('booking');
        return;
    }
    const submitBtn = event.target.querySelector("button[type='submit']");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
    }
    // Ambil nilai pilihan dari dropdown pembayaran
    const method = document.getElementById("paymentMethod").value;

    // Jika user tidak pilih apa-apa, gunakan fallback "ONLINE TRANSFER" supaya database tidak merungut NULL
    temporaryBookingData.payment.PAYMENT_METHOD = method || "ONLINE TRANSFER";

    try {
        // LANGKAH 1: SIMPAN DATA PAYMENT
        const resPay = await fetch(`${API_BASE}/payment/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(temporaryBookingData.payment)
        });

        if (!resPay.ok) {
            const errPayData = await resPay.json().catch(() => ({}));
            throw new Error(`Gagal menyimpan ke jadual PAYMENT. ${errPayData.message || ''}`);
        }

        // ✅ Ambil balik data payment sebenar dari server (PAYMENT_ID, PAYMENT_DATE, dll yang dijana Oracle)
        const payResult = await resPay.json().catch(() => ({}));
        temporaryBookingData.payment = {
            ...temporaryBookingData.payment,
            ...payResult
        };

        // LANGKAH 2: SIMPAN DATA BOOKING
        const resBook = await fetch(`${API_BASE}/booking/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(temporaryBookingData.booking)
        });
        if (!resBook.ok) {
            const errBookData = await resBook.json().catch(() => ({}));
            throw new Error(`Gagal menyimpan ke jadual BOOKING. ${errBookData.message || ''}`);
        }

        // ✅ Ambil balik data booking sebenar dari server (BOOKING_ID auto-generate, dll)
        const bookResult = await resBook.json().catch(() => ({}));
        temporaryBookingData.booking = {
            ...temporaryBookingData.booking,
            ...bookResult
        };

        // LANGKAH 3: SIMPAN DATA BOOKING_DETAIL
        const resDetail = await fetch(`${API_BASE}/booking_detail/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(temporaryBookingData.detail)
        });
        if (!resDetail.ok) {
            const errDetailData = await resDetail.json().catch(() => ({}));
            console.error("Ralat APEX BOOKING_DETAIL:", errDetailData);
            throw new Error(`Ditolak oleh Oracle: ${errDetailData.message || 'Sila semak nama lajur atau sekatan foreign key.'}`);
        }

        // ✅ Ambil balik data detail sebenar dari server (DETAIL_ID, dll)
        const detailResult = await resDetail.json().catch(() => ({}));
        temporaryBookingData.detail = {
            ...temporaryBookingData.detail,
            ...detailResult
        };

        // Sukses Sepenuhnya — data yang disimpan untuk resit kini adalah data SEBENAR dari DB
        sessionStorage.setItem("LATEST_RECEIPT", JSON.stringify(temporaryBookingData));
        alert("Bayaran berjaya diproses dan disahkan!");

        temporaryBookingData = null;
        window.location.href = "Payment.html";
    } catch (error) {
        console.error("Ralat Aliran Transaksi Penuh:", error);
        alert(`Transaksi Gagal: ${error.message}`);

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Sahkan & Bayar Sekarang';
        }
    }
}

function switchTab(tabId) {
    document.querySelectorAll(".tab-link").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("active"));

    const activeBtn = document.getElementById(`tabBtn-${tabId}`);
    const activePanel = document.getElementById(`panel-${tabId}`);
    
    if (activeBtn) activeBtn.classList.add("active");
    if (activePanel) activePanel.classList.add("active");
}

function logout() {
    if(confirm("Adakah anda pasti untuk log keluar?")) {
        sessionStorage.clear();
        window.location.href = "index.html"; 
    }
}
