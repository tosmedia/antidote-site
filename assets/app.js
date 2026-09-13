/* ============================================================
   Antidote — landing page behaviour
   No dependencies, no build step.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- theme ------------------------------------------------ */
  var THEME_KEY = 'antidote-theme';
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function recall(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  var saved = recall(THEME_KEY);
  if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);

  var themeBtn = document.getElementById('themeBtn');
  function syncThemeBtn() {
    var light = root.getAttribute('data-theme') === 'light';
    themeBtn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#F1F5F3' : '#0A1113');
  }
  themeBtn.addEventListener('click', function () {
    var light = root.getAttribute('data-theme') === 'light';
    root.setAttribute('data-theme', light ? 'dark' : 'light');
    store(THEME_KEY, light ? 'dark' : 'light');
    syncThemeBtn();
    paintFrames();
  });
  syncThemeBtn();

  /* ---------- header ----------------------------------------------- */
  var head = document.getElementById('siteHead');
  var onScroll = function () { head.classList.toggle('is-stuck', window.scrollY > 8); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      nav.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });

  /* ---------- reveal on scroll ------------------------------------- */
  var reveals = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- marquee: duplicate the track so it loops seamlessly --- */
  var track = document.getElementById('marqueeTrack');
  if (track) track.innerHTML += track.innerHTML;

  /* ============================================================
     The hero clip.

     Two canvases show the same 25p footage: one as it should look,
     one as the file actually decodes. Everything is generated —
     the clean side is a procedural dusk seascape, the broken side
     is that same frame taken apart the way a damaged H.264 stream
     falls apart, with fresh damage on every frame.
     ============================================================ */
  var clean = document.getElementById('frameClean');
  var broken = document.getElementById('frameBroken');
  var W = 640, H = 360, HORIZON = Math.round(H * 0.6);
  clean.width = broken.width = W;
  clean.height = broken.height = H;
  var cctx = clean.getContext('2d');
  var bctx = broken.getContext('2d');

  function surface(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  var scene = surface(W, H), sctx = scene.getContext('2d');
  var layerBase = surface(W, H);
  var layerClouds = surface(W * 2, H);
  var layerVignette = surface(W, H);
  var qbuf = surface(W, H), qctx = qbuf.getContext('2d');
  var grains = [surface(160, 160), surface(160, 160), surface(160, 160), surface(160, 160)];

  /* deterministic noise, so the scene is identical on every visit */
  var seed = 20260824;
  function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
  function reseed(v) { seed = v; }

  /* ---- layers that only change when the theme changes ---- */
  function buildLayers(light) {
    var ctx = layerBase.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    var sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
    if (light) {
      sky.addColorStop(0, '#2A3F63'); sky.addColorStop(0.45, '#7E7FA0');
      sky.addColorStop(0.78, '#E2A06A'); sky.addColorStop(1, '#F7C98B');
    } else {
      sky.addColorStop(0, '#0C1226'); sky.addColorStop(0.42, '#2A2743');
      sky.addColorStop(0.76, '#8A4A3C'); sky.addColorStop(1, '#E08A3C');
    }
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, HORIZON);

    var sea = ctx.createLinearGradient(0, HORIZON, 0, H);
    if (light) {
      sea.addColorStop(0, '#C98A63'); sea.addColorStop(0.28, '#4A5B76'); sea.addColorStop(1, '#141E2E');
    } else {
      sea.addColorStop(0, '#B06A34'); sea.addColorStop(0.26, '#22304A'); sea.addColorStop(1, '#060A14');
    }
    ctx.fillStyle = sea; ctx.fillRect(0, HORIZON, W, H - HORIZON);

    /* clouds live on a double-width strip so they can scroll and wrap */
    var cc = layerClouds.getContext('2d');
    cc.clearRect(0, 0, W * 2, H);
    reseed(77123);
    for (var i = 0; i < 18; i++) {
      var cy = rnd() * HORIZON * 0.84;
      var cw = W * (0.14 + rnd() * 0.42);
      var cx = rnd() * W;
      var ch = 2 + rnd() * 7;
      var a = (0.05 + rnd() * 0.15) * (light ? 1.25 : 1);
      for (var pass = 0; pass < 2; pass++) {
        var x = cx + pass * W;
        var g = cc.createLinearGradient(x - cw / 2, 0, x + cw / 2, 0);
        g.addColorStop(0, 'rgba(255,220,190,0)');
        g.addColorStop(0.5, 'rgba(255,222,196,' + a.toFixed(3) + ')');
        g.addColorStop(1, 'rgba(255,220,190,0)');
        cc.fillStyle = g;
        cc.beginPath(); cc.ellipse(x, cy, cw / 2, ch, 0, 0, Math.PI * 2); cc.fill();
      }
    }

    var vc = layerVignette.getContext('2d');
    vc.clearRect(0, 0, W, H);
    var vig = vc.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.98);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, light ? 'rgba(10,16,22,.4)' : 'rgba(0,0,0,.6)');
    vc.fillStyle = vig; vc.fillRect(0, 0, W, H);

    /* four grain tiles, cycled — sensor noise is what sells it as footage */
    reseed(4242);
    for (var t = 0; t < grains.length; t++) {
      var gc = grains[t].getContext('2d');
      gc.clearRect(0, 0, 160, 160);
      for (var n = 0; n < 1500; n++) {
        gc.fillStyle = 'rgba(255,255,255,' + (rnd() * 0.12).toFixed(3) + ')';
        gc.fillRect(Math.floor(rnd() * 160), Math.floor(rnd() * 160), 1, 1);
      }
    }
  }

  /* ---- a photographed frame, if the file is there ---- */
  var still = new Image();
  var stillReady = false;
  still.onload = function () {
    stillReady = true;
    if (!playing) { renderScene(frame / FPS, frame); renderBroken(frame); }
  };
  still.src = 'assets/img/hero-frame.jpg';

  /* ---- one frame of the clip ---- */
  function renderScene(t, frame) {
    if (stillReady) {
      /* crop the letterbox, then a slow push-in and drift, like a locked-off shot that breathes */
      var iw = still.naturalWidth, ih = still.naturalHeight;
      var bar = Math.round(ih * 0.035);
      var zoom = 1.05 + Math.sin(t * 0.06) * 0.025;
      var sw = iw / zoom, sh = (ih - bar * 2) / zoom;
      var sx0 = (iw - sw) / 2 + Math.sin(t * 0.085) * iw * 0.012;
      var sy0 = bar + ((ih - bar * 2) - sh) / 2 + Math.cos(t * 0.068) * ih * 0.008;
      sctx.drawImage(still, sx0, sy0, sw, sh, 0, 0, W, H);
      sctx.drawImage(layerVignette, 0, 0);
      var tile0 = grains[frame % grains.length];
      var ox0 = -((frame * 37) % 160), oy0 = -((frame * 53) % 160);
      sctx.globalAlpha = 0.5;
      for (var gx0 = ox0; gx0 < W; gx0 += 160) {
        for (var gy0 = oy0; gy0 < H; gy0 += 160) sctx.drawImage(tile0, gx0, gy0);
      }
      sctx.globalAlpha = 1;
      var ddx = Math.sin(t * 0.31) * 1.2, ddy = Math.sin(t * 0.27) * 0.9;
      cctx.drawImage(scene, -W * 0.01 + ddx, -H * 0.01 + ddy, W * 1.02, H * 1.02);
      return;
    }
    sctx.drawImage(layerBase, 0, 0);

    var drift = (t * 7) % W;
    sctx.drawImage(layerClouds, -drift, Math.sin(t * 0.13) * 1.5);

    /* sun, breathing on the horizon the way heat haze makes it */
    var sx = W * 0.68;
    var sy = HORIZON - H * 0.062 + Math.sin(t * 0.11) * 2.2;
    var sr = H * 0.072 + Math.sin(t * 0.37) * 0.6;
    var glow = sctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 6.2);
    glow.addColorStop(0, 'rgba(255,214,150,.95)');
    glow.addColorStop(0.16, 'rgba(255,176,90,.5)');
    glow.addColorStop(1, 'rgba(255,150,60,0)');
    sctx.fillStyle = glow; sctx.fillRect(0, 0, W, HORIZON + 3);
    sctx.beginPath(); sctx.arc(sx, sy, sr, 0, Math.PI * 2);
    sctx.fillStyle = '#FFD99B'; sctx.fill();

    /* the glitter column, moving with the swell */
    var ph = t * 2.4;
    for (var y = HORIZON; y < H; y += 2) {
      var p = (y - HORIZON) / (H - HORIZON);
      var spread = 6 + p * 130;
      var alpha = (1 - p) * 0.5;
      var wob = Math.sin(y * 0.34 + ph) * 8 + Math.sin(y * 0.11 - ph * 0.6) * 20;
      var gg = sctx.createLinearGradient(sx - spread + wob, 0, sx + spread + wob, 0);
      gg.addColorStop(0, 'rgba(255,190,110,0)');
      gg.addColorStop(0.5, 'rgba(255,205,140,' + alpha.toFixed(3) + ')');
      gg.addColorStop(1, 'rgba(255,190,110,0)');
      sctx.fillStyle = gg;
      sctx.fillRect(0, y, W, 2);
    }
    for (var y2 = HORIZON + 4; y2 < H; y2 += 6) {
      var p2 = (y2 - HORIZON) / (H - HORIZON);
      sctx.fillStyle = 'rgba(255,255,255,' + (0.05 * (1 - p2)).toFixed(3) + ')';
      sctx.fillRect(Math.sin(y2 * 0.2 + ph * 0.5) * 40, y2, W, 1);
    }

    sctx.drawImage(layerVignette, 0, 0);

    /* grain: one tile, cycled and jittered */
    var tile = grains[frame % grains.length];
    var ox = -((frame * 37) % 160), oy = -((frame * 53) % 160);
    sctx.globalAlpha = 0.62;
    for (var gx = ox; gx < W; gx += 160) {
      for (var gy = oy; gy < H; gy += 160) sctx.drawImage(tile, gx, gy);
    }
    sctx.globalAlpha = 1;

    /* handheld float — the scene is drawn slightly oversized so no edge shows */
    var dx = Math.sin(t * 0.085) * 5.6 + Math.sin(t * 0.31) * 1.6;
    var dy = Math.cos(t * 0.068) * 3.4 + Math.sin(t * 0.27) * 1.1;
    cctx.drawImage(scene, -W * 0.03 + dx, -H * 0.03 + dy, W * 1.06, H * 1.06);
  }

  /* ---- the same frame, decoded from a broken file ---- */
  var DEAD = [[255, 30, 120], [56, 232, 150], [18, 22, 34], [255, 190, 60]];
  function renderBroken(frame) {
    reseed(1000 + frame * 7919);
    bctx.globalCompositeOperation = 'source-over';
    bctx.globalAlpha = 1;
    bctx.filter = 'none';
    bctx.imageSmoothingEnabled = true;
    bctx.drawImage(clean, 0, 0);

    /* whole bands of scanlines slide sideways */
    var tears = 5 + Math.floor(rnd() * 6);
    for (var i = 0; i < tears; i++) {
      var y = Math.floor(rnd() * H);
      var h = 2 + Math.floor(rnd() * 22);
      var shift = Math.round((rnd() - 0.5) * W * 0.55);
      bctx.drawImage(clean, 0, y, W, h, shift, y, W, h);
      bctx.drawImage(clean, 0, y, W, h, shift - (shift > 0 ? W : -W), y, W, h);
    }

    /* macroblocks copied from the wrong place */
    var BS = 16;
    for (var b = 0; b < 70; b++) {
      var bx = Math.floor(rnd() * (W / BS)) * BS;
      var by = Math.floor(rnd() * (H / BS)) * BS;
      var ox = Math.max(0, Math.min(W - BS, bx + Math.round((rnd() - 0.5) * 170)));
      var oy = Math.max(0, Math.min(H - BS, by + Math.round((rnd() - 0.5) * 110)));
      bctx.drawImage(clean, ox, oy, BS, BS, bx, by, BS, BS);
    }

    /* a region the decoder gave up on: resolution collapses */
    var rw = 128 + Math.floor(rnd() * 190), rh = 64 + Math.floor(rnd() * 120);
    var rx = Math.floor(rnd() * (W - rw)), ry = Math.floor(rnd() * (H - rh));
    qctx.clearRect(0, 0, W, H);
    qctx.imageSmoothingEnabled = true;
    qctx.drawImage(clean, rx, ry, rw, rh, 0, 0, Math.max(2, rw / 10), Math.max(2, rh / 10));
    bctx.imageSmoothingEnabled = false;
    bctx.drawImage(qbuf, 0, 0, Math.max(2, rw / 10), Math.max(2, rh / 10), rx, ry, rw, rh);
    bctx.imageSmoothingEnabled = true;

    /* chroma torn off its luma */
    if (bctx.filter !== undefined) {
      var cy2 = Math.floor(H * (0.4 + rnd() * 0.45));
      var chh = 14 + Math.floor(rnd() * 40);
      bctx.save();
      bctx.filter = 'hue-rotate(' + Math.round(90 + rnd() * 180) + 'deg) saturate(2.4)';
      bctx.globalAlpha = 0.55;
      bctx.globalCompositeOperation = 'screen';
      bctx.drawImage(clean, 0, cy2, W, chh, Math.round((rnd() - 0.5) * 26), cy2, W, chh);
      bctx.restore();
    }

    /* lost reference frames: flat blocks of magenta and green */
    var deads = 18 + Math.floor(rnd() * 22);
    for (var k = 0; k < deads; k++) {
      var c = DEAD[Math.floor(rnd() * DEAD.length)];
      var kw = BS * (1 + Math.floor(rnd() * 4));
      var kh = BS * (1 + Math.floor(rnd() * 2));
      bctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (0.5 + rnd() * 0.5).toFixed(2) + ')';
      bctx.fillRect(Math.floor(rnd() * (W / BS)) * BS, Math.floor(rnd() * (H / BS)) * BS, kw, kh);
    }

    /* the tail of the frame was never written */
    var deadFrom = Math.floor(H * (0.86 + rnd() * 0.06));
    bctx.fillStyle = 'rgba(4,6,10,.94)';
    bctx.fillRect(0, deadFrom, W, H - deadFrom);
    bctx.fillStyle = 'rgba(255,46,110,.55)';
    bctx.fillRect(0, deadFrom, W, 2);
  }

  /* ---- transport ---- */
  var tcEl = document.getElementById('tc');
  var playBtn = document.getElementById('scopePlay');
  var FPS = 25, STEP = 1000 / FPS;
  var frame = 0;
  var tcFrames = 21557;              /* 00:14:22:07 at 25p */
  var playing = false, raf = null, last = 0, acc = 0, inView = true;

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function drawTimecode() {
    var f = tcFrames;
    tcEl.textContent = pad(Math.floor(f / (FPS * 3600))) + ':' +
      pad(Math.floor(f / (FPS * 60)) % 60) + ':' +
      pad(Math.floor(f / FPS) % 60) + ':' + pad(f % FPS);
  }

  function renderAt(frameNo) {
    renderScene(frameNo / FPS, frameNo);
    /* every so often the broken side simply stops updating — a frozen picture
       over moving audio is exactly what a missing index looks like */
    if (frameNo % 41 > 3) renderBroken(frameNo);
  }

  function tick(ts) {
    if (!playing) return;
    raf = requestAnimationFrame(tick);
    if (!last) last = ts;
    acc += ts - last;
    last = ts;
    if (acc < STEP) return;
    acc = Math.min(acc % STEP, STEP);
    frame++; tcFrames++;
    renderAt(frame);
    if (frame % 5 === 0) drawTimecode();
  }

  function play() {
    if (playing) return;
    playing = true; last = 0; acc = 0;
    playBtn.setAttribute('aria-label', 'Pause the clip');
    playBtn.classList.remove('is-paused');
    raf = requestAnimationFrame(tick);
  }
  function pause() {
    playing = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    playBtn.setAttribute('aria-label', 'Play the clip');
    playBtn.classList.add('is-paused');
  }
  playBtn.addEventListener('click', function () { playing ? pause() : play(); });

  /* rebuilt whenever the theme flips */
  function paintFrames() {
    buildLayers(root.getAttribute('data-theme') === 'light');
    renderScene(frame / FPS, frame);
    renderBroken(frame);
    drawTimecode();
  }
  paintFrames();

  /* never burn cycles on a clip nobody is looking at */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (playing) { pause(); playBtn.dataset.auto = '1'; } }
    else if (playBtn.dataset.auto && inView) { delete playBtn.dataset.auto; play(); }
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      inView = en[0].isIntersecting;
      if (!inView) { if (playing) { pause(); playBtn.dataset.auto = '1'; } }
      else if (playBtn.dataset.auto && !document.hidden) { delete playBtn.dataset.auto; play(); }
    }, { threshold: 0.05 }).observe(clean);
  }

  if (!reduce) play(); else pause();

  /* ---------- the repair slider ------------------------------------ */
  var damaged = document.getElementById('damagedWrap');
  var divider = document.getElementById('scopeDivider');
  var range = document.getElementById('scopeRange');

  function setSplit(pct) {
    var p = Math.max(0, Math.min(100, pct));
    damaged.style.clipPath = 'inset(0 ' + (100 - p) + '% 0 0)';
    divider.style.left = p + '%';
  }
  range.addEventListener('input', function () { setSplit(parseFloat(range.value)); });
  setSplit(100);

  /* opening move: the clip arrives broken, then heals back to halfway */
  if (reduce) {
    range.value = 50; setSplit(50);
  } else {
    var start = null, from = 100, to = 50, dur = 1150;
    var kick = function (ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      var v = from + (to - from) * e;
      range.value = v; setSplit(v);
      if (p < 1) requestAnimationFrame(kick);
    };
    setTimeout(function () { requestAnimationFrame(kick); }, 420);
  }

  /* pointer dragging anywhere on the frame */
  var stage = document.getElementById('scopeStage');
  var dragging = false;
  function fromPointer(e) {
    var r = stage.getBoundingClientRect();
    var pct = ((e.clientX - r.left) / r.width) * 100;
    range.value = Math.max(2, Math.min(98, pct));
    setSplit(pct);
  }
  stage.addEventListener('pointerdown', function (e) {
    dragging = true; stage.setPointerCapture(e.pointerId); fromPointer(e);
  });
  stage.addEventListener('pointermove', function (e) { if (dragging) fromPointer(e); });
  stage.addEventListener('pointerup', function () { dragging = false; });
  stage.addEventListener('pointercancel', function () { dragging = false; });

  /* ---------- local file inspection --------------------------------
     MP4, MOV, MXF, AVI, MKV and MPEG-TS each announce themselves in
     the first few bytes. For the QuickTime family (MP4/MOV/M4V/3GP),
     the frames live in 'mdat' and the index ('moov') is written last —
     which is exactly why a clip that lost power has no index.
     Everything below reads a few small slices of the file in the
     browser; nothing is uploaded.                                     */
  var CONTACT = 'repair@your-domain.com';   /* TODO: real address */
  var drop = document.getElementById('drop');
  var input = document.getElementById('fileInput');
  var report = document.getElementById('report');
  var rows = document.getElementById('reportRows');
  var verdict = document.getElementById('reportVerdict');
  var mailBtn = document.getElementById('mailBtn');
  var resetBtn = document.getElementById('resetBtn');

  ['dragenter', 'dragover'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); });
  });
  drop.addEventListener('drop', function (e) {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) inspect(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', function () { if (input.files[0]) inspect(input.files[0]); });
  resetBtn.addEventListener('click', function () {
    report.hidden = true; drop.style.display = ''; input.value = '';
    drop.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
  });

  function bytes(n) {
    if (n < 1024) return n + ' B';
    var u = ['KB', 'MB', 'GB', 'TB'], i = -1;
    do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
    return n.toFixed(n < 10 ? 2 : 1) + ' ' + u[i];
  }
  function fourcc(view, off) {
    var s = '';
    for (var i = 0; i < 4; i++) s += String.fromCharCode(view.getUint8(off + i));
    return s;
  }
  function hex(u8, n) {
    return Array.from(u8.slice(0, n)).map(function (v) { return v.toString(16).padStart(2, '0'); }).join(' ');
  }
  function startsWith(u8, sig, at) {
    at = at || 0;
    if (u8.length < at + sig.length) return false;
    for (var i = 0; i < sig.length; i++) if (u8[at + i] !== sig[i]) return false;
    return true;
  }
  var TOP_LEVEL = /^(ftyp|wide|mdat|moov|free|skip|uuid|pnot|PICT|styp|sidx|moof|mfra|meta)$/;
  var VIDEO_EXT = /\.(mp4|m4v|mov|qt|3gp|3g2|mxf|mts|m2ts|ts|avi|mkv|webm|mpg|mpeg|vob)$/i;

  /* walk the top-level atoms of a QuickTime-family file */
  async function walkBoxes(file) {
    var found = [], offset = 0, guard = 0, moov = null, mdat = null, mdatAt = null, brand = '';
    while (offset < file.size && guard++ < 400) {
      var head = new DataView(await file.slice(offset, offset + 16).arrayBuffer());
      if (head.byteLength < 8) break;
      var size = head.getUint32(0);
      var type = fourcc(head, 4);
      var hdr = 8;
      if (!/^[\x20-\x7e]{4}$/.test(type)) break;
      if (size === 1) {
        if (head.byteLength < 16) break;
        size = head.getUint32(8) * 4294967296 + head.getUint32(12);
        hdr = 16;
      } else if (size === 0) {
        size = file.size - offset;
      }
      if (size < hdr) break;
      found.push(type);
      if (type === 'ftyp' && head.byteLength >= 12) brand = fourcc(head, 8).trim();
      if (type === 'moov') moov = size;
      if (type === 'mdat') { mdat = size; if (mdatAt === null) mdatAt = offset + hdr; }
      offset += size;
    }
    return { boxes: found, moov: moov, mdat: mdat, mdatAt: mdatAt, ranTo: offset, brand: brand };
  }

  /* count H.264 / HEVC start codes in the first slice of the picture data —
     a rough "are there frames in here" check for compressed streams */
  async function countStartCodes(file, at) {
    var len = Math.min(262144, file.size - at);
    if (len <= 8) return 0;
    var buf = new Uint8Array(await file.slice(at, at + len).arrayBuffer());
    var n = 0;
    for (var i = 0; i < buf.length - 3; i++) {
      if (buf[i] === 0 && buf[i + 1] === 0 && buf[i + 2] === 1) n++;
    }
    return n;
  }

  function row(label, value, cls) {
    var d = document.createElement('div');
    var dt = document.createElement('dt'); dt.textContent = label;
    var dd = document.createElement('dd'); dd.textContent = value;
    if (cls) dd.className = cls;
    d.appendChild(dt); d.appendChild(dd); rows.appendChild(d);
  }

  async function inspect(file) {
    rows.innerHTML = '';
    verdict.textContent = 'Reading the container…';
    report.hidden = false;
    drop.style.display = 'none';

    var isVideoName = VIDEO_EXT.test(file.name);
    var ext = (file.name.match(/\.([a-z0-9]+)$/i) || ['', ''])[1].toUpperCase();
    row('File', file.name);
    row('Size', bytes(file.size) + '  (' + file.size.toLocaleString('en-US') + ' bytes)');

    var head, u8;
    try {
      head = new DataView(await file.slice(0, 16).arrayBuffer());
      u8 = new Uint8Array(head.buffer);
    } catch (err) {
      verdict.textContent = 'The browser could not read this file. Send it to us directly and we will look at it by hand.';
      buildMail(file, 'unreadable in browser');
      return;
    }

    var line = '', tone = '';
    var first = head.byteLength >= 8 ? fourcc(head, 4) : '';

    if (TOP_LEVEL.test(first)) {
      /* ---- QuickTime family: MP4, MOV, M4V, 3GP ---- */
      var res = await walkBoxes(file);
      var codes = res.mdatAt !== null ? await countStartCodes(file, res.mdatAt) : 0;
      var family = res.brand ? 'MP4 / QuickTime family (brand ' + res.brand + ')' : 'QuickTime family (' + (ext || 'MOV') + ')';

      row('Container', family);
      row('Top-level atoms', res.boxes.length ? res.boxes.join(' · ') : 'none readable');
      row('mdat (frames)', res.mdat ? 'present · ' + bytes(res.mdat) : 'not found', res.mdat ? 'good' : 'bad');
      row('moov (index)', res.moov ? 'present · ' + bytes(res.moov) : 'not found', res.moov ? 'good' : 'bad');
      row('Picture data', res.mdatAt !== null
        ? (codes ? codes + ' stream markers in the first ' + bytes(Math.min(262144, file.size - res.mdatAt)) : 'present, no start codes in the first slice (ProRes, DNx or raw are normal here)')
        : 'no picture data to scan', res.mdatAt !== null ? 'good' : '');

      if (res.mdat && !res.moov) {
        line = 'This is the classic one: the frames are all on disk, but the camera never got to write the index that tells your editor where they are. It is the most repairable failure a video file can have.';
        tone = family + ' · frames present, index missing';
      } else if (res.mdat && res.moov) {
        line = 'The container is structurally complete — index and frames both present. If your editor still refuses it or it stops part-way, the damage is inside the frames or the index only covers part of the take. Send it over and an engineer will look.';
        tone = family + ' · index and frames both present';
      } else if (!res.mdat && res.moov) {
        line = 'There is an index but no picture block, which usually means the recording stopped before any frames were committed. Send it anyway — sometimes the data is elsewhere on the card.';
        tone = family + ' · index present, frames missing';
      } else {
        line = 'The header says QuickTime, but the atom tree stops early — this copy of the file is truncated. Recovery normally has to work from the card itself rather than from this copy, so do not reformat it.';
        tone = family + ' · atom tree truncated';
      }
    } else if (startsWith(u8, [0x06, 0x0e, 0x2b, 0x34, 0x02, 0x05, 0x01, 0x01, 0x0d, 0x01, 0x02])) {
      /* ---- MXF: opens with the partition-pack key ---- */
      row('Container', 'MXF (SMPTE 377M)');
      row('Header partition', 'present', 'good');
      line = 'An MXF with its header partition in place. Whether it plays depends on the footer partition and the index tables, which are written when the recording closes — exactly what an interrupted take is missing. Send the sample and we will check the partitions.';
      tone = 'MXF · header partition present';
    } else if (startsWith(u8, [0x52, 0x49, 0x46, 0x46]) && startsWith(u8, [0x41, 0x56, 0x49, 0x20], 8)) {
      /* ---- AVI: RIFF....AVI  ---- */
      var riffSize = head.getUint32(4, true) + 8;
      row('Container', 'AVI (RIFF)');
      row('Declared size', bytes(riffSize) + (Math.abs(riffSize - file.size) > 1024 ? ' — does not match the file' : ' — matches the file'), Math.abs(riffSize - file.size) > 1024 ? 'bad' : 'good');
      line = Math.abs(riffSize - file.size) > 1024
        ? 'The RIFF header describes a different size from the file on disk — the recording was cut off before the index (idx1) was written. Frames are usually intact; the index can be rebuilt.'
        : 'The AVI header matches the file size. If it still refuses to play, the damage is inside the stream or the index points at the wrong places. Send the sample and we will look.';
      tone = 'AVI · ' + (Math.abs(riffSize - file.size) > 1024 ? 'truncated' : 'header consistent');
    } else if (startsWith(u8, [0x1a, 0x45, 0xdf, 0xa3])) {
      /* ---- Matroska / WebM ---- */
      row('Container', 'Matroska / WebM (EBML)');
      row('EBML header', 'present', 'good');
      line = 'A Matroska-family file with a valid EBML header. Interrupted recordings usually have an unknown-length Segment and no Cues — playable frames, no seeking, or no playback at all. That is normally repairable from this copy.';
      tone = 'Matroska · EBML header present';
    } else if (u8[0] === 0x47 && file.size > 376) {
      /* ---- MPEG transport stream (MTS / M2TS / TS) ---- */
      var probe = new Uint8Array(await file.slice(0, 1128).arrayBuffer());
      var ts188 = probe[188] === 0x47 && probe[376] === 0x47;
      var ts192 = probe[192] === 0x47 && probe[384] === 0x47;
      row('Container', ts192 ? 'MPEG-TS, 192-byte packets (AVCHD / M2TS)' : ts188 ? 'MPEG-TS, 188-byte packets' : 'MPEG-TS (packet size unclear)');
      row('Sync bytes', ts188 || ts192 ? 'aligned' : 'not aligned', ts188 || ts192 ? 'good' : 'bad');
      line = 'A transport stream. These survive interruption better than most — each packet stands alone — so a clip that will not open usually has a damaged clip-info file or a broken tail rather than lost frames. Send the sample and we will confirm.';
      tone = 'MPEG-TS · ' + (ts188 || ts192 ? 'sync aligned' : 'sync lost');
    } else if (startsWith(u8, [0x00, 0x00, 0x01, 0xba])) {
      /* ---- MPEG program stream (MPG / VOB) ---- */
      row('Container', 'MPEG program stream (MPG / VOB)');
      row('Pack header', 'present', 'good');
      line = 'An MPEG program stream with its first pack header in place. These are usually recoverable from the copy you have; send the sample and we will confirm what is inside.';
      tone = 'MPEG-PS · pack header present';
    } else {
      row('Container', isVideoName ? 'Header damaged — not recognised as ' + ext : 'Not a recognised video container');
      row('First bytes', hex(u8, 12));
      if (isVideoName) {
        line = 'The file is named .' + ext.toLowerCase() + ' but the very start of it has been overwritten, so nothing will open it as a clip. That is repairable more often than not — the diagnosis is free either way.';
        tone = ext + ' · header overwritten';
      } else {
        line = 'This does not look like a video container we recognise from the first bytes. Send it anyway and say what camera or software wrote it — we will tell you honestly whether we can help.';
        tone = 'unrecognised container';
      }
    }

    row('Reported type', file.type || 'none');
    verdict.textContent = line;
    buildMail(file, tone);
  }

  function buildMail(file, tone) {
    var body = [
      'Hello Antidote,', '',
      'I have a damaged video file and would like a free diagnosis.', '',
      'File:       ' + file.name,
      'Size:       ' + file.size + ' bytes',
      'Inspection: ' + tone, '',
      'Camera and media:', '(model, card or SSD, recording format)', '',
      'What happened:', '(what you were doing when it stopped)', ''
    ].join('\n');
    mailBtn.href = 'mailto:' + CONTACT +
      '?subject=' + encodeURIComponent('Free diagnosis — ' + file.name) +
      '&body=' + encodeURIComponent(body);
  }

  /* ---------- photographs: if a file is missing, the figure goes ------ */
  document.querySelectorAll('.photo img').forEach(function (img) {
    var fig = img.closest('figure');
    var drop = function () { if (fig) fig.hidden = true; };
    if (img.complete && img.naturalWidth === 0) drop();
    img.addEventListener('error', drop);
  });

  /* ---------- misc -------------------------------------------------- */
  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();
})();
