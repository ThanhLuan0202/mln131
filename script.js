/* ============================================================
   SCRIPT.JS – Interaction & Animation
   ============================================================ */

'use strict';

// ── Lucide icons init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  initScrollProgress();
  initNavbar();
  initMobileMenu();
  initRevealObserver();
  initCounterObserver();
  initBarObserver();
  initBackToTop();
  initActiveNavHighlight();
  initButtonRipple();
});

/* ============================================================
   SCROLL PROGRESS BAR
   ============================================================ */
function initScrollProgress() {
  const bar = document.getElementById('scroll-progress-bar');
  if (!bar) return;

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = pct + '%';
  }, { passive: true });
}

/* ============================================================
   NAVBAR – scroll effect
   ============================================================ */
function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

/* ============================================================
   MOBILE MENU
   ============================================================ */
function initMobileMenu() {
  const toggle = document.getElementById('nav-toggle');
  const links  = document.getElementById('nav-links');
  const nav    = document.getElementById('navbar');
  if (!toggle || !links || !nav) return;

  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });

  // Close on link click
  links.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

/* ============================================================
   SCROLL REVEAL (IntersectionObserver)
   ============================================================ */
function initRevealObserver() {
  // Trigger reveal-items when their parent reveal-grid is visible
  const gridEls = document.querySelectorAll('.reveal-grid');
  const revealEls = document.querySelectorAll('.reveal:not(.reveal-grid)');

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Also reveal child items
        entry.target.querySelectorAll('.reveal-item').forEach(item => {
          item.classList.add('visible');
        });
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -60px 0px'
  });

  revealEls.forEach(el => obs.observe(el));
  gridEls.forEach(el => obs.observe(el));

  // Standalone reveal-items not inside reveal-grid
  const standaloneItems = document.querySelectorAll('.reveal-item:not(.reveal-grid .reveal-item)');
  standaloneItems.forEach(el => obs.observe(el));
}

/* ============================================================
   ANIMATED COUNTERS
   ============================================================ */
function initCounterObserver() {
  const counters = document.querySelectorAll('[data-target]');
  if (!counters.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => obs.observe(el));
}

function animateCounter(el) {
  const target  = parseInt(el.dataset.target, 10);
  const suffix  = el.dataset.suffix || '';
  const dur     = 1800;
  const start   = performance.now();

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / dur, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(eased * target);
    el.textContent = current + (progress >= 1 ? suffix : '');
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

/* ============================================================
   ANIMATED BAR FILLS
   ============================================================ */
function initBarObserver() {
  const bars = document.querySelectorAll('.bar-fill');
  if (!bars.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Small delay for stagger
        const idx = [...bars].indexOf(entry.target);
        setTimeout(() => {
          entry.target.classList.add('animated');
        }, idx * 120);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  bars.forEach(b => obs.observe(b));
}

/* ============================================================
   BACK TO TOP
   ============================================================ */
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 500);
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ============================================================
   ACTIVE NAV HIGHLIGHT (scroll spy)
   ============================================================ */
function initActiveNavHighlight() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          const href = link.getAttribute('href');
          link.classList.toggle('active', href === `#${id}`);
        });
      }
    });
  }, {
    rootMargin: `-${parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) + 20}px 0px -60% 0px`,
    threshold: 0
  });

  sections.forEach(s => obs.observe(s));
}

/* ============================================================
   BUTTON RIPPLE EFFECT
   ============================================================ */
function initButtonRipple() {
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      const rect   = this.getBoundingClientRect();
      const x      = e.clientX - rect.left;
      const y      = e.clientY - rect.top;
      const ripple = document.createElement('span');

      ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: rgba(255,255,255,0.25);
        width: 4px; height: 4px;
        left: ${x}px; top: ${y}px;
        transform: translate(-50%,-50%) scale(0);
        animation: rippleAnim 0.55s ease-out forwards;
        pointer-events: none;
      `;

      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });

  // Inject ripple keyframe if not already present
  if (!document.getElementById('ripple-style')) {
    const style = document.createElement('style');
    style.id = 'ripple-style';
    style.textContent = `
      @keyframes rippleAnim {
        to { transform: translate(-50%,-50%) scale(80); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

/* ============================================================
   SMOOTH SCROLL for anchor links (fallback for older browsers)
   ============================================================ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
