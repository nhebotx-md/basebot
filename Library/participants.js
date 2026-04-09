/**
 * =========================================
 * 📌 FILE: participants.js
 * 📌 DESCRIPTION:
 * Handler untuk event group-participants.update
 * Mengelola welcome, goodbye, promote, dan demote
 *
 * Berisi:
 * - Welcome message handler
 * - Goodbye message handler
 * - Promote notification
 * - Demote notification
 * - Avatar fetch dengan fallback
 *
 * ⚠️ CATATAN:
 * DILARANG mengubah nama variabel/function
 * karena berpengaruh ke sistem global
 * =========================================
 */

// =========================================
// 📌 IMPORT / REQUIRE
// =========================================

// Load konfigurasi global
require('../config');

// Import dari Baileys
const { WA_DEFAULT_EPHEMERAL } = require('@itsukichan/baileys').default;

// =========================================
// 📌 CORE LOGIC / MAIN FUNCTIONS
// =========================================

/**
 * =========================================
 * 📌 FUNCTION: GroupParticipants (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Handler utama untuk event group-participants.update
 * Mengirim pesan sesuai action (add, remove, promote, demote)
 *
 * Parameter:
 * - conn → WhatsApp connection instance
 * - id → Group JID
 * - participants → Array JID participants yang terkena action
 * - action → Tipe action ('add', 'remove', 'promote', 'demote')
 * - author → JID user yang melakukan action (untuk promote/demote)
 *
 * Digunakan oleh:
 * - main.js untuk handle group-participants.update event
 *
 * ⚠️ NOTE:
 * Jangan ubah isi function ini
 * =========================================
 */
async function GroupParticipants(conn, { id, participants, action, author }) {
    try {
        // =========================================
        // GET GROUP METADATA
        // =========================================
        const meta = await conn.groupMetadata(id);
        const subject = meta.subject;
        const totalMember = meta.participants.length;

        // =========================================
        // PROCESS EACH PARTICIPANT
        // =========================================
        for (let jid of participants) {
            
            // -----------------------------------------
            // FETCH USER AVATAR
            // -----------------------------------------
            // Ambil avatar user, fallback ke global.thumb jika gagal
            let avatar;
            try {
                avatar = await conn.profilePictureUrl(jid, 'image');
            } catch {
                avatar = global.thumb;
            }

            // -----------------------------------------
            // CALCULATE MEMBER COUNT
            // -----------------------------------------
            // Hitung sisa member setelah action
            let sisaMember = action === "remove" ? totalMember - 1 : totalMember;

            // -----------------------------------------
            // BUILD EXTERNAL AD REPLY
            // -----------------------------------------
            // External Ad Reply dengan avatar user
            const external = {
                title: subject,
                body: `👥 Member: ${sisaMember}`,
                thumbnailUrl: avatar,
                mediaType: 1,
                renderLargerThumbnail: true
            };

            // =========================================
            // 📌 FEATURE HANDLERS - SWITCH ACTION
            // =========================================
            switch (action) {

                // -----------------------------------------
                // WELCOME HANDLER
                // -----------------------------------------
                case "add":
                    // Skip jika welcome disabled
                    if (!global.welcome) return;
                    await conn.sendMessage(id, {
                        text: `👋 Selamat datang @${jid.split("@")[0]} di *${subject}*\n\n👥 Total member: ${sisaMember}`,
                        contextInfo: {
                            mentionedJid: [jid],
                            externalAdReply: external
                        }
                    }, { ephemeralExpiration: WA_DEFAULT_EPHEMERAL });
                    break;

                // -----------------------------------------
                // GOODBYE HANDLER
                // -----------------------------------------
                case "remove":
                    // Skip jika goodbye disabled
                    if (!global.goodbye) return;
                    await conn.sendMessage(id, {
                        text: `👋 Selamat tinggal @${jid.split("@")[0]}\n👥 Sisa member: ${sisaMember}`,
                        contextInfo: {
                            mentionedJid: [jid],
                            externalAdReply: external
                        }
                    }, { ephemeralExpiration: WA_DEFAULT_EPHEMERAL });
                    break;

                // -----------------------------------------
                // PROMOTE HANDLER
                // -----------------------------------------
                case "promote":
                    // Skip jika tidak ada author
                    if (!author) return;
                    await conn.sendMessage(id, {
                        text: `👑 @${author.split("@")[0]} promote @${jid.split("@")[0]} jadi admin`,
                        contextInfo: { mentionedJid: [author, jid] }
                    });
                    break;

                // -----------------------------------------
                // DEMOTE HANDLER
                // -----------------------------------------
                case "demote":
                    // Skip jika tidak ada author
                    if (!author) return;
                    await conn.sendMessage(id, {
                        text: `🚫 @${author.split("@")[0]} demote @${jid.split("@")[0]}`,
                        contextInfo: { mentionedJid: [author, jid] }
                    });
                    break;
            }
        }

    } catch (e) {
        console.error("GroupParticipants Error:", e);
    }
}

// =========================================
// 📌 EXPORT / MODULE
// =========================================
module.exports = GroupParticipants;
