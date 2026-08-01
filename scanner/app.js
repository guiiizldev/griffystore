const statusEl = document.getElementById("status");
const codeEl = document.getElementById("code");
const video = document.getElementById("video");
let detector = null;
let scanning = false;
let lastCode = "";

function setStatus(message) {
  statusEl.textContent = message;
}

async function submitCode(code) {
  const clean = String(code || "").trim();
  if (!clean || clean === lastCode) return;
  lastCode = clean;
  const response = await fetch("/api/barcode-scans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: clean, deviceName: navigator.userAgent.slice(0, 80) }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Nao foi possivel enviar.");
  setStatus(`Codigo enviado: ${clean}`);
  codeEl.value = "";
  setTimeout(() => {
    lastCode = "";
  }, 1800);
}

document.getElementById("manualForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await submitCode(codeEl.value);
  } catch (error) {
    setStatus(error.message);
  }
});

document.getElementById("start").addEventListener("click", async () => {
  try {
    if (!("BarcodeDetector" in window)) {
      setStatus("Camera sem suporte a leitura automatica neste navegador. Use o campo manual.");
      return;
    }
    detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code"] });
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = stream;
    await video.play();
    scanning = true;
    setStatus("Camera ativa. Aponte para o codigo.");
    scanLoop();
  } catch (error) {
    setStatus(error.message);
  }
});

async function scanLoop() {
  if (!scanning || !detector) return;
  try {
    const codes = await detector.detect(video);
    if (codes.length) await submitCode(codes[0].rawValue);
  } catch (_error) {
    // Keep scanning when a frame fails.
  }
  requestAnimationFrame(scanLoop);
}
