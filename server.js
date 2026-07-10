// server.js – Local dev server
// Chạy: npm run dev  →  mở http://localhost:3000

const http   = require('http');
const fs     = require('fs');
const path   = require('path');

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

// ── /api/chat handler ─────────────────────────────────────
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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
- Có thể dùng danh sách, in đậm các từ khóa quan trọng
- Câu trả lời súc tích, khoảng 150-400 từ, không quá dài
- Luôn trung thực, chính xác về mặt lịch sử và học thuật

TỪ CHỐI:
Nếu câu hỏi KHÔNG thuộc các chủ đề trên, hãy lịch sự từ chối và giải thích rằng bạn chỉ hỗ trợ các chủ đề học thuật về lịch sử, triết học, dân tộc và tôn giáo.`;

async function handleChat(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
  if (req.method !== 'POST')    { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return; }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    res.writeHead(500);
    res.end(JSON.stringify({ error: '⚠️ Chưa cấu hình GEMINI_API_KEY trong file .env.local' }));
    return;
  }

  // Read body
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { messages } = JSON.parse(body);
      if (!messages?.length) { res.writeHead(400); res.end(JSON.stringify({ error: 'Thiếu messages' })); return; }

      const contents = [
        { role: 'user',  parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'Xin chào! Tôi là trợ lý AI học thuật MLN131. Tôi sẵn sàng hỗ trợ bạn về lịch sử, triết học, dân tộc và tôn giáo.' }] },
        ...messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
      ];

      const gemRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        })
      });

      const data = await gemRes.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

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

  // Prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found: ' + urlPath); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
}

// ── HTTP Server ───────────────────────────────────────────
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/api/chat') {
    handleChat(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log('\n  ✅ Server đang chạy tại:');
  console.log(`  🌐 http://localhost:${PORT}\n`);
  console.log('  💬 Chat AI: /api/chat');
  console.log('  📄 Static:  /index.html\n');

  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here') {
    console.warn('  ⚠️  GEMINI_API_KEY chưa được cấu hình!');
    console.warn('  👉 Mở file .env.local và điền API key của bạn\n');
  } else {
    console.log('  🔑 GEMINI_API_KEY: đã cấu hình ✓\n');
  }
});
