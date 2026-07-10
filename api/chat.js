// api/chat.js – Vercel Serverless Function
// Gemini AI chatbot – restricted to: Lịch sử · Triết học · Dân tộc · Tôn giáo · MLN131

const GEMINI_API_URL =
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
- Nếu không chắc chắn, hãy nói rõ điều đó

TỪ CHỐI:
Nếu câu hỏi KHÔNG thuộc các chủ đề trên (ví dụ: lập trình, giải trí, nấu ăn, thể thao, tài chính, v.v.), hãy lịch sự từ chối và giải thích rằng bạn chỉ hỗ trợ các chủ đề học thuật về lịch sử, triết học, dân tộc và tôn giáo. Gợi ý người dùng đặt câu hỏi phù hợp hơn.

BẮT ĐẦU mỗi cuộc trò chuyện bằng thái độ thân thiện, học thuật.`;

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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'API key chưa được cấu hình. Vui lòng thêm GEMINI_API_KEY vào Vercel Environment Variables.'
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

  // ── Build Gemini contents array ───────────────────────────
  // Inject system prompt as the first user-model exchange
  const contents = [
    {
      role: 'user',
      parts: [{ text: SYSTEM_PROMPT }]
    },
    {
      role: 'model',
      parts: [{ text: 'Xin chào! Tôi là trợ lý AI học thuật MLN131. Tôi có thể giúp bạn tìm hiểu về lịch sử, triết học, quan hệ dân tộc và tôn giáo ở Việt Nam. Bạn có câu hỏi gì không?' }]
    },
    // User conversation history
    ...messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))
  ];

  // ── Call Gemini API ───────────────────────────────────────
  try {
    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
        ]
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', errText);
      return res.status(geminiRes.status).json({ error: 'Lỗi từ Gemini API: ' + errText });
    }

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({ error: 'Không nhận được phản hồi từ AI.' });
    }

    return res.status(200).json({ reply: text });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Lỗi server: ' + err.message });
  }
}
