type FFmpegState = "idle" | "loading" | "ready" | "error";
type Listener = (state: FFmpegState, detail?: string) => void;

const listeners = new Set<Listener>();
let currentState: FFmpegState = "idle";
let currentDetail: string | undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ffmpegInstance: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fetchFileFn: any = null;
let loadPromise: Promise<boolean> | null = null;

function log(msg: string) {
  const ts = new Date().toLocaleTimeString("es-CO", { hour12: false, fractionalSecondDigits: 3 });
  console.log(`[FFmpeg ${ts}] ${msg}`);
}

function setState(state: FFmpegState, detail?: string) {
  currentState = state;
  currentDetail = detail;
  listeners.forEach((fn) => fn(state, detail));
}

export function getFFmpegState(): { state: FFmpegState; detail?: string } {
  return { state: currentState, detail: currentDetail };
}

export function onFFmpegStateChange(fn: Listener): () => void {
  listeners.add(fn);
  fn(currentState, currentDetail);
  return () => { listeners.delete(fn); };
}

export function getFFmpegInstance() {
  return ffmpegInstance;
}

export function getFetchFile() {
  return fetchFileFn;
}

export async function preloadFFmpeg(): Promise<boolean> {
  if (ffmpegInstance?.loaded) {
    setState("ready");
    return true;
  }

  if (loadPromise) return loadPromise;

  setState("loading", "Verificando SharedArrayBuffer...");
  log("Inicio de precarga");

  loadPromise = (async () => {
    try {
      if (typeof SharedArrayBuffer === "undefined") {
        const msg = "SharedArrayBuffer no disponible";
        log(`ERROR: ${msg}`);
        setState("error", msg);
        return false;
      }
      log("SharedArrayBuffer OK");

      setState("loading", "Importando módulos FFmpeg...");
      const t0 = performance.now();
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { toBlobURL, fetchFile } = await import("@ffmpeg/util");
      fetchFileFn = fetchFile;
      log(`Módulos importados en ${(performance.now() - t0).toFixed(0)}ms`);

      setState("loading", "Descargando ffmpeg-core.js...");
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      const t1 = performance.now();
      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript");
      log(`ffmpeg-core.js descargado en ${(performance.now() - t1).toFixed(0)}ms`);

      setState("loading", "Descargando ffmpeg-core.wasm (~30MB)...");
      const t2 = performance.now();
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm");
      log(`ffmpeg-core.wasm descargado en ${(performance.now() - t2).toFixed(0)}ms`);

      setState("loading", "Inicializando motor WASM...");
      const ffmpeg = new FFmpeg();
      const t3 = performance.now();
      await ffmpeg.load({ coreURL, wasmURL });
      log(`Motor inicializado en ${(performance.now() - t3).toFixed(0)}ms`);

      ffmpegInstance = ffmpeg;
      const total = ((performance.now() - t0) / 1000).toFixed(1);
      log(`Precarga completa en ${total}s`);
      setState("ready", `Listo (${total}s)`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      log(`ERROR: ${msg}`);
      setState("error", msg);
      loadPromise = null;
      return false;
    }
  })();

  return loadPromise;
}
