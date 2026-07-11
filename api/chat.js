// api/chat.js – Vercel Serverless Function
// Groq AI chatbot – restricted to: Lịch sử · Triết học · Dân tộc · Tôn giáo · MLN131

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant'; // Free tier: 14,400 req/day

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
- Có thể dùng danh sách, in đậm các từ khóa quan trọng bằng **text**
- Câu trả lời súc tích, khoảng 150-400 từ, không quá dài
- Luôn trung thực, chính xác về mặt lịch sử và học thuật
- Nếu không chắc chắn, hãy nói rõ điều đó

TỪ CHỐI:
Nếu câu hỏi KHÔNG thuộc các chủ đề trên (ví dụ: lập trình, giải trí, nấu ăn, thể thao, tài chính, v.v.), hãy lịch sự từ chối và giải thích rằng bạn chỉ hỗ trợ các chủ đề học thuật về lịch sử, triết học, dân tộc và tôn giáo.

QUAN TRỌNG: Luôn trả lời bằng tiếng Việt, kể cả khi người dùng hỏi bằng tiếng Anh.`;

module.exports = async function handler(req, res) {
  // ── CORS headers ──────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Validate API key ──────────────────────────────────────
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: '⚠️ Chưa cấu hình GROQ_API_KEY trong Vercel Environment Variables.'
    });
  }

  // ── Parse body ────────────────────────────────────────────
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { messages } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Thiếu trường messages' });
  }

  // ── Build OpenAI-compatible messages ─────────────────────
  const chatMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map(m => ({ role: m.role, content: m.content }))
  ];

  // ── Call Groq API ─────────────────────────────────────────
  try {
    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: chatMessages,
        temperature: 0.7,
        max_tokens: 1024,
        stream: false
      })
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq API error:', errText);
      if (groqRes.status === 429) {
        return res.status(429).json({
          error: '⏳ AI đang bận, vui lòng thử lại sau ít giây!'
        });
      }
      return res.status(groqRes.status).json({ error: 'Lỗi từ Groq API: ' + errText });
    }

    const data = await groqRes.json();
    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      return res.status(500).json({ error: 'Không nhận được phản hồi từ AI.' });
    }

    return res.status(200).json({ reply: text });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Lỗi server: ' + err.message });
  }
};
