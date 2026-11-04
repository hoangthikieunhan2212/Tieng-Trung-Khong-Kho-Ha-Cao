/**
 * Card Fan Carousel — port vanilla JS từ React SocialCards (GSAP, không lib carousel)
 * Autoplay 3s, loop toàn bộ ảnh.
 * Visible: laptop 6 · tablet 4 · mobile 3
 */
(function (global) {
  "use strict";

  var AUTOPLAY_MS = 3000;

  var FAN_BY_COUNT = {
    3: [
      { rot: -10, scale: 0.88, x: -8.5, y: 1.6, zIndex: 2 },
      { rot: 0, scale: 1.0, x: 0, y: 0.0, zIndex: 10 },
      { rot: 10, scale: 0.88, x: 8.5, y: 1.6, zIndex: 2 },
    ],
    4: [
      { rot: -14, scale: 0.8, x: -12, y: 2.2, zIndex: 1 },
      { rot: -5, scale: 0.92, x: -4.5, y: 0.7, zIndex: 4 },
      { rot: 0, scale: 1.0, x: 0, y: 0.0, zIndex: 10 },
      { rot: 10, scale: 0.88, x: 8, y: 1.4, zIndex: 3 },
    ],
    6: [
      { rot: -16, scale: 0.72, x: -15.5, y: 2.8, zIndex: 1 },
      { rot: -10, scale: 0.8, x: -10, y: 1.7, zIndex: 3 },
      { rot: -4, scale: 0.9, x: -4.5, y: 0.5, zIndex: 6 },
      { rot: 0, scale: 1.0, x: 0, y: 0.0, zIndex: 10 },
      { rot: 7, scale: 0.88, x: 5.5, y: 0.7, zIndex: 5 },
      { rot: 13, scale: 0.76, x: 11.5, y: 2.0, zIndex: 2 },
    ],
  };

  function getMaxVisible(width) {
    if (width >= 1024) return 6;
    if (width >= 768) return 4;
    return 3;
  }

  function getResponsiveMultiplier(width) {
    if (width < 380) return 0.4;
    if (width < 480) return 0.5;
    if (width < 640) return 0.64;
    if (width < 768) return 0.78;
    if (width < 1024) return 0.86;
    if (width < 1280) return 0.92;
    return 1.0;
  }

  function getEnterExitRem(width) {
    if (width < 480) return 12;
    if (width < 768) return 18;
    if (width < 1024) return 24;
    return 30;
  }

  function getHeightMultiplier(width) {
    var idealPx;
    if (width < 480) idealPx = 22 * 16;
    else if (width < 640) idealPx = 26 * 16;
    else if (width < 768) idealPx = 28 * 16;
    else if (width < 1024) idealPx = 32 * 16;
    else idealPx = 36 * 16;

    var available = window.innerHeight * 0.7;
    if (available >= idealPx) return 1;
    return available / idealPx;
  }

  function getSlotConfig(slotCount, slot) {
    var presets = FAN_BY_COUNT[slotCount];
    if (presets && presets[slot]) return presets[slot];

    var center = slotCount >> 1;
    var distance = slotCount > 1 ? (slot - center) / center : 0;
    var absDistance = Math.abs(distance);
    return {
      rot: distance * 12,
      scale: 1.0 - 0.12 * absDistance * absDistance,
      x: distance * 9,
      y: absDistance * absDistance * 1.8,
      zIndex: 10 - Math.abs(slot - center),
    };
  }

  /**
   * @param {object} options
   * @param {HTMLElement} options.container
   * @param {HTMLElement} [options.prevBtn]
   * @param {HTMLElement} [options.nextBtn]
   * @param {{imgUrl:string, alt?:string}[]} options.cards
   * @param {number} [options.autoplayMs]
   * @param {(index:number)=>void} [options.onCardClick]
   */
  function createCardFanCarousel(options) {
    var container = options.container;
    var prevBtn = options.prevBtn || null;
    var nextBtn = options.nextBtn || null;
    var cards = options.cards || [];
    var autoplayMs = options.autoplayMs != null ? options.autoplayMs : AUTOPLAY_MS;
    var onCardClick = typeof options.onCardClick === "function" ? options.onCardClick : null;

    if (!container || typeof gsap === "undefined" || !cards.length) return null;

    var totalCards = cards.length;
    var slotCount = Math.min(getMaxVisible(window.innerWidth), totalCards);
    var half = slotCount >> 1;
    var centerIndex = half;
    var isAnimating = false;
    var hasEntered = false;
    var direction = null;
    var prevVisible = new Set();
    var autoplayTimer = null;
    var cleanupHover = null;
    var resizeTimer = null;

    function syncSlotCount() {
      var next = Math.min(getMaxVisible(window.innerWidth), totalCards);
      if (next === slotCount) return false;
      slotCount = next;
      half = slotCount >> 1;
      return true;
    }

    // Build DOM
    container.innerHTML = "";
    cards.forEach(function (card, index) {
      var el = document.createElement("button");
      el.type = "button";
      el.className = "fan-card";
      el.setAttribute("data-index", String(index));
      el.setAttribute(
        "aria-label",
        "Phóng to ảnh: " + (card.alt || "Card " + (index + 1))
      );
      el.innerHTML =
        '<div class="fan-card-inner">' +
        '<img src="' +
        card.imgUrl +
        '" alt="' +
        (card.alt || "Card " + (index + 1)) +
        '" loading="lazy" draggable="false" />' +
        "</div>";
      if (onCardClick) {
        el.addEventListener("click", function () {
          onCardClick(index);
        });
      }
      container.appendChild(el);
    });

    function getVisibleMap(center) {
      var map = new Map();
      for (var slot = 0; slot < slotCount; slot++) {
        var cardIndex =
          (((center + slot - half) % totalCards) + totalCards) % totalCards;
        map.set(cardIndex, slot);
      }
      return map;
    }

    function stopAutoplay() {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    }

    function startAutoplay() {
      stopAutoplay();
      if (totalCards < 2 || autoplayMs <= 0) return;
      autoplayTimer = setInterval(function () {
        cycle("right");
      }, autoplayMs);
    }

    function cycle(dir) {
      if (isAnimating || totalCards < 2) return;
      isAnimating = true;
      direction = dir;
      centerIndex =
        dir === "right"
          ? (centerIndex + 1) % totalCards
          : (centerIndex - 1 + totalCards) % totalCards;
      layout();
      startAutoplay();
    }

    function layout() {
      var cardElements = Array.prototype.slice.call(
        container.querySelectorAll(".fan-card")
      );
      if (!cardElements.length) return;

      if (cleanupHover) {
        cleanupHover();
        cleanupHover = null;
      }

      var visibleMap = getVisibleMap(centerIndex);
      var previouslyVisible = prevVisible;
      var isFirstMount = !hasEntered;
      var multiplier = getResponsiveMultiplier(window.innerWidth);
      var hMult = getHeightMultiplier(window.innerWidth);

      if (isFirstMount) isAnimating = true;

      var completedCount = 0;
      var visibleCount = visibleMap.size;

      function onCardDone() {
        if (++completedCount >= visibleCount) {
          isAnimating = false;
          if (isFirstMount) hasEntered = true;
          cleanupHover = bindHover(cardElements, visibleMap);
        }
      }

      cardElements.forEach(function (card, cardIndex) {
        var slot = visibleMap.get(cardIndex);
        var wasVisible = previouslyVisible.has(cardIndex);

        if (slot !== undefined) {
          var cfg = getSlotConfig(slotCount, slot);
          var target = {
            x: cfg.x * multiplier + "rem",
            y: cfg.y * hMult + "rem",
            xPercent: -50,
            yPercent: -50,
            rotation: cfg.rot,
            scale: cfg.scale,
            opacity: 1,
            zIndex: cfg.zIndex,
          };

          if (isFirstMount) {
            gsap.set(card, {
              x: 0,
              y: 12 * hMult + "rem",
              xPercent: -50,
              yPercent: -50,
              rotation: 0,
              scale: 0.5,
              opacity: 0,
            });
            gsap.to(
              card,
              Object.assign({}, target, {
                duration: 1.1,
                ease: "elastic.out(1.05,.78)",
                delay: 0.15 + slot * 0.05,
                onComplete: onCardDone,
              })
            );
          } else if (!wasVisible) {
            var enterDist = getEnterExitRem(window.innerWidth);
            var enterX = direction === "right" ? enterDist : -enterDist;
            gsap.set(card, {
              x: enterX + "rem",
              y: cfg.y * hMult + "rem",
              xPercent: -50,
              yPercent: -50,
              rotation: direction === "right" ? 24 : -24,
              scale: 0.5,
              opacity: 0,
            });
            gsap.to(
              card,
              Object.assign({}, target, {
                duration: 0.55,
                ease: "power2.out",
                onComplete: onCardDone,
              })
            );
          } else {
            gsap.to(
              card,
              Object.assign({}, target, {
                duration: 0.48,
                ease: "power2.out",
                onComplete: onCardDone,
              })
            );
          }
        } else if (wasVisible) {
          var exitDist = getEnterExitRem(window.innerWidth);
          var exitX = direction === "right" ? -exitDist : exitDist;
          gsap.to(card, {
            x: exitX + "rem",
            xPercent: -50,
            yPercent: -50,
            opacity: 0,
            scale: 0.5,
            rotation: direction === "right" ? -24 : 24,
            duration: 0.38,
            ease: "power2.in",
            zIndex: 0,
          });
        } else if (isFirstMount) {
          gsap.set(card, {
            opacity: 0,
            scale: 0.3,
            x: 0,
            y: 0,
            xPercent: -50,
            yPercent: -50,
            zIndex: 0,
          });
        } else {
          gsap.set(card, {
            opacity: 0,
            scale: 0.4,
            zIndex: 0,
          });
        }
      });

      prevVisible = new Set(visibleMap.keys());
    }

    function bindHover(cardElements, visibleMap) {
      var visibleEntries = [];
      cardElements.forEach(function (el, i) {
        var slot = visibleMap.get(i);
        if (slot !== undefined) visibleEntries.push({ el: el, slot: slot });
      });
      visibleEntries.sort(function (a, b) {
        return a.slot - b.slot;
      });

      var activeSlot = null;
      var leaveTimer = null;
      var centerSlot = visibleEntries.length >> 1;

      function updateHoverLayout(hoveredSlot) {
        if (isAnimating) return;
        var mult = getResponsiveMultiplier(window.innerWidth);
        var hM = getHeightMultiplier(window.innerWidth);

        visibleEntries.forEach(function (entry) {
          var el = entry.el;
          var slot = entry.slot;
          var base = getSlotConfig(slotCount, slot);
          var targetX = base.x * mult;
          var targetY = base.y * hM;
          var targetRot = base.rot;
          var targetScale = base.scale;
          var delay = 0;

          if (hoveredSlot !== null) {
            var distance = Math.abs(slot - hoveredSlot);
            delay = distance * 0.02;

            if (slot === hoveredSlot) {
              targetY -= 2.5 * hM;
              targetScale *= 1.06;
            } else {
              var normalized =
                centerSlot > 0 ? (slot - centerSlot) / centerSlot : 0;
              var pushStrength =
                5.5 *
                (1 - Math.abs(normalized)) *
                (1 + 0.15 * Math.max(0, 3 - distance));

              if (slot < hoveredSlot) {
                targetX -= pushStrength * mult;
                targetRot -= 2.5 / (distance + 1);
              } else {
                targetX += pushStrength * mult;
                targetRot += 2.5 / (distance + 1);
              }
            }
          } else {
            delay = Math.abs(slot - centerSlot) * 0.02;
          }

          gsap.to(el, {
            x: targetX + "rem",
            y: targetY + "rem",
            xPercent: -50,
            yPercent: -50,
            rotation: targetRot,
            scale: targetScale,
            duration: 0.5,
            delay: delay,
            ease: "elastic.out(1,.75)",
            overwrite: "auto",
          });
          gsap.set(el, { zIndex: base.zIndex });
        });
      }

      var enterHandlers = visibleEntries.map(function (entry) {
        var handler = function () {
          if (isAnimating) return;
          if (leaveTimer) {
            clearTimeout(leaveTimer);
            leaveTimer = null;
          }
          if (activeSlot !== entry.slot) {
            activeSlot = entry.slot;
            updateHoverLayout(entry.slot);
          }
        };
        entry.el.addEventListener("mouseenter", handler);
        return { el: entry.el, handler: handler };
      });

      function onMouseLeave() {
        if (isAnimating) return;
        if (leaveTimer) clearTimeout(leaveTimer);
        leaveTimer = setTimeout(function () {
          activeSlot = null;
          updateHoverLayout(null);
        }, 50);
      }
      container.addEventListener("mouseleave", onMouseLeave);

      function onHoverResize() {
        if (!isAnimating) updateHoverLayout(activeSlot);
      }
      window.addEventListener("resize", onHoverResize);

      container.addEventListener("mouseenter", stopAutoplay);
      container.addEventListener("mouseleave", startAutoplay);

      return function () {
        enterHandlers.forEach(function (h) {
          h.el.removeEventListener("mouseenter", h.handler);
        });
        container.removeEventListener("mouseleave", onMouseLeave);
        container.removeEventListener("mouseenter", stopAutoplay);
        container.removeEventListener("mouseleave", startAutoplay);
        window.removeEventListener("resize", onHoverResize);
        if (leaveTimer) clearTimeout(leaveTimer);
      };
    }

    function onWindowResize() {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var changed = syncSlotCount();
        if (changed) {
          prevVisible = new Set();
          direction = null;
        }
        layout();
      }, 120);
    }

    if (prevBtn) prevBtn.addEventListener("click", function () { cycle("left"); });
    if (nextBtn) nextBtn.addEventListener("click", function () { cycle("right"); });
    window.addEventListener("resize", onWindowResize);

    layout();
    startAutoplay();

    return {
      cycle: cycle,
      pause: stopAutoplay,
      resume: startAutoplay,
      destroy: function () {
        stopAutoplay();
        if (cleanupHover) cleanupHover();
        if (resizeTimer) clearTimeout(resizeTimer);
        window.removeEventListener("resize", onWindowResize);
      },
    };
  }

  global.createCardFanCarousel = createCardFanCarousel;
})(window);
