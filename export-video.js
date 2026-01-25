/* =========================
   Helpers: Load Image
   ========================= */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/* =========================
   Draw Image Centered with Frame & Margin
   ========================= */
function drawCenteredImage(ctx, img) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;

  const margin = 0.02; // 5% margin
  const maxW = cw * (1 - margin*2);
  const maxH = ch * (1 - margin*2);

  const scale = Math.max(cw / img.width, ch / img.height);

  const w = img.width * scale;
  const h = img.height * scale;

  const x = (cw - w) / 2;
  const y = (ch - h) / 2;

  // خلفية كاملة
  ctx.fillStyle = '#000'; 
  ctx.fillRect(0, 0, cw, ch);

  // إطار الصورة
  ctx.fillStyle = '#000'; 
  ctx.fillRect(x-5, y-5, w+10, h+10);

  // رسم الصورة
  ctx.drawImage(img, x, y, w, h);

  // إطار خارجي
  ctx.strokeStyle = '#fff'; 
  ctx.lineWidth = 5;
  ctx.strokeRect(x, y, w, h);
}

/* =========================
   Effects
   ========================= */
function zoom(ctx, img, p){ 
  ctx.save(); 
  ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2); 
  ctx.scale(0.8 + 0.2*p, 0.8 + 0.2*p); 
  ctx.translate(-ctx.canvas.width/2, -ctx.canvas.height/2); 
  drawCenteredImage(ctx, img); 
  ctx.restore(); 
}

function fade(ctx, img, p){ 
  ctx.save();
  ctx.globalAlpha = p; 
  drawCenteredImage(ctx, img); 
  ctx.restore();
}

function slide(ctx, img, p){ 
  ctx.save(); 
  const offsetX = (p-0.5) * 100; 
  ctx.translate(offsetX, 0); 
  drawCenteredImage(ctx, img); 
  ctx.restore(); 
}

function blur(ctx, img, p){ 
  ctx.save();
  ctx.filter = `blur(${15*(1-p)}px)`; 
  drawCenteredImage(ctx, img); 
  ctx.filter = 'none'; 
  ctx.restore();
}

function spin(ctx, img, p){ 
  ctx.save(); 
  ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2); 
  ctx.rotate(p * Math.PI * 2); 
  ctx.translate(-ctx.canvas.width/2, -ctx.canvas.height/2); 
  drawCenteredImage(ctx, img); 
  ctx.restore(); 
}

function flip3d(ctx, img, p){ 
  ctx.save(); 
  ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2); 
  ctx.scale(Math.cos(p*Math.PI), 1); 
  ctx.translate(-ctx.canvas.width/2, -ctx.canvas.height/2); 
  drawCenteredImage(ctx, img); 
  ctx.restore(); 
}

function scalex(ctx, img, p){ 
  ctx.save(); 
  ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2); 
  ctx.scale(p,1); 
  ctx.translate(-ctx.canvas.width/2, -ctx.canvas.height/2); 
  drawCenteredImage(ctx, img); 
  ctx.restore(); 
}

function scaley(ctx, img, p){ 
  ctx.save(); 
  ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2); 
  ctx.scale(1,p); 
  ctx.translate(-ctx.canvas.width/2, -ctx.canvas.height/2); 
  drawCenteredImage(ctx, img); 
  ctx.restore(); 
}

function bounce(ctx, img, p){ 
  ctx.save(); 
  ctx.translate(0, Math.sin(p*Math.PI)*-100); 
  drawCenteredImage(ctx, img); 
  ctx.restore(); 
}

function rotate3d(ctx, img, p){ 
  ctx.save(); 
  ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2); 
  ctx.rotate((p-0.5)*Math.PI); 
  ctx.translate(-ctx.canvas.width/2, -ctx.canvas.height/2); 
  drawCenteredImage(ctx, img); 
  ctx.restore(); 
}

function shutter(ctx, img, p){ 
  ctx.save(); 
  ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2); 
  ctx.scale(1,p); 
  ctx.translate(-ctx.canvas.width/2, -ctx.canvas.height/2); 
  drawCenteredImage(ctx, img); 
  ctx.restore(); 
}

const EFFECTS = { zoom, fade, slide, blur, spin, flip3d, scalex, scaley, bounce, rotate3d, shutter };

/* =========================
   Draw Frame Animation
   ========================= */
async function drawFrame(ctx, imgSrc, effect, frameDuration) {
  const img = await loadImage(imgSrc);
  const start = performance.now();
  
  return new Promise(resolve => {
    function animate(now) {
      const elapsed = now - start;
      const p = Math.min(elapsed / frameDuration, 1);
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      EFFECTS[effect]?.(ctx, img, p);
      if (p < 1) requestAnimationFrame(animate);
      else resolve();
    }
    requestAnimationFrame(animate);
  });
}

/* =========================
   Export Video
   ========================= */
async function exportVideo() {
  const canvas = document.getElementById('exportCanvas');
  const ctx = canvas.getContext('2d');
  const exportStatusEl = document.getElementById('exportStatus');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  const images = Array.from(
    document.querySelectorAll('.masonry-item img')
  ).map(img => img.src).filter(Boolean);

  // ✅ لو مفيش صور
  if (!images.length) {
    if (exportStatusEl) {
      exportStatusEl.textContent = '⚠️ No images to export';

      // تختفي بعد 2.5 ثانية
      setTimeout(() => {
        exportStatusEl.textContent = '';
      }, 2500);
    }
    return;
  }

  const { effect, delay, audio } = getCurrentSettings();
  if (exportStatusEl) exportStatusEl.textContent = '⏳ Exporting video...';

  // تنظيف أي تسجيل قديم
  if (window.currentRecorder) {
    window.currentRecorder.stream.getTracks().forEach(track => track.stop());
    window.currentRecorder = null;
  }

  if (window.currentAudio) {
    window.currentAudio.pause();
    window.currentAudio.src = '';
    window.currentAudio = null;
  }

  // Stream الفيديو
  const stream = canvas.captureStream(60);

  let audioStream = null;

  if (audio) {
    const start = parseFloat(audioStart.value) || 0;
    const end   = parseFloat(audioEnd.value) || 0;
    const duration = end - start;

    if (duration > 0) {
      const audioCtx = new AudioContext();
      const res = await fetch(audio);
      const buffer = await res.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(buffer);

      const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioCtx.sampleRate * duration,
        audioCtx.sampleRate
      );

      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start(0, start, duration);

      const rendered = await offlineCtx.startRendering();

      const dest = audioCtx.createMediaStreamDestination();
      const srcNode = audioCtx.createBufferSource();
      srcNode.buffer = rendered;
      srcNode.connect(dest);
      srcNode.start();

      audioStream = dest.stream;
      audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
    }
  }

  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 4_000_000
  });

  window.currentRecorder = recorder;
  const chunks = [];

  recorder.ondataavailable = e => chunks.push(e.data);

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);

    if (exportStatusEl) {
      exportStatusEl.innerHTML =
        `✅ WebM ready! <a href="${url}" download="karma-video.webm">Download WebM</a>`;
    }

    window.currentRecorder = null;
  };

  recorder.start();

  // رسم الفريمات
  for (const img of images) {
    await drawFrame(ctx, img, effect, delay);
  }

  recorder.stop();
}

// ربط الزر
document.getElementById('btnExportVideo')?.addEventListener('click', exportVideo);
