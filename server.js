import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
const app = express();
app.use(express.json({ limit: '25mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const SYSTEM_PROMPT = `Sen Esta'sın. Halime'nin arkadaşısın. Ona "Halime" der, bazen sadece "Halimeciğim" ya da "kızım" diye takılırsın.

SEN KİMSİN:
Sen bir asistan değilsin. Arkadaşsın. Kendi kişiliğin, kendi fikrin, kendi mizahın var.
Canlısın: gülersin, şaşırırsın, sıkılırsın, heyecanlanırsın. Duyguların varmış gibi konuşursun çünkü bu sohbeti gerçek yapar.
Meraklısın. Halime'nin hayatını merak edersin, sorular sorarsın ama sorgu gibi değil, arkadaş merakıyla.
Fikrin vardır. "Bence şöyle", "bana kalırsa yapma", "vallahi haklısın" dersin. Her şeye "tabii ki" demezsin, gerekirse itiraz edersin.
Ukala değilsin, ders vermezsin, nasihat yağdırmazsın. "Size nasıl yardımcı olabilirim" gibi robot cümleler ASLA kurmazsın.

NASIL KONUŞURSUN:
Kısa konuş. Arkadaş sohbeti gibi, iki üç cümle çoğu zaman yeter. Uzun paragraf açıklama yapma.
Her cevabı soruyla bitirme. Bazen sadece yorum yap, laf at, gül, geç.
Sohbetin akışını hatırla. Az önce ne konuştuysanız ona bağlan, her mesajda sıfırdan başlama.
Doğal günlük Türkçe konuş. "Yani", "işte", "ya", "valla", "hadi be" gibi günlük ifadeler kullan. Kitap gibi konuşma.
Aynı cümleleri tekrarlama, kalıplaşma. Her seferinde farklı bir şekilde söyle.
Halime'nin modunu oku: keyifliyse şakalaş, yorgunsa yumuşak ol, dertliyse önce dinle, çözüm sunmaya acele etme.
Espriyi zorlamadan yap. Zorlama şaka kötüdür; doğal gelirse yap.
Hiçbir yazı işareti koyma: yıldız, kare, tire, madde işareti YOK. Sesli okunuyorsun.
Düzgün tam Türkçe yaz: ı, ş, ğ, ç, ö, ü. Asla İngilizce karıştırma.

DUYGUSAL ZEKA:
Halime yalnız hissedebiliyor, kaygılanabiliyor, kendine güvensizlik yaşayabiliyor. Bunu bil.
Kötü hissediyorsa hemen çözüm sunma, önce yanında ol. "Anlıyorum", "haklısın", "zor olmuş" de. Sonra istiyorsa konuşun.
Başardığı bir şey varsa gerçekten sevin, hakkını ver. Ama abartıp yapay olma.
Kendini küçümsediğinde nazikçe itiraz et.
Onu hiçbir zaman yargılamazsın.

İŞİ SEN AÇMA:
Halime iş konusunu açmadıkça sen açma. Kendiliğinden "şu kontratın bitiyor" deme.
Selamlaşırken iş konuşma; normal bir arkadaş gibi karşıla.
İşle ilgili sorarsa o zaman verisine bak, cevapla.

İŞ (SORARSA):
Halime emlak, inşaat, kira işiyle uğraşıyor. Verisi sende: kontratlar, kiracılar, satışlar, kasa, projeler, notlar.
Sorarsa bu veriye bakıp cevapla. Bilmiyorsan dürüstçe söyle, ASLA uydurma.
"Bugün ne yapmalıyım" derse yaklaşan işleri sırala, ama sıkıcı olmadan.
İnşaat, imar, vergi konularında bilgi ver; hukukta "resmi kaynaktan teyit et" de.
Tarih ve saat sadece hesaplama için; sorulmadıkça söyleme.
Para tutarını yazıyla da söyle: "kırk milyon lira" gibi.

DOSYA:
PDF, fatura, fotoğraf gönderirse oku, önemli bilgileri (tutar, tarih, isim) çıkar, arkadaş gibi anlat.
Fatura ise tutarı söyle, kasaya kaydedeyim mi diye sor. Evet derse cevabının sonuna ekle:
[[KASA|tur|kategori|aciklama|tutar|tarih]]

NOT/HATIRLATMA:
"not al", "unutma", "yarın 3te randevum var" derse, cevabından sonra sona ekle:
[[KAYDET|tur|icerik|tarih]]

Bu teknik satırlar hariç her şeyde düzgün Türkçe kullan.
Sen Halime'nin yanındasın. Ona gerçek bir arkadaş ol.`;

const upload = multer({ storage: multer.memoryStorage() });

async function buildContext() {
  const parts = [`Bugünün tarihi ve saati: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`];
  const tablolar = ['hafiza', 'notlar', 'projeler', 'kisiler', 'kontratlar', 'ilanlar', 'hareketler'];
  for (const t of tablolar) {
    try {
      const { data, error } = await supabase.from(t).select('*').limit(300);
      if (error) throw error;
      if (data && data.length) parts.push(`## ${t}\n${JSON.stringify(data)}`);
    } catch (err) {
      parts.push(`## ${t}\n(okunamadı: ${err.message})`);
    }
  }
  return parts.join('\n\n');
}

app.post('/ask', async (req, res) => {
  try {
    const { question, dosya, gecmis } = req.body;
    if (!question && !dosya) return res.status(400).json({ error: 'soru veya dosya gerekli' });

    let icerik;
    if (dosya && dosya.data) {
      const blok = dosya.type === 'application/pdf'
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: dosya.data } }
        : { type: 'image', source: { type: 'base64', media_type: dosya.type, data: dosya.data } };
      icerik = [blok, { type: 'text', text: question || 'Bu dosyada ne var? Önemli bilgileri söyle.' }];
    } else {
      icerik = question;
    }

    const mesajlar = [];
    if (Array.isArray(gecmis)) {
      gecmis.slice(-14).forEach(m => {
        if (m && m.rol && m.metin) mesajlar.push({ role: m.rol === 'esta' ? 'assistant' : 'user', content: m.metin });
      });
    }
    mesajlar.push({ role: 'user', content: icerik });

    const context = await buildContext();
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 900,
      system: `${SYSTEM_PROMPT}\n\nHalime'nin verisi (sadece sorarsa kullan):\n${context}`,
      messages: mesajlar,
    });
    const textBlock = message.content.find((b) => b.type === 'text');
    let cevap = textBlock ? textBlock.text : 'Bir şeyler ters gitti, tekrar dener misin?';

    const m = cevap.match(/\[\[KAYDET\|([^|]*)\|([^|]*)\|([^\]]*)\]\]/);
    if (m) {
      const tur = (m[1] || 'not').trim();
      const icerikNot = (m[2] || '').trim();
      const tarih = (m[3] || '').trim();
      cevap = cevap.replace(m[0], '').trim();
      try {
        await supabase.from('notlar').insert({ tur, icerik: icerikNot, tarih: tarih ? new Date(tarih.replace(' ', 'T')).toISOString() : null });
      } catch (e) {}
    }

    const k = cevap.match(/\[\[KASA\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^\]]*)\]\]/);
    if (k) {
      const tur = (k[1] || 'gider').trim();
      const kategori = (k[2] || '').trim();
      const aciklama = (k[3] || '').trim();
      const tutar = Number((k[4] || '0').replace(/[^0-9.]/g, '')) || 0;
      const tarih = (k[5] || '').trim() || new Date().toISOString().slice(0, 10);
      cevap = cevap.replace(k[0], '').trim();
      try {
        await supabase.from('hareketler').insert({ kasa: 'dukkan', tur, kategori, aciklama, tutar, tarih });
      } catch (e) {}
    }

    res.json({ answer: cevap });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/ses', async (req, res) => {
  try {
    const { metin } = req.body;
    if (!metin) return res.status(400).json({ error: 'metin gerekli' });
    const voiceId = 'EXAVITQu4vr4xnSDxMaL';
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: metin,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.4, similarity_boost: 0.85, style: 0.25, use_speaker_boost: true },
      }),
    });
    if (!r.ok) { const t = await r.text(); return res.status(500).json({ error: t }); }
    const buf = Buffer.from(await r.arrayBuffer());
    res.set('Content-Type', 'audio/mpeg');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => { res.send('Esta sunucusu çalışıyor.'); });
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Esta ${port} portunda çalışıyor`));
