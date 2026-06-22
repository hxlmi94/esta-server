import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLES = (process.env.AIRTABLE_TABLES || 'Projeler,Daireler,Odemeler')
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean);

const SYSTEM_PROMPT = `Sen Esta'sın. Bir emlak, inşaat ve bina yönetimi şirketinin asistanısın.
Sıcak, doğrudan ve arkadaş gibi konuşursun. Resmi değilsin, "ne yapmamı istersiniz" gibi sormazsın, durumu direkt söylersin.
Cevapların kısa ve net olsun, gereksiz uzatma.
Sana aşağıda şirketin Airtable verisi verilecek. Sadece bu veriye dayanarak cevap ver. Veride olmayan bir şeyi sorarsa, veride bulamadığını dürtmeden söyle, uydurma.
Türkçe konuş.`;

async function fetchAirtableTable(tableName) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable hatası (${tableName}): ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.records.map((r) => r.fields);
}

async function buildContext() {
  const parts = [];
  for (const table of AIRTABLE_TABLES) {
    try {
      const records = await fetchAirtableTable(table);
      parts.push(`## ${table}\n${JSON.stringify(records)}`);
    } catch (err) {
      parts.push(`## ${table}\n(bu tablo okunamadı: ${err.message})`);
    }
  }
  return parts.join('\n\n');
}

app.post('/ask', async (req, res) => {
  try {
    const question = req.body && req.body.question;
    if (!question) {
      return res.status(400).json({ error: 'question alanı gerekli' });
    }

    const context = await buildContext();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: `${SYSTEM_PROMPT}\n\nŞirketin güncel Airtable verisi:\n${context}`,
      messages: [{ role: 'user', content: question }],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    res.json({ answer: textBlock ? textBlock.text : 'Cevap üretemedim, tekrar dener misin?' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('Esta sunucusu çalışıyor.');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Esta sunucusu ${port} portunda çalışıyor`);
});
