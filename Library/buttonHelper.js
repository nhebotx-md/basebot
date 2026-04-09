/**
 * =========================================
 * 📌 FILE: buttonHelper.js
 * 📌 DESCRIPTION:
 * Helper module untuk membuat dan mengirim tombol interaktif
 * menggunakan format modern itsukichan Baileys
 *
 * Berisi:
 * - Base interactive sender
 * - Flow presets (quickReply, singleSelect, ctaUrl, ctaCall)
 * - Menu templates
 * - Hybrid button combinations
 *
 * ⚠️ CATATAN:
 * DILARANG mengubah nama variabel/function
 * karena berpengaruh ke sistem global
 * =========================================
 */

// =========================================
// 📌 CORE LOGIC / MAIN FUNCTIONS
// =========================================

/**
 * =========================================
 * 📌 FUNCTION: buildButton (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Factory function untuk membuat berbagai jenis tombol interaktif
 * Support format modern itsukichan Baileys
 *
 * Parameter:
 * - m → Message object dari WhatsApp
 * - Obj → Object berisi conn (connection) dan q (quoted helper)
 *
 * Return:
 * - Object berisi sendFlow, sendInteractive, dan flow presets
 *
 * Digunakan oleh:
 * - handler.js untuk inject button helper ke plugins
 *
 * ⚠️ NOTE:
 * Jangan ubah isi function ini
 * =========================================
 */
const buildButton = (m, Obj) => {
    
    // Destructure conn dan q dari Obj
    const { conn, q } = Obj;

    // =========================================
    // 📌 BASE INTERACTIVE SENDER (UPDATED)
    // =========================================
    /**
     * Menggunakan format modern interactiveButtons yang support:
     * - quick_reply (tombol biasa)
     * - single_select (list/menu dropdown)
     * - cta_url (tombol link)
     * - cta_call (tombol panggil)
     * Bisa dikombinasikan dalam 1 pesan (hybrid button)!
     */
    const sendInteractive = async (text, interactiveButtons = [], opt = {}) => {
        // Default options
        const {
            type = 'fkontak',                    // tipe quoted (fkontak, etc.)
            title = global.botname || "NHE BOT",
            body = "Interactive Menu",
            thumbnailUrl = "https://files.catbox.moe/5x2b8n.jpg",
            sourceUrl = "https://wa.me/62881027174423",
            footer = "© NHE SYSTEM"
        } = opt;

        // Build message object
        const msg = {
            text,
            footer,
            interactiveButtons,                   // ← format baru itsukichan
            headerType: 1,
            contextInfo: {
                externalAdReply: {
                    title,
                    body,
                    thumbnailUrl,
                    sourceUrl,
                    renderLargerThumbnail: true
                }
            }
        };

        // Kirim pesan dengan quoted
        return await conn.sendMessage(
            m.chat,
            msg,
            { quoted: q(type) }
        );
    };

    // =========================================
    // 📌 FLOW PRESETS
    // =========================================
    // Object untuk menyimpan preset-preset tombol
    const flow = {};

    // -----------------------------------------
    // QUICK REPLY PRESET
    // -----------------------------------------
    /**
     * Quick Reply (tombol biasa, max 3, bisa dikombinasikan dengan yang lain)
     */
    flow.quickReply = (displayText, id) => ([{
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
            display_text: displayText,
            id: id || displayText.toLowerCase().replace(/\s/g, '')
        })
    }]);

    // -----------------------------------------
    // SINGLE SELECT PRESET
    // -----------------------------------------
    /**
     * Single Select (dropdown menu / list)
     */
    flow.singleSelect = (title, sections = [], highlightLabel = "") => ([{
        name: "single_select",
        buttonParamsJson: JSON.stringify({
            title: title || "Pilih Menu",
            sections: sections.length ? sections : [{
                title: "Main Menu",
                rows: []
            }],
            ...(highlightLabel && { highlight_label: highlightLabel })
        })
    }]);

    // -----------------------------------------
    // CTA URL PRESET
    // -----------------------------------------
    /**
     * CTA URL (tombol link)
     */
    flow.ctaUrl = (displayText, url) => ([{
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
            display_text: displayText,
            url: url,
            merchant_url: url
        })
    }]);

    // -----------------------------------------
    // CTA CALL PRESET
    // -----------------------------------------
    /**
     * CTA Call (tombol panggil nomor)
     */
    flow.ctaCall = (displayText, phone) => ([{
        name: "cta_call",
        buttonParamsJson: JSON.stringify({
            display_text: displayText,
            id: phone
        })
    }]);

    // =========================================
    // 📌 MENU TEMPLATES
    // =========================================

    // -----------------------------------------
    // BASIC MENU
    // -----------------------------------------
    /**
     * Menu dasar dengan 3 opsi utama
     */
    flow.menu = () => flow.singleSelect(
        "Select Menu",
        [{
            title: "Main Menu",
            rows: [
                { title: "📦 Panel", description: "Buka Panel", id: ".panel" },
                { title: "🤖 AI", description: "AI Assistant", id: ".ai" },
                { title: "🎮 Game", description: "Game Menu", id: ".game" }
            ]
        }]
    );

    // -----------------------------------------
    // FULL MENU
    // -----------------------------------------
    /**
     * Menu lengkap dengan kategori Populer dan Main
     */
    flow.fullMenu = (botname = global.botname || "NHE BOT") => flow.singleSelect(
        "📂 All Menu",
        [
            {
                title: "Populer 🔥",
                rows: [
                    {
                        title: "🛒 STORE",
                        description: "Menu Store & Jualan",
                        id: ".storemenu"
                    }
                ]
            },
            {
                title: botname,
                rows: [
                    { title: "💻 PANEL", description: "Panel Management", id: ".panel" },
                    { title: "⬇️ DOWNLOAD", description: "Download Menu", id: ".downloadmenu" },
                    { title: "🔮 AI MENU", description: "AI Tools", id: ".aimenu" }
                ]
            }
        ]
    );

    // =========================================
    // 📌 HYBRID BUTTON EXAMPLE
    // =========================================
    /**
     * Contoh kombinasi tombol (super interactive)
     * Tombol cepat + list + link + call dalam 1 pesan
     */
    flow.hybridMenu = (botname) => ([
        // Quick Reply (tombol biasa)
        ...flow.quickReply("📋 Menu Utama", ".menu"),
        ...flow.quickReply("🔍 Cari", ".search"),
        // Single Select (list lengkap)
        ...flow.singleSelect(
            "📂 Full Menu",
            [
                {
                    title: "Populer 🔥",
                    rows: [{ title: "🛒 STORE", description: "Menu Store", id: ".storemenu" }]
                },
                {
                    title: botname || "NHE BOT",
                    rows: [
                        { title: "💻 PANEL", description: "Panel", id: ".panel" },
                        { title: "⬇️ DOWNLOAD", description: "Download", id: ".downloadmenu" },
                        { title: "🔮 AI", description: "AI Menu", id: ".aimenu" }
                    ]
                }
            ]
        ),
        // CTA URL
        ...flow.ctaUrl("🌐 Website", "https://example.com"),
        // CTA Call
        ...flow.ctaCall("📞 Hubungi Owner", "62881027174423")
    ]);

    // =========================================
    // 📌 RETURN API
    // =========================================
    // Return object dengan fungsi-fungsi yang tersedia
    return {
        sendFlow: sendInteractive,     // ← tetap nama lama, tapi lebih powerful
        sendInteractive,               // nama baru yang lebih jelas
        flow                           // flow presets
    };
};

// =========================================
// 📌 EXPORT / MODULE
// =========================================
module.exports = buildButton;
