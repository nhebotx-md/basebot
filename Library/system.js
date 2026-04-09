/**
 * =========================================
 * 📌 FILE: system.js
 * 📌 DESCRIPTION:
 * Case management system untuk bot WhatsApp
 * Mengelola CRUD operations untuk case commands
 *
 * Berisi:
 * - Get case by name
 * - Add new case
 * - Delete case
 * - List all cases
 *
 * ⚠️ CATATAN:
 * DILARANG mengubah nama variabel/function
 * karena berpengaruh ke sistem global
 * =========================================
 */

// =========================================
// 📌 IMPORT / REQUIRE
// =========================================
const fs = require("fs");
const path = require("path");

// =========================================
// 📌 CONSTANTS
// =========================================

// Path ke file case utama
const CASE_FILE = path.join(process.cwd(), "./WhosTANG.js");

// =========================================
// 📌 CORE LOGIC / MAIN FUNCTIONS
// =========================================

/**
 * =========================================
 * 📌 OBJECT: Case (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Object utama untuk manajemen case commands
 * Berisi method get, add, delete, dan list
 *
 * Digunakan oleh:
 * - Plugins untuk CRUD case commands
 *
 * ⚠️ NOTE:
 * Jangan ubah struktur atau nama method
 * =========================================
 */
const Case = {

    // -----------------------------------------
    // GET CASE
    // -----------------------------------------
    /**
     * =========================================
     * 📌 METHOD: get (JANGAN DIUBAH)
     * -----------------------------------------
     * Deskripsi:
     * Ambil isi case berdasarkan nama
     *
     * Parameter:
     * - n → Nama case yang dicari
     *
     * Return:
     * - String → Isi case lengkap
     *
     * Throw:
     * - Error jika case tidak ditemukan
     * =========================================
     */
    get: (n) => {
        // Baca file case
        let c = fs.readFileSync(CASE_FILE, "utf8");
        // Regex untuk mencari case
        let r = /case .*?:/g;
        // Cari case yang mengandung nama
        let f = (c.match(r) || []).find(v => v.includes(n));
        // Throw error jika tidak ditemukan
        if (!f) throw new Error(`Case "${n}" tidak ditemukan`);
        
        // Parse block case dengan bracket matching
        let s = c.indexOf(f);
        let b = c.indexOf("{", s);
        let i = b + 1;
        let x = 1;
        // Bracket matching untuk menemukan akhir block
        while (x && i < c.length) c[i++] == "{" ? x++ : c[i - 1] == "}" && x--;
        return c.slice(s, i);
    },

    // -----------------------------------------
    // ADD CASE
    // -----------------------------------------
    /**
     * =========================================
     * 📌 METHOD: add (JANGAN DIUBAH)
     * -----------------------------------------
     * Deskripsi:
     * Tambah case baru ke file WhosTANG.js
     *
     * Parameter:
     * - cod → Kode case lengkap (harus ada 'case', '{ }', dan 'break')
     *
     * Throw:
     * - Error jika format tidak valid
     * - Error jika case sudah ada
     * - Error jika default: tidak ditemukan
     * =========================================
     */
    add: (cod) => {
        // Baca file case
        let c = fs.readFileSync(CASE_FILE, "utf8");
        // Validasi format
        if (!cod.includes("case")) throw new Error("harus ada 'case'.");
        if (!cod.includes("{") || !cod.includes("}")) throw new Error("blok ga, ada bodoh *{ }*");
        if (!cod.includes("break")) throw new Error("case harus ada 'break'.");

        // Cek duplikat case
        let r = /case\s+["'`](.*?)["'`]\s*:/g, m;
        while ((m = r.exec(c)) !== null) {
            if ([`"`, `'`, "`"].some(q => cod.includes(`case ${q}${m[1]}${q}`))) {
                throw new Error(`Case "${m[1]}" sudah ada!`);
            }
        }

        // Cari posisi default:
        let p = c.lastIndexOf("default:");
        if (p == -1) throw new Error("default: tidak ditemukan di case.js");

        // Insert case baru sebelum default:
        let out = c.slice(0, p) + "\n  " + cod.trim() + "\n\n  " + c.slice(p);
        fs.writeFileSync(CASE_FILE, out);
    },

    // -----------------------------------------
    // DELETE CASE
    // -----------------------------------------
    /**
     * =========================================
     * 📌 METHOD: delete (JANGAN DIUBAH)
     * -----------------------------------------
     * Deskripsi:
     * Hapus case berdasarkan nama
     *
     * Parameter:
     * - ky → Nama case yang akan dihapus
     *
     * Throw:
     * - Error jika case tidak ditemukan
     * - Error jika blok { } tidak ditemukan
     * =========================================
     */
    delete: (ky) => {
        // Baca file case
        let c = fs.readFileSync(CASE_FILE, "utf8");
        // Regex untuk mencari case
        let r = new RegExp(`case\\s+["'\`]${ky}["'\`]\\s*:\\s*`);
        let m = c.match(r);
        // Throw error jika tidak ditemukan
        if (!m) throw new Error(`Case "${ky}" tidak ditemukan`);

        // Cari posisi awal case
        let s = c.indexOf(m[0]);
        // Cari posisi awal block
        let b = c.indexOf("{", s);
        if (b === -1) throw new Error("blok { ga ada tolol");

        // Bracket matching untuk menemukan akhir block
        let x = 1, i = b + 1;
        while (x && i < c.length) {
            if (c[i] === "{") x++;
            else if (c[i] === "}") x--;
            i++;
        }
        // Hapus case dari file
        let out = c.slice(0, s) + c.slice(i);
        fs.writeFileSync(CASE_FILE, out);
    },

    // -----------------------------------------
    // LIST CASES
    // -----------------------------------------
    /**
     * =========================================
     * 📌 METHOD: list (JANGAN DIUBAH)
     * -----------------------------------------
     * Deskripsi:
     * List semua case yang ada di file
     *
     * Return:
     * - String → List nama case (newline separated)
     * =========================================
     */
    list: () => {
        // Baca file case
        let c = fs.readFileSync(CASE_FILE, "utf8");
        // Regex untuk mencari semua case
        let r = /case\s+["'`](.*?)["'`]\s*:/g;
        let list = [], m;
        // Extract semua nama case
        while ((m = r.exec(c)) !== null) list.push(m[1]);
        return list.length ? list.join("\n") : "Tidak ada case!";
    }
};

// =========================================
// 📌 EXPORT / MODULE
// =========================================
module.exports = Case;
