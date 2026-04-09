/**
 * =========================================
 * 📌 FILE: handler.js
 * 📌 DESCRIPTION:
 * Handler utama untuk memuat dan mengeksekusi plugins
 * dengan support reply mode (button/text)
 *
 * Berisi:
 * - Plugin loader dengan caching
 * - Tag-based plugin indexing
 * - Reply mode helper (smartReply)
 * - UI engine dengan presets
 * - Button helper injection
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

// Import button helper
const buildButton = require("./buttonHelper");

// Import reply mode module
const { getUserReplyMode } = require('./replyMode');

// =========================================
// 📌 GLOBAL VARIABLES / CONFIG
// =========================================

// Cache untuk plugins (FIX performa)
let pluginsCache = null;

// =========================================
// 📌 CORE LOGIC / MAIN FUNCTIONS
// =========================================

/**
 * =========================================
 * 📌 FUNCTION: loadPlugins (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Fungsi untuk memuat semua plugins dari folder Plugins-CJS
 * dengan caching untuk performa optimal
 *
 * Fitur:
 * - Load plugins dari folder Plugins-CJS
 * - Normalisasi tags
 * - Tag-based indexing
 * - Cache management
 *
 * Return:
 * - Array plugins dengan metadata dan index byTag
 *
 * Digunakan oleh:
 * - handleMessage() untuk load plugins
 *
 * ⚠️ NOTE:
 * Jangan ubah isi function ini
 * =========================================
 */
const loadPlugins = async () => {
    // Path ke folder plugins
    const dir = path.join(__dirname, "../Plugins-CJS");
    const plugins = [];
    const pluginsByTag = new Map();

    // -----------------------------------------
    // HELPER: Normalisasi Tags
    // -----------------------------------------
    /**
     * Normalisasi tags menjadi array lowercase unik
     */
    const normalizeTags = (tags) => {
        if (!Array.isArray(tags)) return [];
        return [...new Set(
            tags
                .map(t => String(t || "").trim().toLowerCase())
                .filter(Boolean)
        )];
    };

    // -----------------------------------------
    // HELPER: Add to Tag Index
    // -----------------------------------------
    /**
     * Tambah plugin ke index berdasarkan tag
     */
    const addToTagIndex = (tag, plugin) => {
        const key = String(tag || "").trim().toLowerCase();
        if (!key) return;
        if (!pluginsByTag.has(key)) pluginsByTag.set(key, []);
        pluginsByTag.get(key).push(plugin);
    };

    // -----------------------------------------
    // CHECK FOLDER EXISTS
    // -----------------------------------------
    if (!fs.existsSync(dir)) {
        console.warn("Folder 'Plugins-CJS' tidak ditemukan.");
        plugins.byTag = pluginsByTag;
        return plugins;
    }

    // -----------------------------------------
    // LOAD PLUGIN FILES
    // -----------------------------------------
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        // Skip non-js files
        if (!filePath.endsWith(".js")) continue;

        try {
            const resolved = require.resolve(filePath);
            // Clear cache untuk hot reload
            if (require.cache[resolved]) {
                delete require.cache[resolved];
            }
            // Load plugin
            const plugin = require(filePath);
            // Validasi plugin (harus function dengan array command)
            if (typeof plugin === "function" && Array.isArray(plugin.command)) {
                const tags = normalizeTags(plugin.tags);
                // Simpan metadata aman
                plugin.tags = tags;
                plugin.help = Array.isArray(plugin.help) ? plugin.help : [];
                plugin._file = file;
                plugin._path = filePath;
                plugin._category = tags[0] || "uncategorized";
                // Tambah ke array plugins
                plugins.push(plugin);
                // Index berdasarkan tag kategori
                if (tags.length) {
                    tags.forEach(tag => addToTagIndex(tag, plugin));
                } else {
                    addToTagIndex("uncategorized", plugin);
                }
            } else {
                console.warn(`Plugin '${file}' tidak valid`);
            }
        } catch (err) {
            console.error(`❌ Gagal load plugin: ${file}`, err);
        }
    }

    // -----------------------------------------
    // ATTACH INDEX TO ARRAY
    // -----------------------------------------
    // Tempel index ke array biar tetap backward-compatible
    plugins.byTag = pluginsByTag;
    plugins.getByTag = (tag) => pluginsByTag.get(String(tag || "").toLowerCase()) || [];
    plugins.tags = [...pluginsByTag.keys()];

    return plugins;
};

// =========================================
// 📌 FEATURE HANDLERS
// =========================================

/**
 * =========================================
 * 📌 FUNCTION: handleMessage (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Handler utama untuk memproses pesan dan mengeksekusi plugins
 * dengan support reply mode dan UI engine
 *
 * Parameter:
 * - m → Message object dari WhatsApp
 * - commandText → Command yang dijalankan user
 * - Obj → Object berisi conn dan utilities lainnya
 *
 * Digunakan oleh:
 * - WhosTANG.js untuk handle commands
 *
 * ⚠️ NOTE:
 * Jangan ubah isi function ini
 * =========================================
 */
const handleMessage = async (m, commandText, Obj = {}) => {

    // =========================================
    // SAFE OBJECT INITIALIZATION
    // =========================================
    // Pastikan Obj adalah object valid
    if (!Obj || typeof Obj !== "object") Obj = {};
    // Set conn dari Obj atau global
    Obj.conn = Obj.conn || global.conn || m?.conn;
    // Error jika conn tidak ada
    if (!Obj.conn) {
        console.error("❌ conn tidak ditemukan!");
        return;
    }

    // =========================================
    // LOAD PLUGINS (CACHE FIX)
    // =========================================
    // Load plugins dari cache jika tersedia
    if (!pluginsCache) {
        pluginsCache = await loadPlugins();
        console.log("✅ Plugins loaded:", pluginsCache.length);
        console.log("📦 Tags:", pluginsCache.tags);
    }
    // Inject plugins ke Obj dan global
    Obj.plugins = pluginsCache;
    global.plugins = pluginsCache;

    // =========================================
    // REPLY MODE HELPER
    // =========================================

    // -----------------------------------------
    // Get User's Reply Mode
    // -----------------------------------------
    /**
     * Ambil mode reply user dari database
     */
    const getUserMode = (userId) => {
        const userData = getUserReplyMode(userId);
        return userData?.mode || 'text'; // Default to text if not set
    };

    // -----------------------------------------
    // Smart Reply Function
    // -----------------------------------------
    /**
     * Smart Reply - Reply sesuai mode user (button atau text)
     * @param {string} text - Text to send
     * @param {object} options - Options for reply
     */
    const smartReply = async (text, options = {}) => {
        const userMode = getUserMode(m.sender);
        
        // Mode button dengan externalAdReply
        if (userMode === 'button' && !options.forceText) {
            try {
                return await Obj.conn.sendMessage(m.chat, {
                    text: text,
                    mentions: options.mentions || [],
                    contextInfo: {
                        mentionedJid: options.mentions || [],
                        externalAdReply: {
                            title: options.title || global.botname || "NHE BOT",
                            body: options.body || "Verified System",
                            thumbnailUrl: options.thumbnailUrl || "https://files.catbox.moe/5x2b8n.jpg",
                            sourceUrl: options.sourceUrl || "https://wa.me/62881027174423",
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: options.quoted || m });
            } catch (err) {
                // Fallback to text if button fails
                console.error('❌ Button reply failed, falling back to text:', err);
            }
        }
        
        // Text mode (default)
        return await Obj.conn.sendMessage(m.chat, {
            text: text,
            mentions: options.mentions || []
        }, { quoted: options.quoted || m });
    };

    // Add smartReply to Obj for plugins to use
    Obj.smartReply = smartReply;
    Obj.getUserMode = getUserMode;

    // =========================================
    // FAKE QUOTED WRAPPER
    // =========================================
    /**
     * Wrapper untuk fake quoted dengan validasi tipe
     */
    Obj.q = (type = 'fkontak', opt = {}) => {
        const allowed = [
            'fkontak','fgif','fimg','fdoc',
            'fvn','ftext','floc','forder','fproduct'
        ];
        if (!allowed.includes(type)) type = 'fkontak';
        return global.q(m, type, opt);
    };

    // Fake quoted helper
    Obj.fakeQuoted = (opt = {}) => global.fakeQuoted(m, opt);

    // =========================================
    // UI ENGINE
    // =========================================
    /**
     * UI Engine untuk mengirim pesan dengan berbagai style
     */
    Obj.sendUI = async (text, opt = {}) => {
        // Default options
        const {
            type = 'fkontak',
            title = global.botname || "NHE BOT",
            body = "Verified System",
            thumbnailUrl = "https://files.catbox.moe/6n4pkg.jpg",
            sourceUrl = "https://wa.me/62881027174423",
            showAd = true,
            read = true,
            typing = true,
            delay = 600
        } = opt;

        try {
            // Read message jika diminta
            if (read && m.key) {
                try { await Obj.conn.readMessages([m.key]); } catch {}
            }
            // Send typing indicator
            if (typing) {
                try { await Obj.conn.sendPresenceUpdate('composing', m.chat); } catch {}
                await new Promise(r => setTimeout(r, delay));
            }
            // Build message
            const msg = {
                text,
                contextInfo: showAd ? {
                    externalAdReply: {
                        title,
                        body,
                        mediaType: 1,
                        previewType: 0,
                        renderLargerThumbnail: true,
                        thumbnailUrl,
                        sourceUrl
                    }
                } : {}
            };
            // Send message
            return await Obj.conn.sendMessage(m.chat, msg, {
                quoted: Obj.q(type)
            });
        } catch (err) {
            console.error("❌ UI Engine Error:", err);
            // Fallback error message
            return Obj.conn.sendMessage(m.chat, {
                text: "⚠️ UI gagal\n" + (err.message || "")
            }, {
                quoted: Obj.q('fkontak')
            });
        }
    };

    // =========================================
    // UI PRESETS
    // =========================================
    Obj.ui = {
        // -----------------------------------------
        // System UI
        // -----------------------------------------
        system: async (text, opt = {}) => {
            return Obj.conn.sendMessage(m.chat, {
                text,
                contextInfo: {
                    externalAdReply: {
                        title: opt.title || "NHE SYSTEM ✔️",
                        body: opt.body || "System Notification",
                        thumbnailUrl: opt.thumb || "https://files.catbox.moe/5x2b8n.jpg",
                        sourceUrl: opt.url || "https://example.com",
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: Obj.q('fkontak') });
        },

        // -----------------------------------------
        // Broadcast UI
        // -----------------------------------------
        broadcast: async (text) => {
            return Obj.conn.sendMessage(m.chat, { text }, {
                quoted: {
                    key: {
                        participant: "0@s.whatsapp.net",
                        remoteJid: "status@broadcast",
                        fromMe: false
                    },
                    message: { conversation: "Broadcast Message" }
                }
            });
        },

        // -----------------------------------------
        // Forwarded UI
        // -----------------------------------------
        forwarded: async (text) => {
            return Obj.conn.sendMessage(m.chat, {
                text,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true
                }
            }, { quoted: Obj.q('ftext') });
        },

        // -----------------------------------------
        // AI UI
        // -----------------------------------------
        ai: async (text) => {
            return Obj.sendUI(text, {
                title: "NHE AI ✔️",
                body: "Smart Assistant",
                type: "ftext"
            });
        },

        // -----------------------------------------
        // Alert UI
        // -----------------------------------------
        alert: async (text) => {
            return Obj.conn.sendMessage(m.chat, {
                text: `⚠️ ${text}`,
                contextInfo: {
                    externalAdReply: {
                        title: "SYSTEM ALERT ⚠️",
                        body: "Warning",
                        thumbnailUrl: "https://files.catbox.moe/5x2b8n.jpg",
                        sourceUrl: "https://example.com",
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: Obj.q('fkontak') });
        },

        // -----------------------------------------
        // Tag UI
        // -----------------------------------------
        tag: async (text) => {
            return Obj.conn.sendMessage(m.chat, {
                text: `@${m.sender.split("@")[0]} ${text}`,
                mentions: [m.sender]
            }, { quoted: Obj.q('fkontak') });
        },

        // -----------------------------------------
        // Random UI
        // -----------------------------------------
        random: async (text) => {
            const modes = ['system', 'forwarded', 'ai'];
            const pick = modes[Math.floor(Math.random() * modes.length)];
            return Obj.ui[pick](text);
        }
    };

    // =========================================
    // PANEL UI
    // =========================================
    /**
     * Panel UI dengan loading animation
     */
    Obj.ui.panel = async (title = "NHE DASHBOARD") => {
        // Send typing indicator
        await Obj.conn.sendPresenceUpdate('composing', m.chat);
        await new Promise(r => setTimeout(r, 600));
        // Loading message
        await Obj.conn.sendMessage(m.chat, {
            text: "```Loading system...```"
        }, { quoted: Obj.q('ftext') });
        await new Promise(r => setTimeout(r, 800));
        // Panel header
        await Obj.conn.sendMessage(m.chat, {
            text: `╭───〔 ${title} 〕───⬣`,
            contextInfo: {
                externalAdReply: {
                    title: "NHE SYSTEM ✔️",
                    body: "Interactive Panel",
                    thumbnailUrl: "https://files.catbox.moe/5x2b8n.jpg",
                    sourceUrl: "https://wa.me/62881027174423",
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: Obj.q('fkontak') });
    };

    // =========================================
    // BUTTON HELPER INJECTION
    // =========================================
    try {
        Obj.button = buildButton(m, Obj);
    } catch (err) {
        console.error("❌ ButtonHelper error:", err);
        Obj.button = {};
    }

    // =========================================
    // LOAD & EXECUTE PLUGIN
    // =========================================
    const plugins = pluginsCache; // 🔥 pakai cache (fix performa)

    // Loop semua plugins untuk mencari command yang cocok
    for (const plugin of plugins) {
        if (
            plugin.command
                .map(c => c.toLowerCase())
                .includes(commandText.toLowerCase())
        ) {
            try {
                // Eksekusi plugin
                await plugin(m, Obj);
            } catch (err) {
                console.error(`❌ Error plugin '${commandText}':`, err);
                // Send error message
                await Obj.conn.sendMessage(m.chat, {
                    text: "❌ Terjadi error saat menjalankan command"
                }, {
                    quoted: Obj.q('fkontak')
                });
            }
            break; // Stop setelah plugin ditemukan dan dieksekusi
        }
    }
};

// =========================================
// 📌 EXPORT / MODULE
// =========================================
module.exports = handleMessage;
