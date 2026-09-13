import { renderPlaySvg, fieldViewBox } from "../components/designer/playRenderer.js";
import { toast } from "../state/store.js";

const RES_SCALES = { standard: 1.5, high: 3, print: 5 };

function svgStringToBlob(svgString) {
  return new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function exportPlayPng(play, branding, { resolution = "high", background = true } = {}) {
  try {
    const box = fieldViewBox(play);
    const scale = RES_SCALES[resolution] || RES_SCALES.high;
    const svgMarkup = renderPlaySvg(play, { branding }).replace(
      "<svg ",
      `<svg width="${box.w}" height="${box.h}" `
    );
    const blob = svgStringToBlob(svgMarkup);
    const url = URL.createObjectURL(blob);
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = box.w * scale;
    canvas.height = box.h * scale;
    const ctx = canvas.getContext("2d");
    if (background) {
      ctx.fillStyle = branding?.fieldColor || "#1e5c33";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((pngBlob) => {
      const dlUrl = URL.createObjectURL(pngBlob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = `${(play.name || "play").replace(/[^a-z0-9-_ ]/gi, "").trim() || "play"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(dlUrl), 4000);
      toast("PNG exported", "success");
    }, "image/png");
  } catch (err) {
    console.error(err);
    toast("PNG export failed: " + err.message, "danger");
  }
}
