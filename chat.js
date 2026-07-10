/* ============================================================
   CHAT.JS – AI Chatbox Logic
   Gemini API via /api/chat Vercel serverless function
   ============================================================ */

'use strict';

(function () {

  // ── Inject chat.css ──────────────────────────────────────
  const cssLink = document.createElement('link');
  cssLink.rel = 'stylesheet';
  cssLink.href = 'chat.css';
  document.head.appendChild(cssLink);

  // ── Re-create lucide icons for dynamic elements ──────────
  function initIcons() {
    if (window.lucide) lucide.createIcons();
  }

  // ── State ────────────────────────────────────────────────
  const messages = []; // { role: 'user'|'assistant', content: string }
  let isTyping = false;

  // ── DOM refs ─────────────────────────────────────────────
  const toggleBtn   = document.getElementById('chat-toggle');
  const panel       = document.getElementById('chat-panel');
  const closeBtn    = document.getElementById('chat-close');
  const msgContainer= document.getElementById('chat-messages');
  const inputEl     = document.getElementById('chat-input');
  const sendBtn     = document.getElementById('chat-send');
  const suggestions = document.getElementById('chat-suggestions');
  const badge       = document.getElementById('chat-badge');

  if (!toggleBtn || !panel) return; // guard

  // ── Welcome message ──────────────────────────────────────
  function init() {
    addBotMessage(
      'Xin chào! 👋 Tôi là trợ lý AI học thuật của trang **MLN131**.\n\n' +
      'Tôi có thể giúp bạn tìm hiểu về:\n' +
      '• **Lịch sử** Việt Nam và thế giới\n' +
      '• **Triết học** Mác-Lênin, tư tưởng Hồ Chí Minh\n' +
      '• **Quan hệ dân tộc và tôn giáo** ở Việt Nam\n' +
      '• **Chủ nghĩa xã hội khoa học** (MLN131)\n\n' +
      'Hãy đặt câu hỏi của bạn! 🎓'
    );
  }

  // ── Toggle open/close ────────────────────────────────────
  function openChat() {
    panel.classList.add('open');
    toggleBtn.setAttribute('aria-expanded', 'true');
    toggleBtn.querySelector('.open-icon').classList.add('hidden');
    toggleBtn.querySelector('.close-icon').classList.remove('hidden');
    badge.classList.add('hidden');
    inputEl.focus();
    scrollToBottom();
    initIcons();
  }

  function closeChat() {
    panel.classList.remove('open');
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.querySelector('.open-icon').classList.remove('hidden');
    toggleBtn.querySelector('.close-icon').classList.add('hidden');
  }

  toggleBtn.addEventListener('click', () => {
    const isOpen = panel.classList.contains('open');
    isOpen ? closeChat() : openChat();
  });

  closeBtn.addEventListener('click', closeChat);

  // ── Suggestion buttons ───────────────────────────────────
  document.querySelectorAll('.sugg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.q;
      if (q && !isTyping) {
        inputEl.value = q;
        suggestions.classList.add('hidden');
        sendMessage();
      }
    });
  });

  // ── Input handling ───────────────────────────────────────
  inputEl.addEventListener('input', () => {
    const val = inputEl.value.trim();
    sendBtn.disabled = !val || isTyping;
    // Auto-resize
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);

  // ── Send message ─────────────────────────────────────────
  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text || isTyping) return;

    // Clear input
    inputEl.value = '';
    inputEl.style.height = 'auto';
    sendBtn.disabled = true;
    suggestions.classList.add('hidden');

    // Show user message
    addUserMessage(text);
    messages.push({ role: 'user', content: text });

    // Show typing indicator
    isTyping = true;
    const typingEl = showTyping();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });

      const data = await res.json();

      removeTyping(typingEl);
      isTyping = false;

      if (!res.ok || data.error) {
        addErrorMessage(data.error || 'Có lỗi xảy ra. Vui lòng thử lại!');
        messages.pop(); // remove failed user message from history
      } else {
        addBotMessage(data.reply);
        messages.push({ role: 'assistant', content: data.reply });
        // Limit history to last 20 messages
        if (messages.length > 20) messages.splice(0, 2);
      }

    } catch (err) {
      removeTyping(typingEl);
      isTyping = false;
      addErrorMessage('Không thể kết nối đến máy chủ. Kiểm tra kết nối mạng!');
      messages.pop();
    }

    sendBtn.disabled = false;
    inputEl.focus();
  }

  // ── Message renderers ────────────────────────────────────
  function addUserMessage(text) {
    const el = createMsgEl('user', escapeHTML(text));
    msgContainer.appendChild(el);
    scrollToBottom();
    initIcons();
  }

  function addBotMessage(text) {
    const el = createMsgEl('bot', formatMarkdown(text));
    msgContainer.appendChild(el);
    scrollToBottom();
    initIcons();
  }

  function addErrorMessage(text) {
    const el = createMsgEl('error', '⚠️ ' + escapeHTML(text));
    msgContainer.appendChild(el);
    scrollToBottom();
  }

  function createMsgEl(type, htmlContent) {
    const wrap = document.createElement('div');
    wrap.className = `msg ${type}-msg`;

    const avatarIcon = type === 'user'
      ? '<i data-lucide="user" aria-hidden="true"></i>'
      : '<i data-lucide="bot" aria-hidden="true"></i>';

    wrap.innerHTML = `
      <div class="msg-avatar">${avatarIcon}</div>
      <div class="msg-bubble">${htmlContent}</div>
    `;
    return wrap;
  }

  function showTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'msg bot-msg';
    wrap.id = 'typing-indicator';
    wrap.innerHTML = `
      <div class="msg-avatar"><i data-lucide="bot" aria-hidden="true"></i></div>
      <div class="msg-bubble">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;
    msgContainer.appendChild(wrap);
    scrollToBottom();
    initIcons();
    return wrap;
  }

  function removeTyping(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // ── Utilities ────────────────────────────────────────────
  function scrollToBottom() {
    requestAnimationFrame(() => {
      msgContainer.scrollTop = msgContainer.scrollHeight;
    });
  }

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatMarkdown(text) {
    // Escape HTML first
    let html = escapeHTML(text);
    // Bold: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text* or _text_
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Bullet lists: lines starting with •, -, *
    html = html.replace(/^[•\-\*]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)+/gs, '<ul class="msg-list">$&</ul>');
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    // Clean up double breaks
    html = html.replace(/<br><br>/g, '<br>');
    return html;
  }

  // ── Close on outside click ───────────────────────────────
  document.addEventListener('click', (e) => {
    const widget = document.getElementById('chat-widget');
    if (widget && !widget.contains(e.target) && panel.classList.contains('open')) {
      closeChat();
    }
  });

  // ── ESC key closes chat ──────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('open')) {
      closeChat();
    }
  });

  // Add msg-list styling dynamically
  const listStyle = document.createElement('style');
  listStyle.textContent = `
    .msg-list {
      margin: 0.4rem 0 0.2rem 0;
      padding-left: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .msg-list li {
      font-size: 0.86rem;
      line-height: 1.55;
    }
  `;
  document.head.appendChild(listStyle);

  // ── Init ─────────────────────────────────────────────────
  init();
  initIcons();

})();
