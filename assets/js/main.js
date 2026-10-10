/**
 * 赫滋與羊 HerzBaa — interactions
 * 無框架、無建置步驟；所有動畫都會尊重 prefers-reduced-motion。
 */
(function () {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------------------------------------------------------------
   * Split text：把字拆成 span 以做逐字進場
   * ------------------------------------------------------------- */
  function splitChars(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let i = 0;
    nodes.forEach((node) => {
      const frag = document.createDocumentFragment();
      // 拉丁字以單字為單位，中文以單字元為單位；標點黏在前一個字上，避免單獨落到下一行
      node.textContent.match(/[A-Za-z0-9@.'’-]+[，。？！、；：」』）]*|\s+|[「『（]?.[，。？！、；：」』）…]*/gu)?.forEach((part) => {
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        const span = document.createElement('span');
        span.className = 'char';
        span.style.setProperty('--i', i++);
        span.textContent = part;
        frag.appendChild(span);
      });
      node.parentNode.replaceChild(frag, node);
    });
    return i;
  }

  // 拆字後螢幕閱讀器改讀隱藏的完整句子，不會一個字一個字念
  function splitAccessible(el) {
    const text = el.textContent.trim();
    splitChars(el);
    $$('.char', el).forEach((c) => c.setAttribute('aria-hidden', 'true'));
    const sr = document.createElement('span');
    sr.className = 'visually-hidden';
    sr.textContent = text;
    el.appendChild(sr);
  }
  $$('[data-split]').forEach(splitAccessible);
  // 第二行標題接續第一行的延遲
  $$('.hero__title .line, .contact__title .line').forEach((line, idx) => {
    line.firstElementChild.style.setProperty('--d', `${idx * 220}ms`);
  });

  const statement = $('[data-scrub]');
  let statementChars = [];
  if (statement) {
    splitAccessible(statement);
    statementChars = $$('.char', statement);
  }

  /* ---------------------------------------------------------------
   * Smooth scroll (Lenis)
   * ------------------------------------------------------------- */
  let lenis = null;
  if (!reduceMotion && typeof window.Lenis === 'function') {
    lenis = new window.Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  function scrollToTarget(target) {
    const headerOffset = target.id === 'top' ? 0 : -60;
    if (lenis) lenis.scrollTo(target, { offset: headerOffset, duration: 1.4 });
    else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + headerOffset, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const target = id === '#' ? null : document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (body.classList.contains('menu-open')) closeMenu(false);
    scrollToTarget(target);
    // 讓鍵盤與螢幕閱讀器的焦點跟著移動
    const focusTarget = target.id === 'top' ? $('#main') : target;
    if (!focusTarget.hasAttribute('tabindex')) focusTarget.setAttribute('tabindex', '-1');
    focusTarget.focus({ preventScroll: true });
    history.replaceState(null, '', id === '#top' ? location.pathname : id);
  });

  /* ---------------------------------------------------------------
   * Loader：數羊
   * ------------------------------------------------------------- */
  const loader = $('.loader');
  function startSite() {
    root.classList.add('is-ready');
    $$('.hero [data-split]').forEach((el) => el.classList.add('is-in'));
    $$('.hero [data-reveal]').forEach((el) => el.classList.add('is-in'));
    try { sessionStorage.setItem('hb-loaded', '1'); } catch (e) { /* 隱私模式 */ }
  }

  const skipLoader = !loader || reduceMotion || root.classList.contains('is-returning');
  if (skipLoader) {
    if (loader) loader.remove();
    requestAnimationFrame(() => requestAnimationFrame(startSite));
  } else {
    if (lenis) lenis.stop();
    const num = $('.loader__num', loader);
    const start = performance.now();
    const MIN = 1600, MAX = 4000;
    let loaded = document.readyState === 'complete';
    window.addEventListener('load', () => { loaded = true; });
    let n = 1;
    const tick = (now) => {
      const t = now - start;
      // 每隻羊跳過柵欄的節奏 ~ 1.1s；數字配合載入進度增加
      const target = loaded ? 12 : Math.min(11, 1 + Math.floor(t / 180));
      if (n < target) { n++; num.textContent = String(n).padStart(2, '0'); }
      if ((loaded && t > MIN && n >= 12) || t > MAX) {
        loader.classList.add('is-done');
        setTimeout(startSite, 350);
        setTimeout(() => { loader.remove(); if (lenis) lenis.start(); }, 1200);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------------------------------------------------------------
   * Header：滾動狀態、隱藏 / 顯示、目前區塊
   * ------------------------------------------------------------- */
  let lastY = window.scrollY;
  function onHeaderScroll(y) {
    root.classList.toggle('is-scrolled', y > 40);
    const goingDown = y > lastY + 4;
    const goingUp = y < lastY - 4;
    if (goingDown && y > 600 && !body.classList.contains('menu-open')) root.classList.add('header-hidden');
    else if (goingUp || y < 600) root.classList.remove('header-hidden');
    lastY = y;
  }
  // 鍵盤 Tab 進入 header 時一定要顯示
  $('#header').addEventListener('focusin', () => root.classList.remove('header-hidden'));

  const navLinks = $$('.nav__link');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        const active = link.getAttribute('href') === `#${entry.target.id}`;
        if (active) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['top', 'about', 'journey', 'services', 'skills', 'works', 'contact'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) sectionObserver.observe(el);
  });

  /* ---------------------------------------------------------------
   * Mobile menu
   * ------------------------------------------------------------- */
  const menuBtn = $('.menu-toggle');
  const menu = $('#mobile-menu');
  function openMenu() {
    menu.hidden = false;
    requestAnimationFrame(() => body.classList.add('menu-open'));
    menuBtn.setAttribute('aria-expanded', 'true');
    $('.visually-hidden', menuBtn).textContent = '關閉選單';
    if (lenis) lenis.stop();
    setTimeout(() => $('a', menu).focus(), 300);
  }
  function closeMenu(returnFocus = true) {
    body.classList.remove('menu-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    $('.visually-hidden', menuBtn).textContent = '開啟選單';
    if (lenis) lenis.start();
    setTimeout(() => { if (!body.classList.contains('menu-open')) menu.hidden = true; }, 800);
    if (returnFocus) menuBtn.focus();
  }
  menuBtn.addEventListener('click', () => (body.classList.contains('menu-open') ? closeMenu() : openMenu()));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && body.classList.contains('menu-open')) closeMenu();
  });
  window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => {
    if (e.matches && body.classList.contains('menu-open')) closeMenu(false);
  });

  /* ---------------------------------------------------------------
   * Reveal on scroll
   * ------------------------------------------------------------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      revealObserver.unobserve(entry.target);
      if (entry.target.matches('.stat')) countUp($('.stat__num', entry.target));
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });

  $$('[data-reveal], [data-split], .work').forEach((el) => {
    if (el.closest('.hero')) return;
    revealObserver.observe(el);
  });

  function countUp(el) {
    if (!el || reduceMotion) return;
    const end = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const dur = 1400;
    const t0 = performance.now();
    const step = (now) => {
      const p = clamp((now - t0) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(end * eased) + (p === 1 ? suffix : '');
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------------------------------------------------------------
   * Scroll-linked frame loop
   * ------------------------------------------------------------- */
  const progress = $('.progress');
  const heroImg = $('.hero__img');
  const hero = $('.hero');
  const timeline = $('.timeline');
  const marqueeTrack = $('.marquee__track');
  let marqueeX = 0;
  let scrollVel = 0;
  let prevY = window.scrollY;
  let litCount = -1;

  function frame() {
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;

    progress.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    onHeaderScroll(y);

    // velocity (smoothed)
    scrollVel = lerp(scrollVel, y - prevY, 0.12);
    prevY = y;

    if (!reduceMotion) {
      // hero parallax
      // 只在真正滾動後接手，避免蓋掉進場的縮放過場
      if (y > 2 && y < vh * 1.2 && root.classList.contains('is-ready')) {
        root.classList.add('is-scrolling-hero');
        heroImg.style.setProperty('--hy', `${(y * 0.28).toFixed(1)}px`);
        heroImg.style.setProperty('--hs', (1.08 + y / vh * 0.08).toFixed(4));
      }

      // marquee：基本速度 + 滾動加速
      if (marqueeTrack) {
        const half = marqueeTrack.scrollWidth / 2;
        marqueeX -= 0.6 + Math.abs(scrollVel) * 0.25;
        if (half > 0 && -marqueeX >= half) marqueeX += half;
        marqueeTrack.style.transform = `translate3d(${marqueeX.toFixed(2)}px,0,0)`;
      }
    }

    // timeline line drawing
    if (timeline) {
      const r = timeline.getBoundingClientRect();
      const p = clamp((vh * 0.6 - r.top) / r.height, 0, 1);
      timeline.style.setProperty('--tl', p.toFixed(4));
    }

    // statement 逐字點亮
    if (statement && statementChars.length) {
      const r = statement.getBoundingClientRect();
      const p = reduceMotion ? 1 : clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0, 1);
      const count = Math.round(p * statementChars.length);
      if (count !== litCount) {
        statementChars.forEach((c, i) => c.classList.toggle('is-lit', i < count));
        litCount = count;
      }
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------------------------------------------------------------
   * Hero：雲朵隨滑鼠移動、職稱輪播、數羊彩蛋
   * ------------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    const clouds = $$('.hero__cloud');
    hero.addEventListener('pointermove', (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      clouds.forEach((c) => {
        const d = Number(c.dataset.depth || 1);
        c.style.setProperty('--mx', `${(-nx * 40 * d).toFixed(1)}px`);
        c.style.setProperty('--my', `${(-ny * 26 * d).toFixed(1)}px`);
      });
    });
  }

  const roleItems = $$('.roles__item');
  if (roleItems.length > 1 && !reduceMotion) {
    let r = 0;
    setInterval(() => {
      const cur = roleItems[r];
      cur.classList.remove('is-active');
      cur.classList.add('is-leaving');
      setTimeout(() => cur.classList.remove('is-leaving'), 800);
      r = (r + 1) % roleItems.length;
      roleItems[r].classList.add('is-active');
    }, 2400);
  }

  const counterBtn = $('.sheep-counter');
  const counterNum = $('.sheep-counter__n');
  let sheepCount = 0;
  counterBtn.addEventListener('click', () => {
    sheepCount++;
    counterNum.textContent = sheepCount;
    if (reduceMotion) return;
    const rect = counterBtn.getBoundingClientRect();
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('class', 'flying-sheep');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<use href="#sheep"/>';
    s.style.left = `${rect.left + 10}px`;
    s.style.top = `${rect.top - 10}px`;
    s.style.setProperty('--fx', `${(Math.random() * -260 - 40).toFixed(0)}px`);
    s.style.setProperty('--fy', `${(Math.random() * -260 - 120).toFixed(0)}px`);
    s.style.setProperty('--fr', `${(Math.random() * 60 - 30).toFixed(0)}deg`);
    body.appendChild(s);
    s.addEventListener('animationend', () => s.remove());
    if (sheepCount === 10) toast('數到 10 隻羊了…別睡著，作品集還在下面喔 🐑');
  });

  /* ---------------------------------------------------------------
   * Custom cursor + magnetic buttons
   * ------------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    root.classList.add('has-cursor');
    const cursor = $('.cursor');
    const dot = $('.cursor__dot');
    const ring = $('.cursor__ring');
    const label = $('.cursor__label');
    let mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    }, { passive: true });
    const loop = () => {
      rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
      ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    document.addEventListener('pointerover', (e) => {
      const labelled = e.target.closest('[data-cursor]');
      const link = e.target.closest('a, button, .filter, .chips li');
      cursor.classList.toggle('is-label', !!labelled);
      cursor.classList.toggle('is-link', !labelled && !!link);
      if (labelled) label.textContent = labelled.dataset.cursor;
    });
    document.documentElement.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
    document.documentElement.addEventListener('pointerenter', () => cursor.classList.remove('is-hidden'));

    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.3;
        const y = (e.clientY - r.top - r.height / 2) * 0.35;
        el.style.transition = 'transform .25s ease-out';
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = 'transform .8s cubic-bezier(.34,1.56,.64,1)';
        el.style.transform = '';
      });
    });

    /* Services：跟隨游標的預覽圖 */
    const preview = $('.svc-preview');
    const previewImg = $('img', preview);
    let px = 0, py = 0, tx = 0, ty = 0, running = false;
    const follow = () => {
      px = lerp(px, tx, 0.14); py = lerp(py, ty, 0.14);
      const tilt = clamp((tx - px) * 0.08, -12, 12);
      preview.style.setProperty('--px', `${px.toFixed(1)}px`);
      preview.style.setProperty('--py', `${py.toFixed(1)}px`);
      preview.style.setProperty('--pr', `${(-4 + tilt).toFixed(2)}deg`);
      if (running) requestAnimationFrame(follow);
    };
    $$('.svc__row').forEach((row) => {
      const img = new Image();
      img.src = row.dataset.preview; // 預先載入
      row.addEventListener('pointerenter', (e) => {
        previewImg.src = row.dataset.preview;
        tx = e.clientX + 30; ty = e.clientY - 100;
        if (!preview.classList.contains('is-on')) { px = tx; py = ty; }
        preview.classList.add('is-on');
        if (!running) { running = true; requestAnimationFrame(follow); }
      });
      row.addEventListener('pointermove', (e) => { tx = e.clientX + 30; ty = e.clientY - 100; });
      row.addEventListener('pointerleave', () => { preview.classList.remove('is-on'); running = false; });
    });
  }

  /* ---------------------------------------------------------------
   * Works：最短欄位瀑布流 + 篩選
   * ------------------------------------------------------------- */
  const grid = $('.works__grid');
  const filters = $$('.filter');
  const works = $$('.work');
  const filterStatus = $('#filter-status');

  function layoutWorks() {
    const width = grid.clientWidth;
    const cols = width >= 1000 ? 3 : width >= 620 ? 2 : 1;
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 24;
    const rowGap = gap * 1.35;
    const colW = (width - gap * (cols - 1)) / cols;
    const heights = new Array(cols).fill(0);
    let visibleIdx = 0;
    works.forEach((w) => {
      w.style.width = `${colW}px`;
      if (w.classList.contains('is-hidden')) return;
      const c = heights.indexOf(Math.min(...heights));
      w.style.setProperty('--x', `${(c * (colW + gap)).toFixed(1)}px`);
      w.style.setProperty('--y', `${heights[c].toFixed(1)}px`);
      w.style.setProperty('--d', `${(visibleIdx++ % cols) * 90}ms`);
      heights[c] += w.offsetHeight + rowGap;
    });
    grid.style.height = `${Math.max(0, Math.max(...heights) - rowGap)}px`;
    if (lenis) lenis.resize();
  }
  layoutWorks();
  let layoutRaf = 0;
  const requestLayout = () => { cancelAnimationFrame(layoutRaf); layoutRaf = requestAnimationFrame(layoutWorks); };
  new ResizeObserver(requestLayout).observe(grid);
  if (document.fonts) document.fonts.ready.then(requestLayout);
  window.addEventListener('load', requestLayout);

  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('is-active')) return;
      const cat = btn.dataset.filter;
      filters.forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      let shown = 0;
      works.forEach((w) => {
        const match = cat === '*' || w.dataset.cat === cat;
        w.classList.toggle('is-hidden', !match);
        $('.work__btn', w).tabIndex = match ? 0 : -1;
        if (match) { shown++; w.classList.add('is-in'); }
      });
      filterStatus.textContent = `顯示 ${shown} 件作品`;
      layoutWorks();
    });
  });

  /* ---------------------------------------------------------------
   * Lightbox
   * ------------------------------------------------------------- */
  const lb = $('.lightbox');
  const lbImg = $('.lightbox__img', lb);
  let lbList = [];
  let lbIndex = 0;
  let lastFocus = null;

  function largestSrc(img) {
    const set = img.getAttribute('srcset');
    if (!set) return img.getAttribute('src');
    const parts = set.split(',').map((s) => s.trim().split(/\s+/));
    return parts[parts.length - 1][0];
  }

  function renderLb(i, dir = 0) {
    const item = lbList[i];
    const img = $('img', item);
    const fill = () => {
      lbImg.src = largestSrc(img);
      lbImg.alt = img.alt;
      $('.lb-index', lb).textContent = String(i + 1).padStart(2, '0');
      $('.lb-total', lb).textContent = String(lbList.length).padStart(2, '0');
      $('.lightbox__cat', lb).textContent = $('.work__cat', item).textContent;
      $('.lightbox__title', lb).textContent = $('.work__title', item).textContent;
      $('.lightbox__sub', lb).textContent = $('.work__sub', item).textContent;
      $('.lightbox__story', lb).textContent = $('.work__story', item).textContent.trim();
      $('.lightbox__story', lb).scrollTop = 0;
    };
    if (dir && !reduceMotion) {
      lbImg.classList.add('is-swapping');
      setTimeout(() => {
        fill();
        const done = () => lbImg.classList.remove('is-swapping');
        if (lbImg.complete) requestAnimationFrame(done); else lbImg.onload = done;
      }, 220);
    } else {
      fill();
    }
  }

  function openLb(item) {
    lbList = works.filter((w) => !w.classList.contains('is-hidden'));
    lbIndex = lbList.indexOf(item);
    lastFocus = document.activeElement;
    renderLb(lbIndex);
    lb.showModal();
    root.classList.add('lb-open');
    if (lenis) lenis.stop();
    $('.lb-close', lb).focus();
  }
  function step(d) {
    lbIndex = (lbIndex + d + lbList.length) % lbList.length;
    renderLb(lbIndex, d);
  }

  works.forEach((w) => $('.work__btn', w).addEventListener('click', () => openLb(w)));
  $('.lb-close', lb).addEventListener('click', () => lb.close());
  $('.lb-prev', lb).addEventListener('click', () => step(-1));
  $('.lb-next', lb).addEventListener('click', () => step(1));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lightbox__figure')) lb.close(); });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });
  lb.addEventListener('close', () => {
    root.classList.remove('lb-open');
    if (lenis) lenis.start();
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  });
  // 觸控滑動切換
  let touchX = null;
  lb.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1);
    touchX = null;
  });

  /* ---------------------------------------------------------------
   * Copy email + toast
   * ------------------------------------------------------------- */
  const toastEl = $('.toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2600);
  }
  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
        toast('已複製信箱，期待你的來信 ✉️');
      } catch (e) {
        window.location.href = `mailto:${text}`;
      }
    });
  });

  /* ---------------------------------------------------------------
   * Misc
   * ------------------------------------------------------------- */
  const year = $('.year');
  if (year) year.textContent = new Date().getFullYear();

  // 字型載入後重新計算 Lenis 高度
  if (lenis && document.fonts) document.fonts.ready.then(() => lenis.resize());
})();
