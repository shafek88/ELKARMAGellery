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

  const margin = 0.05; // 5% margin
  const maxW = cw * (1 - margin*2);
  const maxH = ch * (1 - margin*2);

  const scale = Math.min(maxW / img.width, maxH / img.height);

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
async function drawFrame(ctx, imgSrc, effect, duration) {
  const img = await loadImage(imgSrc);
  const start = performance.now();
  return new Promise(resolve => {
    function animate(t) {
      const p = Math.min((t - start)/duration, 1);
      ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
      EFFECTS[effect]?.(ctx, img, p);
      if(p < 1) requestAnimationFrame(animate);
      else resolve();
    }
    requestAnimationFrame(animate);
  });
}

/* =========================
   Get Current Settings (Live)
   ========================= */
function getCurrentSettings() {
  const effectEl = document.getElementById('effectSelect');
  const delayEl  = document.getElementById('delayInput');
  const audioEl  = document.getElementById('audioSelect');

  return {
    effect: effectEl?.value || 'zoom',
    delay: Number(delayEl?.value) || 1100,
    audio: audioEl?.value || null
  };
}

/* =========================
   Export Video
   ========================= */
async function exportVideo() {
  const canvas = document.getElementById('exportCanvas');
  const ctx = canvas.getContext('2d');

  const exportStatusEl = document.getElementById('exportStatus');

  // تنظيف كامل قبل البدء
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // حجم YouTube القياسي
  const width = 1920;
  const height = 1080;
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  const images = Array.from(
    document.querySelectorAll('.masonry-item img')
  ).map(img => img.src).filter(Boolean);

  // بدل alert، رسالة فوق الزرار
  if (!images.length) {
    if (exportStatusEl) {
      exportStatusEl.textContent = '⚠️ No images to export';
    }
    return;
  }

  const { effect, delay, audio } = getCurrentSettings();
  exportStatusEl && (exportStatusEl.textContent = '⏳...Exporting video');

  // إيقاف أي MediaRecorder أو audio سابق
  if (window.currentRecorder) {
    window.currentRecorder.stream.getTracks().forEach(track => track.stop());
    window.currentRecorder = null;
  }
  if (window.currentAudio) {
    window.currentAudio.pause();
    window.currentAudio.src = '';
    window.currentAudio = null;
  }

  const stream = canvas.captureStream(60);

  let audioEl;
  if (audio) {
    audioEl = new Audio(audio);
    audioEl.loop = true;
    audioEl.volume = 0; 
    await audioEl.play().catch(() => {});
    window.currentAudio = audioEl;
    const audioStream = audioEl.captureStream();
    audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
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

    // تنظيف بعد الانتهاء
    if (audioEl) {
      audioEl.pause();
      audioEl.src = '';
      window.currentAudio = null;
    }
    window.currentRecorder = null;
  };

  recorder.start();
  for (const img of images) {
    await drawFrame(ctx, img, effect, delay);
  }
  recorder.stop();
}

// ربط الزر
document.getElementById('btnExportVideo')?.addEventListener('click', exportVideo);
