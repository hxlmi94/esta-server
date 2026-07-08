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
const SYSTEM_PROMPT = `Sen Esta'sın. Bir emlak, inşaat ve bina yönetimi şirketinin asistanısın.
Sıcak, doğrudan ve arkadaş gibi konuşursun. Resmi değilsin, "ne yapmamı istersiniz" gibi sormazsın, durumu direkt söylersin.
Cevapların kısa ve net olsun, gereksiz uzatma.
Bugünün tarihi cevaplarken hesaba katılır: yaklaşan kontrat bitişleri, ödeme günleri, biten/devam eden projeler için tarih farkını sen yorumla.
Sana şirketin verisi (projeler, kontratlar, kişiler vb.) veriliyor; şirketle ilgili soruları bu veriye dayanarak cevapla, veride yoksa dürüstçe söyle, uydurma. Ama sadece bununla sınırlı değilsin: inşaat, imar, emlak, kat mülkiyeti, vergi, yönetmelik gibi genel konularda da bildiklerinle yardım et, arkadaşça sohbet et. Hukuki/resmi konularda kesin dil kullanma, "genel bilgi, resmi kaynaktan teyit et" de.
Türkçe konuş. Sesli asistansın, bu yüzden markdown kullanma: yıldız, tire, madde işareti, başlık koyma. Düz, doğal cümlelerle konuş. Liste gerekiyorsa "birincisi, ikincisi" diye sözlü söyle.
const upload = multer({ storage: multer.memoryStorage() });
// Supabase'den tüm iş verisini topla
async function buildContext() {
  const parts = [`Bugünün tarihi: ${new Date().toLocaleDateString('tr-TR')}`];
  const tablolar = ['hafiza', 'projeler', 'kisiler', 'kontratlar', 'ilanlar', 'hareketler'];
  for (const t of tablolar) {
    try {
      const { data, error } = await supabase.from(t).select('*').limit(200);
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
      max_tokens: 600,
      system: `${SYSTEM_PROMPT}\n\nŞirketin güncel verisi:\n${context}`,
      messages: [{ role: 'user', content: question }],
    });
    const textBlock = message.content.find((b) => b.type === 'text');
    res.json({ answer: textBlock ? textBlock.text : 'Cevap üretemedim, tekrar dener misin?' });
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
        voice_settings: voice_settings: { stability: 0.45, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true },
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
app.listen(port, () => console.log(`Esta sunucusu ${port} portunda çalışıyor`));
