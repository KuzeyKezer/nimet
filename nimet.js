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
    medium: { gram: 750, hacim: 2500 },
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

function otomatikKutular() {
    // Burada da adil dağılım algoritmasını büyük kutular için çalıştırıyoruz
    let stock = { ...leftovers };
    if (Object.keys(stock).length === 0) { alert("Ürün yok!"); return; }

    while (Object.keys(stock).some(k => stock[k] > 0)) {
        let items = {};
        let tGram = 0, tHacim = 0, tCost = 0;
        let kutuEklendi = false;
        let sortedNames = Object.keys(stock).sort(() => Math.random() - 0.5);

        let turDevam = true;
        while(turDevam){
            turDevam = false;
            for(const n of sortedNames){
                if(stock[n] > 0 && tGram + products[n].gram <= 1500 && tHacim + products[n].hacim <= 5000 && (items[n] || 0) < 4){
                    stock[n]--;
                    items[n] = (items[n] || 0) + 1;
                    tGram += products[n].gram;
                    tHacim += products[n].hacim;
                    tCost += products[n].cost;
                    kutuEklendi = true;
                    turDevam = true;
                }
            }
        }
        if(!kutuEklendi) break;
        boxes.push({ id: Date.now() + Math.random(), type: 'large', items, totalGram: tGram, totalHacim: tHacim, totalCost: tCost });
    }
    leftovers = stock;
    renderLeftovers();
    renderBoxes();
}

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