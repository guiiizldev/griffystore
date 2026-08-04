const statusEl = document.getElementById("status");
const codeEl = document.getElementById("code");
const video = document.getElementById("video");
const startButton = document.getElementById("start");
let detector = null;
let scanning = false;
let lastCode = "";
let stream = null;
let zxingControls = null;

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

startButton.addEventListener("click", async () => {
  try {
    if (scanning) {
      stopCamera();
      setStatus("Camera pausada.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Camera indisponivel neste navegador. Use o campo manual.");
      return;
    }
    if ("BarcodeDetector" in window) {
      await startNativeScanner();
      return;
    }
    if (window.ZXingBrowser?.BrowserMultiFormatReader) {
      await startZxingScanner();
      return;
    }
    setStatus("Leitor automatico nao carregou neste navegador. Use o campo manual ou abra no Chrome atualizado.");
  } catch (error) {
    setStatus(error.message);
    stopCamera();
  }
});

async function startNativeScanner() {
  detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code"] });
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  scanning = true;
  startButton.textContent = "Pausar camera";
  setStatus("Camera ativa. Aponte para o codigo.");
  scanLoop();
}

async function startZxingScanner() {
  const reader = new ZXingBrowser.BrowserMultiFormatReader();
  scanning = true;
  startButton.textContent = "Pausar camera";
  setStatus("Camera ativa com leitor compativel. Aponte para o codigo.");
  zxingControls = await reader.decodeFromConstraints(
    { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
    video,
    async (result) => {
      if (!result || !scanning) return;
      try {
        await submitCode(result.getText());
      } catch (error) {
        setStatus(error.message);
      }
    },
  );
}

function stopCamera() {
  scanning = false;
  detector = null;
  zxingControls?.stop?.();
  zxingControls = null;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
  if (video.srcObject) {
    video.srcObject.getTracks?.().forEach((track) => track.stop());
    video.srcObject = null;
  }
  startButton.textContent = "Iniciar camera";
}

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
