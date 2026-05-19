/* nav.js — Dropdown toggle + traduction automatique des items de nav */
(function () {

  /* ── Traductions nav ──────────────────────────────────────────── */
  var NAV_T = {
    fr: { analyses:'Analyses', outils:'Outils', elections:'Élections', questions:'Questions', apropos:'À propos' },
    en: { analyses:'Analyses', outils:'Tools',  elections:'Elections', questions:'Questions', apropos:'About'    }
  };

  function applyNavLang(lang) {
    var t = NAV_T[lang] || NAV_T.fr;

    /* Bouton "Analyses ▼" — on préserve le <span class="nav-caret"> */
    var dropBtn = document.querySelector('.nav-drop-btn');
    if (dropBtn) {
      var caret = dropBtn.querySelector('.nav-caret');
      /* Remplace uniquement le nœud texte */
      dropBtn.childNodes.forEach(function(n) {
        if (n.nodeType === 3) n.textContent = t.analyses + ' ';
      });
    }

    /* Liens de la nav desktop */
    document.querySelectorAll('nav ul > li > a').forEach(function(a) {
      var h = a.getAttribute('href');
      if      (h === '/outils/')    a.textContent = t.outils;
      else if (h === '/elections/') a.textContent = t.elections;
      else if (h === '/questions/') a.textContent = t.questions;
      else if (h === '/a-propos/')  a.textContent = t.apropos;
    });
  }

  /* ── Dropdown toggle ──────────────────────────────────────────── */
  function init () {
    var btns = document.querySelectorAll('.nav-drop-btn');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var li = btn.closest('.has-dropdown');
        var wasOpen = li.classList.contains('open');
        document.querySelectorAll('.has-dropdown.open').forEach(function (el) {
          el.classList.remove('open');
        });
        if (!wasOpen) { li.classList.add('open'); }
      });
    });

    /* Clic ailleurs → ferme tout */
    document.addEventListener('click', function () {
      document.querySelectorAll('.has-dropdown.open').forEach(function (el) {
        el.classList.remove('open');
      });
    });

    /* Clic sur un lien du dropdown → ferme */
    document.querySelectorAll('.dropdown a').forEach(function (a) {
      a.addEventListener('click', function () {
        document.querySelectorAll('.has-dropdown.open').forEach(function (el) {
          el.classList.remove('open');
        });
      });
    });

    /* Applique la langue courante au chargement */
    applyNavLang(localStorage.getItem('lfm-lang') || 'fr');

    /* Après que tous les scripts inline (i18n IIFE) ont tourné,
       on enveloppe window.setLang pour synchroniser la nav */
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
