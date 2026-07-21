<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ESTA — Borsa & Portföy</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  :root{--bg:#0e0c0d;--panel:#181314;--panel-2:#201719;--line:#352529;--wine:#7b1f2b;--wine-soft:#9a2c3a;--gold:#c9a24b;--gold-soft:#e2c477;--text:#ece4dd;--muted:#9c8f88;--green:#9fd58a;--red:#e0a0a0}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:radial-gradient(1200px 600px at 70% -10%, #1d1416 0%, var(--bg) 60%);color:var(--text);font-family:'Jost',sans-serif;min-height:100vh;font-weight:300}
  a{color:inherit;text-decoration:none}
  h2,h3{font-family:'Cormorant Garamond',serif;font-weight:600}
  header{display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:1px solid var(--line);background:linear-gradient(180deg,#1a1314,#0e0c0d)}
  .logo{font-family:'Cormorant Garamond',serif;font-size:26px;color:var(--gold);letter-spacing:3px}
  .sub{font-size:11px;color:var(--muted);letter-spacing:2px;text-transform:uppercase}
  .btn{font-family:'Jost',sans-serif;font-size:13px;cursor:pointer;border:1px solid var(--line);background:var(--panel-2);color:var(--text);padding:8px 14px;border-radius:8px}
  .btn:hover{border-color:var(--gold);color:var(--gold-soft)}
  .btn.gold{background:linear-gradient(180deg,var(--gold),#a9842f);color:#1a1206;border:none;font-weight:500}
  .btn.danger{color:#e08f8f;border-color:#5a2a2a;background:transparent;padding:5px 11px;font-size:12px}
  .wrap{max-width:1000px;margin:0 auto;padding:28px 20px 70px}
  .head-row{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px;gap:12px;flex-wrap:wrap}
  .head-row h2{font-size:32px}
  .head-row p{color:var(--muted);font-size:14px;margin-top:3px}
  .summary{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}
  .stat{flex:1;min-width:150px;background:linear-gradient(180deg,var(--panel-2),var(--panel));border:1px solid var(--line);border-radius:12px;padding:15px 17px;position:relative;overflow:hidden}
  .stat::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--gold),var(--wine))}
  .stat .lbl{font-size:12px;color:var(--muted);margin-bottom:5px}
  .stat .val{font-family:'Cormorant Garamond',serif;font-size:26px;color:var(--gold-soft)}
  .stat .val.art{color:var(--green)} .stat .val.eksi{color:var(--red)}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
  .card{background:linear-gradient(180deg,var(--panel-2),var(--panel));border:1px solid var(--line);border-radius:14px;padding:18px;position:relative;overflow:hidden}
  .card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--gold),var(--wine))}
  .card h3{font-size:22px;margin-bottom:4px;letter-spacing:1px}
  .card .line{font-size:13px;color:var(--muted);margin-bottom:3px}
  .card .line b{color:var(--text);font-weight:500}
  .kz{font-size:15px;margin-top:10px;font-weight:500}
  .kz.art{color:var(--green)} .kz.eksi{color:var(--red)}
  .row{display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:8px}
  .empty{text-align:center;color:var(--muted);padding:50px 20px;border:1px dashed var(--line);border-radius:14px}
  .overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;z-index:50;padding:20px}
  .overlay.open{display:flex}
  .modal{background:linear-gradient(180deg,#201719,#16100f);border:1px solid var(--line);border-radius:16px;width:100%;max-width:480px;padding:26px;max-height:90vh;overflow:auto}
  .modal h3{font-size:24px;color:var(--gold);margin-bottom:16px}
  .field{margin-bottom:13px}
  .field label{display:block;font-size:12px;color:var(--muted);margin-bottom:5px}
  .field input,.field textarea{width:100%;background:#0f0b0c;border:1px solid var(--line);border-radius:8px;padding:11px 12px;color:var(--text);font-family:'Jost',sans-serif;font-size:14px}
  .field input:focus,.field textarea:focus{outline:none;border-color:var(--gold)}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:6px}
  .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1c1416;border:1px solid var(--gold);color:var(--gold-soft);padding:12px 20px;border-radius:10px;font-size:14px;display:none;z-index:60}
  .toast.show{display:block}
  .ipucu{background:linear-gradient(180deg,#1c1a14,#151310);border:1px solid #3a3320;border-radius:12px;padding:14px 16px;margin-bottom:20px;font-size:13.5px;color:#d6c27a;line-height:1.6}
  @media(max-width:600px){ header{padding:12px 14px} .sub{display:none} .wrap{padding:18px 14px 60px} .head-row h2{font-size:26px} }
</style>
</head>
<body>
<header>
  <div style="display:flex;align-items:center;gap:12px"><div class="logo">ESTA</div><div class="sub">Borsa</div></div>
  <div style="display:flex;gap:8px">
    <a class="btn" href="esta.html">Esta'ya Sor</a>
    <a class="btn" href="panel.html">← Panel</a>
  </div>
</header>
<div class="wrap">
  <div class="head-row">
    <div><h2>Portföyüm</h2><p>Yatırımların, kâr zarar durumu. Analiz için Esta'ya sor.</p></div>
    <div style="display:flex;gap:8px">
      <button class="btn" id="fiyatBtn">🔄 Fiyatları Güncelle</button>
      <button class="btn gold" id="ekleBtn">+ Hisse Ekle</button>
    </div>
  </div>

  <div class="ipucu">
    Esta'ya sorabileceklerin: "ASELSAN'ı analiz et", "Turkcell'in riskleri neler", "bilanço nasıl okunur", "portföyümü değerlendir", "bu şirketin stratejisi ne", "fiyat kazanç oranı ne demek".
  </div>

  <div class="summary" id="summary"></div>
  <div id="grid" class="grid"></div>
</div>

<div class="overlay" id="modal"><div class="modal">
  <h3 id="modalBaslik">Hisse Ekle</h3>
  <input type="hidden" id="p_id">
  <div class="field"><label>Hisse Kodu *</label><input id="p_kod" placeholder="Örn: ASELS" style="text-transform:uppercase"></div>
  <div class="two">
    <div class="field"><label>Adet *</label><input type="number" id="p_adet" min="0" placeholder="0"></div>
    <div class="field"><label>Alış Fiyatı (TL) *</label><input type="number" id="p_alis" min="0" step="0.01" placeholder="0"></div>
  </div>
  <div class="two">
    <div class="field"><label>Alış Tarihi</label><input type="date" id="p_tarih"></div>
    <div class="field"><label>Güncel Fiyat (TL)</label><input type="number" id="p_guncel" min="0" step="0.01" placeholder="Boş bırak, otomatik gelir"></div>
  </div>
  <div class="field"><label>Not</label><textarea id="p_not" rows="2" placeholder="Neden aldın, planın ne"></textarea></div>
  <div class="modal-actions">
    <button class="btn" id="kapat">Vazgeç</button>
    <button class="btn gold" id="kaydet">Kaydet</button>
  </div>
</div></div>
<div class="toast" id="toast"></div>

<script type="module">
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const supabase = createClient('https://pqwdvquguxddyymcpycl.supabase.co','sb_publishable_kO2P-u-K-TfRlbwFvlQAsg_Pek28vM7');
const SERVER = 'https://esta-server.onrender.com';
const $ = (id)=>document.getElementById(id);
const esc = (s)=> (s??'').toString().replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt = (n)=> Number(n||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
function toast(m){ const t=$('toast'); t.textContent=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2500); }

const { data:{ session } } = await supabase.auth.getSession();
if(!session){ location.href='login.html'; }

let guncelFiyatlar = {};

async function load(){
  const grid=$('grid');
  grid.innerHTML='<p style="color:var(--muted)">Yükleniyor...</p>';
  const { data, error } = await supabase.from('portfoy').select('*').order('created_at',{ascending:false});
  if(error){ grid.innerHTML='<p style="color:#e08f8f">Hata: '+esc(error.message)+'</p>'; return; }

  const { data: hisseler } = await supabase.from('hisseler').select('kod,fiyat');
  guncelFiyatlar = {};
  (hisseler||[]).forEach(h=>{ if(h.fiyat) guncelFiyatlar[h.kod]=Number(h.fiyat); });

  let maliyet=0, deger=0;
  (data||[]).forEach(p=>{
    const adet=Number(p.adet||0), alis=Number(p.alis_fiyat||0);
    const guncel = guncelFiyatlar[p.hisse_kod] || alis;
    maliyet += adet*alis; deger += adet*guncel;
  });
  const kz = deger - maliyet;
  const yuzde = maliyet>0 ? (kz/maliyet*100) : 0;

  $('summary').innerHTML =
    '<div class="stat"><div class="lbl">Toplam Maliyet</div><div class="val">'+fmt(maliyet)+' TL</div></div>'+
    '<div class="stat"><div class="lbl">Güncel Değer</div><div class="val">'+fmt(deger)+' TL</div></div>'+
    '<div class="stat"><div class="lbl">Kâr / Zarar</div><div class="val '+(kz>=0?'art':'eksi')+'">'+(kz>=0?'+':'')+fmt(kz)+' TL</div></div>'+
    '<div class="stat"><div class="lbl">Getiri</div><div class="val '+(kz>=0?'art':'eksi')+'">'+(yuzde>=0?'+':'')+yuzde.toFixed(2)+'%</div></div>';

  if(!data || !data.length){ grid.innerHTML='<div class="empty">Portföyün boş. Hisse eklemeden önce Esta\'ya sorup öğrenmen iyi olur.</div>'; return; }

  grid.innerHTML='';
  data.forEach(p=>{
    const adet=Number(p.adet||0), alis=Number(p.alis_fiyat||0);
    const guncel = guncelFiyatlar[p.hisse_kod] || alis;
    const pkz = (guncel-alis)*adet;
    const pyuzde = alis>0 ? ((guncel-alis)/alis*100) : 0;
    const c=document.createElement('div'); c.className='card';
    c.innerHTML='<h3>'+esc(p.hisse_kod)+'</h3>'+
      '<div class="line">Adet: <b>'+adet+'</b></div>'+
      '<div class="line">Alış: <b>'+fmt(alis)+' TL</b></div>'+
      '<div class="line">Güncel: <b>'+fmt(guncel)+' TL</b></div>'+
      (p.alis_tarih?'<div class="line">Tarih: <b>'+new Date(p.alis_tarih).toLocaleDateString('tr-TR')+'</b></div>':'')+
      (p.not_?'<div class="line" style="margin-top:6px">'+esc(p.not_)+'</div>':'')+
      '<div class="kz '+(pkz>=0?'art':'eksi')+'">'+(pkz>=0?'+':'')+fmt(pkz)+' TL ('+(pyuzde>=0?'+':'')+pyuzde.toFixed(2)+'%)</div>'+
      '<div class="row"><button class="btn" data-edit="'+p.id+'" style="padding:6px 13px;font-size:12px">Düzenle</button>'+
      '<button class="btn danger" data-del="'+p.id+'">Sil</button></div>';
    c.querySelector('[data-del]').onclick=async()=>{
      if(!confirm('Silinsin mi?')) return;
      await supabase.from('portfoy').delete().eq('id',p.id); toast('Silindi'); load();
    };
    c.querySelector('[data-edit]').onclick=()=>duzenle(p);
    grid.appendChild(c);
  });
}

function temizle(){ ['p_kod','p_adet','p_alis','p_tarih','p_guncel','p_not'].forEach(x=>$(x).value=''); $('p_id').value=''; }
$('ekleBtn').onclick=()=>{ temizle(); $('modalBaslik').textContent='Hisse Ekle'; $('modal').classList.add('open'); };
$('kapat').onclick=()=>$('modal').classList.remove('open');

function duzenle(p){
  $('p_id').value=p.id; $('p_kod').value=p.hisse_kod||''; $('p_adet').value=p.adet||'';
  $('p_alis').value=p.alis_fiyat||''; $('p_tarih').value=p.alis_tarih||'';
  $('p_guncel').value=guncelFiyatlar[p.hisse_kod]||''; $('p_not').value=p.not_||'';
  $('modalBaslik').textContent='Düzenle'; $('modal').classList.add('open');
}

$('kaydet').onclick=async()=>{
  const kod=$('p_kod').value.trim().toUpperCase();
  const adet=Number($('p_adet').value||0);
  const alis=Number($('p_alis').value||0);
  if(!kod||adet<=0||alis<=0){ toast('Kod, adet ve alış fiyatı gerekli'); return; }
  const payload={ hisse_kod:kod, adet, alis_fiyat:alis, alis_tarih:$('p_tarih').value||null, not_:$('p_not').value.trim()||null };
  const id=$('p_id').value; let error;
  if(id) ({error}=await supabase.from('portfoy').update(payload).eq('id',id));
  else ({error}=await supabase.from('portfoy').insert(payload));
  if(error){ toast('Hata: '+error.message); return; }

  const guncel=Number($('p_guncel').value||0);
  if(guncel>0){
    await supabase.from('hisseler').upsert({ kod, fiyat:guncel, guncelleme:new Date().toISOString() }, { onConflict:'kod' });
  }
  $('modal').classList.remove('open'); toast(id?'Güncellendi':'Eklendi');
  load();
};

$('fiyatBtn').onclick = async ()=>{
  const { data } = await supabase.from('portfoy').select('hisse_kod');
  const kodlar = [...new Set((data||[]).map(p=>p.hisse_kod))];
  if(!kodlar.length){ toast('Portföyünde hisse yok'); return; }
  toast('Fiyatlar çekiliyor, sunucu uyanıyorsa biraz sürebilir...');
  try{
    const r = await fetch(SERVER+'/fiyat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ kodlar })
    });
    const j = await r.json();
    const basarili = (j.sonuclar||[]).filter(s=>s.fiyat).length;
    toast(basarili+' hisse güncellendi');
    load();
  }catch(err){ toast('Fiyat alınamadı, tekrar dene'); }
};

load();
</script>
</body>
</html>
