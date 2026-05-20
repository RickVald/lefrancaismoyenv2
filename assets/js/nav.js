/* nav.js — Dropdown toggle + traduction nav + lang-switch normalisé */
(function () {

  /* ── Traductions nav desktop ──────────────────────────────────── */
  var NAV_T = {
    fr: { analyses:'Analyses', fiscalite:'Fiscalité', outils:'Outils', elections:'Élections', questions:'Questions', apropos:'À propos' },
    en: { analyses:'Analyses', fiscalite:'Taxation',  outils:'Tools',  elections:'Elections', questions:'Questions', apropos:'About'    }
  };

  function applyNavLang(lang) {
    var t = NAV_T[lang] || NAV_T.fr;

    /* Bouton dropdown "Analyses ▼" — ciblé par data-nav */
    var analysesBtn = document.querySelector('[data-nav="analyses"]');
    if (analysesBtn) {
      var caret = analysesBtn.querySelector('.nav-caret');
      analysesBtn.textContent = t.analyses + ' ';
      if (caret) analysesBtn.appendChild(caret);
    }

    /* Bouton dropdown "Fiscalité ▼" — ciblé par data-nav */
    var fiscaliteBtn = document.querySelector('[data-nav="fiscalite"]');
    if (fiscaliteBtn) {
      var caret2 = fiscaliteBtn.querySelector('.nav-caret');
      fiscaliteBtn.textContent = t.fiscalite + ' ';
      if (caret2) fiscaliteBtn.appendChild(caret2);
    }

    /* Liens top-level de la nav desktop */
    document.querySelectorAll('nav > ul > li > a').forEach(function(a) {
      var h = a.getAttribute('href');
      if      (h === '/outils/')    a.textContent = t.outils;
      else if (h === '/elections/') a.textContent = t.elections;
      else if (h === '/questions/') a.textContent = t.questions;
      else if (h === '/a-propos/')  a.textContent = t.apropos;
    });

    /* Boutons FR / EN — état actif */
    var btnFR = document.getElementById('btn-fr');
    var btnEN = document.getElementById('btn-en');
    if (btnFR) btnFR.classList.toggle('active', lang === 'fr');
    if (btnEN) btnEN.classList.toggle('active', lang === 'en');
  }

  /* ── Normalise le texte des boutons FR/EN (retire les emojis) ─── */
  function normalizeLangButtons() {
    var btnFR = document.getElementById('btn-fr');
    var btnEN = document.getElementById('btn-en');
    if (btnFR) btnFR.textContent = 'FR';
    if (btnEN) btnEN.textContent = 'EN';
  }

  /* ── Dropdown toggle ──────────────────────────────────────────── */
  function init() {
    /* Nettoie les emojis de flags (problème Windows) */
    normalizeLangButtons();

    /* Applique la langue courante */
    applyNavLang(localStorage.getItem('lfm-lang') || 'fr');

    /* Dropdown clic — gère tous les .nav-drop-btn (Analyses + Fiscalité) */
    document.querySelectorAll('.nav-drop-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var li = btn.closest('.has-dropdown');
        var wasOpen = li.classList.contains('open');
        document.querySelectorAll('.has-dropdown.open').forEach(function(el) {
          el.classList.remove('open');
        });
        if (!wasOpen) li.classList.add('open');
      });
    });

    /* Clic ailleurs → ferme tout */
    document.addEventListener('click', function() {
      document.querySelectorAll('.has-dropdown.open').forEach(function(el) {
        el.classList.remove('open');
      });
    });

    /* Clic sur lien dropdown → ferme */
    document.querySelectorAll('.dropdown a').forEach(function(a) {
      a.addEventListener('click', function() {
        document.querySelectorAll('.has-dropdown.open').forEach(function(el) {
          el.classList.remove('open');
        });
      });
    });

    /* Après que l'i18n IIFE a tourné, on enveloppe window.setLang
       pour synchroniser la nav à chaque changement de langue */
    setTimeout(function() {
      if (typeof window.setLang === 'function') {
        var _orig = window.setLang;
        window.setLang = function(l) {
          _orig(l);
          applyNavLang(l);
        };
      }
    }, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
