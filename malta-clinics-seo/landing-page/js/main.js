/* ===== SmileMalta landing page — vanilla JS ===== */
(function () {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---- year ---- */
  $('#year').textContent = new Date().getFullYear();

  /* ---- mobile nav ---- */
  const nav = $('#primary-nav'), toggle = $('#menuToggle');
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
  $$('#primary-nav a').forEach(a =>
    a.addEventListener('click', () => nav.classList.remove('open')));

  /* ---- carousel ---- */
  const track = $('#carTrack');
  const step = () => Math.min(track.clientWidth * 0.8, 300);
  $('.car-btn.next').addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  $('.car-btn.prev').addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));

  /* ---- availability calendar ----
     In production these counts come from the admin backend via API.
     Here we deterministically fake availability per date so the demo is stable. */
  const grid = $('#calGrid'), title = $('#calTitle');
  let view = new Date(); view.setDate(1);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let selected = null;

  function slotsFor(date) {
    // deterministic pseudo-availability: weekends fuller, varies by day
    const day = date.getDay();
    if (day === 0) return 0;                  // Sunday closed
    const seed = (date.getDate() * 7 + date.getMonth() * 3) % 10;
    return seed; // 0..9 free slots
  }
  function level(n) { return n === 0 ? 'full' : n <= 3 ? 'low' : 'ok'; }

  function render() {
    grid.innerHTML = '';
    title.textContent = view.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
    // Monday-first offset
    let start = view.getDay(); start = start === 0 ? 6 : start - 1;
    for (let i = 0; i < start; i++) {
      const e = document.createElement('div'); e.className = 'cal-cell empty'; grid.appendChild(e);
    }
    const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const date = new Date(view.getFullYear(), view.getMonth(), d);
      const cell = document.createElement('div');
      cell.className = 'cal-cell';
      const past = date < today;
      const n = slotsFor(date);
      if (past) {
        cell.classList.add('past');
        cell.innerHTML = `${d}`;
      } else {
        const lv = level(n);
        cell.innerHTML = `${d}<i class="dot ${lv}"></i>`;
        if (lv === 'full') { cell.classList.add('past'); }       // unselectable
        else {
          cell.addEventListener('click', () => {
            $$('.cal-cell.sel').forEach(c => c.classList.remove('sel'));
            cell.classList.add('sel');
            selected = date;
            // sync to booking date input
            $('#bookDate').value = date.toISOString().slice(0, 10);
          });
        }
      }
      grid.appendChild(cell);
    }
  }
  $('#calPrev').addEventListener('click', () => { view.setMonth(view.getMonth() - 1); render(); });
  $('#calNext').addEventListener('click', () => { view.setMonth(view.getMonth() + 1); render(); });
  render();

  // min date on the picker = today
  $('#bookDate').min = today.toISOString().slice(0, 10);

  /* ---- booking form ---- */
  $('#bookingForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = $('#bookingMsg');
    const ok = $('#treatment').value && $('#fullname').value &&
      $('#email').value && $('#bookDate').value && $('#bookTime').value && $('#consent').checked;
    if (!ok) {
      msg.textContent = 'Please complete all fields and accept the consent.';
      msg.className = 'form-msg err'; return;
    }
    msg.textContent = `✓ Request received for ${$('#bookDate').value} at ${$('#bookTime').value}. We'll confirm by email.`;
    msg.className = 'form-msg ok';
    e.target.reset();
  });

  /* ---- auth modal ---- */
  const modal = $('#authModal'), title2 = $('#authTitle'),
    nameField = $('#nameField'), switchText = $('#authSwitchText'), switchLink = $('#authSwitch');
  let mode = 'login';
  function setMode(m) {
    mode = m;
    const login = m === 'login';
    title2.textContent = login ? 'Log in' : 'Sign up';
    nameField.hidden = login;
    switchText.textContent = login ? 'No account?' : 'Have an account?';
    switchLink.textContent = login ? 'Sign up' : 'Log in';
  }
  function openModal(m) { setMode(m); modal.hidden = false; }
  $$('[data-open-auth]').forEach(b =>
    b.addEventListener('click', () => openModal(b.dataset.openAuth)));
  $('#authClose').addEventListener('click', () => modal.hidden = true);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });
  switchLink.addEventListener('click', (e) => { e.preventDefault(); setMode(mode === 'login' ? 'signup' : 'login'); });
  $('#authForm').addEventListener('submit', (e) => { e.preventDefault(); modal.hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.hidden = true; });

  /* ---- GDPR cookie consent ---- */
  const banner = $('#cookieBanner');
  if (!localStorage.getItem('cookieConsent')) banner.hidden = false;
  const choose = (v) => { localStorage.setItem('cookieConsent', v); banner.hidden = true; };
  $('#cookieAccept').addEventListener('click', () => choose('accepted'));
  $('#cookieReject').addEventListener('click', () => choose('rejected'));
})();
