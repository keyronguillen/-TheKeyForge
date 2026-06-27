/* ============================================================
   The "Key" Forge landing — interacciones (vanilla JS, sin build)
   - Menú móvil
   - Enlaces a WhatsApp con mensaje prellenado (data-wa)
   - Formulario de auditoría → arma mensaje y abre WhatsApp
   - Banner de cookies (localStorage)
   - Año dinámico en el footer
   ============================================================ */
(function () {
  'use strict';

  // 📞 Número de WhatsApp del negocio (formato internacional, sin signos).
  //    Malta = 356 + número. Cambiá aquí si querés otro número de contacto.
  const WA_NUMBER = '35677012748';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* ---- WhatsApp links (cualquier elemento con data-wa) ---- */
  function waUrl(message) {
    return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
  }
  $$('[data-wa]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      window.open(waUrl(el.getAttribute('data-wa')), '_blank', 'noopener');
    });
  });

  /* ---- Menú móvil ---- */
  const toggle = $('#menuToggle');
  const mobileNav = $('#mobileNav');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => {
      const open = mobileNav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    // cerrar al tocar un enlace
    $$('a', mobileNav).forEach((a) =>
      a.addEventListener('click', () => {
        mobileNav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      })
    );
  }

  /* ---- Formulario de auditoría → WhatsApp ---- */
  const form = $('#auditForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const negocio = $('#negocio').value.trim();
      const tipo = $('#tipo').value;
      const sitio = $('#sitio').value.trim() || 'no tengo';
      const msg =
        `¡Hola The "Key" Forge! Quiero mi auditoría SEO gratuita.\n\n` +
        `• Negocio: ${negocio}\n` +
        `• Tipo: ${tipo}\n` +
        `• Sitio web: ${sitio}`;
      window.open(waUrl(msg), '_blank', 'noopener');
    });
  }

  /* ---- Banner de cookies ---- */
  const cookie = $('#cookie');
  const COOKIE_KEY = 'keyforge_cookies_ok';
  if (cookie && !localStorage.getItem(COOKIE_KEY)) {
    setTimeout(() => cookie.classList.add('show'), 800);
    $('#cookieOk').addEventListener('click', () => {
      localStorage.setItem(COOKIE_KEY, '1');
      cookie.classList.remove('show');
    });
  }

  /* ---- Año dinámico ---- */
  const yr = $('#year');
  if (yr) yr.textContent = new Date().getFullYear();
})();
