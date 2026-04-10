/**
 * Plugin: asmaulhusna.js
 * Description: Menampilkan 99 Nama Allah (Asmaul Husna)
 * Command: .asmaulhusna
 */

const asmaulHusnaData = [
    { index: 1, arab: 'الرَّحْمَنُ', latin: 'Ar Rahman', arti: 'Yang Maha Pengasih' },
    { index: 2, arab: 'الرَّحِيمُ', latin: 'Ar Rahiim', arti: 'Yang Maha Penyayang' },
    { index: 3, arab: 'الْمَلِكُ', latin: 'Al Malik', arti: 'Yang Maha Merajai' },
    { index: 4, arab: 'الْقُدُّوسُ', latin: 'Al Quddus', arti: 'Yang Maha Suci' },
    { index: 5, arab: 'السَّلاَمُ', latin: 'As Salaam', arti: 'Yang Maha Memberi Kesejahteraan' },
    { index: 6, arab: 'الْمُؤْمِنُ', latin: 'Al Mu\'min', arti: 'Yang Maha Memberi Keamanan' },
    { index: 7, arab: 'الْمُهَيْمِنُ', latin: 'Al Muhaimin', arti: 'Yang Maha Mengatur' },
    { index: 8, arab: 'الْعَزِيزُ', latin: 'Al \'Aziiz', arti: 'Yang Maha Perkasa' },
    { index: 9, arab: 'الْجَبَّارُ', latin: 'Al Jabbar', arti: 'Yang Maha Memaksa' },
    { index: 10, arab: 'الْمُتَكَبِّرُ', latin: 'Al Mutakabbir', arti: 'Yang Maha Megah' },
    { index: 11, arab: 'الْخَالِقُ', latin: 'Al Khaaliq', arti: 'Yang Maha Menciptakan' },
    { index: 12, arab: 'الْبَارِئُ', latin: 'Al Baari\'', arti: 'Yang Maha Menjadikan' },
    { index: 13, arab: 'الْمُصَوِّرُ', latin: 'Al Mushawwir', arti: 'Yang Maha Membentuk' },
    { index: 14, arab: 'الْغَفَّارُ', latin: 'Al Ghaffaar', arti: 'Yang Maha Pengampun' },
    { index: 15, arab: 'الْقَهَّارُ', latin: 'Al Qahhaar', arti: 'Yang Maha Menundukkan' },
    { index: 16, arab: 'الْوَهَّابُ', latin: 'Al Wahhaab', arti: 'Yang Maha Pemberi Karunia' },
    { index: 17, arab: 'الرَّزَّاقُ', latin: 'Ar Razzaaq', arti: 'Yang Maha Pemberi Rezeki' },
    { index: 18, arab: 'الْفَتَّاحُ', latin: 'Al Fattaah', arti: 'Yang Maha Pembuka' },
    { index: 19, arab: 'اَلْعَلِيمُ', latin: 'Al \'Aliim', arti: 'Yang Maha Mengetahui' },
    { index: 20, arab: 'الْقَابِضُ', latin: 'Al Qaabidh', arti: 'Yang Maha Menyempitkan' },
    { index: 21, arab: 'الْبَاسِطُ', latin: 'Al Baasith', arti: 'Yang Maha Melapangkan' },
    { index: 22, arab: 'الْخَافِضُ', latin: 'Al Khaafidh', arti: 'Yang Maha Merendahkan' },
    { index: 23, arab: 'الرَّافِعُ', latin: 'Ar Raafi\'', arti: 'Yang Maha Meninggikan' },
    { index: 24, arab: 'الْمُعِزُّ', latin: 'Al Mu\'izz', arti: 'Yang Maha Memuliakan' },
    { index: 25, arab: 'المُذِلُّ', latin: 'Al Mudzil', arti: 'Yang Maha Menghinakan' },
    { index: 26, arab: 'السَّمِيعُ', latin: 'As Samii\'', arti: 'Yang Maha Mendengar' },
    { index: 27, arab: 'الْبَصِيرُ', latin: 'Al Bashiir', arti: 'Yang Maha Melihat' },
    { index: 28, arab: 'الْحَكَمُ', latin: 'Al Hakam', arti: 'Yang Maha Menetapkan' },
    { index: 29, arab: 'الْعَدْلُ', latin: 'Al \'Adl', arti: 'Yang Maha Adil' },
    { index: 30, arab: 'اللَّطِيفُ', latin: 'Al Lathiif', arti: 'Yang Maha Lembut' },
    { index: 31, arab: 'الْخَبِيرُ', latin: 'Al Khabiir', arti: 'Yang Maha Mengenal' },
    { index: 32, arab: 'الْحَلِيمُ', latin: 'Al Haliim', arti: 'Yang Maha Penyantun' },
    { index: 33, arab: 'الْعَظِيمُ', latin: 'Al \'Azhiim', arti: 'Yang Maha Agung' },
    { index: 34, arab: 'الْغَفُورُ', latin: 'Al Ghafuur', arti: 'Yang Maha Pengampun' },
    { index: 35, arab: 'الشَّكُورُ', latin: 'As Syakuur', arti: 'Yang Maha Penerima Syukur' },
    { index: 36, arab: 'الْعَلِيُّ', latin: 'Al \'Aliy', arti: 'Yang Maha Tinggi' },
    { index: 37, arab: 'الْكَبِيرُ', latin: 'Al Kabiir', arti: 'Yang Maha Besar' },
    { index: 38, arab: 'الْحَفِيظُ', latin: 'Al Hafizh', arti: 'Yang Maha Memelihara' },
    { index: 39, arab: 'الْمُقِيتُ', latin: 'Al Muqiit', arti: 'Yang Maha Pemberi Kecukupan' },
    { index: 40, arab: 'الْحَسِيبُ', latin: 'Al Hasiib', arti: 'Yang Maha Membuat Perhitungan' },
    { index: 41, arab: 'الْجَلِيلُ', latin: 'Al Jaliil', arti: 'Yang Maha Mulia' },
    { index: 42, arab: 'الْكَرِيمُ', latin: 'Al Kariim', arti: 'Yang Maha Pemurah' },
    { index: 43, arab: 'الرَّقِيبُ', latin: 'Ar Raqiib', arti: 'Yang Maha Mengawasi' },
    { index: 44, arab: 'الْمُجِيبُ', latin: 'Al Mujiib', arti: 'Yang Maha Mengabulkan' },
    { index: 45, arab: 'الْوَاسِعُ', latin: 'Al Waasi\'', arti: 'Yang Maha Luas' },
    { index: 46, arab: 'الْحَكِيمُ', latin: 'Al Hakiim', arti: 'Yang Maha Bijaksana' },
    { index: 47, arab: 'الْوَدُودُ', latin: 'Al Waduud', arti: 'Yang Maha Mengasihi' },
    { index: 48, arab: 'الْمَجِيدُ', latin: 'Al Majiid', arti: 'Yang Maha Mulia' },
    { index: 49, arab: 'الْبَاعِثُ', latin: 'Al Baa\'its', arti: 'Yang Maha Membangkitkan' },
    { index: 50, arab: 'الشَّهِيدُ', latin: 'As Syahiid', arti: 'Yang Maha Menyaksikan' },
    { index: 51, arab: 'الْحَقُّ', latin: 'Al Haqq', arti: 'Yang Maha Benar' },
    { index: 52, arab: 'الْوَكِيلُ', latin: 'Al Wakiil', arti: 'Yang Maha Memelihara' },
    { index: 53, arab: 'الْقَوِيُّ', latin: 'Al Qawiyyu', arti: 'Yang Maha Kuat' },
    { index: 54, arab: 'الْمَتِينُ', latin: 'Al Matiin', arti: 'Yang Maha Kokoh' },
    { index: 55, arab: 'الْوَلِيُّ', latin: 'Al Waliyy', arti: 'Yang Maha Melindungi' },
    { index: 56, arab: 'الْحَمِيدُ', latin: 'Al Hamiid', arti: 'Yang Maha Terpuji' },
    { index: 57, arab: 'الْمُحْصِي', latin: 'Al Muhsii', arti: 'Yang Maha Menghitung' },
    { index: 58, arab: 'الْمُبْدِئُ', latin: 'Al Mubdi\'', arti: 'Yang Maha Memulai' },
    { index: 59, arab: 'الْمُعِيدُ', latin: 'Al Mu\'iid', arti: 'Yang Maha Mengembalikan' },
    { index: 60, arab: 'الْمُحْيِي', latin: 'Al Muhyii', arti: 'Yang Maha Menghidupkan' },
    { index: 61, arab: 'الْمُمِيتُ', latin: 'Al Mumiitu', arti: 'Yang Maha Mematikan' },
    { index: 62, arab: 'الْحَيُّ', latin: 'Al Hayyu', arti: 'Yang Maha Hidup' },
    { index: 63, arab: 'الْقَيُّومُ', latin: 'Al Qayyuum', arti: 'Yang Maha Mandiri' },
    { index: 64, arab: 'الْوَاجِدُ', latin: 'Al Waajid', arti: 'Yang Maha Penemu' },
    { index: 65, arab: 'الْمَاجِدُ', latin: 'Al Maajid', arti: 'Yang Maha Mulia' },
    { index: 66, arab: 'الْوَاحِدُ', latin: 'Al Waahid', arti: 'Yang Maha Esa' },
    { index: 67, arab: 'الصَّمَدُ', latin: 'As Shomad', arti: 'Yang Maha Dibutuhkan' },
    { index: 68, arab: 'الْقَادِرُ', latin: 'Al Qaadir', arti: 'Yang Maha Menentukan' },
    { index: 69, arab: 'الْمُقْتَدِرُ', latin: 'Al Muqtadir', arti: 'Yang Maha Berkuasa' },
    { index: 70, arab: 'الْمُقَدِّمُ', latin: 'Al Muqaddim', arti: 'Yang Maha Mendahulukan' },
    { index: 71, arab: 'الْمُؤَخِّرُ', latin: 'Al Mu\'akhir', arti: 'Yang Maha Mengakhirkan' },
    { index: 72, arab: 'الأوَّلُ', latin: 'Al Awwal', arti: 'Yang Maha Awal' },
    { index: 73, arab: 'الآخِرُ', latin: 'Al Aakhir', arti: 'Yang Maha Akhir' },
    { index: 74, arab: 'الظَّاهِرُ', latin: 'Azh Zhaahir', arti: 'Yang Maha Nyata' },
    { index: 75, arab: 'الْبَاطِنُ', latin: 'Al Baathin', arti: 'Yang Maha Ghaib' },
    { index: 76, arab: 'الْوَالِي', latin: 'Al Waali', arti: 'Yang Maha Memerintah' },
    { index: 77, arab: 'الْمُتَعَالِي', latin: 'Al Muta\'aalii', arti: 'Yang Maha Tinggi' },
    { index: 78, arab: 'الْبَرُّ', latin: 'Al Barru', arti: 'Yang Maha Dermawan' },
    { index: 79, arab: 'التَّوَّابُ', latin: 'At Tawwaab', arti: 'Yang Maha Penerima Tobat' },
    { index: 80, arab: 'الْمُنْتَقِمُ', latin: 'Al Muntaqim', arti: 'Yang Maha Penuntut Balas' },
    { index: 81, arab: 'العَفُوُّ', latin: 'Al Afuww', arti: 'Yang Maha Pemaaf' },
    { index: 82, arab: 'الرَّؤُوفُ', latin: 'Ar Ra\'uuf', arti: 'Yang Maha Pengasih' },
    { index: 83, arab: 'مَالِكُ الْمُلْكِ', latin: 'Malikul Mulk', arti: 'Yang Maha Merajai' },
    { index: 84, arab: 'ذُوالْجَلاَلِ وَالإكْرَامِ', latin: 'Dzul Jalaali Wal Ikraam', arti: 'Yang Maha Mulia dan Maha Pemurah' },
    { index: 85, arab: 'الْمُقْسِطُ', latin: 'Al Muqsith', arti: 'Yang Maha Adil' },
    { index: 86, arab: 'الْجَامِعُ', latin: 'Al Jaami\'', arti: 'Yang Maha Mengumpulkan' },
    { index: 87, arab: 'الْغَنِيُّ', latin: 'Al Ghaniyy', arti: 'Yang Maha Kaya' },
    { index: 88, arab: 'الْمُغْنِي', latin: 'Al Mughnii', arti: 'Yang Maha Memberi Kekayaan' },
    { index: 89, arab: 'اَلْمَانِعُ', latin: 'Al Maani\'', arti: 'Yang Maha Mencegah' },
    { index: 90, arab: 'الضَّارَّ', latin: 'Ad Dhaar', arti: 'Yang Maha Memberi Mudarat' },
    { index: 91, arab: 'النَّافِعُ', latin: 'An Nafii\'', arti: 'Yang Maha Memberi Manfaat' },
    { index: 92, arab: 'النُّورُ', latin: 'An Nuur', arti: 'Yang Maha Bercahaya' },
    { index: 93, arab: 'الْهَادِي', latin: 'Al Haadii', arti: 'Yang Maha Memberi Petunjuk' },
    { index: 94, arab: 'الْبَدِيعُ', latin: 'Al Badii\'', arti: 'Yang Maha Pencipta' },
    { index: 95, arab: 'الْبَاقِي', latin: 'Al Baaqii', arti: 'Yang Maha Kekal' },
    { index: 96, arab: 'الْوَارِثُ', latin: 'Al Waarits', arti: 'Yang Maha Pewaris' },
    { index: 97, arab: 'الرَّشِيدُ', latin: 'Ar Rashiid', arti: 'Yang Maha Pandai' },
    { index: 98, arab: 'الصَّبُورُ', latin: 'As Shabuur', arti: 'Yang Maha Sabar' }
];

const handler = async (m, Obj) => {
    const { button, text, replyAdaptive } = Obj;
    
    const args = text.trim();
    
    // Jika ada nomor spesifik
    if (args && !isNaN(args)) {
        const nomor = parseInt(args);
        if (nomor < 1 || nomor > 99) {
            return replyAdaptive({
                text: '❌ Masukkan nomor antara 1-99!',
                title: "Error",
                body: "Invalid Number"
            });
        }
        
        const data = asmaulHusnaData.find(a => a.index === nomor);
        if (data) {
            const detailText = `
╭━━━❰ *ASMAUL HUSNA* ❱━━━╮
┃
┃ *Nomor:* ${data.index}
┃
┃ ${data.arab}
┃
┃ *${data.latin}*
┃
┃ Arti: ${data.arti}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

            const buttons = [
                ...button.flow.quickReply("⬅️ Sebelumnya", `.asmaulhusna ${data.index > 1 ? data.index - 1 : 99}`),
                ...button.flow.quickReply("➡️ Selanjutnya", `.asmaulhusna ${data.index < 99 ? data.index + 1 : 1}`),
                ...button.flow.quickReply("📋 Semua", ".asmaulhusna all")
            ];

            return replyAdaptive({
                text: detailText,
                buttons: buttons,
                title: `Asmaul Husna #${data.index}`,
                body: data.latin
            });
        }
    }
    
    // Tampilkan semua
    let allText = `
╭━━━❰ *99 ASMAUL HUSNA* ❱━━━╮
┃
┃ 📖 99 Nama Allah SWT
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

`;
    
    asmaulHusnaData.forEach((data, i) => {
        allText += `${data.index}. ${data.arab} - ${data.latin}\n   → ${data.arti}\n\n`;
        
        // Split into chunks if too long
        if ((i + 1) % 25 === 0 && i !== 0 && i !== asmaulHusnaData.length - 1) {
            allText += `--- Lanjutan ---\n\n`;
        }
    });

    const buttons = [
        ...button.flow.quickReply("🔢 Nomor 1", ".asmaulhusna 1"),
        ...button.flow.quickReply("🔢 Nomor 50", ".asmaulhusna 50"),
        ...button.flow.quickReply("🔢 Nomor 99", ".asmaulhusna 99"),
        ...button.flow.quickReply("📋 Menu", ".menuplug")
    ];

    return replyAdaptive({
        text: allText,
        buttons: buttons,
        title: "99 Asmaul Husna",
        body: "Nama-nama Allah SWT"
    });
};

handler.command = ['asmaulhusna', 'asmaulhusna', '99nama'];
handler.tags = ['islam'];
handler.help = ['asmaulhusna <nomor/all>'];

module.exports = handler;
