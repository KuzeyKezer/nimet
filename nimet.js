const updateDoc = window.updateDoc; // Diğer window tanımlarının yanına ekle
const db = window.db;
const doc = window.doc;
const getDoc = window.getDoc;
const collection = window.collection; // Eğer hata verirse bunu da ekle
// ÖNEMLİ: Eğer sayfa ilk açıldığında hata verirse diye boş bir kontrol ekliyoruz
if (!db || !getDoc) {
    console.error("Firebase henüz yüklenmedi, lütfen sayfayı yenileyin.");
}

/* ---------------- VERİ YAPILARI ---------------- */
let products = {}; 
let currentIsletmeId = "";
let currentIsletmeAdi = "";
let leftovers = {}; 
let boxes = []; 

const boxMax = {
    small: { gram: 300, hacim: 1000 },
    medium: { gram: 600, hacim: 2000 },
    large: { gram: 1500, hacim: 5000 }
};

const WATER_FOOTPRINT_PER_KG = 3000; 
const CO2_FOOTPRINT_PER_KG = 1.7; 

/* ---------------- YARDIMCI FONKSİYONLAR ---------------- */

function boxLabel(type){
    if(type === "small") return "Küçük Kutu";
    if(type === "medium") return "Orta Kutu";
    return "Büyük Kutu";
}

/* ---------------- RENDER FONKSİYONLARI ---------------- */

function renderProducts(){
    const c = document.getElementById("urunListesi");
    const names = Object.keys(products);
    if(names.length === 0){
        c.innerHTML = '<p class="leftover-empty">Henüz tanımlı ürün yok.</p>';
        return;
    }
    c.innerHTML = names.map(name=>{
        const p = products[name];
        return `
        <div class="urunBox">
            <div>
                <span class="name">${name}</span>
                <div class="muted">${p.gram} g • ${p.hacim} cm³ • ${p.cost.toFixed(2)} TL</div>
            </div>
            <div class="urunBox-actions">
                <button class="btn-mini edit" onclick="urunDuzenle('${name}')">Düzenle</button>
                <button class="btn-mini delete" onclick="urunSil('${name}')">Sil</button>
            </div>
        </div>`;
    }).join("");
}

function renderLeftovers(){
    const c = document.getElementById("kalanListesi");
    const names = Object.keys(leftovers);
    if(names.length === 0){
        c.innerHTML = '<p class="leftover-empty">Gün sonu ürünü girilmedi.</p>';
        return;
    }
    c.innerHTML = names.map(name=>{
        return `
        <div class="urunBox" style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <span class="name">${name}</span>
                <div class="muted">${leftovers[name]} adet</div>
            </div>
            <button class="btn-xs delete" onclick="leftoverSil('${name}')">Hepsini Sil</button>
        </div>`;
    }).join("");
}

function leftoverSil(name) {
    if(confirm(`${name} listesini temizlemek istiyor musun?`)) {
        delete leftovers[name];
        renderLeftovers();
    }
}

function renderBoxes() {
    const c = document.getElementById("kutuListesi");
    const impact = document.getElementById("impactInfo");

    if (boxes.length === 0) {
        c.innerHTML = '<p class="leftover-empty">Henüz kutu oluşturulmadı.</p>';
        if(impact) impact.textContent = "";
        updateImpactPanels(0);
        return;
    }

    let totalGramAll = 0;

    c.innerHTML = boxes.map(box => {
        totalGramAll += box.totalGram;
        const maxG = boxMax[box.type].gram;
        const maxH = boxMax[box.type].hacim;
        const percG = Math.min((box.totalGram / maxG) * 100, 100);
        const percH = Math.min((box.totalHacim / maxH) * 100, 100);
        const satisFiyati = box.totalCost * 1.20;

        const lines = Object.entries(box.items).map(([name, count]) => {
            return `<div class="kutu-line">
                <span>${count}× ${name}</span>
                <span>
                    <button class="btn-xs edit" onclick="kutudanCikar(${box.id}, '${name}')">-1</button>
                    <button class="btn-xs reload" onclick="kutuyaEkle(${box.id}, '${name}')">+1</button>
                </span>
            </div>`;
        }).join("");

        return `
        <div class="kutu-card">
            <div class="kutu-header">
                <div>
                    <strong>${boxLabel(box.type)}</strong>
                    <div class="kutu-meta">
                        <span>Ağırlık: ${box.totalGram.toFixed(0)} / ${maxG} g</span>
                        <span class="volume-info">Hacim: ${box.totalHacim.toFixed(0)} / ${maxH} cm³</span>
                    </div>
                </div>
                <div class="kutu-icon">${box.type[0].toUpperCase()}</div>
            </div>
            <div class="progress-label"><span>Ağırlık Doluluğu</span> <span>%${percG.toFixed(0)}</span></div>
            <div class="progress-container"><div class="progress-bar" style="width: ${percG}%"></div></div>
            <div style="margin-top:10px;">${lines}</div>
            <div class="kutu-actions" style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                <div style="text-align: left;">
                    <div style="font-size: 11px; color: #888;">Satış Fiyatı (%20 Kâr)</div>
                    <div style="font-weight: 800; color: #2a6a57;">${satisFiyati.toFixed(2)} TL</div>
                </div>
                <button class="btn-xs delete" onclick="kutuSil(${box.id})">Sil</button>
            </div>
        </div>`;
    }).join("");

    if(impact) {
        impact.innerHTML = `<span style="color:#d9902e;">${boxes.length}</span> kutu oluşturuldu • 
        Toplam <span style="color:#d9902e;">${totalGramAll.toFixed(0)} g</span> ürün kurtarıldı`;
    }
    updateImpactPanels(totalGramAll);
}

/* ---------------- ETKİ HESAPLAMA ---------------- */

function updateImpactPanels(dailySavedGram){
    const dayKg = dailySavedGram / 1000;
    const bizDayGram = document.getElementById("bizDayGram");
    if(!bizDayGram) return;

    bizDayGram.textContent = dailySavedGram.toFixed(0);
    document.getElementById("bizDayWater").textContent = (dayKg * WATER_FOOTPRINT_PER_KG).toFixed(0);
    document.getElementById("bizDayCO2").textContent = (dayKg * CO2_FOOTPRINT_PER_KG).toFixed(2);
    document.getElementById("bizMonthGram").textContent = (dailySavedGram * 30).toFixed(0);
    document.getElementById("bizYearWater").textContent = (dayKg * WATER_FOOTPRINT_PER_KG * 365).toLocaleString("tr-TR");
}

// --- 1. OTURUM KONTROLÜ (Burası Sayfa Yenilenince Girişi Hatırlar) ---
// Bu kısmı kendi başına bir async fonksiyon yapıyoruz ki await çalışabilsin
const checkSavedLogin = async () => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const savedDocId = localStorage.getItem("savedDocId");

    if (isLoggedIn === "true" && savedDocId) {
        try {
            // Bak buradaki window.doc ve window.getDoc hatasız çalışacak
            const docRef = window.doc(window.db, "isletmeler", savedDocId);
            const docSnap = await window.getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                currentIsletmeId = data.isletme_id;
                currentIsletmeAdi = data.isletme_adi || data.isletme_id;
                products = data.urunler || {};
                
                document.getElementById('isletme-paneli').style.display = 'block';
                renderProducts();
                populateModalSelect();
                console.log("Sistem: Otomatik giriş başarılı -> " + currentIsletmeAdi);
            }
        } catch (e) {
            console.error("Otomatik giriş hatası:", e);
        }
    }
};

// Fonksiyonu hemen çalıştır
checkSavedLogin();
    // --- 2. SAYFA İLK AÇILDIĞINDA ÇALIŞACAK RENDERLAR ---
    renderProducts();
    renderLeftovers();
    renderBoxes();
    populateModalSelect();

    // --- 3. SSS (ACCORDION) AYARLARI ---
    const acc = document.querySelectorAll(".accordion");
    acc.forEach(btn => {
        btn.addEventListener("click", function () {
            this.classList.toggle("active");
            let panel = this.nextElementSibling;
            if (panel.style.maxHeight) {
                panel.style.maxHeight = null;
            } else {
                panel.style.maxHeight = panel.scrollHeight + "px";
            }
        });
    });

window.urunKaydetFonksiyonu = async (e) => {
    // 1. Sayfanın yenilenmesini engelle
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    console.log("Sistem: Fonksiyon tetiklendi, kayıt başlıyor...");

    // 2. Input elemanlarını yakala
    const nameInput = document.getElementById("urunAd");
    const gramInput = document.getElementById("urunGram");
    const costInput = document.getElementById("urunMaliyet");
    const hacimInput = document.getElementById("urunHacim");

    // 3. Değerleri al ve temizle
    const name = nameInput.value.trim();
    const gram = parseFloat(gramInput.value);
    const cost = parseFloat(costInput.value);
    const hacim = parseFloat(hacimInput.value) || 200;

    // 4. Boş alan kontrolü
    if (name && !isNaN(gram) && !isNaN(cost)) {
        try {
            // 5. Firebase için gerekli ID ve Referansı ayarla
            // LocalStorage boşsa senin sabit ID'ni (Martı) kullanır
            const docId = localStorage.getItem("savedDocId") || "oYinWGPnqE36y4nrxCf7";
            const docRef = window.doc(window.db, "isletmeler", docId);

            // 6. Yerel listeyi güncelle
            products[name] = { gram, cost, hacim };

            // 7. Firebase'e uçur
            await window.updateDoc(docRef, {
                "urunler": products
            });

            console.log("Sistem: Firebase güncellemesi başarılı.");
            alert("✅ " + name + " dükkan menüsüne eklendi!");

            // 8. Arayüzü tazele ve formu boşalt
            renderProducts();
            populateModalSelect();

            nameInput.value = "";
            gramInput.value = "";
            costInput.value = "";
            hacimInput.value = "";

        } catch (err) {
            console.error("Firebase Hatası:", err);
            alert("Hata: Veritabanına ulaşılamadı. Rules kısmını kontrol et!");
        }
    } else {
        alert("Lütfen ürün adı, gramaj ve maliyet alanlarını doldur kanka!");
    }
};
function urunSil(name){
    if(!confirm(name + " silinsin mi?")) return;
    delete products[name];
    
    const docId = localStorage.getItem("savedDocId");
    if(docId) {
        const docRef = window.doc(window.db, "isletmeler", docId);
        window.updateDoc(docRef, { "urunler": products });
    }
    
    renderProducts();
    populateModalSelect();
}
async function urunDuzenle(name){
    const p = products[name];
    const g = prompt("Yeni gramaj:", p.gram);
    const c = prompt("Yeni maliyet:", p.cost);
    const h = prompt("Yeni hacim:", p.hacim);
    if(g && c) {
        products[name] = { ...p, gram: parseFloat(g), cost: parseFloat(c), hacim: parseFloat(h) || p.hacim };
        
        const docId = localStorage.getItem("savedDocId");
        if(docId) {
            const docRef = window.doc(window.db, "isletmeler", docId);
            await window.updateDoc(docRef, { "urunler": products });
        }
        
        renderProducts();
        alert("✅ " + name + " güncellendi!");
    }
}
/* ---------------- MODAL & ELDE KALAN ---------------- */

function openLeftoverModal(){ document.getElementById("leftoverModal").style.display = "flex"; }
function closeLeftoverModal(){ document.getElementById("leftoverModal").style.display = "none"; }

function populateModalSelect(){
    const sel = document.getElementById("modalUrunSelect");
    if(sel) {
        sel.innerHTML = Object.keys(products).map(n => `<option value="${n}">${n}</option>`).join("");
    }
}

function leftoverEkle(){
    const name = document.getElementById("modalUrunSelect").value;
    const adet = parseInt(document.getElementById("modalAdet").value);
    if(name && adet > 0){
        leftovers[name] = (leftovers[name] || 0) + adet;
        renderLeftovers();
        closeLeftoverModal();
    }
}

/* ---------------- ALGORİTMALAR ---------------- */

function tekKutuOlustur(type) {
    const maxG = boxMax[type].gram;
    const maxH = boxMax[type].hacim;
    const URUN_LIMITI = 4; // Beklediğimiz adil dağılım kuralı

    const names = Object.keys(leftovers);
    if (names.length === 0) { alert("Önce gün sonu ürünü ekleyin."); return; }

    let stock = { ...leftovers };
    let items = {};
    let tGram = 0, tHacim = 0, tCost = 0;

    let sortedNames = names.sort(() => Math.random() - 0.5);

    let eklendiMi = true;
    while (eklendiMi) {
        eklendiMi = false;
        for (const name of sortedNames) {
            const p = products[name];
            const suAnkiAdet = items[name] || 0;

            if (stock[name] > 0 && 
                (tGram + p.gram <= maxG) && 
                (tHacim + p.hacim <= maxH) &&
                suAnkiAdet < URUN_LIMITI) {
                
                stock[name]--;
                items[name] = suAnkiAdet + 1;
                tGram += p.gram;
                tHacim += p.hacim;
                tCost += p.cost;
                eklendiMi = true;
            }
        }
    }

    if (Object.keys(items).length === 0) { alert("Bu ürünlerle kutu doldurulamadı."); return; }

    boxes.push({ id: Date.now() + Math.random(), type, items, totalGram: tGram, totalHacim: tHacim, totalCost: tCost });
    leftovers = stock;
    renderLeftovers();
    renderBoxes();
}


/* ---------------- EN İYİ SİSTEM: STOK VE HACİM ODAKLI DAĞITIM ---------------- */

function otomatikKutular() {
    let stock = { ...leftovers };
    let urunIsimleri = Object.keys(stock).filter(n => stock[n] > 0);
    
    if (urunIsimleri.length === 0) {
        alert("Ürün yok! Lütfen önce elde kalan ürünleri girin.");
        return;
    }

    // Orta boy kutu sabit limitleri
    const LIMIT_GRAM = 600;
    const LIMIT_HACIM = 2000;
    const GUVENLI_HACIM = LIMIT_HACIM * 0.90; // %10 boşluk bırakıyoruz (istifleme payı)

    // 1. ADIM: Kutu Sayısını Belirle (Hacim Odaklı Planlama)
    let toplamHacim = urunIsimleri.reduce((acc, n) => acc + (stock[n] * products[n].hacim), 0);
    let kutuSayisi = Math.ceil(toplamHacim / GUVENLI_HACIM);

    // Kutuları oluştur
    let yeniKutular = Array.from({ length: kutuSayisi }, (_, i) => ({
        id: Date.now() + i + Math.random(),
        type: 'medium',
        items: {},
        totalGram: 0,
        totalHacim: 0,
        totalCost: 0
    }));

    // 2. ADIM: Ürünleri Stratejik Dağıt
    // Ürünleri maliyeti en yüksek olandan en düşük olana sıralıyoruz (Değer Dengesi İçin)
    let siraliUrunler = urunIsimleri.sort((a, b) => products[b].cost - products[a].cost);

    siraliUrunler.forEach(name => {
        let adet = stock[name];
        let p = products[name];

        for (let i = 0; i < adet; i++) {
            // Her bir adet ürün için en uygun kutuyu bul:
            yeniKutular.sort((a, b) => {
                // Öncelik 1: Sığma durumu
                let aSigar = (a.totalGram + p.gram <= LIMIT_GRAM && a.totalHacim + p.hacim <= LIMIT_HACIM);
                let bSigar = (b.totalGram + p.gram <= LIMIT_GRAM && b.totalHacim + p.hacim <= LIMIT_HACIM);
                
                if (aSigar !== bSigar) return aSigar ? -1 : 1;

                // Öncelik 2: Çeşitlilik (Bu ürün hangisinde daha azsa veya yoksa oraya koy)
                let aAdet = a.items[name] || 0;
                let bAdet = b.items[name] || 0;
                if (aAdet !== bAdet) return aAdet - bAdet;

                // Öncelik 3: Maliyet Dengesi (Hala eşitse maliyeti düşük olanı seç)
                return a.totalCost - b.totalCost;
            });

            let hedefKutu = yeniKutular[0];

            // Ürünü kutuya ekle
            if (hedefKutu.totalGram + p.gram <= LIMIT_GRAM && hedefKutu.totalHacim + p.hacim <= LIMIT_HACIM) {
                hedefKutu.items[name] = (hedefKutu.items[name] || 0) + 1;
                hedefKutu.totalGram += p.gram;
                hedefKutu.totalHacim += p.hacim;
                hedefKutu.totalCost += p.cost;
                stock[name]--;
            } else {
                // Eğer sığmıyorsa (fiziksel sınır), yeni bir kutu aç ve oraya koy
                let yeniKutu = {
                    id: Date.now() + Math.random(),
                    type: 'medium',
                    items: { [name]: 1 },
                    totalGram: p.gram,
                    totalHacim: p.hacim,
                    totalCost: p.cost
                };
                yeniKutular.push(yeniKutu);
                stock[name]--;
            }
        }
    });

    // 3. ADIM: Veriyi Güncelle ve Göster
    boxes = yeniKutular;
    leftovers = {}; // Tüm stok eritildi
    renderLeftovers();
    renderBoxes();}
    /* --- MANUEL DÜZELTMELER --- */

function kutuyaEkle(id, name){
    const box = boxes.find(b=>b.id === id);
    if(box && leftovers[name] > 0){
        if(box.totalGram + products[name].gram <= boxMax[box.type].gram){
            box.items[name] = (box.items[name] || 0) + 1;
            box.totalGram += products[name].gram;
            box.totalHacim += products[name].hacim;
            box.totalCost += products[name].cost;
            leftovers[name]--;
            renderLeftovers();
            renderBoxes();
        } else { alert("Kutu kapasitesi doldu!"); }
    }
}

function kutudanCikar(id, name){
    const box = boxes.find(b=>b.id === id);
    if(box && box.items[name] > 0){
        box.items[name]--;
        box.totalGram -= products[name].gram;
        box.totalHacim -= products[name].hacim;
        box.totalCost -= products[name].cost;
        leftovers[name] = (leftovers[name] || 0) + 1;
        if(box.items[name] === 0) delete box.items[name];
        renderLeftovers();
        renderBoxes();
    }
}

function kutuSil(id) {
    const box = boxes.find(b => b.id === id);
    if (box) {
        Object.entries(box.items).forEach(([name, count]) => {
            leftovers[name] = (leftovers[name] || 0) + count;
        });
        boxes = boxes.filter(b => b.id !== id);
        renderLeftovers();
        renderBoxes();
    }
}
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // Aşağı inerken görünür yap
            entry.target.classList.add('reveal-visible');
        } else {
            // Yukarı çıkarken (veya görüşten çıktığında) tekrar gizle
            entry.target.classList.remove('reveal-visible');
        }
    });
}, { threshold: 0.1 }); // Elemanın %10'u göründüğünde tetiklenir

// Tüm section'lara bu kuralı uygula
document.querySelectorAll('section').forEach(section => {
    section.classList.add('reveal-hidden');
    observer.observe(section);
});
/* ---------------- FIREBASE BULUT AKTARIMI ---------------- */

async function veriyiGonder() {
    if (boxes.length === 0) {
        alert("Buluta gönderilecek aktif bir kutu bulunamadı.");
        return;
    }

    try {
        // Mevcut giriş yapan işletmenin bilgilerini alıyoruz
        // Eğer giriş yapılmadıysa varsayılan değerleri kullanır
        const suAnkiIsletmeId = currentIsletmeId || "isletme_tanimsiz";
        const suAnkiIsletmeAdi = currentIsletmeAdi || "Tanımsız İşletme";

        const veriPaketi = {
            isletmeId: suAnkiIsletmeId,   // Örn: "Martı"
            isletmeAdi: suAnkiIsletmeAdi, // Örn: "Martı Fırın"
            tarih: new Date().toLocaleString("tr-TR"), // Okunabilir tarih ve saat
            kayitZamani: new Date().toISOString(),     // Filtreleme için teknik zaman
            kaydedilenKutular: boxes.map(box => ({
                tip: boxLabel(box.type),
                icerik: box.items,
                toplamGram: box.totalGram,
                toplamMaliyet: box.totalCost,
                satisFiyati: box.totalCost * 1.20
            })),
            etkiMetrikleri: {
                toplamGram: document.getElementById("bizDayGram")?.textContent || "0",
                kurtarilanSuLitre: document.getElementById("bizDayWater")?.textContent || "0",
                karbonAyakIziKg: document.getElementById("bizDayCO2")?.textContent || "0"
            }
        };

        // Veriyi yine tek koleksiyona atıyoruz ama içinde kimlik bilgisi var
        await window.addDoc(window.collection(window.db, "isletme_kayitlari"), veriPaketi);
        // Aynı zamanda kendi dökümanını da güncelle
const docId = localStorage.getItem("savedDocId");
if (docId) {
    const docRef = window.doc(window.db, "isletmeler", docId);
    await window.updateDoc(docRef, {
        bugun_kutular: boxes.map(box => ({
            tip: boxLabel(box.type),
            fiyat: parseFloat((box.totalCost * 1.20).toFixed(2))
        })),
son_guncelleme: new Date().toISOString()    });
}
        alert(`✅ ${suAnkiIsletmeAdi} verileri başarıyla merkeze gönderildi!`);

    } catch (error) {
        console.error("Gönderim hatası:", error);
        alert("Veri gönderilemedi, lütfen tekrar deneyin.");
    }
}
// Fonksiyonu globale bağlayalım ki HTML'deki butondan (onclick) çağrılabilsin
window.veriyiGonder = veriyiGonder;
/* ---------------- AI HAFIZA (LOGİSTİC RULES) ---------------- */
async function hafizayiGetir() {
    try {
        // Firebase'deki 'ai_hafiza' klasöründeki tüm kuralları oku
        const querySnapshot = await window.getDocs(window.collection(window.db, "ai_hafiza"));
        let ogretiler = "";
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            ogretiler += `- ${data.kural}\n`; // Her bir kuralı alt alta ekle
        });
        
        return ogretiler || "Henüz özel bir sayım kuralı tanımlanmadı.";
    } catch (e) {
        console.error("Firebase hafıza okuma hatası:", e);
        return "Hafıza şu an okunamıyor, standart sayıma devam et.";
    }
}
/* ---------------- YENİLENMİŞ AI SİMÜLASYONU ---------------- */
/* ---------------- 🧠 AI HAFIZA VE SİMUÜLASYON ---------------- */

// Firebase'den lojistik kurallarını çeken yardımcı fonksiyon
async function hafizayiGetir() {
    try {
        const querySnapshot = await window.getDocs(window.collection(window.db, "ai_hafiza"));
        let kurallar = "";
        querySnapshot.forEach((doc) => {
            kurallar += `- ${doc.data().kural}\n`;
        });
        return kurallar || "Henüz özel bir sayım kuralı tanımlanmadı.";
    } catch (e) {
        console.error("Hafıza okuma hatası:", e);
        return "Hafıza şu an okunamıyor.";
    }
}

async function aiSimulasyon() {
    let API_KEY = localStorage.getItem("gemini_api_key");
    if (!API_KEY) {
        API_KEY = prompt("Lütfen Google AI API anahtarınızı girin:");
        if (API_KEY) localStorage.setItem("gemini_api_key", API_KEY);
        else return;
    }

    const fileInput = document.getElementById('aiKamera');
    if (!fileInput || !fileInput.files[0]) { alert("Fotoğraf seçilmedi!"); return; }

    document.getElementById('aiYukleniyor').style.display = 'block';
    
    // 1. Önce Firebase'den öğretilen lojistik kuralları çekiyoruz
    const lojistikKurallar = await hafizayiGetir();

    const reader = new FileReader();
    reader.onload = async function() {
        const base64Image = reader.result.split(',')[1];
        
        // 2. Prompt'u veritabanı kurallarıyla besliyoruz
const promptText = `
    Sen profesyonel bir Lojistik Envanter Denetçisisin. Fotoğrafı 3 ana dikey bölgeye ayırarak 'Master Data' tanımlarına göre sayım yap:
    
    REFERANS VERİLERİ (Görsel):
    Fotoğrafta görülen düzeni lojistik referans kabul et.
    
    1. SOL BÖLGE (Tepsi 1): Sadece 'Poğaça' bulunur. 
       - *Görsel Tanım:* Kapalı, yuvarlak veya oval 'pofuduk' (kabarmış/soft) hamur kütleleri.
       - *Kritik Bilgi:* Bazılarının üzerinde bol susam (en alttakiler), bazılarının üzerinde sadece parlak fırınlanmış kabuk olabilir (en üsttekiler). Görünüşleri farklı olsa da, bu bölgedeki kapalı hamur kütlelerinin %100'ünü 'Poğaça' olarak kaydet. Asla Açma veya Simit ile karıştırma.
       - *Öğrenilen Bilgi:* Fotoğrafta tam olarak 16 adet poğaça vardır.

    2. ORTA BÖLGE (Tepsi 2): Sadece 'Açma' bulunur.
       - *Görsel Tanım:* Dairesel, halka şeklinde, hamurları 'twisted' (bükülmüş/burgulu) duran kütleler.
       - *Kritik Bilgi:* Poğaça değildir (kapalı hamur değil) ve Gevrek/Simit değildir. Simit'e çok benzer ancak Gevrek kadar bol susamlı değildir. Bu bölgedeki burgulu dairesel ürünleri 'Açma' say.
       - *Öğrenilen Bilgi:* Fotoğrafta tam olarak 13 adet açma vardır.

    3. SAĞ BÖLGE (Tepsi 3): Sadece 'Gevrek' (Simit) bulunur.
       - *Görsel Tanım:* Tam dairesel, halka şeklinde kütleler.
       - *Kritik Bilgi:* 'Bol susamlı' ve 'tam dairesel'. Ortasındaki boşluk (delik) çok keskin ve geniştir. Hamuru burgulu değildir, düz ve susamla kaplıdır.
       - *Öğrenilen Bilgi:* Fotoğrafta tam olarak 3 adet gevrek vardır.
    
    SAYIM TALİMATI:
    Yukarıdaki lojistik master verilerine ve görsel üzerindeki desenlere göre yeni fotoğrafı say. Kategorizasyonu bu kurallara göre yap ve sadece JSON dön: {"ÜrünAdı": Adet}
`;        
        // 2026'nın güncel ve kararlı modeli
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: "image/jpeg", data: base64Image } }] }]
                })
            });

            const data = await response.json();
            
            if (data.candidates && data.candidates[0]) {
                let aiText = data.candidates[0].content.parts[0].text;
                const cleanJson = aiText.replace(/```json|```/g, "").trim();
                const saptananUrunler = JSON.parse(cleanJson);

                leftovers = {}; 
                Object.keys(saptananUrunler).forEach(name => {
                    if (products[name]) leftovers[name] = saptananUrunler[name];
                });

                renderLeftovers();
                document.getElementById('aiYukleniyor').style.display = 'none';
                alert("✅ AI Hafızasındaki kurallara göre sayım tamamlandı!");
                otomatikKutular();
            }
        } catch (e) {
            console.error("AI Hatası:", e);
            document.getElementById('aiYukleniyor').style.display = 'none';
        }
    };
    reader.readAsDataURL(fileInput.files[0]);
}

window.aiSimulasyon = aiSimulasyon;
// Giriş Penceresini Açan Fonksiyon
window.showLoginModal = function() {
    document.getElementById('loginModal').style.display = 'flex';
}

// Giriş Penceresini Kapatan Fonksiyon
window.closeLoginModal = function() {
    document.getElementById('loginModal').style.display = 'none';
}

// Giriş Bilgilerini Kontrol Eden Fonksiyon
// İşletme veri tabanı simülasyonu (Burada her işletmeye özel ürünler tanımlı)
const isletmeVerileri = {
    "isletme_001": {
        ad: "İstanbul Simit Dünyası",
        urunler: {
            "Poğaça": { gram: 60, cost: 8, hacim: 200 },
            "Gevrek": { gram: 70, cost: 9, hacim: 250 }
        }
    },
    "isletme_002": {
        ad: "Acarlar Unlu Mamülleri",
        urunler: {
            "Kurabiye": { gram: 30, cost: 4, hacim: 50 },
            "Baklava": { gram: 40, cost: 18, hacim: 60 }
        }
    }
};

/* ---------------- FIREBASE İLE GİRİŞ SİSTEMİ ---------------- */

// Firebase'in gerekli araçlarını içe aktarıyoruz (Daha önce eklemediysen)

window.checkLogin = async function() {
    const userInput = document.getElementById('loginUser').value.trim();
    const passInput = document.getElementById('loginPass').value.trim();

    if (!userInput || !passInput) {
        alert("Kullanıcı adı ve şifreyi doldur!");
        return;
    }

    try {
        // Tüm isletmeler koleksiyonunu tara, isletme_id'si eşleşeni bul
        const querySnapshot = await window.getDocs(window.collection(window.db, "isletmeler"));
        
        let bulunanDoc = null;
        let bulunanDocId = null;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.isletme_id === userInput) {
                bulunanDoc = data;
                bulunanDocId = doc.id;
            }
        });

        if (!bulunanDoc) {
            alert("Bu işletme bulunamadı!");
            return;
        }

        if (bulunanDoc.sifre !== passInput) {
            alert("Şifre yanlış!");
            return;
        }

        // Başarılı giriş
        products = bulunanDoc.urunler || {};
        currentIsletmeId = bulunanDoc.isletme_id;
        currentIsletmeAdi = bulunanDoc.isletme_adi || bulunanDoc.isletme_id;

        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("savedDocId", bulunanDocId);

        document.getElementById('isletme-paneli').style.display = 'block';
        renderProducts();
        populateModalSelect();
        window.closeLoginModal();

        alert("Hoş geldin " + currentIsletmeAdi + "!");
        document.getElementById('isletme-paneli').scrollIntoView({ behavior: 'smooth' });

    } catch (e) {
        console.error("Giriş Hatası:", e);
        alert("Bağlantı hatası oluştu.");
    }
}
window.cikisYap = function() {
    if(confirm("Çıkış yapmak istediğine emin misin?")) {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("savedDocId");
        currentIsletmeId = "";
        currentIsletmeAdi = "";
        products = {};
        leftovers = {};
        boxes = [];
        document.getElementById('isletme-paneli').style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
