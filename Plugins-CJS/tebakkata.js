/**
 * Plugin: tebakkata.js
 * Description: Game tebak kata
 * Command: .tebakkata, .tebak
 */

const axios = require('axios');

// Store active games
const activeGames = new Map();

const kataList = [
    { kata: 'JAVASCRIPT', hint: 'Bahasa pemrograman untuk web' },
    { kata: 'WHATSAPP', hint: 'Aplikasi chat populer' },
    { kata: 'BAILEYS', hint: 'Library WhatsApp untuk Node.js' },
    { kata: 'JAKARTA', hint: 'Ibukota Indonesia' },
    { kata: 'INDONESIA', hint: 'Negara dengan ribuan pulau' },
    { kata: 'PROGRAMMER', hint: 'Orang yang menulis kode' },
    { kata: 'KOMPUTER', hint: 'Alat elektronik untuk komputasi' },
    { kata: 'INTERNET', hint: 'Jaringan global yang menghubungkan komputer' },
    { kata: 'DATABASE', hint: 'Tempat menyimpan data' },
    { kata: 'FRAMEWORK', hint: 'Kerja kerja untuk membangun aplikasi' },
    { kata: 'API', hint: 'Antarmuka untuk berkomunikasi antar aplikasi' },
    { kata: 'SERVER', hint: 'Komputer yang menyediakan layanan' },
    { kata: 'BROWSER', hint: 'Aplikasi untuk browsing web' },
    { kata: 'ANDROID', hint: 'Sistem operasi mobile dari Google' },
    { kata: 'LINUX', hint: 'Sistem operasi open source' }
];

const handler = async (m, Obj) => {
    const { conn, q, button, text, isGroup, replyAdaptive } = Obj;

    const chatId = m.chat;
    const userId = m.sender;

    // Check if there's an active game
    if (activeGames.has(chatId)) {
        const game = activeGames.get(chatId);
        const guess = text.toUpperCase().trim();

        if (guess === game.kata) {
            activeGames.delete(chatId);
            
            const winText = `
╭━━━❰ *TEBAK KATA* ❱━━━╮
┃
┃ 🎉 *SELAMAT!*
┃
┃ ✅ Jawaban benar: *${game.kata}*
┃ 👤 Pemenang: @${userId.split('@')[0]}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

            const buttons = [
                ...button.flow.quickReply("🔄 Main Lagi", ".tebakkata"),
                ...button.flow.quickReply("📋 Menu", ".menuplug")
            ];

            return replyAdaptive({
                text: winText,
                buttons: buttons,
                mentions: [userId],
                title: "Tebak Kata",
                body: "Correct Answer!"
            });
        } else {
            game.attempts++;
            
            const wrongText = `
╭━━━❰ *TEBAK KATA* ❱━━━╮
┃
┃ ❌ *Salah!*
┃
┃ 💡 Hint: ${game.hint}
┃ 📝 Kata: ${game.display}
┃ ❓ Percobaan: ${game.attempts}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

            const buttons = [
                ...button.flow.quickReply("🚫 Menyerah", ".tebakmenyerah"),
                ...button.flow.quickReply("📋 Menu", ".menuplug")
            ];

            return replyAdaptive({
                text: wrongText,
                buttons: buttons,
                title: "Tebak Kata",
                body: "Wrong Answer!"
            });
        }
    }

    // Start new game
    const randomKata = kataList[Math.floor(Math.random() * kataList.length)];
    const display = randomKata.kata.replace(/[AIUEO]/gi, '_');

    activeGames.set(chatId, {
        kata: randomKata.kata,
        hint: randomKata.hint,
        display: display,
        attempts: 0,
        startTime: Date.now()
    });

    const startText = `
╭━━━❰ *TEBAK KATA* ❱━━━╮
┃
┃ 🎮 *Game Dimulai!*
┃
┃ 💡 Hint: ${randomKata.hint}
┃ 📝 Kata: ${display}
┃
┃ *Cara main:*
┃ Ketik jawabanmu langsung!
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

    const buttons = [
        ...button.flow.quickReply("🚫 Menyerah", ".tebakmenyerah"),
        ...button.flow.quickReply("📋 Menu", ".menuplug")
    ];

    return replyAdaptive({
        text: startText,
        buttons: buttons,
        title: "Tebak Kata",
        body: "Game Started!"
    });
};

// Surrender command
handler.surrender = async (m, Obj) => {
    const { button, replyAdaptive } = Obj;
    const chatId = m.chat;

    if (activeGames.has(chatId)) {
        const game = activeGames.get(chatId);
        activeGames.delete(chatId);

        return replyAdaptive({
            text: `
╭━━━❰ *TEBAK KATA* ❱━━━╮
┃
┃ 🚫 *Menyerah!*
┃
┃ ✅ Jawaban: *${game.kata}*
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
            buttons: [
                ...button.flow.quickReply("🔄 Main Lagi", ".tebakkata"),
                ...button.flow.quickReply("📋 Menu", ".menuplug")
            ],
            title: "Tebak Kata",
            body: "Game Over"
        });
    }

    return replyAdaptive({
        text: '❌ Tidak ada game yang sedang berjalan!',
        title: "Error",
        body: "No Active Game"
    });
};

handler.command = ['tebakkata', 'tebak'];
handler.tags = ['game'];
handler.help = ['tebakkata'];

module.exports = handler;
