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
   Resize Canvas to 16:9 Aspect Ratio
   ========================= */
function resizeCanvas(canvas) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const targetRatio = 16 / 9;

  let w, h;

  if (width / height > targetRatio) {
    // الشاشة أعرض من 16:9
    h = height;
    w = h * targetRatio;
  } else {
    // الشاشة أطول أو أقل عرضًا من 16:9
    w = width;
    h = w / targetRatio;
  }

  canvas.width = w;
  canvas.height = h;
}

/* =========================
   Draw Image Centered Fullscreen
   ========================= */
function drawCenteredImage(ctx, img) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;

  // scale لتغطية الكانفاس بالكامل مع الحفاظ على النسب
  const scale = Math.max(cw / img.width, ch / img.height);

  const w = img.width * scale;
  const h = img.height * scale;

  ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
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
function fade(ctx, img, p){ ctx.globalAlpha = p; drawCenteredImage(ctx, img); ctx.globalAlpha = 1; }
function slide(ctx, img, p){ ctx.save(); ctx.translate((1 - p) * 300, 0); drawCenteredImage(ctx, img); ctx.restore(); }
function blur(ctx, img, p){ ctx.filter = `blur(${15*(1-p)}px)`; drawCenteredImage(ctx, img); ctx.filter = 'none'; }
function spin(ctx, img, p){ ctx.save(); ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2); ctx.rotate(p * Math.PI * 2); ctx.translate(-ctx.canvas.width/2, -ctx.canvas.height/2); drawCenteredImage(ctx, img); ctx.restore(); }
function flip3d(ctx, img, p){ ctx.save(); ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2); ctx.scale(Math.cos(p*Math.PI), 1); ctx.translate(-ctx.canvas.width/2, -ctx.canvas.height/2); drawCenteredImage(ctx, img); ctx.restore(); }
function scalex(ctx, img, p){ ctx.save(); ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2); ctx.scale(p,1); ctx.translate(-ctx.canvas.width/2, -ctx.canvas.height/2); drawCenteredImage(ctx, img); ctx.restore(); }
function scaley(ctx, img, p){ ctx.save(); ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2); ctx.scale(1,p); ctx.translate(-ctx.canvas.width/2, -ctx.canvas.height/2); drawCenteredImage(ctx, img); ctx.restore(); }
function bounce(ctx, img, p){ ctx.save(); ctx.translate(0, Math.sin(p*Math.PI)*-100); drawCenteredImage(ctx, img); ctx.restore(); }
function rotate3d(ctx, img, p){ ctx.save(); ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2); ctx.rotate((p-0.5)*Math.PI); ctx.translate(-ctx.canvas.width/2, -ctx.canvas.height/2); drawCenteredImage(ctx, img); ctx.restore(); }
function shutter(ctx, img, p){ ctx.save(); ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2); ctx.scale(1,p); ctx.translate(-ctx.canvas.width/2, -ctx.canvas.height/2); drawCenteredImage(ctx, img); ctx.restore(); }

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
   Export Video + Audio
   ========================= */
async function exportVideo() {
  const canvas = document.getElementById('exportCanvas');
  resizeCanvas(canvas); // ضبط الكانفاس بنسبة 16:9
  const ctx = canvas.getContext('2d');

  const images = Array.from(
    document.querySelectorAll('.masonry-item img')
  ).map(img => img.src).filter(Boolean);

  if(!images.length) {
    alert('No images to export');
    return;
  }

  const { effect, delay, audio } = getCurrentSettings();

  exportStatusEl && (exportStatusEl.textContent = '⏳ Exporting video...');

  const stream = canvas.captureStream(60);

  // 🔹 دمج الصوت من الإعدادات
  let audioEl;
  if(audio){
    audioEl = new Audio(audio);
    audioEl.loop = true;
    audioEl.muted = true; // مكتوم أثناء التصدير
    await audioEl.play().catch(()=>{});
    const audioStream = audioEl.captureStream();
    audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
  }

  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 4_000_000
  });

  const chunks = [];
  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.start();

  for(const img of images) {
    await drawFrame(ctx, img, effect, delay);
  }

  recorder.stop();

  recorder.onstop = async () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);

    exportStatusEl && (exportStatusEl.innerHTML = `✅ WebM ready! <a href="${url}" download="karma-video.webm">Download WebM</a>`);

    if(audioEl){
      audioEl.pause();
      audioEl.src = '';
      audioEl = null;
    }
  };
}

// ربط الزر
document.getElementById('btnExportVideo')?.addEventListener('click', exportVideo);

/* =========================
   ضبط الكانفاس عند تغيير حجم الشاشة
   ========================= */
window.addEventListener('resize', () => {
  const canvas = document.getElementById('exportCanvas');
  resizeCanvas(canvas);
});
