/* ---------------- VERİ YAPILARI ---------------- */

let products = {
    "Poğaça": { gram: 60, cost: 8, hacim: 200 },
    "Gevrek": { gram: 70, cost: 9, hacim: 250 },
    "Kurabiye": { gram: 30, cost: 4, hacim: 50 },
    "Baklava": { gram: 40, cost: 18, hacim: 60 },
    "Şöbiyet": { gram: 60, cost: 25, hacim: 90 },
    "Havuçlu Kek": { gram: 120, cost: 22, hacim: 300 },
    "Sandviç": { gram: 180, cost: 45, hacim: 550 },
    "Tam Buğday Ekmek": { gram: 250, cost: 12, hacim: 800 },
    "Ekler": { gram: 35, cost: 14, hacim: 50 }
};

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

/* ---------------- ANA İŞLEMLER & EVENT LISTENERS ---------------- */

document.addEventListener("DOMContentLoaded", ()=>{
    const form = document.getElementById("urunForm");
    if(form) {
        form.addEventListener("submit", e=>{
            e.preventDefault();
            const name = document.getElementById("urunAd").value.trim();
            const gram = parseFloat(document.getElementById("urunGram").value);
            const cost = parseFloat(document.getElementById("urunMaliyet").value);
            const hacim = parseFloat(document.getElementById("urunHacim")?.value || 200);

            if(name && !isNaN(gram) && !isNaN(cost)){
                products[name] = { gram, cost, hacim };
                form.reset();
                renderProducts();
                populateModalSelect();
            }
        });
    }

    renderProducts();
    renderLeftovers();
    renderBoxes();
    populateModalSelect();

    const acc = document.querySelectorAll(".accordion");
    acc.forEach(btn => {
        btn.addEventListener("click", function () {
            this.classList.toggle("active");
            let panel = this.nextElementSibling;
            panel.style.maxHeight = panel.style.maxHeight ? null : panel.scrollHeight + "px";
        });
    });
});

function urunSil(name){
    if(!confirm(name + " silinsin mi?")) return;
    delete products[name];
    renderProducts();
    populateModalSelect();
}

function urunDuzenle(name){
    const p = products[name];
    const g = prompt("Yeni gramaj:", p.gram);
    const c = prompt("Yeni maliyet:", p.cost);
    if(g && c) {
        products[name] = { ...p, gram: parseFloat(g), cost: parseFloat(c) };
        renderProducts();
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
    // Kutuların boş olup olmadığını kontrol et
    if (boxes.length === 0) {
        alert("Buluta gönderilecek aktif bir kutu bulunamadı. Lütfen önce kutu oluşturun.");
        return;
    }

    try {
        // Gönderilecek veri paketini hazırla
        const veriPaketi = {
            isletmeAdi: "isletme_001", // Burası dinamikleştirilebilir
            isletmeId: "isletme_001",
            tarih: new Date().toISOString(),
            kaydedilenKutular: boxes.map(box => ({
                tip: box.label || boxLabel(box.type),
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

        // HTML script modülünde window'a bağladığımız Firebase fonksiyonlarını kullanıyoruz
        const docRef = await window.addDoc(window.collection(window.db, "isletme_kayitlari"), veriPaketi);
        
        console.log("Başarıyla kaydedildi. Belge ID:", docRef.id);
        alert("✅ Veriler Firebase bulut sistemine başarıyla gönderildi!");

        // İsteğe bağlı: Gönderim sonrası paneli sıfırla
        // boxes = []; 
        // renderBoxes();

    } catch (error) {
        console.error("Firebase Hatası:", error);
        alert("Veri gönderilirken bir sorun oluştu. Lütfen Firebase Console kurallarını kontrol edin.");
    }
}

// Fonksiyonu globale bağlayalım ki HTML'deki butondan (onclick) çağrılabilsin
window.veriyiGonder = veriyiGonder;
function aiSimulasyon() {
    // 1. Yükleniyor animasyonunu göster
    document.getElementById('aiYukleniyor').style.display = 'block';
    
    // 2. 3 saniye bekle (Sanki AI düşünüyormuş gibi)
    setTimeout(() => {
        // 3. Simülasyon verileri (Buraya istediğin rakamları yazabilirsin)
        const saptananUrunler = {
            "Gevrek": 42,
            "Poğaça": 17,
            "Kurabiye": 38
        };

        // 4. Bu verileri sisteme (leftovers) aktar
        Object.keys(saptananUrunler).forEach(name => {
            leftovers[name] = (leftovers[name] || 0) + saptananUrunler[name];
        });

        // 5. Ekranı güncelle
        renderLeftovers();
        document.getElementById('aiYukleniyor').style.display = 'none';
        
        alert("✅ Yapay Zeka Başarıyla Saydı:\n- 42 Gevrek (Açmalar dahil)\n- 17 Poğaça\n- 38 Kurabiye");
        
        // 6. OTOMATİK PAKETLEMEYİ TETİKLE (Senin en sevdiğin kısım)
        otomatikKutular();
        
    }, 3000);
}
