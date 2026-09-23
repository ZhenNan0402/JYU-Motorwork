/* =========================================
   DATA STORAGE
========================================= */
/* =========================================
   SUPABASE
========================================= */

const SUPABASE_URL =
    "https://bceahbwtgtixyuyjealv.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_yXMXdkVz4GNjPPeohKO2KQ_4jkli52T";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =========================================
   LOGIN
========================================= */

async function loginUser() {

    const email =
        document.getElementById("loginEmail")
        .value
        .trim();

    const password =
        document.getElementById("loginPassword")
        .value;

    const errorBox =
        document.getElementById("loginError");

    errorBox.style.display = "none";


    if (!email || !password) {

        errorBox.textContent =
            "Please enter email and password.";

        errorBox.style.display = "block";

        return;
    }


    const { error } =
        await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });


    if (error) {

        console.error(error);

        errorBox.textContent =
            "Login failed. Please check email and password.";

        errorBox.style.display = "block";

        return;
    }


    await startGarageApp();
}


/* =========================================
   LOGOUT
========================================= */

async function logoutUser() {

    await supabaseClient.auth.signOut();

    document.getElementById("mainApp")
        .style.display = "none";

    document.getElementById("loginScreen")
        .style.display = "flex";

    document.getElementById("loginPassword")
        .value = "";
}


/* =========================================
   CHECK LOGIN
========================================= */

async function checkLogin() {

    const {
        data: { session }
    } = await supabaseClient.auth.getSession();


    if (session) {

        await startGarageApp();

    }
    else {

        document.getElementById("loginScreen")
            .style.display = "flex";

        document.getElementById("mainApp")
            .style.display = "none";
    }
}


/* =========================================
   START GARAGE
========================================= */

async function startGarageApp() {

    document.getElementById("loginScreen")
        .style.display = "none";

    document.getElementById("mainApp")
        .style.display = "block";


    await loadCloudData();


    setDefaultDate();

    updateDashboard();

    updateReport();
}
let vehicles = JSON.parse(
    localStorage.getItem("garageVehicles") || "[]"
);

let repairs = JSON.parse(
    localStorage.getItem("garageRepairs") || "[]"
);
/* =========================================
   LOAD DATA FROM SUPABASE
========================================= */

async function loadCloudData() {

    try {

        /* VEHICLES */

        const {
            data: cloudVehicles,
            error: vehicleError
        } = await supabaseClient
            .from("vehicles")
            .select("*")
            .order("created_at", {
                ascending: true
            });

        if (vehicleError) {
            throw vehicleError;
        }


        /* REPAIRS */

        const {
            data: cloudRepairs,
            error: repairError
        } = await supabaseClient
            .from("repairs")
            .select("*")
            .order("date", {
                ascending: true
            });

        if (repairError) {
            throw repairError;
        }


        /* CONVERT SUPABASE FORMAT */

        vehicles = (cloudVehicles || []).map(v => ({
            id: Number(v.id),
            plate: v.plate,
            model: v.model || "",
            customer: v.customer || ""
        }));


        repairs = (cloudRepairs || []).map(r => ({
            id: Number(r.id),
            invoiceNo: r.invoice_no || "",
            vehicleId: Number(r.vehicle_id),
            date: r.date,
            plate: r.plate,
            model: r.model || "",
            customer: r.customer || "",
            repair: r.repair,
            partsCost: Number(r.parts_cost || 0),
            partsCharged: Number(r.parts_charged || 0),
            labor: Number(r.labor || 0),
            total: Number(r.total || 0),
            profit: Number(r.profit || 0),
            remark: r.remark || ""
        }));


        /* UPDATE LOCAL CACHE */

        localStorage.setItem(
            "garageVehicles",
            JSON.stringify(vehicles)
        );

        localStorage.setItem(
            "garageRepairs",
            JSON.stringify(repairs)
        );


        console.log(
            "Supabase data loaded successfully."
        );

    }
    catch (error) {

        console.error(
            "Supabase loading failed:",
            error
        );

        console.log(
            "Using local cached data."
        );
    }
}


/* =========================================
   SAVE REPAIR TO SUPABASE
========================================= */

async function saveRepairToCloud(vehicle, repair) {

    /* CHECK VEHICLE */

    const {
        data: existingVehicle,
        error: findVehicleError
    } = await supabaseClient
        .from("vehicles")
        .select("id")
        .eq("plate", vehicle.plate)
        .maybeSingle();


    if (findVehicleError) {
        throw findVehicleError;
    }


    /* EXISTING VEHICLE */

    if (existingVehicle) {

        vehicle.id = Number(existingVehicle.id);
        repair.vehicleId = Number(existingVehicle.id);

        const {
            error: updateVehicleError
        } = await supabaseClient
            .from("vehicles")
            .update({
                model: vehicle.model || "",
                customer: vehicle.customer || ""
            })
            .eq("id", existingVehicle.id);


        if (updateVehicleError) {
            throw updateVehicleError;
        }

    }

    /* NEW VEHICLE */

    else {

        const {
            data: insertedVehicle,
            error: insertVehicleError
        } = await supabaseClient
            .from("vehicles")
            .insert({
                plate: vehicle.plate,
                model: vehicle.model || "",
                customer: vehicle.customer || ""
            })
            .select("id")
            .single();


        if (insertVehicleError) {
            throw insertVehicleError;
        }


        vehicle.id = Number(insertedVehicle.id);
        repair.vehicleId = Number(insertedVehicle.id);
    }


    /* SAVE REPAIR */

    const {
        data: insertedRepair,
        error: repairError
    } = await supabaseClient
        .from("repairs")
        .insert({
            invoice_no: repair.invoiceNo,
            vehicle_id: repair.vehicleId,
            date: repair.date,
            plate: repair.plate,
            model: repair.model || "",
            customer: repair.customer || "",
            repair: repair.repair,
            parts_cost: repair.partsCost,
            parts_charged: repair.partsCharged,
            labor: repair.labor,
            total: repair.total,
            profit: repair.profit,
            remark: repair.remark || ""
        })
        .select("id")
        .single();


    if (repairError) {
        throw repairError;
    }


    repair.id = Number(insertedRepair.id);

    console.log(
        "Repair saved to Supabase successfully."
    );
}
/* =========================================
   PAGE NAVIGATION
========================================= */

function showPage(pageId, button) {

    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    document.getElementById(pageId).classList.add("active");

    document.querySelectorAll(".sidebar button").forEach(btn => {
        btn.classList.remove("active");
    });

    button.classList.add("active");

    if (pageId === "dashboard") {
        updateDashboard();
    }

    if (pageId === "reports") {
        updateReport();
    }
}


/* =========================================
   DATE
========================================= */

function setDefaultDate() {

    const today = new Date();

    const yyyy = today.getFullYear();

    const mm = String(today.getMonth() + 1).padStart(2, "0");

    const dd = String(today.getDate()).padStart(2, "0");

    document.getElementById("repairDate").value =
        `${yyyy}-${mm}-${dd}`;

}


/* =========================================
   CALCULATE TOTAL
========================================= */

function calculateTotal() {

    const partsCharged =
        parseFloat(document.getElementById("partsCharged").value) || 0;

    const labor =
        parseFloat(document.getElementById("laborCharged").value) || 0;

    const partsCost =
        parseFloat(document.getElementById("partsCost").value) || 0;

    const total = partsCharged + labor;

    const profit = total - partsCost;

    document.getElementById("totalCharged").value =
        total.toFixed(2);

    document.getElementById("profit").value =
        profit.toFixed(2);
}


/* =========================================
   SAVE DATA
========================================= */

async function saveRepair() {

    const date =
        document.getElementById("repairDate").value;

    const plate =
        document.getElementById("plate").value.trim().toUpperCase();

    const model =
        document.getElementById("model").value.trim();

    const customer =
        document.getElementById("customer").value.trim();

    const repair =
        document.getElementById("repair").value.trim();

    const partsCost =
        parseFloat(document.getElementById("partsCost").value) || 0;

    const partsCharged =
        parseFloat(document.getElementById("partsCharged").value) || 0;

    const labor =
        parseFloat(document.getElementById("laborCharged").value) || 0;

    const total =
        partsCharged + labor;

    const profit =
        total - partsCost;

    const remark =
        document.getElementById("remark").value.trim();


    /* Validation */

    if (!date) {

        showMessage(
            "entryMessage",
            "Please select the repair date.",
            "error"
        );

        return;
    }

    if (!plate) {

        showMessage(
            "entryMessage",
            "Please enter the vehicle plate number.",
            "error"
        );

        return;
    }

    if (!repair) {

        showMessage(
            "entryMessage",
            "Please enter the repair / service.",
            "error"
        );

        return;
    }


    /* Find existing vehicle */

    let vehicle =
        vehicles.find(v => v.plate === plate);


    /* New vehicle */

    if (!vehicle) {

        vehicle = {

            id: Date.now(),

            plate: plate,

            model: model,

            customer: customer

        };

        vehicles.push(vehicle);

    }

    /* Existing vehicle */

    else {

        /*
           Update information if new information
           has been entered.
        */

        if (model) {
            vehicle.model = model;
        }

        if (customer) {
            vehicle.customer = customer;
        }

    }


    /* Create repair */

    const newRepair = {

        id: Date.now(),

        invoiceNo: createInvoiceNumber(),

        vehicleId: vehicle.id,

        date: date,

        plate: plate,

        model: vehicle.model,

        customer: vehicle.customer,

        repair: repair,

        partsCost: partsCost,

        partsCharged: partsCharged,

        labor: labor,

        total: total,

        profit: profit,

        remark: remark

    };


    repairs.push(newRepair);


/* =========================================
   SAVE LOCAL COPY
========================================= */

localStorage.setItem(
    "garageVehicles",
    JSON.stringify(vehicles)
);

localStorage.setItem(
    "garageRepairs",
    JSON.stringify(repairs)
);


/* =========================================
   SAVE CLOUD COPY
========================================= */

let cloudMessage = "";

try {

    await saveRepairToCloud(
        vehicle,
        newRepair
    );


    /*
       Save again because Supabase may
       have supplied an existing vehicle ID.
    */

    localStorage.setItem(
        "garageVehicles",
        JSON.stringify(vehicles)
    );

    localStorage.setItem(
        "garageRepairs",
        JSON.stringify(repairs)
    );


    cloudMessage =
        " ☁ Cloud backup successful.";

}
catch (error) {

    console.error(
        "Supabase backup error:",
        error
    );

    cloudMessage =
        " ⚠ Saved locally, but cloud backup failed.";
}

    /* Generate PDF invoice on Desktop */
    let invoiceMessage = "";

    try {
        const invoiceFile = await generateInvoicePDF(newRepair);
        invoiceMessage = " ✓ Invoice saved to Desktop: " + invoiceFile;
    }
    catch (error) {
        console.error("Invoice PDF error:", error);
        invoiceMessage = " Repair was saved, but the invoice PDF could not be created.";
    }

    /* Success */
    showMessage(
        "entryMessage",
        "✓ Repair saved successfully!" +
cloudMessage +
invoiceMessage,
    );


    /* Clear repair fields */

    document.getElementById("repair").value = "";

    document.getElementById("partsCost").value = "0";

    document.getElementById("partsCharged").value = "0";

    document.getElementById("laborCharged").value = "0";

    document.getElementById("totalCharged").value = "0.00";

    document.getElementById("profit").value = "0.00";

    document.getElementById("remark").value = "";


    updateDashboard();

}


/* =========================================
   SEARCH VEHICLE
========================================= */

function searchVehicle() {

    const plate =
        document.getElementById("searchPlate")
        .value
        .trim()
        .toUpperCase();


    if (!plate) {

        showMessage(
            "searchMessage",
            "Please enter a plate number.",
            "error"
        );

        document.getElementById("vehicleResult").innerHTML = "";

        return;
    }


    const vehicle =
        vehicles.find(v => v.plate === plate);


    if (!vehicle) {

        showMessage(
            "searchMessage",
            "Vehicle not found.",
            "error"
        );

        document.getElementById("vehicleResult").innerHTML = "";

        return;
    }


    showMessage(
        "searchMessage",
        "✓ Vehicle found.",
        "success"
    );


    const vehicleRepairs =
        repairs
        .filter(r => r.vehicleId === vehicle.id)
        .sort((a, b) => b.date.localeCompare(a.date));


    let html = `

        <div class="vehicle-info">

            <strong>Plate:</strong>
            ${escapeHTML(vehicle.plate)}

            &nbsp;&nbsp;

            <strong>Model:</strong>
            ${escapeHTML(vehicle.model || "-")}

            &nbsp;&nbsp;

            <strong>Customer:</strong>
            ${escapeHTML(vehicle.customer || "-")}

        </div>

        <h3>Complete Repair History</h3>

        <table>

            <thead>

                <tr>
                    <th>Date</th>
                    <th>Repair / Service</th>
                    <th>Parts Cost</th>
                    <th>Parts Charged</th>
                    <th>Labor</th>
                    <th>Total</th>
                    <th>Profit</th>
                </tr>

            </thead>

            <tbody>
    `;


    if (vehicleRepairs.length === 0) {

        html += `
            <tr>
                <td colspan="7" class="empty">
                    No repair records.
                </td>
            </tr>
        `;

    }
    else {

        vehicleRepairs.forEach(r => {

            html += `

                <tr>

                    <td>${r.date}</td>

                    <td>
                        ${escapeHTML(r.repair)}
                    </td>

                    <td class="money">
                        RM ${r.partsCost.toFixed(2)}
                    </td>

                    <td class="money">
                        RM ${r.partsCharged.toFixed(2)}
                    </td>

                    <td class="money">
                        RM ${r.labor.toFixed(2)}
                    </td>

                    <td class="money">
                        <strong>
                            RM ${r.total.toFixed(2)}
                        </strong>
                    </td>

                    <td class="money">
                        RM ${r.profit.toFixed(2)}
                    </td>

                </tr>

            `;

        });

    }


    html += `

            </tbody>

        </table>

    `;


    document.getElementById("vehicleResult").innerHTML = html;

}


/* =========================================
   DASHBOARD
========================================= */

function updateDashboard() {

    document.getElementById("dashboardVehicles")
        .textContent = vehicles.length;

    document.getElementById("dashboardRepairs")
        .textContent = repairs.length;


    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(now.getMonth() + 1).padStart(2, "0");


    const currentMonth =
        `${year}-${month}`;


    const monthlyRepairs =
        repairs.filter(r =>
            r.date.startsWith(currentMonth)
        );


    const sales =
        monthlyRepairs.reduce(
            (sum, r) => sum + r.total,
            0
        );


    const profit =
        monthlyRepairs.reduce(
            (sum, r) => sum + r.profit,
            0
        );


    document.getElementById("dashboardSales")
        .textContent =
        "RM " + sales.toFixed(2);


    document.getElementById("dashboardProfit")
        .textContent =
        "RM " + profit.toFixed(2);


    updateRecentRepairs();

}


/* =========================================
   RECENT REPAIRS
========================================= */

function updateRecentRepairs() {

    const table =
        document.getElementById("recentRepairsTable");


    const recent =
        [...repairs]
        .sort((a, b) =>
            b.date.localeCompare(a.date)
        )
        .slice(0, 10);


    if (recent.length === 0) {

        table.innerHTML = `

            <tr>
                <td colspan="6" class="empty">
                    No repair records yet.
                </td>
            </tr>

        `;

        return;
    }


    table.innerHTML =
        recent.map(r => `

            <tr>

                <td>${r.date}</td>

                <td>${escapeHTML(r.plate)}</td>

                <td>${escapeHTML(r.model || "-")}</td>

                <td>${escapeHTML(r.repair)}</td>

                <td class="money">
                    RM ${r.total.toFixed(2)}
                </td>

                <td class="money">
                    RM ${r.profit.toFixed(2)}
                </td>

            </tr>

        `).join("");

}


/* =========================================
   MONTHLY REPORT
========================================= */
function generateReport() {

    const month =
        document.getElementById("reportMonth").value;

    if (!month) {

        alert("Please select a month first.");

        return;
    }

    updateReport();

}
function updateReport() {

    let month =
        document.getElementById("reportMonth").value;


    if (!month) {

        const now = new Date();

        month =
            now.getFullYear() +
            "-" +
            String(now.getMonth() + 1).padStart(2, "0");

        document.getElementById("reportMonth").value =
            month;
    }


    const monthRepairs =
        repairs.filter(r =>
            r.date.startsWith(month)
        );


    const sales =
        monthRepairs.reduce(
            (sum, r) => sum + r.total,
            0
        );


    const parts =
        monthRepairs.reduce(
            (sum, r) => sum + r.partsCost,
            0
        );


    const labor =
        monthRepairs.reduce(
            (sum, r) => sum + r.labor,
            0
        );


    const profit =
        monthRepairs.reduce(
            (sum, r) => sum + r.profit,
            0
        );


    document.getElementById("reportSales")
        .textContent =
        "RM " + sales.toFixed(2);


    document.getElementById("reportParts")
        .textContent =
        "RM " + parts.toFixed(2);


    document.getElementById("reportLabor")
        .textContent =
        "RM " + labor.toFixed(2);


    document.getElementById("reportProfit")
        .textContent =
        "RM " + profit.toFixed(2);


    const table =
        document.getElementById("reportTable");


    if (monthRepairs.length === 0) {

        table.innerHTML = `

            <tr>
                <td colspan="8" class="empty">
                    No repairs for this month.
                </td>
            </tr>

        `;

        return;
    }


    table.innerHTML =
        monthRepairs
        .sort((a, b) =>
            a.date.localeCompare(b.date)
        )
        .map(r => `

            <tr>

                <td>${r.date}</td>

                <td>${escapeHTML(r.plate)}</td>

                <td>${escapeHTML(r.model || "-")}</td>

                <td>${escapeHTML(r.repair)}</td>

                <td class="money">
                    RM ${r.total.toFixed(2)}
                </td>

                <td class="money">
                    RM ${r.partsCost.toFixed(2)}
                </td>

                <td class="money">
                    RM ${r.labor.toFixed(2)}
                </td>

                <td class="money">
                    RM ${r.profit.toFixed(2)}
                </td>

            </tr>

        `).join("");

}


/* =========================================
   EXPORT MONTHLY REPORT
========================================= */
function exportReportCSV() {

    let month =
        document.getElementById("reportMonth").value;

    if (!month) {
        alert("Please select a month first.");
        return;
    }

    const monthRepairs =
        repairs.filter(r =>
            r.date.startsWith(month)
        );

    if (monthRepairs.length === 0) {
        alert("No repair records found for the selected month.");
        return;
    }

    const sales =
        monthRepairs.reduce(
            (sum, r) => sum + r.total,
            0
        );

    const parts =
        monthRepairs.reduce(
            (sum, r) => sum + r.partsCost,
            0
        );

    const labor =
        monthRepairs.reduce(
            (sum, r) => sum + r.labor,
            0
        );

    const profit =
        monthRepairs.reduce(
            (sum, r) => sum + r.profit,
            0
        );

    const rows = [
        ["GARAGE MONTHLY REPORT"],
        ["Month", month],
        [],
        ["SUMMARY"],
        ["Total Sales (RM)", sales.toFixed(2)],
        ["Parts Cost (RM)", parts.toFixed(2)],
        ["Labor (RM)", labor.toFixed(2)],
        ["Gross Profit (RM)", profit.toFixed(2)],
        ["Number of Repairs", monthRepairs.length],
        [],
        [
            "Date",
            "Plate",
            "Vehicle",
            "Repair / Service",
            "Parts Charged (RM)",
            "Parts Cost (RM)",
            "Labor (RM)",
            "Total Sales (RM)",
            "Gross Profit (RM)",
            "Remark"
        ]
    ];

    monthRepairs
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .forEach(r => {
            rows.push([
                r.date,
                r.plate,
                r.model || "",
                r.repair,
                Number(r.partsCharged || 0).toFixed(2),
                Number(r.partsCost || 0).toFixed(2),
                Number(r.labor || 0).toFixed(2),
                Number(r.total || 0).toFixed(2),
                Number(r.profit || 0).toFixed(2),
                r.remark || ""
            ]);
        });

    function csvEscape(value) {
        const text = String(value ?? "");
        return '"' + text.replace(/"/g, '""') + '"';
    }

    const csv =
        "\uFEFF" +
        rows.map(row =>
            row.map(csvEscape).join(",")
        ).join("\r\n");

    const blob =
        new Blob([csv], {
            type: "text/csv;charset=utf-8;"
        });

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;
    link.download =
        "Garage_Report_" + month + ".csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}


/* =========================================
   PDF INVOICE
========================================= */

function createInvoiceNumber() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const sec = String(now.getSeconds()).padStart(2, "0");

    return `INV-${yyyy}${mm}${dd}-${hh}${min}${sec}`;
}

function safeFileName(value) {
    return String(value || "")
        .replace(/[<>:"/\\|?*]/g, "_")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function pdfSafeText(value) {
    return String(value ?? "")
        .normalize("NFKD")
        .replace(/[^\x20-\x7E]/g, "?")
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
}

function wrapInvoiceText(value, maxChars = 72) {
    const words = String(value ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ");

    const lines = [];
    let line = "";

    words.forEach(word => {
        if (!word) return;

        if ((line + " " + word).trim().length <= maxChars) {
            line = (line + " " + word).trim();
        }
        else {
            if (line) lines.push(line);
            line = word;
        }
    });

    if (line) lines.push(line);

    return lines.length ? lines : [""];
}

function buildSimplePDF(repair) {
    const pageWidth = 595;
    const pageHeight = 842;
    const commands = [];

    const addText = (text, x, y, size = 11, bold = false) => {
        const font = bold ? "F2" : "F1";
        commands.push(
            `BT /${font} ${size} Tf ${x} ${y} Td (${pdfSafeText(text)}) Tj ET`
        );
    };

    const addLine = (x1, y1, x2, y2, width = 1) => {
        commands.push(`${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
    };

   /* ================================
   GARAGE HEADER
================================ */

addText("JYU&CRAFT MOTORWORK", 50, 790, 22, true);

addText("18, JALAN BUKIT MEWAH 8", 50, 770, 9);
addText("202603230251", 50, 756, 9);
addText("KT0620371-P", 50, 742, 9);
addText("Phone No: 0173102339", 50, 728, 9);

addText("INVOICE", 450, 790, 18, true);

addLine(50, 710, 545, 710, 1.2);


/* ================================
   INVOICE INFORMATION
================================ */

addText(
    `Invoice No: ${repair.invoiceNo || ""}`,
    50,
    685,
    10
);

addText(
    `Date: ${repair.date || ""}`,
    390,
    685,
    10
);


/* ================================
   CUSTOMER / VEHICLE
================================ */

addText(
    `Customer: ${repair.customer || "-"}`,
    50,
    658,
    11
);

addText(
    `Vehicle Plate: ${repair.plate || "-"}`,
    50,
    635,
    11
);

addText(
    `Vehicle Model: ${repair.model || "-"}`,
    300,
    635,
    11
);

addLine(50, 613, 545, 613, 0.8);


/* ================================
   REPAIR / SERVICE
================================ */

/* ================================
   REPAIR / SERVICE TABLE
================================ */

let y = 590;

const tableLeft = 50;
const tableRight = 545;

const noX = 50;
const serviceX = 90;
const qtyX = 465;

const headerHeight = 26;
const rowHeight = 25;

/* Top line */
addLine(tableLeft, y, tableRight, y, 0.8);

/* Header */
addText("No.", 60, y - 18, 10, true);
addText("Repair / Service", 100, y - 18, 10, true);
addText("Quantity", 475, y - 18, 10, true);

y -= headerHeight;

/* Header bottom line */
addLine(tableLeft, y, tableRight, y, 0.8);

/* Vertical header lines */
addLine(88, y + headerHeight, 88, y, 0.8);
addLine(455, y + headerHeight, 455, y, 0.8);


/* ================================
   SERVICE ROWS
================================ */

/*
   For now this supports repair being either:

   1. An array of service items
   OR
   2. Your existing repair text
*/

let serviceItems = [];

if (Array.isArray(repair.repair)) {

    serviceItems = repair.repair;

} else if (repair.repair) {

    /*
       If your existing repair field contains
       multiple lines, each line becomes one row.
    */

    serviceItems = String(repair.repair)
        .split("\n")
        .filter(item => item.trim() !== "")
        .map(item => ({
            description: item.trim(),
            quantity: 1
        }));
}


/* Draw rows */

serviceItems.forEach((item, index) => {

    const description =
        typeof item === "string"
            ? item
            : item.description || item.name || "";

    const quantity =
        typeof item === "object"
            ? item.quantity || 1
            : 1;

    const rowTop = y;

    /* Row number */
    addText(
        String(index + 1),
        65,
        y - 17,
        10
    );

    /* Service description */
    addText(
        description,
        100,
        y - 17,
        10
    );

    /* Quantity */
    addText(
        String(quantity),
        490,
        y - 17,
        10
    );

    y -= rowHeight;

    /* Bottom line */
    addLine(
        tableLeft,
        y,
        tableRight,
        y,
        0.5
    );

    /* Vertical lines */
    addLine(
        88,
        rowTop,
        88,
        y,
        0.5
    );

    addLine(
        455,
        rowTop,
        455,
        y,
        0.5
    );
});


/* Outer left/right borders */

const tableBottom = y;

addLine(
    tableLeft,
    590,
    tableLeft,
    tableBottom,
    0.8
);

addLine(
    tableRight,
    590,
    tableRight,
    tableBottom,
    0.8
);


/* Space before charges */

y -= 30;

addText("Parts Charged", 300, y, 11);
addText(
    `RM ${Number(repair.partsCharged || 0).toFixed(2)}`,
    455,
    y,
    11,
    true
);

y -= 24;

addText("Labor Charged", 300, y, 11);
addText(
    `RM ${Number(repair.labor || 0).toFixed(2)}`,
    455,
    y,
    11,
    true
);

y -= 18;

addLine(300, y, 545, y, 0.8);

y -= 32;

addText("TOTAL", 300, y, 14, true);

addText(
    `RM ${Number(repair.total || 0).toFixed(2)}`,
    445,
    y,
    14,
    true
);

if (repair.remark) {
    y -= 55;

    addText("Remark", 50, y, 11, true);

    y -= 20;

    wrapInvoiceText(repair.remark, 70).forEach(line => {
        addText(line, 50, y, 10);
        y -= 16;
    });
}


/* ================================
   FOOTER
================================ */

addLine(50, 115, 545, 115, 0.7);

addText(
    "Thank you for your support.",
    50,
    92,
    10
);

addText(
    "JYU&Craft Motorwork",
    450,
    92,
    10,
    true
);


/* ================================
   BUILD PDF
================================ */

const stream = commands.join("\n") + "\n";

const objects = [];

objects[1] =
    "<< /Type /Catalog /Pages 2 0 R >>";

objects[2] =
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";

objects[3] =
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
    "/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> " +
    "/Contents 6 0 R >>";

objects[4] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

objects[5] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

objects[6] =
    `<< /Length ${new TextEncoder().encode(stream).length} >>\n` +
    "stream\n" +
    stream +
    "endstream";

let pdf = "%PDF-1.4\n";

const offsets = [0];

for (let i = 1; i <= 6; i++) {

    offsets[i] =
        new TextEncoder().encode(pdf).length;

    pdf +=
        `${i} 0 obj\n${objects[i]}\nendobj\n`;
}

const xrefOffset =
    new TextEncoder().encode(pdf).length;

pdf +=
    "xref\n" +
    "0 7\n" +
    "0000000000 65535 f \n";

for (let i = 1; i <= 6; i++) {

    pdf +=
        String(offsets[i]).padStart(10, "0") +
        " 00000 n \n";
}

pdf +=
    "trailer\n" +
    "<< /Size 7 /Root 1 0 R >>\n" +
    "startxref\n" +
    xrefOffset +
    "\n%%EOF";

return new TextEncoder().encode(pdf);

}

async function generateInvoicePDF(repair) {

    const cleanPlate =
        safeFileName(repair.plate || "Vehicle");

    const cleanDate =
        safeFileName(repair.date || "Date");

    const filename =
        `Invoice_${cleanPlate}_${cleanDate}_${repair.invoiceNo}.pdf`;

    const pdfBytes =
        buildSimplePDF(repair);


    /* =========================================
       TAURI DESKTOP VERSION
    ========================================= */

    if (
        window.__TAURI__ &&
        window.__TAURI__.core &&
        window.__TAURI__.core.invoke
    ) {

        const { invoke } = window.__TAURI__.core;

        await invoke("save_invoice_pdf", {
            filename: filename,
            data: Array.from(pdfBytes)
        });

        return filename;
    }


    /* =========================================
       WEBSITE / BROWSER VERSION
    ========================================= */

    const blob = new Blob(
        [pdfBytes],
        {
            type: "application/pdf"
        }
    );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download = filename;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1000);

    return filename;
}

/* =========================================
   MESSAGE
========================================= */

function showMessage(elementId, text, type) {

    const element =
        document.getElementById(elementId);

    element.textContent = text;

    element.className =
        "message " + type;

}


/* =========================================
   SECURITY / HTML ESCAPE
========================================= */

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================
   INITIALIZE
========================================= */

checkLogin();
/* =========================================
   EXPOSE FUNCTIONS TO HTML BUTTONS
========================================= */

window.showPage = showPage;
window.calculateTotal = calculateTotal;
window.saveRepair = saveRepair;
window.searchVehicle = searchVehicle;
window.generateReport = generateReport;
window.exportReportCSV = exportReportCSV;
window.loginUser = loginUser;
window.logoutUser = logoutUser;
