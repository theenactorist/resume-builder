import { Worker } from 'node:worker_threads';
import { createGenerationLimiter } from './generation-limits.js';

export const MAX_PDF_BYTES = 5 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = MAX_PDF_BYTES + 64 * 1024;
export const PDF_TIMEOUT_MS = 15000;
// Resolve native paths at runtime; Webpack's require.resolve returns module IDs.
const resolvePackage = specifier => process.getBuiltinModule('module').createRequire(import.meta.url).resolve(specifier);
const acquirePdfExtraction = createGenerationLimiter({ maxConcurrent: 2, maxPerHour: 60 });

const ERRORS = {
  FILE: ['Upload one PDF resume in the file field.', 400],
  TYPE: ['Please upload a PDF file.', 415],
  SIZE: ['The PDF must be 5 MiB or smaller.', 413],
  PASSWORD: ['This PDF is encrypted or password protected. Upload an unlocked PDF, or paste your resume text.', 422],
  PAGES: ['The PDF must contain 30 pages or fewer.', 422],
  SHORT: ['This PDF has too little readable text. Scanned or image-only PDFs are not supported; upload a text-based PDF or paste your resume.', 422],
  LONG: ['The extracted resume exceeds 30,000 characters. Upload a shorter PDF or paste an edited resume.', 422],
  INVALID: ['The PDF could not be read. It may be damaged; try another PDF or paste your resume text.', 422],
  TIMEOUT: ['PDF extraction timed out. Try a smaller PDF or paste your resume text.', 408],
  SERVICE: ['PDF extraction is temporarily unavailable. Please paste your resume text or try again.', 503],
};

class PdfUploadError extends Error {
  constructor(code) {
    const [message, status] = ERRORS[code] || ERRORS.SERVICE;
    super(message);
    this.status = status;
  }
}

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

// Multipart parsing and PDF decompression both run outside the server event loop.
// This fixed program never evaluates document scripts or fetches a document URL.
const WORKER_PROGRAM = String.raw`
const { parentPort, workerData } = require('node:worker_threads');
globalThis.fetch = async () => { throw new Error('Network access is disabled'); };
let parser;
(async () => {
  let form;
  try {
    const upload = new Request('http://localhost/upload', {
      method: 'POST', headers: { 'Content-Type': workerData.contentType }, body: workerData.body,
    });
    form = await upload.formData();
  } catch { throw { code: 'FILE' }; }
  const entries = [...form.entries()];
  if (entries.length !== 1 || entries[0][0] !== 'file') throw { code: 'FILE' };
  const file = entries[0][1];
  if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') throw { code: 'FILE' };
  if (file.size === 0 || file.size > workerData.maxFileBytes) throw { code: 'SIZE' };
  if (file.type.toLowerCase() !== 'application/pdf') throw { code: 'TYPE' };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length < 8 || String.fromCharCode(...bytes.subarray(0, 5)) !== '%PDF-') throw { code: 'TYPE' };

  try {
    const workerSupport = require(workerData.workerPath);
    const { PDFParse } = require(workerData.parserPath);
    PDFParse.setWorker(workerSupport.getPath());
    parser = new PDFParse({
      data: bytes, CanvasFactory: workerSupport.CanvasFactory,
      isEvalSupported: false, useWorkerFetch: false, useWasm: false,
      stopAtErrors: true, verbosity: 0, disableFontFace: true,
      enableXfa: false, isOffscreenCanvasSupported: false, isImageDecoderSupported: false,
    });
  } catch { throw { code: 'SERVICE' }; }
  const info = await parser.getInfo({ parsePageInfo: false });
  if (info.info?.EncryptFilterName) throw { code: 'PASSWORD' };
  if (!Number.isInteger(info.total) || info.total < 1) throw { code: 'INVALID' };
  if (info.total > 30) throw { code: 'PAGES' };
  const pageTexts = [];
  let length = 0;
  for (let page = 1; page <= info.total; page++) {
    const result = await parser.getText({ partial: [page], pageJoiner: '', parseHyperlinks: true });
    const text = typeof result.text === 'string' ? result.text.replace(/\r\n?/g, '\n').replace(/\u0000/g, '').trim() : '';
    pageTexts.push(text);
    length += text.length + (page > 1 ? 2 : 0);
    if (length > 30000) throw { code: 'LONG' };
  }
  const text = pageTexts.join('\n\n').trim();
  if (text.length < 100) throw { code: 'SHORT' };
  return { text, pageCount: info.total };
})().then(
  result => ({ result }),
  error => ({ code: error?.code || (error?.name === 'PasswordException' ? 'PASSWORD' : 'INVALID') }),
).then(async message => {
  try { await parser?.destroy(); } catch {}
  parentPort.postMessage(message);
});
`;

export function extractPdfInWorker(body, contentType, { timeoutMs = PDF_TIMEOUT_MS, WorkerImpl = Worker } = {}) {
  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new WorkerImpl(WORKER_PROGRAM, {
        eval: true, execArgv: [], env: {}, stdout: true, stderr: true,
        resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 32, stackSizeMb: 4 },
        workerData: {
          body, contentType, maxFileBytes: MAX_PDF_BYTES,
          parserPath: resolvePackage('pdf-parse'), workerPath: resolvePackage('pdf-parse/worker'),
        },
        transferList: [body.buffer],
      });
    } catch { reject(new PdfUploadError('SERVICE')); return; }
    // Suppress library diagnostic output; uploaded text and filenames never enter logs.
    worker.stdout?.resume();
    worker.stderr?.resume();
    let settled = false;
    const timer = setTimeout(() => finish(new PdfUploadError('TIMEOUT')), timeoutMs);
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Termination also stops a CPU-bound parser that cannot service an abort signal.
      worker.terminate().catch(() => {}).finally(() => error ? reject(error) : resolve(result));
    };
    worker.once('message', message => {
      if (message?.code) finish(new PdfUploadError(message.code));
      else if (typeof message?.result?.text !== 'string' || !Number.isInteger(message.result.pageCount)) finish(new PdfUploadError('INVALID'));
      else finish(null, message.result);
    });
    worker.once('error', () => finish(new PdfUploadError('INVALID')));
    worker.once('exit', () => finish(new PdfUploadError('INVALID')));
  });
}

async function readUpload(request, deadline) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.length > 512 || !/^multipart\/form-data\s*;/i.test(contentType) || !/boundary=/i.test(contentType)) {
    throw new PdfUploadError('TYPE');
  }
  const declaredSize = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_UPLOAD_BYTES) throw new PdfUploadError('SIZE');
  const reader = request.body?.getReader();
  if (!reader) throw new PdfUploadError('FILE');
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      let timer;
      let chunk;
      try {
        chunk = await Promise.race([
          reader.read(),
          new Promise((_, reject) => { timer = setTimeout(() => reject(new PdfUploadError('TIMEOUT')), Math.max(1, deadline - Date.now())); }),
        ]);
      } finally { clearTimeout(timer); }
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_UPLOAD_BYTES) throw new PdfUploadError('SIZE');
      chunks.push(chunk.value);
    }
  } catch (error) {
    reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return { body, contentType };
}

export function createPdfExtractionHandler({ extractImpl = extractPdfInWorker, acquire = acquirePdfExtraction, timeoutMs = PDF_TIMEOUT_MS } = {}) {
  return async function POST(request) {
    const permit = acquire();
    if (!permit) return json({ error: 'PDF extraction is busy or its usage limit was reached. Please try again later, or paste your resume.' }, 429);
    try {
      const deadline = Date.now() + timeoutMs;
      const { body, contentType } = await readUpload(request, deadline);
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new PdfUploadError('TIMEOUT');
      const result = await extractImpl(body, contentType, { timeoutMs: remaining });
      if (typeof result?.text !== 'string' || result.text.length < 100 || result.text.length > 30000 ||
          !Number.isInteger(result.pageCount) || result.pageCount < 1 || result.pageCount > 30) throw new PdfUploadError('INVALID');
      return json({ text: result.text, pageCount: result.pageCount });
    } catch (error) {
      const safe = error instanceof PdfUploadError ? error : new PdfUploadError('INVALID');
      return json({ error: safe.message }, safe.status);
    } finally { permit.release(); }
  };
}
