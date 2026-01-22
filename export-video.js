/* =========================
   Load Image Helper
   ========================= */
function loadImage(src){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/* =========================
   Draw Image Centered
   ========================= */
function drawCenteredImage(ctx, img){
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;

  const ratio = Math.min(cw / img.width, ch / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;

  ctx.drawImage(img, -w/2, -h/2, w, h);
}

/* =========================
   Effects
   ========================= */
function zoom(ctx, img, p){
  const s = 0.8 + 0.2 * p;
  ctx.scale(s, s);
  drawCenteredImage(ctx, img);
}

function fade(ctx, img, p){
  ctx.globalAlpha = p;
  drawCenteredImage(ctx, img);
}

function slide(ctx, img, p){
  ctx.translate((1 - p) * 300, 0);
  drawCenteredImage(ctx, img);
}

function blur(ctx, img, p){
  ctx.filter = `blur(${15 * (1 - p)}px)`;
  drawCenteredImage(ctx, img);
  ctx.filter = 'none';
}

function spin(ctx, img, p){
  ctx.rotate(p * Math.PI * 2);
  drawCenteredImage(ctx, img);
}

function flip3d(ctx, img, p){
  ctx.scale(Math.cos(p * Math.PI), 1);
  drawCenteredImage(ctx, img);
}

function scalex(ctx, img, p){
  ctx.scale(p, 1);
  drawCenteredImage(ctx, img);
}

function scaley(ctx, img, p){
  ctx.scale(1, p);
  drawCenteredImage(ctx, img);
}

function bounce(ctx, img, p){
  ctx.translate(0, Math.sin(p * Math.PI) * -100);
  drawCenteredImage(ctx, img);
}

function rotate3d(ctx, img, p){
  ctx.rotate((p - 0.5) * Math.PI);
  drawCenteredImage(ctx, img);
}

function shutter(ctx, img, p){
  ctx.scale(1, p);
  drawCenteredImage(ctx, img);
}

/* =========================
   Effects Map
   ========================= */
const EFFECTS = {
  zoom,
  fade,
  slide,
  blur,
  spin,
  flip3d,
  scalex,
  scaley,
  bounce,
  rotate3d,
  shutter
};

/* =========================
   Draw Frame (Animation)
   ========================= */
async function drawFrame(ctx, imgSrc, effect, duration){
  const img = await loadImage(imgSrc);
  const start = performance.now();

  return new Promise(resolve=>{
    function animate(t){
      const p = Math.min((t - start) / duration, 1);

      ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
      ctx.save();
      ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);

      EFFECTS[effect]?.(ctx, img, p);

      ctx.restore();

      if(p < 1){
        requestAnimationFrame(animate);
      }else{
        resolve();
      }
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

    const images = Array.from(
        masonry.querySelectorAll('.masonry-item img')
    ).map(img => img.src).filter(Boolean);

    if (!images.length) {
        alert('No images to export');
        return;
    }

    const { effect, delay } = getCurrentSettings();

    // Show exporting status
    exportStatusEl.textContent = '⏳ Exporting video...';

    const stream = canvas.captureStream(60);

    if (audioPlayer && audioPlayer.src) {
        const originalVolume = audioPlayer.volume;
        audioPlayer.volume = 0;
        audioPlayer.currentTime = 0;
        await audioPlayer.play();

        const audioStream = audioPlayer.captureStream();
        audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
    }

    const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 8_000_000
    });

    const chunks = [];
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.start();

    for (const img of images) {
        await drawFrame(ctx, img, effect, delay);
    }

    recorder.stop();

    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);

        // Update status with download link
        exportStatusEl.innerHTML = `✅ Video ready! <a href="${url}" download="karma-video.webm">Click here to download</a>`;

        // Stop audio
        if (audioPlayer && !audioPlayer.paused) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
            audioPlayer.volume = 1;
        }
    };
}

// Bind button
document.getElementById('btnExportVideo')?.addEventListener('click', exportVideo);
