// server.js – Local dev server
// Chạy: npm run dev  →  mở http://localhost:3000

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 3000;

// ── Load .env.local ──────────────────────────────────────
function loadEnv() {
  const envFile = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envFile)) return;
  const lines = fs.readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...vals] = trimmed.split('=');
    if (key) process.env[key.trim()] = vals.join('=').trim();
  }
}

loadEnv();

// ── MIME types ────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

// ── Groq API handler ──────────────────────────────────────
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

const SYSTEM_PROMPT = `Bạn là trợ lý AI học thuật của trang web MLN131 – Chủ nghĩa Xã hội Khoa học.

NHIỆM VỤ CỦA BẠN:
Chỉ trả lời các câu hỏi thuộc các chủ đề sau:
1. Lịch sử Việt Nam (dựng nước, giữ nước, các triều đại, kháng chiến...)
2. Lịch sử thế giới (cổ đại, trung đại, cận đại, hiện đại)
3. Triết học (triết học Mác-Lênin, tư tưởng Hồ Chí Minh, triết học phương Đông, phương Tây...)
4. Quan hệ dân tộc và tôn giáo ở Việt Nam
5. Chủ nghĩa xã hội khoa học (MLN131)
6. Tín ngưỡng, tôn giáo (Phật giáo, Công giáo, Cao Đài, Hòa Hảo, Tin Lành...)
7. Văn hóa, phong tục, tín ngưỡng truyền thống Việt Nam
8. Chính sách dân tộc, tôn giáo của Đảng và Nhà nước Việt Nam

PHONG CÁCH TRẢ LỜI:
- Trả lời bằng tiếng Việt, rõ ràng, học thuật nhưng dễ hiểu
- Câu trả lời súc tích, khoảng 150-400 từ
- Luôn trung thực, chính xác về mặt lịch sử

TỪ CHỐI:
Nếu câu hỏi KHÔNG thuộc các chủ đề trên, hãy lịch sự từ chối.

QUAN TRỌNG: Luôn trả lời bằng tiếng Việt.`;

async function handleChat(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
  if (req.method !== 'POST')    { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return; }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    res.writeHead(500);
    res.end(JSON.stringify({ error: '⚠️ Chưa cấu hình GROQ_API_KEY trong file .env.local' }));
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { messages } = JSON.parse(body);
      if (!messages?.length) { res.writeHead(400); res.end(JSON.stringify({ error: 'Thiếu messages' })); return; }

      const chatMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ];

      const groqRes = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ model: MODEL, messages: chatMessages, temperature: 0.7, max_tokens: 1024 })
      });

      const data = await groqRes.json();
      const text = data?.choices?.[0]?.message?.content;

      if (!text) { res.writeHead(500); res.end(JSON.stringify({ error: 'Không nhận được phản hồi từ AI.' })); return; }

      res.writeHead(200);
      res.end(JSON.stringify({ reply: text }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Lỗi server: ' + err.message }));
    }
  });
}

// ── Static file handler ───────────────────────────────────
function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(__dirname, urlPath);
  if (!filePath.startsWith(__dirname)) { res.writeHead(403); res.end('Forbidden'); return; }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found: ' + urlPath); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
}

// ── HTTP Server ───────────────────────────────────────────
const server = http.createServer((req, res) => {
  req.url.startsWith('/api/chat') ? handleChat(req, res) : serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log('\n  ✅ Server đang chạy tại:');
  console.log(`  🌐 http://localhost:${PORT}\n`);

  const key = process.env.GROQ_API_KEY;
  if (!key || key === 'your_groq_api_key_here') {
    console.warn('  ⚠️  GROQ_API_KEY chưa được cấu hình!');
    console.warn('  👉 Mở file .env.local và điền GROQ_API_KEY\n');
  } else {
    console.log('  🔑 GROQ_API_KEY: đã cấu hình ✓\n');
  }
});
