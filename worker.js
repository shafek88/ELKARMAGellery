// worker.js
self.onmessage = async function (e) {
  const { files, maxWidth = 1280, quality = 0.75 } = e.data;

  const results = [];

  for (let file of files) {
    try {
      const bitmap = await createImageBitmap(file);

      const scale = Math.min(1, maxWidth / bitmap.width);
      const canvas = new OffscreenCanvas(bitmap.width * scale, bitmap.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
      results.push({ name: file.name, blob });
    } catch (err) {
      results.push({ name: file.name, error: err.message || err });
    }
  }

  self.postMessage(results);
};
