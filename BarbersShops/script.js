/**
 * Blade & Stone Barbershop Malta
 * script.js — Vanilla JS, no dependencies, production-ready
 */

(function () {
    'use strict';

    /* ═══════════════════════════════════════════════
       UTILITY
    ═══════════════════════════════════════════════ */

    /**
     * Safely query a single element; returns null if not found.
     * @param {string} selector
     * @param {Document|Element} [ctx=document]
     * @returns {Element|null}
     */
    function qs(selector, ctx) {
        return (ctx || document).querySelector(selector);
    }

    /**
     * Safely query all matching elements.
     * @param {string} selector
     * @param {Document|Element} [ctx=document]
     * @returns {NodeList}
     */
    function qsa(selector, ctx) {
        return (ctx || document).querySelectorAll(selector);
    }

    /* ═══════════════════════════════════════════════
       1. STICKY HEADER — background on scroll
    ═══════════════════════════════════════════════ */

    (function initStickyHeader() {
        var header = qs('#header');
        if (!header) return;

        var SCROLL_THRESHOLD = 60;

        function onScroll() {
            var scrolled = window.scrollY > SCROLL_THRESHOLD;
            header.classList.toggle('is-scrolled', scrolled);
        }

        // Set initial state
        onScroll();

        // Passive listener for scroll performance
        window.addEventListener('scroll', onScroll, { passive: true });
    })();


    /* ═══════════════════════════════════════════════
       2. MOBILE HAMBURGER MENU
    ═══════════════════════════════════════════════ */

    (function initMobileMenu() {
        var hamburger = qs('#hamburger');
        var nav = qs('#nav');
        if (!hamburger || !nav) return;

        function openMenu() {
            nav.classList.add('is-open');
            hamburger.classList.add('is-active');
            hamburger.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
        }

        function closeMenu() {
            nav.classList.remove('is-open');
            hamburger.classList.remove('is-active');
            hamburger.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        }

        function toggleMenu() {
            var isOpen = nav.classList.contains('is-open');
            isOpen ? closeMenu() : openMenu();
        }

        // Toggle on hamburger click
        hamburger.addEventListener('click', toggleMenu);

        // Close when a nav link is clicked (SPA-style navigation)
        qsa('.nav__link, .nav__cta', nav).forEach(function (link) {
            link.addEventListener('click', closeMenu);
        });

        // Close on Escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && nav.classList.contains('is-open')) {
                closeMenu();
                hamburger.focus();
            }
        });

        // Close when clicking outside the nav area on mobile
        document.addEventListener('click', function (e) {
            if (
                nav.classList.contains('is-open') &&
                !nav.contains(e.target) &&
                !hamburger.contains(e.target)
            ) {
                closeMenu();
            }
        });
    })();


    /* ═══════════════════════════════════════════════
       3. SMOOTH SCROLL — for internal anchor links
    ═══════════════════════════════════════════════ */

    (function initSmoothScroll() {
        // Use native CSS scroll-behavior as primary method (set in CSS).
        // This JS layer provides a polyfill for older browsers and handles
        // offset compensation for the fixed header dynamically.

        var HEADER_H = parseInt(
            getComputedStyle(document.documentElement).getPropertyValue('--header-h'),
            10
        ) || 70;

        qsa('a[href^="#"]').forEach(function (anchor) {
            anchor.addEventListener('click', function (e) {
                var targetId = anchor.getAttribute('href');

                // Skip pure "#" with no target id, "#book" is handled by modal
                if (targetId === '#' || targetId === '#book') return;

                var target = qs(targetId);
                if (!target) return;

                e.preventDefault();

                var targetTop = target.getBoundingClientRect().top + window.scrollY - HEADER_H;

                window.scrollTo({ top: targetTop, behavior: 'smooth' });
            });
        });
    })();


    /* ═══════════════════════════════════════════════
       4. BOOKING MODAL — Conversion tracking simulator
    ═══════════════════════════════════════════════ */

    (function initBookingModal() {
        var modal = qs('#booking-modal');
        var backdrop = qs('#modal-backdrop');
        var closeBtn = qs('#modal-close');
        var freshaLink = qs('#modal-fresha-link');

        if (!modal) return;

        // ── Open & Close helpers ──────────────────────

        function openModal(origin) {
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            closeBtn && closeBtn.focus();

            // Simulate GA4 / GTM conversion event
            trackConversionEvent('book_now_click', {
                origin: origin || 'unknown',
                page: window.location.pathname,
                timestamp: new Date().toISOString(),
            });
        }

        function closeModal() {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        // ── Event listeners ──────────────────────────

        // All "Book Now" triggers across the page
        qsa('.js-book-now').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                // Only intercept "#book" anchor clicks to show modal
                var href = btn.getAttribute('href');
                if (href === '#book' || href === null) {
                    e.preventDefault();
                    openModal(btn.dataset.section || 'unknown');
                }
            });
        });

        // Close on backdrop click
        backdrop && backdrop.addEventListener('click', closeModal);

        // Close on × button
        closeBtn && closeBtn.addEventListener('click', closeModal);

        // Close on Escape
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('is-open')) {
                closeModal();
            }
        });

        // Track click-through to Fresha
        freshaLink && freshaLink.addEventListener('click', function () {
            trackConversionEvent('fresha_redirect', {
                origin: 'booking_modal',
                destination: freshaLink.href,
                timestamp: new Date().toISOString(),
            });
        });

        // ── Trap focus inside modal when open ────────
        modal.addEventListener('keydown', function (e) {
            if (e.key !== 'Tab') return;

            var focusable = Array.from(
                modal.querySelectorAll(
                    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )
            );

            if (focusable.length === 0) return;

            var first = focusable[0];
            var last = focusable[focusable.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });
    })();


    /* ═══════════════════════════════════════════════
       5. CONVERSION EVENT TRACKER
          Simulates GA4 gtag() / GTM dataLayer push.
          Replace console calls with real analytics
          when connecting to Google Analytics 4.
    ═══════════════════════════════════════════════ */

    function trackConversionEvent(eventName, params) {
        // ── Console simulation (dev/staging) ──
        console.groupCollapsed(
            '%c[Blade & Stone Analytics] Event: ' + eventName,
            'color: #D4AF37; font-weight: bold;'
        );
        console.table(params);
        console.groupEnd();

        // ── Google Analytics 4 (activate when GA4 is connected) ──
        // if (typeof gtag === 'function') {
        //   gtag('event', eventName, {
        //     event_category: 'conversion',
        //     event_label:    params.origin,
        //     ...params
        //   });
        // }

        // ── GTM dataLayer push (activate when GTM is connected) ──
        // window.dataLayer = window.dataLayer || [];
        // window.dataLayer.push({
        //   event:      eventName,
        //   eventData:  params,
        // });
    }


    /* ═══════════════════════════════════════════════
       6. HERO BG — Subtle parallax + loaded class
    ═══════════════════════════════════════════════ */

    (function initHeroBg() {
        var heroBg = qs('.hero__bg');
        if (!heroBg) return;

        // Trigger CSS entrance animation
        requestAnimationFrame(function () {
            heroBg.classList.add('is-loaded');
        });

        // Subtle parallax on scroll (disabled for prefers-reduced-motion)
        var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (!prefersReducedMotion) {
            window.addEventListener('scroll', function () {
                var offset = window.scrollY;
                // Subtle: move bg up at 30% of scroll speed
                heroBg.style.transform = 'scale(1) translateY(' + offset * 0.3 + 'px)';
            }, { passive: true });
        }
    })();


    /* ═══════════════════════════════════════════════
       7. ACTIVE NAV LINK — highlight current section
    ═══════════════════════════════════════════════ */

    (function initActiveNavLinks() {
        var sections = qsa('section[id]');
        var navLinks = qsa('.nav__link');

        if (!sections.length || !navLinks.length) return;

        var HEADER_OFFSET = 100;

        var observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;

                    var activeId = entry.target.id;

                    navLinks.forEach(function (link) {
                        var linkTarget = link.getAttribute('href').replace('#', '');
                        var isActive = linkTarget === activeId;
                        link.classList.toggle('nav__link--active', isActive);
                        link.setAttribute('aria-current', isActive ? 'true' : 'false');
                    });
                });
            },
            {
                rootMargin: '-' + HEADER_OFFSET + 'px 0px -60% 0px',
                threshold: 0,
            }
        );

        sections.forEach(function (section) {
            observer.observe(section);
        });
    })();


    /* ═══════════════════════════════════════════════
       8. FOOTER YEAR — dynamic copyright year
    ═══════════════════════════════════════════════ */

    (function setFooterYear() {
        var yearEl = qs('#footer-year');
        if (yearEl) {
            yearEl.textContent = new Date().getFullYear();
        }
    })();


    /* ═══════════════════════════════════════════════
       9. SCROLL REVEAL — fade-in on scroll
          Lightweight alternative to AOS/ScrollReveal
    ═══════════════════════════════════════════════ */

    (function initScrollReveal() {
        var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) return;

        // Add reveal class to target elements
        var revealTargets = qsa(
            '.service-card, .barber-card, .testimonial-card, .about__pillar, .location__detail'
        );

        // Inject reveal styles dynamically
        var style = document.createElement('style');
        style.textContent = [
            '.reveal-on-scroll {',
            '  opacity: 0;',
            '  transform: translateY(24px);',
            '  transition: opacity 0.6s ease, transform 0.6s ease;',
            '}',
            '.reveal-on-scroll.is-revealed {',
            '  opacity: 1;',
            '  transform: translateY(0);',
            '}',
        ].join('\n');
        document.head.appendChild(style);

        revealTargets.forEach(function (el) {
            el.classList.add('reveal-on-scroll');
        });

        var revealObserver = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry, i) {
                    if (entry.isIntersecting) {
                        // Staggered delay for grid children
                        var delay = (Array.from(revealTargets).indexOf(entry.target) % 3) * 80;
                        setTimeout(function () {
                            entry.target.classList.add('is-revealed');
                        }, delay);
                        revealObserver.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12 }
        );

        revealTargets.forEach(function (el) {
            revealObserver.observe(el);
        });
    })();

})();