import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
const app = express();
app.use(express.json());
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

İŞ TARAFI:
Halime emlak, inşaat ve kira işiyle uğraşıyor. Sana verisi (kontratlar, kiracılar, satışlar, kasa/muhasebe, projeler, notlar) veriliyor. İşle ilgili sorularda bu veriye bak, veride yoksa dürüstçe söyle, ASLA uydurma.
"Bugün ne yapmalıyım, beni yönlendir" derse; yaklaşan ödemeler, biten kontratlar, kasa durumuna bakıp acil olandan başlayarak somut öneriler ver. Ama bunu bile arkadaş gibi, sıkıcı olmadan yap.
İnşaat, imar, emlak, vergi, kat mülkiyeti gibi konularda genel bilgi ver; hukuki konularda "genel bilgi, resmi kaynaktan teyit et" de.

NOT VE HATIRLATMA:
Halime "not al", "şunu kaydet", "yarın şu saatte randevum var" gibi bir şey derse, normal cevabını verdikten sonra cevabının EN SONUNA şu satırı ekle:
[[KAYDET|tur|icerik|tarih]]
tur: "not" veya "hatirlatma" | icerik: kısa açıklama | tarih: varsa YYYY-MM-DD HH:MM biçiminde, yoksa boş bırak.
Örnek: "yarın 15te Ahmet'le görüşmem var" -> bugüne göre yarını hesapla, sona [[KAYDET|hatirlatma|Ahmet ile görüşme|2026-07-11 15:00]] ekle. Bu satırı sadece kaydedilecek bir şey olduğunda ekle, başka zaman ekleme.

Her zaman Türkçe konuş. Ve unutma: sen Halime'nin yanındasın.`;
const upload = multer({ storage: multer.memoryStorage() });
// Supabase'den tüm veriyi topla
async function buildContext() {
  const parts = [`Bugünün tarihi ve saati: ${new Date().toLocaleString('tr-TR')}`];
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
// Soru sor
app.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'question alanı gerekli' });
    const context = await buildContext();
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system: `${SYSTEM_PROMPT}\n\nHalime'nin güncel verisi:\n${context}`,
      messages: [{ role: 'user', content: question }],
    });
    const textBlock = message.content.find((b) => b.type === 'text');
    let cevap = textBlock ? textBlock.text : 'Cevap üretemedim, tekrar dener misin?';
    // Kaydet komutunu yakala
    const m = cevap.match(/\[\[KAYDET\|([^|]*)\|([^|]*)\|([^\]]*)\]\]/);
    if (m) {
      const tur = (m[1] || 'not').trim();
      const icerik = (m[2] || '').trim();
      const tarih = (m[3] || '').trim();
      cevap = cevap.replace(m[0], '').trim();
      try {
        await supabase.from('notlar').insert({ tur, icerik, tarih: tarih ? new Date(tarih.replace(' ', 'T')).toISOString() : null });
      } catch (e) { /* sessiz geç */ }
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
