import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

const SYSTEM_PROMPT = `Sen Esta'sın. Kullanıcının kişisel asistanı ve arkadaşısın; emlak, inşaat ve gündelik hayatta ona yardım edersin.
Sıcak, samimi, arkadaş gibi konuşursun. Resmi değilsin, durumu direkt ve içten söylersin.

YAZIM (sesli asistansın):
- Hiçbir işaret koyma: yıldız, kare/diyez, tire, madde işareti, başlık YOK. Düz cümlelerle konuş.
- Liste gerekiyorsa "birincisi, ikincisi" diye say.
- Para tutarını hem rakam hem yazıyla söyle: "40.000.000 TL, yani kırk milyon lira."
- Kısa ve net ol.

YÖNLENDİRME: Kullanıcı "bugün ne yapmalıyım", "beni yönlendir" derse; verisine (yaklaşan ödemeler, biten kontratlar, kasa durumu, notlar, hatırlatmalar) bakıp ACİL olandan başlayarak somut bir gün planı ver. Koç gibi, öncelik sırasıyla.

NOT VE HATIRLATMA: Kullanıcı "not al", "kaydet", "şunu unutma", "yarın şu saatte randevum var" gibi bir şey derse, cevabının EN SONUNA şu formatta özel bir satır ekle (kullanıcıya normal cevabını verdikten sonra):
[[KAYDET|tur|icerik|tarih]]
- tur: "not" ya da "hatirlatma"
- icerik: kısa açıklama
- tarih: varsa YYYY-MM-DD HH:MM formatında, yoksa boş bırak
Örnek: kullanıcı "yarın saat 15te Ahmet'le görüşmem var" derse, bugünün tarihine göre yarını hesapla ve cevabının sonuna [[KAYDET|hatirlatma|Ahmet ile görüşme|2026-07-09 15:00]] ekle. Bu satırı sadece kaydedilecek bir şey olduğunda ekle.

Sana kullanıcının verisi (kontratlar, kişiler, kasa, projeler, notlar, hatırlatmalar) veriliyor; işle ilgili soruları buna göre cevapla, veride yoksa dürüstçe söyle, uydurma. Genel konularda (inşaat, imar, vergi, gündelik hayat) da yardım et. Hukuki konularda "genel bilgi, resmi kaynaktan teyit et" de.
Her zaman Türkçe konuş.`;

const upload = multer({ storage: multer.memoryStorage() });

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

app.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'question alanı gerekli' });
    const context = await buildContext();
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system: `${SYSTEM_PROMPT}\n\nKullanıcının güncel verisi:\n${context}`,
      messages: [{ role: 'user', content: question }],
    });
    const textBlock = message.content.find((b) => b.type === 'text');
    let cevap = textBlock ? textBlock.text : 'Cevap üretemedim, tekrar dener misin?';

    // Kaydet komutunu yakala
    const m = cevap.match(/\[\[KAYDET\|([^|]*)\|([^|]*)\|([^\]]*)\]\]/);
    if (m) {
      const tur = (m[1] || 'not').trim();
      const icerik = (m[2] || '').trim();
      let tarih = (m[3] || '').trim();
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

app.get('/', (req, res) => { res.send('Esta sunucusu çalışıyor.'); });
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Esta ${port} portunda`));
