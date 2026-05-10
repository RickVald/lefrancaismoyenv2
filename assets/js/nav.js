/* nav.js — Dropdown toggle pour mobile / touch
   Le CSS gère le hover sur desktop ; ce script ajoute le toggle au clic pour les écrans tactiles */
(function () {
  function init () {
    var btns = document.querySelectorAll('.nav-drop-btn');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var li = btn.closest('.has-dropdown');
        var wasOpen = li.classList.contains('open');
        // Ferme tous les dropdowns ouverts
        document.querySelectorAll('.has-dropdown.open').forEach(function (el) {
          el.classList.remove('open');
        });
        // Rouvre si ce n'était pas déjà ouvert
        if (!wasOpen) {
          li.classList.add('open');
        }
      });
    });

    // Clic ailleurs → ferme tout
    document.addEventListener('click', function () {
      document.querySelectorAll('.has-dropdown.open').forEach(function (el) {
        el.classList.remove('open');
      });
    });

    // Ferme aussi quand on clique un lien du dropdown
    document.querySelectorAll('.dropdown a').forEach(function (a) {
      a.addEventListener('click', function () {
        document.querySelectorAll('.has-dropdown.open').forEach(function (el) {
          el.classList.remove('open');
        });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
