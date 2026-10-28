/**
 * Há Cảo — main.js
 *
 * Modules:
 *  0. loadSettings        — đọc settings.json (CTA, social, YouTube)
 *  1. initImageSlots      — lazy-load ảnh (.jpg/.webp/.png/.svg)
 *  2. initYouTubeEmbed    — nhúng video từ settings.youtubeVideoId
 *  3. initFeedbackCarousel — Card fan (GSAP) + autoplay 3s + loop
 *  4. initHeaderScroll
 *  5. initActiveNav
 *  6. initMobileNav
 *  7. initFAQ
 *  8. initGSAP
 */
(function () {
  "use strict";

  var DEFAULT_SETTINGS = {
    cta: { url: "#", label: "Nhận tư vấn", openInNewTab: true },
    social: { facebook: "#", tiktok: "#", youtube: "#" },
    youtubeVideoId: "",
  };

  /* ═══════════════════════════════════════════════════════════════
     0. SETTINGS.JSON → CTA + social + YouTube
  ═══════════════════════════════════════════════════════════════ */
  function applySettings(settings) {
    var cta = settings.cta || DEFAULT_SETTINGS.cta;
    var social = settings.social || DEFAULT_SETTINGS.social;
    var url = (cta.url || "#").trim() || "#";
    var newTab = cta.openInNewTab !== false;

    document.querySelectorAll("[data-cta]").forEach(function (el) {
      el.setAttribute("href", url);
      if (newTab && url !== "#") {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }
    });

    ["facebook", "tiktok", "youtube"].forEach(function (key) {
      var link = (social[key] || "#").trim() || "#";
      document.querySelectorAll('[data-social="' + key + '"]').forEach(function (el) {
        el.setAttribute("href", link);
        if (link !== "#") {
          el.setAttribute("target", "_blank");
          el.setAttribute("rel", "noopener noreferrer");
        }
      });
    });

    initYouTubeEmbed(settings.youtubeVideoId || "");
  }

  function loadSettings() {
    return fetch("settings.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("settings.json " + res.status);
        return res.json();
      })
      .then(applySettings)
      .catch(function () {
        applySettings(DEFAULT_SETTINGS);
      });
  }

  /* ═══════════════════════════════════════════════════════════════
     1. IMAGE SLOTS
     data-src có thể có hoặc không có đuôi file — JS tự strip rồi thử lại.
  ═══════════════════════════════════════════════════════════════ */
  function initImageSlots() {
    document.querySelectorAll(".img-slot[data-src]").forEach(function (slot) {
      var raw = slot.getAttribute("data-src") || "";
      // Bỏ đuôi nếu user ghi nhầm "hero-books.png"
      var base = raw.replace(/\.(jpe?g|webp|png|svg)$/i, "");
      var alt  = slot.getAttribute("data-alt") || "";
      var exts = ["jpg", "jpeg", "webp", "png", "svg"];
      var i    = 0;

      slot.setAttribute("data-loaded", "false");

      (function tryNext() {
        if (i >= exts.length) return;
        var img = new Image();
        var src = base + "." + exts[i];
        img.onload = function () {
          img.alt = alt;
          slot.appendChild(img);
          slot.setAttribute("data-loaded", "true");
        };
        img.onerror = function () {
          i++;
          tryNext();
        };
        img.src = src;
      })();
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     2. YOUTUBE EMBED  (youtubeVideoId trong settings.json)
  ═══════════════════════════════════════════════════════════════ */
  function initYouTubeEmbed(id) {
    var box = document.getElementById("youtube-embed");
    if (!box) return;

    id = (id || "").trim();
    if (!id) return;

    var wrap = box.querySelector(".aspect-video") || box;
    wrap.innerHTML =
      '<iframe class="absolute inset-0 h-full w-full" ' +
      'src="https://www.youtube.com/embed/' + encodeURIComponent(id) + '" ' +
      'title="Hướng dẫn sử dụng giáo trình Há Cảo" ' +
      'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
      'referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe>';
  }

  /* ═══════════════════════════════════════════════════════════════
     3. FEEDBACK CAROUSEL — Card Fan (GSAP, js/card-fan-carousel.js)
     Quét feedback-1.png → N, autoplay 3s, loop.
  ═══════════════════════════════════════════════════════════════ */
  function initFeedbackCarousel() {
    var container = document.getElementById("feedback-fan");
    var btnPrev = document.getElementById("feedback-prev");
    var btnNext = document.getElementById("feedback-next");
    if (!container) return;

    var FOLDER = "assets/images/feedback/";
    var PREFIX = "feedback-";
    var EXT = ".png";
    var MAX_PROBE = 40;

    function probe(src) {
      return new Promise(function (resolve) {
        var img = new Image();
        img.onload = function () { resolve(true); };
        img.onerror = function () { resolve(false); };
        img.src = src;
      });
    }

    (async function loadAll() {
      var images = [];
      for (var n = 1; n <= MAX_PROBE; n++) {
        var src = FOLDER + PREFIX + n + EXT;
        var ok = await probe(src);
        if (!ok) break;
        images.push(src);
      }

      if (!images.length) {
        container.innerHTML =
          '<p class="px-4 text-center text-sm text-forest/50">' +
          "Thêm ảnh feedback-1.png… vào assets/images/feedback/</p>";
        return;
      }

      if (typeof createCardFanCarousel !== "function") {
        console.warn("card-fan-carousel.js chưa load");
        return;
      }

      createCardFanCarousel({
        container: container,
        prevBtn: btnPrev,
        nextBtn: btnNext,
        autoplayMs: 3000,
        cards: images.map(function (src, i) {
          return { imgUrl: src, alt: "Chia sẻ học viên " + (i + 1) };
        }),
      });
    })();
  }

  /* ═══════════════════════════════════════════════════════════════
     4. HEADER SCROLL SHADOW
  ═══════════════════════════════════════════════════════════════ */
  function initHeaderScroll() {
    var header = document.getElementById("site-header");
    if (!header) return;
    window.addEventListener(
      "scroll",
      function () {
        header.classList.toggle("shadow-sm", window.scrollY > 10);
      },
      { passive: true }
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     5. ACTIVE NAV LINK
  ═══════════════════════════════════════════════════════════════ */
  function initActiveNav() {
    var sections = document.querySelectorAll("section[id]");
    var links = document.querySelectorAll(".nav-link[href^='#']");
    if (!sections.length || !links.length) return;

    function update() {
      var pos = window.scrollY + 130;
      var current = "";
      sections.forEach(function (s) {
        if (s.offsetTop <= pos) current = s.id;
      });
      links.forEach(function (l) {
        var h = l.getAttribute("href").slice(1);
        h === current
          ? l.setAttribute("aria-current", "page")
          : l.removeAttribute("aria-current");
      });
    }

    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ═══════════════════════════════════════════════════════════════
     6. MOBILE NAV
  ═══════════════════════════════════════════════════════════════ */
  function initMobileNav() {
    var toggle = document.getElementById("nav-toggle");
    var menu = document.getElementById("mobile-menu");
    var iconOpen = document.getElementById("nav-icon-open");
    var iconClose = document.getElementById("nav-icon-close");
    if (!toggle || !menu) return;

    var isOpen = false;
    gsap.set(menu, { height: 0, overflow: "hidden" });

    function openMenu() {
      isOpen = true;
      toggle.setAttribute("aria-expanded", "true");
      gsap.to(menu, { height: "auto", duration: 0.38, ease: "power2.out" });
      gsap.to(iconOpen, { opacity: 0, rotation: 45, duration: 0.22 });
      gsap.to(iconClose, { opacity: 1, rotation: 0, duration: 0.22, delay: 0.1 });
    }

    function closeMenu() {
      isOpen = false;
      toggle.setAttribute("aria-expanded", "false");
      gsap.to(menu, { height: 0, duration: 0.28, ease: "power2.in" });
      gsap.to(iconOpen, { opacity: 1, rotation: 0, duration: 0.22, delay: 0.06 });
      gsap.to(iconClose, { opacity: 0, rotation: -45, duration: 0.18 });
    }

    toggle.addEventListener("click", function () {
      isOpen ? closeMenu() : openMenu();
    });

    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        if (isOpen) closeMenu();
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     7. FAQ ACCORDION
  ═══════════════════════════════════════════════════════════════ */
  function initFAQ() {
    document.querySelectorAll(".faq-body").forEach(function (b) {
      gsap.set(b, { height: 0, overflow: "hidden" });
    });

    document.querySelectorAll(".faq-trigger").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = btn.closest(".faq-item");
        var body = item.querySelector(".faq-body");
        var icon = btn.querySelector(".faq-icon");
        var open = item.classList.contains("is-open");

        document.querySelectorAll(".faq-item.is-open").forEach(function (other) {
          other.classList.remove("is-open");
          gsap.to(other.querySelector(".faq-body"), {
            height: 0,
            duration: 0.3,
            ease: "power2.in",
          });
          gsap.to(other.querySelector(".faq-icon"), {
            rotation: 0,
            duration: 0.25,
            ease: "power2.out",
          });
        });

        if (!open) {
          item.classList.add("is-open");
          gsap.to(body, { height: "auto", duration: 0.38, ease: "power2.out" });
          gsap.to(icon, {
            rotation: 45,
            duration: 0.28,
            ease: "back.out(1.2)",
          });
        }
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     8. GSAP SCROLL ANIMATIONS
  ═══════════════════════════════════════════════════════════════ */
  function initGSAP() {
    if (typeof gsap === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    function reveal(targets, fromVars, trigger) {
      var els =
        typeof targets === "string"
          ? document.querySelectorAll(targets)
          : [targets];
      if (!els || !els.length) return;

      gsap.from(
        els,
        Object.assign(
          {
            opacity: 0,
            duration: 0.78,
            ease: "power3.out",
            scrollTrigger: {
              trigger: trigger || els[0],
              start: "top 85%",
              toggleActions: "play none none none",
            },
          },
          fromVars
        )
      );
    }

    /* Hero */
    var heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
    heroTl
      .from("#hero-eyebrow", { opacity: 0, y: 12, duration: 0.5 })
      .from("#hero-title", { opacity: 0, y: 30, duration: 0.75 }, "-=0.28")
      .from("#hero-desc", { opacity: 0, y: 20, duration: 0.65 }, "-=0.44")
      .from("#hero-actions", { opacity: 0, y: 14, duration: 0.5 }, "-=0.38")
      .from(
        "#hero-features > li",
        { opacity: 0, y: 10, stagger: 0.1, duration: 0.45 },
        "-=0.3"
      )
      .from(
        "#hero-visual",
        {
          opacity: 0,
          y: 24,
          duration: 0.95,
          ease: "power2.out",
          clearProps: "opacity,transform",
        },
        0.18
      );

    /* Highlights */
    reveal(".highlights-intro", { y: 32, x: -18 }, "#lo-trinh");
    reveal(".highlights-card", { y: 46, stagger: 0.14 }, "#lo-trinh");

    /* Curriculum */
    reveal(".curriculum-header", { y: 24 }, "#giao-trinh");
    var courseCards = document.querySelectorAll(".course-card");
    if (courseCards.length >= 1) {
      gsap.from(courseCards[0], {
        opacity: 0,
        x: -40,
        duration: 0.78,
        ease: "power3.out",
        scrollTrigger: {
          trigger: courseCards[0],
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    }
    if (courseCards.length >= 2) {
      gsap.from(courseCards[1], {
        opacity: 0,
        x: 40,
        duration: 0.78,
        ease: "power3.out",
        delay: 0.1,
        scrollTrigger: {
          trigger: courseCards[0],
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    }
    reveal("#combo-banner", { y: 30, scale: 0.98 }, "#combo-banner");

    /* Outcomes */
    reveal(".outcomes-heading", { x: -36 }, "#ket-qua");
    reveal(".outcomes-item", { x: 32, stagger: 0.12 }, "#ket-qua");

    /* Video showcase */
    reveal(".video-intro", { y: 22 }, "#xem-thu");
    reveal(".video-frame", { y: 28 }, "#xem-thu");

    /* Testimonials carousel */
    reveal(".testimonials-intro", { y: 22 }, "#hoc-vien");
    reveal(".testimonials-carousel", { y: 28 }, "#hoc-vien");

    /* Support */
    reveal(".support-heading", { y: 22 }, "#ho-tro");
    reveal(".support-item", { y: 34, stagger: 0.15 }, "#ho-tro");

    /* FAQ */
    reveal(".faq-item", { y: 22, stagger: 0.09 }, "#faq");

    /* CTA */
    gsap.from("#cta-box", {
      opacity: 0,
      y: 32,
      scale: 0.975,
      duration: 0.85,
      ease: "power3.out",
      scrollTrigger: {
        trigger: "#tu-van",
        start: "top 88%",
        toggleActions: "play none none none",
      },
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════════════ */
  lucide.createIcons();

  initImageSlots();
  initFeedbackCarousel();
  initHeaderScroll();
  initActiveNav();
  initMobileNav();
  initFAQ();
  initGSAP();
  loadSettings();

  document.getElementById("year").textContent = new Date().getFullYear();
})();