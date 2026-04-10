/**
 * =========================================
 * 📌 FILE: replyAdaptive.js
 * 📌 DESCRIPTION:
 * Abstraction layer untuk sistem dual reply mode
 * Menangani reply sesuai preferensi user (button/text)
 *
 * Berisi:
 * - replyAdaptive function utama
 * - Helper untuk format text dari buttons
 * - Auto-deteksi mode user
 *
 * ⚠️ CATATAN:
 * DILARANG mengubah nama variabel/function
 * karena berpengaruh ke sistem global
 * =========================================
 */

// =========================================
// 📌 IMPORT / REQUIRE
// =========================================
const { getUserReplyMode } = require('./replyMode');

// =========================================
// 📌 HELPER FUNCTIONS
// =========================================

/**
 * =========================================
 * 📌 FUNCTION: formatButtonsToText (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Konversi button array ke format text yang readable
 * untuk mode text reply
 *
 * Parameter:
 * - buttons → Array button dari plugin
 *
 * Return:
 * - String → Formatted text dengan daftar opsi
 * =========================================
 */
const formatButtonsToText = (buttons) => {
    if (!Array.isArray(buttons) || buttons.length === 0) return '';
    
    let textOutput = '\n\n';
    let quickReplies = [];
    let sections = [];
    let ctaItems = [];
    
    buttons.forEach(btn => {
        if (!btn || !btn.name) return;
        
        try {
            const params = JSON.parse(btn.buttonParamsJson || '{}');
            
            switch (btn.name) {
                case 'quick_reply':
                    quickReplies.push(`[ ${params.display_text} ] → Ketik: ${params.id}`);
                    break;
                    
                case 'single_select':
                    if (params.sections && Array.isArray(params.sections)) {
                        params.sections.forEach(section => {
                            if (section.rows && Array.isArray(section.rows)) {
                                textOutput += `\n📁 *${section.title || 'Menu'}*\n`;
                                section.rows.forEach(row => {
                                    sections.push(`  • ${row.title}${row.description ? ` - ${row.description}` : ''} → Ketik: ${row.id}`);
                                });
                            }
                        });
                    }
                    break;
                    
                case 'cta_url':
                    ctaItems.push(`🔗 ${params.display_text}: ${params.url}`);
                    break;
                    
                case 'cta_call':
                    ctaItems.push(`📞 ${params.display_text}: ${params.id}`);
                    break;
            }
        } catch (e) {
            // Skip invalid button
        }
    });
    
    // Build output
    if (quickReplies.length > 0) {
        textOutput += '\n📋 *Pilihan Cepat:*\n' + quickReplies.join('\n') + '\n';
    }
    
    if (sections.length > 0) {
        textOutput += sections.join('\n') + '\n';
    }
    
    if (ctaItems.length > 0) {
        textOutput += '\n📎 *Link & Kontak:*\n' + ctaItems.join('\n') + '\n';
    }
    
    return textOutput;
};

/**
 * =========================================
 * 📌 FUNCTION: getUserMode (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Ambil mode reply user dari database
 * Default ke 'text' jika belum di-set
 *
 * Parameter:
 * - userId → JID user
 *
 * Return:
 * - String → 'button' atau 'text'
 * =========================================
 */
const getUserMode = (userId) => {
    const userData = getUserReplyMode(userId);
    return userData?.mode || 'text';
};

/**
 * =========================================
 * 📌 FUNCTION: replyAdaptive (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Fungsi utama untuk adaptive reply
 * Mengirim pesan sesuai mode user (button atau text)
 *
 * Parameter:
 * - m → Message object
 * - Obj → Object berisi conn, q, button, dll
 * - content → Object berisi text, buttons, options
 *
 * Return:
 * - Promise → Hasil send message
 *
 * Digunakan oleh:
 * - Semua plugin untuk mengirim reply
 *
 * ⚠️ NOTE:
 * Ini adalah core function untuk adaptive reply
 * =========================================
 */
const replyAdaptive = async (m, Obj, content) => {
    const { conn, q, button } = Obj;
    const userMode = getUserMode(m.sender);
    
    // Default options
    const {
        text = '',
        buttons = [],
        title = global.botname || 'NHE BOT',
        body = 'Verified System',
        thumbnailUrl = global.thumbnail || 'https://files.catbox.moe/5x2b8n.jpg',
        sourceUrl = 'https://wa.me/62881027174423',
        footer = '© NHE SYSTEM',
        mentions = [],
        quoted = m,
        forceText = false
    } = content;
    
    // Log untuk debug
    console.log(`[ReplyMode]: ${userMode} | User: ${m.sender.split('@')[0]}`);
    
    // Mode Button
    if (userMode === 'button' && !forceText && buttons.length > 0) {
        try {
            return await button.sendInteractive(text, buttons, {
                title,
                body,
                thumbnailUrl,
                footer
            });
        } catch (err) {
            console.error('❌ Button reply failed, falling back to text:', err.message);
            // Fallback ke text mode
        }
    }
    
    // Mode Text (default atau fallback)
    let textContent = text;
    
    // Tambahkan format button ke text jika ada buttons
    if (buttons.length > 0) {
        textContent += formatButtonsToText(buttons);
    }
    
    // Tambahkan footer
    textContent += `\n\n_${footer}_`;
    
    try {
        return await conn.sendMessage(m.chat, {
            text: textContent,
            mentions: mentions
        }, { quoted });
    } catch (err) {
        console.error('❌ Text reply failed:', err.message);
        // Last resort fallback
        return conn.sendMessage(m.chat, { text: text });
    }
};

/**
 * =========================================
 * 📌 FUNCTION: sendSimpleText (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Kirim simple text tanpa button conversion
 * Untuk pesan yang memang hanya text
 *
 * Parameter:
 * - m → Message object
 * - Obj → Object berisi conn
 * - text → Text content
 * - options → Optional config
 *
 * Return:
 * - Promise → Hasil send message
 * =========================================
 */
const sendSimpleText = async (m, Obj, text, options = {}) => {
    const { conn } = Obj;
    const userMode = getUserMode(m.sender);
    
    console.log(`[ReplyMode]: ${userMode} (simple) | User: ${m.sender.split('@')[0]}`);
    
    const {
        mentions = [],
        quoted = m
    } = options;
    
    try {
        return await conn.sendMessage(m.chat, {
            text,
            mentions
        }, { quoted });
    } catch (err) {
        console.error('❌ Simple text reply failed:', err.message);
        return null;
    }
};

/**
 * =========================================
 * 📌 FUNCTION: sendWithExternalAd (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Kirim pesan dengan externalAdReply (card style)
 * Hanya untuk mode button
 *
 * Parameter:
 * - m → Message object
 * - Obj → Object berisi conn, q
 * - text → Text content
 * - adOptions → ExternalAdReply options
 *
 * Return:
 * - Promise → Hasil send message
 * =========================================
 */
const sendWithExternalAd = async (m, Obj, text, adOptions = {}) => {
    const { conn, q } = Obj;
    const userMode = getUserMode(m.sender);
    
    const {
        title = global.botname || 'NHE BOT',
        body = 'Verified System',
        thumbnailUrl = global.thumbnail || 'https://files.catbox.moe/5x2b8n.jpg',
        sourceUrl = 'https://wa.me/62881027174423',
        quoted = m
    } = adOptions;
    
    // Mode button: kirim dengan externalAdReply
    if (userMode === 'button') {
        try {
            return await conn.sendMessage(m.chat, {
                text,
                contextInfo: {
                    externalAdReply: {
                        title,
                        body,
                        thumbnailUrl,
                        sourceUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted });
        } catch (err) {
            console.error('❌ ExternalAd reply failed:', err.message);
        }
    }
    
    // Mode text atau fallback: kirim plain text
    return sendSimpleText(m, Obj, text, { quoted });
};

// =========================================
// 📌 EXPORT / MODULE
// =========================================
module.exports = {
    replyAdaptive,
    sendSimpleText,
    sendWithExternalAd,
    getUserMode,
    formatButtonsToText
};
