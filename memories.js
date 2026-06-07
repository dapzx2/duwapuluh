/* ═══════════════════════════════════════════════════
   LITTLE MEMORIES — Heyzine-style Flipbook
   memories.js — v9.1 (stabilized)

   Fixes from audit:
   1. TOTAL_FACES dynamic (sheets.length * 2)
   2. suppressClick prevents swipe → click double flip
   3. Final sparkle uses stopPropagation
   4. Counter uses labels for cover/intro/end
   5. Click handler respects suppressClick
═══════════════════════════════════════════════════ */
'use strict';

let sheets = [];
let curFace = 0;
let TOTAL_FACES = 0;
let suppressClick = false;  // prevents swipe from also firing click

/* ════════════════════════════════════
   goTo(f) — SINGLE SOURCE OF TRUTH
   Updates: sheet classes, z-index, counter, buttons
════════════════════════════════════ */
function goTo(f) {
  const target      = Math.max(0, Math.min(TOTAL_FACES - 1, f));
  const targetSheet = Math.floor(target / 2);
  const targetSide  = target % 2;  // 0=front, 1=back
  const prevSheet   = Math.floor(curFace / 2);
  const goingFwd    = target > curFace;

  sheets.forEach((sheet, i) => {
    sheet.classList.remove('show-back');
    if (i < targetSheet) {
      sheet.classList.add('is-flipped');
      if (goingFwd && i === prevSheet) {
        sheet.style.zIndex = sheets.length + 2;
      } else {
        sheet.style.zIndex = i + 1;
      }
    } else if (i === targetSheet) {
      if (targetSide === 1) {
        sheet.classList.add('is-flipped');
      } else {
        sheet.classList.remove('is-flipped');
      }
      sheet.style.zIndex = sheets.length + 1;
    } else {
      sheet.classList.remove('is-flipped');
      sheet.style.zIndex = sheets.length - i;
    }
  });

  // After flip animation ends, drop the flipped sheet's z-index back to normal
  if (goingFwd && prevSheet < targetSheet && sheets[prevSheet]) {
    const ps = prevSheet;
    setTimeout(() => {
      sheets[ps].style.zIndex = ps + 1;
    }, 900);
  }

  curFace = target;
  updateNav(target);
}

/* ════════════════════════════════════
   updateNav — counter per spread
════════════════════════════════════ */
function updateNav(face) {
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const counter = document.getElementById('pageCounter');

  const sheetIdx = Math.floor(face / 2);
  if (btnPrev) btnPrev.disabled = face <= 0;
  if (btnNext) btnNext.disabled = face >= TOTAL_FACES - 1;

  if (counter) counter.textContent = `${sheetIdx + 1} / ${sheets.length}`;
}

/* ════════════════════════════════════
   navForward / navBack — per sheet spread
   Each flip reveals left (back) + right (next front)
════════════════════════════════════ */
function navForward() {
  const curSheet = Math.floor(curFace / 2);
  if (curSheet >= sheets.length - 1) {
    goTo(TOTAL_FACES - 1);  // show last back face
  } else {
    goTo((curSheet + 1) * 2);  // next sheet front
  }
}

function navBack() {
  if (curFace >= TOTAL_FACES - 1) {
    goTo((sheets.length - 1) * 2);  // back from end
  } else {
    const curSheet = Math.floor(curFace / 2);
    if (curSheet <= 0) return;
    goTo((curSheet - 1) * 2);  // prev sheet front
  }
}

/* ════════════════════════════════════
   INIT FLIPBOOK
════════════════════════════════════ */
function initFlipbook(elFlipbook) {
  sheets = [...elFlipbook.querySelectorAll('.sheet')];
  TOTAL_FACES = sheets.length * 2;  // dynamic — never hard-coded

  goTo(0);

  sheets.forEach(sheet => {
    sheet.addEventListener('pointerdown', e => {
      if (e.target.closest('a, .love-note, .mini-env, .nav-btn')) return;
      e.preventDefault();
    });

    sheet.addEventListener('click', e => {
      if (suppressClick) return;
      if (e.target.closest('a, .love-note, .mini-env, .nav-btn')) return;

      const rect = sheet.getBoundingClientRect();
      const clickedRight = (e.clientX - rect.left) > rect.width * 0.5;

      if (clickedRight) {
        navForward();
      } else {
        navBack();
      }
      if (navigator.vibrate) navigator.vibrate(10);
    });
  });
}

/* ════════════════════════════════════
   SWIPE — sets suppressClick to prevent
   double navigation after pointerup
════════════════════════════════════ */
function initSwipe(elFlipbook) {
  let startX = 0;
  let startY = 0;
  let moved = false;
  let isTracking = false;

  elFlipbook.addEventListener('pointerdown', e => {
    if (e.target.closest('a, .love-note, .mini-env, .nav-btn')) return;
    startX = e.clientX;
    startY = e.clientY;
    moved = false;
    isTracking = true;
  }, { passive: true });

  elFlipbook.addEventListener('pointermove', e => {
    if (!isTracking) return;
    if (Math.abs(e.clientX - startX) > 8) moved = true;
  }, { passive: true });

  elFlipbook.addEventListener('pointerup', e => {
    if (!isTracking) return;
    isTracking = false;
    if (!moved) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) < Math.abs(dy) * 1.2) return;

    if (dx < -40) {
      suppressClick = true;
      navForward();
      if (navigator.vibrate) navigator.vibrate(12);
    } else if (dx > 40) {
      suppressClick = true;
      navBack();
      if (navigator.vibrate) navigator.vibrate(10);
    }

    // Release suppressClick after browser click event window
    setTimeout(() => { suppressClick = false; }, 300);
  }, { passive: true });
}

/* ════════════════════════════════════
   KEYBOARD
════════════════════════════════════ */
function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navForward();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') navBack();
  });
}

/* ════════════════════════════════════
   LOVE NOTES
════════════════════════════════════ */
function initLoveNotes() {
  document.querySelectorAll('.love-note').forEach(card => {
    card.addEventListener('click', e => {
      e.stopPropagation();
      card.classList.toggle('open');
      if (navigator.vibrate) navigator.vibrate(10);
    });
  });
}

/* ════════════════════════════════════
   ENVELOPES
════════════════════════════════════ */
function initEnvelopes() {
  document.querySelectorAll('.mini-env').forEach(env => {
    env.addEventListener('click', e => {
      e.stopPropagation();
      env.classList.add('opened');
      if (navigator.vibrate) navigator.vibrate([18, 8, 28]);
      const popId = env.dataset.msg;
      if (popId) {
        setTimeout(() => {
          const pop = document.getElementById(popId);
          if (pop) pop.classList.add('show');
        }, 380);
      }
    });
  });

  document.querySelectorAll('.env-msg').forEach(pop => {
    pop.addEventListener('click', e => {
      if (e.target === pop || e.target.classList.contains('env-msg-close')) {
        pop.classList.remove('show');
      }
    });
  });
}

/* ════════════════════════════════════
   FINAL PAGE SPARKLES
   stopPropagation always — final page
   should not trigger sheet flip on tap.
   Add a "next" button on final page instead.
════════════════════════════════════ */
function initFinalSparkles() {
  const finalFront = document.getElementById('finalFront');
  if (!finalFront) return;
  let fired = false;

  finalFront.addEventListener('click', e => {
    e.stopPropagation();  // do NOT bubble to sheet click handler

    if (fired) return;
    fired = true;

    const container = finalFront.querySelector('.final-sparkles');
    if (!container) return;

    const cols = ['#C9A9A6', '#E8D4CF', '#9B7A87', '#D4B5B0', '#A0B4C8', '#F0D4CA'];
    for (let i = 0; i < 14; i++) {
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('viewBox', '0 0 20 20');
      s.setAttribute('width', String(8 + Math.random() * 10));
      s.setAttribute('height', String(8 + Math.random() * 10));
      s.innerHTML = `<path d="M10 0L12 7L20 10L12 13L10 20L8 13L0 10L8 7Z" fill="${cols[i % cols.length]}"/>`;
      s.classList.add('sparkle');
      s.style.cssText = `left:${5 + Math.random() * 90}%;top:${5 + Math.random() * 90}%;animation-delay:${i * .055}s`;
      container.appendChild(s);
      setTimeout(() => s.remove(), 1800);
    }
    if (navigator.vibrate) navigator.vibrate([14, 8, 18, 8, 14]);
  });
}

/* ════════════════════════════════════
   INIT ALL
════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  const elFlipbook = document.getElementById('flipbook');
  if (!elFlipbook) return;

  initFlipbook(elFlipbook);
  initSwipe(elFlipbook);
  initKeyboard();
  initLoveNotes();
  initEnvelopes();
  initFinalSparkles();

  // Entry overlay
  const overlay = document.getElementById('entryOverlay');
  if (overlay) {
    setTimeout(() => {
      overlay.classList.add('out');
      setTimeout(() => overlay.remove(), 1200);
    }, 2400);
  }
});

/* ════════════════════════════════════
   GLOBAL NAV — wired from HTML buttons
════════════════════════════════════ */
window.flipFwd  = () => { navForward(); if (navigator.vibrate) navigator.vibrate(12); };
window.flipBack = () => { navBack();    if (navigator.vibrate) navigator.vibrate(10); };
