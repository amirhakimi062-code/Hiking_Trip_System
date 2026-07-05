// ========================================================
// 1. KONFIGURASI UTAMA & PEMBOLEHUBAH GLOBAL
// ========================================================
const API_BASE_URL = 'https://oracleapex.com/ords/merendanghikers';

const LOGGED_IN_GUIDE_ID = sessionStorage.getItem("GUIDE_ID") || 
                             sessionStorage.getItem("guide_id") || 
                             sessionStorage.getItem("guideId") || 
                             sessionStorage.getItem("USER_ID");

// Pembolehubah Global untuk mengawal navigasi kalendar bulanan
let currentMonth = new Date().getMonth(); // 0 - 11 (Jan - Dis)
let currentYear = new Date().getFullYear(); // Tahun semasa (e.g. 2026)
let globalMyTrips = []; // Menyimpan data tugasan selepas difilter untuk rujukan kalendar

// Cetus fungsi utama apabila halaman selesai dimuatkan sepenuhnya
document.addEventListener("DOMContentLoaded", () => {
    initCalendarSelectors(); // Bina pilihan dropdown bulan & tahun dahulu
    fetchAssignedTrips();    // Tarik data dari API dan render kalendar + jadual
});

// ========================================================
// 2. BINA PILIHAN DROPDOWN BULAN & TAHUN SECARA DINAMIK
// ========================================================
function initCalendarSelectors() {
    const monthSelect = document.getElementById("select-month");
    const yearSelect = document.getElementById("select-year");
    if (!monthSelect || !yearSelect) return;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    // Masukkan senarai bulan ke dalam dropdown
    monthSelect.innerHTML = "";
    monthNames.forEach((name, index) => {
        monthSelect.innerHTML += `<option value="${index}">${name}</option>`;
    });

    // Masukkan senarai julat tahun (Dari tahun 2024 hingga 2035)
    yearSelect.innerHTML = "";
    const startYear = 2024;
    const endYear = 2035; 
    for (let y = startYear; y <= endYear; y++) {
        yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
    }
}

// ========================================================
// 3. FUNGSI APABILA DROPDOWN BULAN/TAHUN DITUKAR (JUMP)
// ========================================================
function jumpToMonthYear() {
    const monthSelect = document.getElementById("select-month");
    const yearSelect = document.getElementById("select-year");
    if (!monthSelect || !yearSelect) return;

    // Ambil nilai baharu dari dropdown dan kemaskini variable global
    currentMonth = parseInt(monthSelect.value);
    currentYear = parseInt(yearSelect.value);

    // Render semula grid kalendar berdasarkan pilihan baru
    renderCalendar(currentMonth, currentYear);
}

// ========================================================
// 4. AMBIL DATA TRIPS YANG DIASSIGN KEPADA JURUPANDU (GUIDE)
// ========================================================
async function fetchAssignedTrips() {
    try {
        // Memanggil data booking detail dari API
        const response = await fetch(`${API_BASE_URL}/booking_detail/`);
        const data = await response.json();
        
        // Tapis data untuk guide yang sedang log masuk sahaja
        globalMyTrips = data.items.filter(trip => trip.guide_id === LOGGED_IN_GUIDE_ID);

        // Bina kalendar bulanan interaktif berdasarkan bulan & tahun aktif semasa
        renderCalendar(currentMonth, currentYear);

        // --- JANA JADUAL SENARAI BAWAH ---
        const tripsTableBody = document.getElementById("assigned-trips-list");
        if (!tripsTableBody) return;
        
        tripsTableBody.innerHTML = ""; // Bersihkan dummy data asal

        if (globalMyTrips.length === 0) {
            tripsTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Tiada tugasan trip dijumpai untuk anda.</td></tr>`;
            return;
        }

        // Untuk setiap trip, ambil nama lokasi dan maklumat pelanggan secara async
        for (const trip of globalMyTrips) {
            const locationName = await fetchLocationName(trip.location_id);
            const customerDetails = await fetchCustomerDetails(trip.booking_id);
            const durationDay = getField(trip, 'duration_day') || 0; 

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${formatDate(trip.trip_date)}</td>
                <td><strong>${trip.booking_id}</strong></td>
                <td>${locationName}</td>
                <td>${customerDetails.name}</td>
                <td>
                    <button class="btn-view" onclick="viewTripDetails('${trip.booking_id}', '${locationName}', '${formatDate(trip.trip_date)}', '${trip.pax}', '${trip.emergency_contact || ''}', '${trip.duration_day || 0}')">
                        View Live Attendance
                    </button>
                </td>
            `;
            tripsTableBody.appendChild(row);
        }
    } catch (error) {
        console.error("Ralat mengambil data trip dari API:", error);
    }
}
function getField(obj, key) {
    if (!obj) return undefined;
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
    const lowerKey = key.toLowerCase();
    const foundKey = Object.keys(obj).find(k => k.toLowerCase() === lowerKey);
    return (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null) ? obj[foundKey] : undefined;
}

// Pengendali format tarikh standard (ISO YYYY-MM-DD) atau Format Huruf Oracle (e.g. 15-JUL-2026)
function parseTripDate(dateString) {
    if (!dateString) return null;

    if (dateString.includes('-') && isNaN(dateString.charAt(0))) {
        const monthsMap = { 'JAN':0, 'FEB':1, 'MAR':2, 'APR':3, 'MAY':4, 'JUN':5, 'JUL':6, 'AUG':7, 'SEP':8, 'OCT':9, 'NOV':10, 'DEC':11 };
        const parts = dateString.split('-');
        return new Date(parts[2], monthsMap[parts[1].toUpperCase()], parts[0]);
    }
    return new Date(dateString);
}
// ========================================================
// 5. LOGIK UTAMA UTK MEMBINA & MERENDER GRID KALENDAR
// ========================================================
function renderCalendar(month, year) {
    const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    const daysGrid = document.getElementById("calendar-days-grid");
    
    if (!daysGrid) return;

    // Selaraskan (sync) nilai dropdown pilihan dengan bulan & tahun aktif semasa
    const monthSelect = document.getElementById("select-month");
    const yearSelect = document.getElementById("select-year");
    if (monthSelect) monthSelect.value = month;
    if (yearSelect) yearSelect.value = year;

    daysGrid.innerHTML = ""; // Kosongkan paparan grid lama

    // 1. Suntik baris nama-nama hari (Header Hari) ke dalam grid
    dayNames.forEach(day => {
        const dayHeader = document.createElement("div");
        dayHeader.className = "calendar-day-header";
        dayHeader.style.fontWeight = "600";
        dayHeader.style.color = "#888";
        dayHeader.style.fontSize = "0.85rem";
        dayHeader.style.paddingBottom = "5px";
        dayHeader.style.textAlign = "center";
        dayHeader.innerText = day;
        daysGrid.appendChild(dayHeader);
    });

    // 2. Kira indeks hari pertama (0 = Ahad, 1 = Isnin...) & jumlah hari bagi bulan ini
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    // 3. Masukkan kotak kosong (offset padding) sebelum tarikh 1 hari bulan bermula
    for (let i = 0; i < firstDayIndex; i++) {
        const emptySlot = document.createElement("div");
        emptySlot.className = "calendar-day empty-slot";
        daysGrid.appendChild(emptySlot);
    }

    let dutyDaysCountThisMonth = 0;
    const today = new Date();

    // 4. Mula menjana kotak tarikh demi tarikh (1 sehingga 28/30/31)
    for (let day = 1; day <= totalDays; day++) {
        const daySlot = document.createElement("div");
        daySlot.className = "calendar-day";
        daySlot.innerText = day;
        
        // Penggayaan reka bentuk kotak tarikh
        daySlot.style.padding = "10px 0";
        daySlot.style.borderRadius = "6px";
        daySlot.style.textAlign = "center";
        daySlot.style.fontSize = "0.9rem";
        daySlot.style.position = "relative";

        // Tandakan warna jika tarikh kotak ini adalah HARI INI (Today)
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            daySlot.style.border = "2px solid #3b82f6";
            daySlot.style.color = "#3b82f6";
            daySlot.style.fontWeight = "bold";
        }

        // Semak jika jurupandu mempunyai tugasan trip aktif pada tarikh ini
        // (kira SEMUA hari dalam julat trip_date hingga trip_date + duration_day - 1)
        const currentCellDate = new Date(year, month, day);
        currentCellDate.setHours(0, 0, 0, 0);

        const hasDuty = globalMyTrips.some(trip => {
            const startDate = parseTripDate(trip.trip_date);
            if (!startDate) return false;

            // Ambil duration_day secara case-insensitive, minimum 1 hari
            const rawDuration = getField(trip, 'duration_day');
            const duration = Math.max(parseInt(rawDuration) || 1, 1);

            // Kira tarikh akhir trip (start + duration - 1 hari)
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + duration - 1);

            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);

            return currentCellDate >= startDate && currentCellDate <= endDate;
        });

        // Jika disahkan bertugas pada hari tersebut, warnakan kotak dengan hijau emerald
        if (hasDuty) {
            daySlot.classList.add("active-shift");
            daySlot.style.backgroundColor = "var(--secondary-color, #10b981)"; 
            daySlot.style.color = "#ffffff";
            daySlot.style.fontWeight = "bold";
            daySlot.title = "Anda mempunyai jadual bertugas pada hari ini!";
            
            dutyDaysCountThisMonth++;
        }

        daysGrid.appendChild(daySlot);
    }

    // 5. Kemaskini angka kaunter ringkasan tugas secara dinamik mengikut bulan yang dipapar
    const counterEl = document.getElementById("total-duty-days");
    if (counterEl) {
        counterEl.innerText = dutyDaysCountThisMonth;
    }
}

// ========================================================
// 6. FUNGSI NAVIGASI ANAK PANAH KIRI / KANAN (CHEVRONS)
// ========================================================
function changeMonth(direction) {
    currentMonth += direction;

    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }

    // Bina semula paparan kalendar mengikut bulan baharu
    renderCalendar(currentMonth, currentYear);
}

// ========================================================
// 7. HELPER: AMBIL NAMA LOKASI DARI API API
// ========================================================
async function fetchLocationName(locationId) {
    try {
        const response = await fetch(`${API_BASE_URL}/location_hiking/`);
        const data = await response.json();
        const loc = data.items.find(l => l.location_id === locationId);
        return loc ? loc.location_name : "Unknown Location";
    } catch {
        return "N/A";
    }
}

// ========================================================
// 8. HELPER: AMBIL MAKLUMAT DATA PELANGGAN
// ========================================================
async function fetchCustomerDetails(bookingId) {
    try {
        const bRes = await fetch(`${API_BASE_URL}/booking/`);
        const bData = await bRes.json();
        const booking = bData.items.find(b => b.booking_id === bookingId);
        
        if (booking) {
            const cRes = await fetch(`${API_BASE_URL}/customer/`);
            const cData = await cRes.json();
            const cust = cData.items.find(c => c.customer_id === booking.customer_id);
            return { name: cust ? cust.customer_name : "N/A", phone: cust ? cust.customer_phone : "N/A" };
        }
        return { name: "N/A", phone: "N/A" };
    } catch {
        return { name: "N/A", phone: "N/A" };
    }
}

// ========================================================
// 9. PAPARKAN DATA KEHADIRAN LIVE APABILA TRIP DIKLIK
// ========================================================
async function viewTripDetails(bookingId, destination, date, pax, emergencyContact, durationDay) {
    document.getElementById("trip-id").innerText = bookingId;
    document.getElementById("trip-dest").innerText = destination;
    document.getElementById("trip-date").innerText = date;
    document.getElementById("trip-duration").innerText = `${durationDay || 0} Days`;
    document.getElementById("trip-equip").innerText = `Total Pax: ${pax} orang`;

    const attendanceTableBody = document.getElementById("attendance-list-table");
    if (!attendanceTableBody) return;
    
    attendanceTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Memuatkan senarai pendaki...</td></tr>`;

    const customerDetails = await fetchCustomerDetails(bookingId);
    attendanceTableBody.innerHTML = ""; // Padam loading baris tadi

    // 1. Papar baris Ketua Kumpulan (Leader)
    const row = document.createElement("tr");
    row.innerHTML = `
        <td style="text-align: center;"><input type="checkbox" class="attendance-check"></td>
        <td><strong>${customerDetails.name} (Leader)</strong></td>
        <td>${emergencyContact}</td>
        <td>-</td>
        <td>Group Leader</td>
    `;
    attendanceTableBody.appendChild(row);

    // 2. Tambah baris placeholder ahli kumpulan yang lain berdasarkan baki nilai PAX
    for (let i = 1; i < parseInt(pax); i++) {
        const pRow = document.createElement("tr");
        pRow.innerHTML = `
            <td style="text-align: center;"><input type="checkbox" class="attendance-check"></td>
            <td style="color:#888;">Member #${i}</td>
            <td>-</td>
            <td>-</td>
            <td>Participant</td>
        `;
        attendanceTableBody.appendChild(pRow); // Dibetulkan ralat append sedia ada anda
    }
}

// ========================================================
// 10. UTALITI: FORMAT TARIKH UNTUK PAPARAN JADUAL
// ========================================================
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('ms-MY', options);
}