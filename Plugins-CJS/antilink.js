/**
 * Plugin: antilink.js
 * Description: Anti link group protection
 * Command: .antilink
 */

const fs = require('fs');
const path = require('path');

const ANTILINK_PATH = path.join(process.cwd(), './data/antilink.json');

// Initialize antilink data
const initAntiLink = () => {
    try {
        if (!fs.existsSync(path.dirname(ANTILINK_PATH))) {
            fs.mkdirSync(path.dirname(ANTILINK_PATH), { recursive: true });
        }
        if (!fs.existsSync(ANTILINK_PATH)) {
            fs.writeFileSync(ANTILINK_PATH, JSON.stringify({}, null, 2));
        }
    } catch (err) {
        console.error('Error init antilink:', err);
    }
};

const getAntiLinkData = () => {
    try {
        initAntiLink();
        const data = fs.readFileSync(ANTILINK_PATH, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
};

const saveAntiLinkData = (data) => {
    try {
        fs.writeFileSync(ANTILINK_PATH, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error save antilink:', err);
    }
};

const handler = async (m, Obj) => {
    const { conn, q, button, text, isGroup, isAdmins, isBotAdmins, replyAdaptive } = Obj;

    if (!isGroup) {
        return replyAdaptive({
            text: '❌ Fitur ini hanya bisa digunakan di dalam grup!',
            title: "Error",
            body: "Group Only"
        });
    }

    if (!isAdmins) {
        return replyAdaptive({
            text: '❌ Hanya admin grup yang bisa menggunakan fitur ini!',
            title: "Error",
            body: "Admin Only"
        });
    }

    if (!isBotAdmins) {
        return replyAdaptive({
            text: '❌ Bot harus menjadi admin untuk menggunakan fitur ini!',
            title: "Error",
            body: "Bot Admin Required"
        });
    }

    const args = text.trim().toLowerCase();
    const data = getAntiLinkData();
    const groupId = m.chat;

    if (!args || args === 'status') {
        const status = data[groupId]?.enabled ? '✅ AKTIF' : '❌ NONAKTIF';
        const action = data[groupId]?.action || 'delete';
        
        const statusText = `
╭━━━❰ *ANTI LINK* ❱━━━╮
┃
┃ 📊 *Status:* ${status}
┃ 🛡️ *Action:* ${action}
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .antilink on - Aktifkan
┃ .antilink off - Matikan
┃ .antilink delete - Hapus pesan
┃ .antilink kick - Kick pengirim
┃ .antilink warn - Beri peringatan
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("✅ On", ".antilink on"),
            ...button.flow.quickReply("❌ Off", ".antilink off"),
            ...button.flow.quickReply("⚙️ Delete", ".antilink delete"),
            ...button.flow.quickReply("🦵 Kick", ".antilink kick")
        ];

        return replyAdaptive({
            text: statusText,
            buttons: buttons,
            title: "Anti Link Settings",
            body: "Group Protection"
        });
    }

    if (args === 'on') {
        data[groupId] = { ...data[groupId], enabled: true };
        saveAntiLinkData(data);
        return replyAdaptive({
            text: '✅ *Anti Link diaktifkan!*\n\nBot akan menghapus pesan yang mengandung link.',
            title: "Success",
            body: "Anti Link Enabled"
        });
    }

    if (args === 'off') {
        data[groupId] = { ...data[groupId], enabled: false };
        saveAntiLinkData(data);
        return replyAdaptive({
            text: '❌ *Anti Link dimatikan!*',
            title: "Success",
            body: "Anti Link Disabled"
        });
    }

    if (['delete', 'kick', 'warn'].includes(args)) {
        data[groupId] = { ...data[groupId], action: args };
        saveAntiLinkData(data);
        return replyAdaptive({
            text: `✅ *Action diatur ke: ${args.toUpperCase()}*`,
            title: "Success",
            body: "Action Updated"
        });
    }

    return replyAdaptive({
        text: '❌ Opsi tidak valid!\n\nGunakan: on/off/delete/kick/warn',
        title: "Error",
        body: "Invalid Option"
    });
};

handler.command = ['antilink', 'antilinkgc'];
handler.tags = ['group'];
handler.help = ['antilink <on/off/delete/kick/warn>'];

module.exports = handler;
