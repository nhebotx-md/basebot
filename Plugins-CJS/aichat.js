/**
 * Plugin: aichat.js
 * Description: Chat dengan AI GPT
 * Command: .ai, .aichat
 */

const axios = require('axios');

// Store conversation history
const conversations = new Map();

const handler = async (m, Obj) => {
    const { conn, q, button, text, sender, replyAdaptive } = Obj;

    if (!text) {
        const helpText = `
╭━━━❰ *AI CHAT* ❱━━━╮
┃
┃ 🤖 Chat dengan AI Assistant
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .ai Pertanyaan
┃ .aichat Halo AI
┃
┃ *Contoh:*
┃ .ai Apa itu JavaScript?
┃ .ai Ceritakan dongeng
┃ .ai Bantu saya coding
┃
┃ 💡 *Fitur:*
┃ • Natural conversation
┃ • Coding assistant
┃ • General knowledge
┃ • Creative writing
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("💡 Apa itu AI?", ".ai Apa itu Artificial Intelligence?"),
            ...button.flow.quickReply("🎨 AI Image", ".aimage cat in space"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: helpText,
            buttons: buttons,
            title: "AI Chat",
            body: "Chat dengan AI Assistant"
        });
    }

    try {
        await conn.sendMessage(m.chat, {
            text: "🤖 AI sedang berpikir..."
        }, { quoted: q('fkontak') });

        // Get or create conversation history
        const userId = sender;
        if (!conversations.has(userId)) {
            conversations.set(userId, []);
        }
        const history = conversations.get(userId);

        // Add user message to history
        history.push({ role: 'user', content: text });

        // Keep only last 10 messages for context
        if (history.length > 10) {
            history.shift();
        }

        // Call AI API
        const response = await axios.get(`https://api.ryzendesu.vip/api/ai/chatgpt?text=${encodeURIComponent(text)}`, {
            timeout: 30000
        });

        let aiResponse = '';
        if (response.data && response.data.response) {
            aiResponse = response.data.response;
        } else if (response.data && response.data.message) {
            aiResponse = response.data.message;
        } else if (typeof response.data === 'string') {
            aiResponse = response.data;
        } else {
            aiResponse = 'Maaf, saya tidak bisa memproses permintaan Anda saat ini.';
        }

        // Add AI response to history
        history.push({ role: 'assistant', content: aiResponse });

        const resultText = `
╭━━━❰ *AI RESPONSE* ❱━━━╮
┃
┃ 🤖 *Pertanyaan:*
┃ ${text}
┃
┃ 💬 *Jawaban:*
┃ ${aiResponse}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const resultButtons = [
            ...button.flow.quickReply("🔄 Lanjutkan", ".ai "),
            ...button.flow.quickReply("🗑️ Hapus History", ".aiclear"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: resultText,
            buttons: resultButtons,
            title: "AI Response",
            body: "Powered by GPT"
        });

    } catch (error) {
        console.error('AI Chat Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Gagal terhubung ke AI'}\n\nSilakan coba lagi nanti.`,
            title: "Error",
            body: "AI Service"
        });
    }
};

handler.command = ['ai', 'aichat', 'chatgpt'];
handler.tags = ['ai'];
handler.help = ['ai <pertanyaan>', 'aichat <pertanyaan>'];

module.exports = handler;
