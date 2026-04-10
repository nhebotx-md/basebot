/**
 * Plugin: antispam.js
 * Description: Anti spam protection untuk grup
 * Command: .antispam
 */

const fs = require('fs');
const path = require('path');

const ANTISPAM_PATH = path.join(process.cwd(), './data/antispam.json');
const spamTracker = new Map();

// Initialize antispam data
const initAntiSpam = () => {
    try {
        if (!fs.existsSync(path.dirname(ANTISPAM_PATH))) {
            fs.mkdirSync(path.dirname(ANTISPAM_PATH), { recursive: true });
        }
        if (!fs.existsSync(ANTISPAM_PATH)) {
            fs.writeFileSync(ANTISPAM_PATH, JSON.stringify({}, null, 2));
        }
    } catch (err) {
        console.error('Error init antispam:', err);
    }
};

const getAntiSpamData = () => {
    try {
        initAntiSpam();
        const data = fs.readFileSync(ANTISPAM_PATH, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
};

const saveAntiSpamData = (data) => {
    try {
        fs.writeFileSync(ANTISPAM_PATH, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error save antispam:', err);
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
    const data = getAntiSpamData();
    const groupId = m.chat;

    if (!args || args === 'status') {
        const status = data[groupId]?.enabled ? '✅ AKTIF' : '❌ NONAKTIF';
        const maxMsg = data[groupId]?.maxMsg || 5;
        const timeWindow = data[groupId]?.timeWindow || 10;
        
        const statusText = `
╭━━━❰ *ANTI SPAM* ❱━━━╮
┃
┃ 📊 *Status:* ${status}
┃ 📩 *Max Message:* ${maxMsg} pesan
┃ ⏱️ *Time Window:* ${timeWindow} detik
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .antispam on - Aktifkan
┃ .antispam off - Matikan
┃ .antispam max <angka> - Set max pesan
┃ .antispam time <detik> - Set waktu
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("✅ On", ".antispam on"),
            ...button.flow.quickReply("❌ Off", ".antispam off"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: statusText,
            buttons: buttons,
            title: "Anti Spam Settings",
            body: "Group Protection"
        });
    }

    if (args === 'on') {
        data[groupId] = { ...data[groupId], enabled: true, maxMsg: 5, timeWindow: 10 };
        saveAntiSpamData(data);
        return replyAdaptive({
            text: '✅ *Anti Spam diaktifkan!*\n\nBot akan mendeteksi dan menghapus spam.',
            title: "Success",
            body: "Anti Spam Enabled"
        });
    }

    if (args === 'off') {
        data[groupId] = { ...data[groupId], enabled: false };
        saveAntiSpamData(data);
        return replyAdaptive({
            text: '❌ *Anti Spam dimatikan!*',
            title: "Success",
            body: "Anti Spam Disabled"
        });
    }

    if (args.startsWith('max ')) {
        const max = parseInt(args.split(' ')[1]);
        if (isNaN(max) || max < 1 || max > 20) {
            return replyAdaptive({
                text: '❌ Masukkan angka antara 1-20!',
                title: "Error",
                body: "Invalid Number"
            });
        }
        data[groupId] = { ...data[groupId], maxMsg: max };
        saveAntiSpamData(data);
        return replyAdaptive({
            text: `✅ *Max message diatur ke: ${max} pesan*`,
            title: "Success",
            body: "Setting Updated"
        });
    }

    if (args.startsWith('time ')) {
        const time = parseInt(args.split(' ')[1]);
        if (isNaN(time) || time < 5 || time > 60) {
            return replyAdaptive({
                text: '❌ Masukkan angka antara 5-60 detik!',
                title: "Error",
                body: "Invalid Number"
            });
        }
        data[groupId] = { ...data[groupId], timeWindow: time };
        saveAntiSpamData(data);
        return replyAdaptive({
            text: `✅ *Time window diatur ke: ${time} detik*`,
            title: "Success",
            body: "Setting Updated"
        });
    }

    return replyAdaptive({
        text: '❌ Opsi tidak valid!\n\nGunakan: on/off/max/time',
        title: "Error",
        body: "Invalid Option"
    });
};

handler.command = ['antispam', 'antispamgc'];
handler.tags = ['group'];
handler.help = ['antispam <on/off/max/time>'];

module.exports = handler;
