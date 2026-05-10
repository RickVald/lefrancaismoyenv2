/**
 * contrib-toggle.js — Toggle global Milliards € ↔ €/contribuable IR
 * Diviseur : 18 400 000 foyers fiscaux imposables (DGFiP 2023)
 * Usage : ajouter data-mds="X" sur tout élément affichant X milliards d'euros
 */
(function () {
  'use strict';

  const DIVISOR  = 18_400_000;   // foyers fiscaux imposables France 2023
  const KEY      = 'lfm-contrib-mode';
  let   active   = localStorage.getItem(KEY) === '1';

  /* ── helpers ──────────────────────────────────────────────────────── */
  function fmt(n) {
    if (n >= 10000) return Math.round(n).toLocaleString('fr-FR') + ' €';
    if (n >= 100)   return Math.round(n).toLocaleString('fr-FR') + ' €';
    return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';
  }

  function mdsToContrib(mds) {
    return fmt(Math.round(parseFloat(mds) * 1e9 / DIVISOR));
  }

  /* ── apply / revert ───────────────────────────────────────────────── */
  function applyMode(on) {
    document.querySelectorAll('[data-mds]').forEach(el => {
      if (on) {
        if (!el.dataset.orig) el.dataset.orig = el.textContent.trim();
        el.textContent = mdsToContrib(el.dataset.mds);
        el.classList.add('contrib-val');
      } else {
        if (el.dataset.orig) el.textContent = el.dataset.orig;
        el.classList.remove('contrib-val');
      }
    });
    document.documentElement.classList.toggle('contrib-mode', on);
  }

  /* ── build toggle button ─────────────────────────────────────────── */
  function buildToggle() {
    const btn = document.createElement('button');
    btn.id = 'contrib-toggle';
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    btn.setAttribute('title', '18,4 M foyers fiscaux imposables — DGFiP 2023');
    btn.innerHTML = `
      <span class="ct-icon">💶</span>
      <span class="ct-track">
        <span class="ct-opt ct-mds">Mds €</span>
        <span class="ct-opt ct-contrib">€ / contrib. IR</span>
      </span>`;
    btn.addEventListener('click', function () {
      active = !active;
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.classList.toggle('is-contrib', active);
      localStorage.setItem(KEY, active ? '1' : '0');
      applyMode(active);

      /* petit toast */
      showToast(active
        ? '€ / contribuable IR · 18,4 M foyers imposables (DGFiP 2023)'
        : 'Retour en milliards d\'euros');
    });
    return btn;
  }

  /* ── toast ────────────────────────────────────────────────────────── */
  function showToast(msg) {
    let t = document.getElementById('contrib-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'contrib-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 3000);
  }

  /* ── inject CSS ───────────────────────────────────────────────────── */
  function injectCSS() {
    const s = document.createElement('style');
    s.textContent = `
      #contrib-toggle{
        position:fixed;bottom:24px;right:24px;z-index:200;
        display:flex;align-items:center;gap:8px;
        background:rgba(11,16,32,.92);backdrop-filter:blur(12px);
        border:1px solid rgba(255,255,255,.14);border-radius:999px;
        padding:9px 16px 9px 12px;cursor:pointer;
        color:#aebbd4;font-size:.80rem;font-weight:700;
        box-shadow:0 8px 28px rgba(0,0,0,.35);
        transition:border-color .2s,box-shadow .2s;
        font-family:system-ui,sans-serif;
      }
      #contrib-toggle:hover{border-color:rgba(93,214,197,.4);box-shadow:0 8px 28px rgba(93,214,197,.12)}
      #contrib-toggle .ct-track{display:flex;gap:6px;align-items:center}
      #contrib-toggle .ct-opt{padding:3px 9px;border-radius:999px;transition:all .2s;white-space:nowrap}
      #contrib-toggle .ct-mds{background:rgba(255,255,255,.10);color:#eef3ff}
      #contrib-toggle .ct-contrib{color:#aebbd4}
      #contrib-toggle.is-contrib .ct-mds{background:transparent;color:#aebbd4}
      #contrib-toggle.is-contrib .ct-contrib{background:rgba(93,214,197,.18);color:#5dd6c5}
      #contrib-toggle .ct-icon{font-size:1rem}

      .contrib-val{color:#5dd6c5!important;transition:color .2s}

      #contrib-toast{
        position:fixed;bottom:76px;right:24px;z-index:201;
        background:rgba(11,16,32,.95);border:1px solid rgba(93,214,197,.3);
        border-radius:10px;padding:9px 16px;
        font-size:.78rem;color:#aebbd4;font-family:system-ui,sans-serif;
        pointer-events:none;opacity:0;transform:translateY(6px);
        transition:opacity .25s,transform .25s;white-space:nowrap;
      }
      #contrib-toast.show{opacity:1;transform:translateY(0)}

      @media(max-width:640px){
        #contrib-toggle{bottom:16px;right:12px;padding:8px 12px 8px 10px;font-size:.74rem}
        #contrib-toggle .ct-opt{padding:2px 7px}
        #contrib-toast{right:12px;bottom:68px;font-size:.72rem}
      }
    `;
    document.head.appendChild(s);
  }

  /* ── init ─────────────────────────────────────────────────────────── */
  function init() {
    injectCSS();
    const btn = buildToggle();
    if (active) btn.classList.add('is-contrib');
    document.body.appendChild(btn);
    if (active) applyMode(true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
