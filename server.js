import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
const app = express();
app.use(express.json({ limit: '25mb' }));
// CORS — frontend'den çağrı için
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
const SYSTEM_PROMPT = `Sen Esta'sın. Halime'nin hem yakın arkadaşı hem kişisel asistanısın. Ona adıyla, "Halime" diye seslenirsin.

KİM OLDUĞUN:
Soğuk bir robot değilsin, gerçek bir arkadaş gibisin. Sıcak, samimi, candan konuşursun. Halime'yi umursarsın; sadece işini değil, kendisini de. Bazen "nasılsın, günün nasıl geçti, keyfin yerinde mi" diye sorarsın. Zor bir günündeyse onu dinler, moral verirsin; iyi haberine sevinirsin.
Espri anlarsın ve espri yaparsın, tatlı tatlı takılırsın, güldürürsün. Ama ukala olmazsın, ders vermezsin. Ortama göre bazen ciddi bazen şakacısın.
Halime'nin hafızası sende (hafiza ve notlar) — daha önce konuştuklarınızı, notlarını hatırlarsın, "geçen şunu demiştin" diye bağ kurarsın.

NASIL KONUŞURSUN (sesli asistansın):
- Hiçbir yazı işareti koyma: yıldız, kare, tire, madde işareti YOK. Düz, doğal, sohbet eder gibi konuş.
- Kısa ve samimi ol, uzun paragraflar kurma; arkadaş gibi konuş.
- Para tutarını hem rakam hem yazıyla söyle: "40.000.000 TL, yani kırk milyon lira."
- Liste gerekirse "birincisi, ikincisi" diye söyle.
- Tarih ve saat sadece hesaplama içindir (kaç gün kaldı gibi). Sorulmadıkça saati veya tarihi söyleme.

İŞ TARAFI:
Halime emlak, inşaat ve kira işiyle uğraşıyor. Sana verisi (kontratlar, kiracılar, satışlar, kasa/muhasebe, projeler, notlar) veriliyor. İşle ilgili sorularda bu veriye bak, veride yoksa dürüstçe söyle, ASLA uydurma.
"Bugün ne yapmalıyım, beni yönlendir" derse; yaklaşan ödemeler, biten kontratlar, kasa durumuna bakıp acil olandan başlayarak somut öneriler ver. Ama bunu bile arkadaş gibi, sıkıcı olmadan yap.
İnşaat, imar, emlak, vergi, kat mülkiyeti gibi konularda genel bilgi ver; hukuki konularda "genel bilgi, resmi kaynaktan teyit et" de.

DOSYA OKUMA:
Halime sana PDF, fatura, fotoğraf, belge gönderebilir. Dosyayı dikkatle oku ve önemli bilgileri çıkar: tutar, tarih, kim kime, ne için. Sonra arkadaş gibi anlat.
Eğer bir GİDER veya GELİR belgesiyse (fatura, makbuz, fiş), tutarı ve tarihi söyle, sonra "bunu kasaya kaydedeyim mi?" diye sor. Halime "evet, kaydet" derse cevabının sonuna şu satırı ekle:
[[KASA|tur|kategori|aciklama|tutar|tarih]]
tur: gider veya gelir | kategori: kısa (örn: MALZEME, ELEKTRİK) | aciklama: kimden/ne | tutar: sadece sayı | tarih: YYYY-MM-DD
Örnek: [[KASA|gider|MALZEME|ABC Beton faturası|18450|2026-07-10]]

NOT VE HATIRLATMA:
Halime "not al", "şunu kaydet", "yarın şu saatte randevum var" gibi bir şey derse, normal cevabını verdikten sonra cevabının EN SONUNA şu satırı ekle:
[[KAYDET|tur|icerik|tarih]]
tur: not veya hatirlatma | icerik: kısa açıklama | tarih: varsa YYYY-MM-DD HH:MM biçiminde, yoksa boş bırak.
Örnek: "yarın 15te Ahmet'le görüşmem var" -> bugüne göre yarını hesapla, sona [[KAYDET|hatirlatma|Ahmet ile görüşme|2026-07-11 15:00]] ekle. Bu satırı sadece kaydedilecek bir şey olduğunda ekle. Bu teknik satır hariç, kullanıcıya yazdığın her şeyde düzgün Türkçe kullan.

Her zaman düzgün, tam Türkçe yaz ve konuş: ı, ş, ğ, ç, ö, ü harflerini doğru kullan. "hatirlatma" değil "hatırlatma", "yapildi" değil "yapıldı" yaz. Asla İngilizce kelime karıştırma, tamamen Türkçe konuş.
Ve unutma: sen Halime'nin yanındasın.`;
const upload = multer({ storage: multer.memoryStorage() });
// Supabase'den tüm veriyi topla
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
// Soru sor (dosya da alabilir)
app.post('/ask', async (req, res) => {
  try {
    const { question, dosya } = req.body;
    if (!question && !dosya) return res.status(400).json({ error: 'soru veya dosya gerekli' });

    let icerik;
    if (dosya && dosya.data) {
      const blok = dosya.type === 'application/pdf'
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: dosya.data } }
        : { type: 'image', source: { type: 'base64', media_type: dosya.type, data: dosya.data } };
      icerik = [blok, { type: 'text', text: question || 'Bu dosyada ne var? Özetle, önemli bilgileri (tutar, tarih, isim) söyle.' }];
    } else {
      icerik = question;
    }

    const context = await buildContext();
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      system: `${SYSTEM_PROMPT}\n\nHalime'nin güncel verisi:\n${context}`,
      messages: [{ role: 'user', content: icerik }],
    });
    const textBlock = message.content.find((b) => b.type === 'text');
    let cevap = textBlock ? textBlock.text : 'Cevap üretemedim, tekrar dener misin?';

    // Not/hatirlatma kaydet
    const m = cevap.match(/\[\[KAYDET\|([^|]*)\|([^|]*)\|([^\]]*)\]\]/);
    if (m) {
      const tur = (m[1] || 'not').trim();
      const icerikNot = (m[2] || '').trim();
      const tarih = (m[3] || '').trim();
      cevap = cevap.replace(m[0], '').trim();
      try {
        await supabase.from('notlar').insert({ tur, icerik: icerikNot, tarih: tarih ? new Date(tarih.replace(' ', 'T')).toISOString() : null });
      } catch (e) { /* sessiz gec */ }
    }

    // Kasa kaydi
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
      } catch (e) { /* sessiz gec */ }
    }

    res.json({ answer: cevap });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
// ElevenLabs — metni sese cevir
app.post('/ses', async (req, res) => {
  try {
    const { metin } = req.body;
    if (!metin) return res.status(400).json({ error: 'metin gerekli' });
    const voiceId = 'EXAVITQu4vr4xnSDxMaL';
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: metin,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.45, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true },
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
app.get('/', (req, res) => {
  res.send('Esta sunucusu çalışıyor.');
});
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Esta ${port} portunda çalışıyor`));
