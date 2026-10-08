import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import vm from 'node:vm';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Test the actual route/module source without starting Next or connecting to Postgres.
// A database import or unexpected dependency deliberately fails the loader.
async function loadSource(relativePath) {
  const context = vm.createContext({
    Request, Response, Headers, URL, AbortController, AbortSignal, FormData, File, Blob,
    TextEncoder, TextDecoder, Buffer, setTimeout, clearTimeout,
    console: { error() {}, warn() {}, log() {} },
    process: { env: {}, getBuiltinModule: process.getBuiltinModule },
    fetch: async () => { throw new Error('Live network calls are forbidden in tests'); },
  });
  const cache = new Map();
  const imports = [];
  const nextServer = new vm.SyntheticModule(['NextResponse'], function () {
    this.setExport('NextResponse', { json: Response.json.bind(Response) });
  }, { context, identifier: 'next/server' });

  async function createModule(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const source = await readFile(filename, 'utf8');
    const module = new vm.SourceTextModule(source, { context, identifier: filename, initializeImportMeta(meta) { meta.url = pathToFileURL(filename).href; } });
    cache.set(filename, module);
    await module.link(async (specifier, referencingModule) => {
      imports.push(specifier);
      assert.ok(!/\/db(?:\.js)?$|^pg$/.test(specifier), 'Public routes must not import the legacy database');
      if (specifier === 'next/server') return nextServer;
      if (['node:worker_threads', 'node:module'].includes(specifier)) {
        const native = await import(specifier);
        return new vm.SyntheticModule(Object.keys(native), function () {
          for (const key of Object.keys(native)) this.setExport(key, native[key]);
        }, { context, identifier: specifier });
      }

      let resolved;
      if (specifier.startsWith('@/')) resolved = path.join(projectRoot, specifier.slice(2));
      else if (specifier.startsWith('.')) resolved = path.resolve(path.dirname(referencingModule.identifier), specifier);
      else throw new Error(`Unexpected module dependency: ${specifier}`);
      if (!path.extname(resolved)) resolved += '.js';
      return createModule(resolved);
    });
    return module;
  }
  const module = await createModule(path.join(projectRoot, relativePath));
  await module.evaluate();
  return { exports: module.namespace, imports };
}

const resumeA = `Avery Morgan\nToronto, Canada\nProduct Designer, Cedar Studio, 2021–2025\nDesigned onboarding and researched customer needs. Used FlowSketch. Improved completion by 12%.\nEducation: B.A. Design, Lake College, 2020.`;
const resumeB = `Rowan Patel\nOttawa, Canada\nOperations Analyst, Birch Services, 2019–2025\nUsed SheetLogic for reporting and reconciled invoices. Reduced monthly errors by 8%.\nEducation: B.Com., Valley College, 2018.`;
const jobDescription = 'Cedar Labs seeks a candidate with FlowSketch, SheetLogic, QuantumCAD, customer research, and reporting experience to improve its product operations.';

function validResult(name = 'Avery Morgan') {
  const rowan = name === 'Rowan Patel';
  const originalBullet = rowan ? 'Used SheetLogic for reporting and reconciled invoices.' : 'Designed onboarding and researched customer needs.';
  return {
    candidate_name: name,
    company_name: 'Cedar Labs',
    job_title: 'Product Operations Specialist',
    analysis: {
      company_profile: 'Cedar Labs develops product operations tools.',
      role_level: 'IC',
      role_level_reasoning: 'This role requires independent delivery.',
      top_priorities: ['Reporting', 'Customer research'],
      hard_skills: ['Reporting'], soft_skills: ['Collaboration'], keyword_map: ['Reporting'],
      role_relevance: { primary: 'Current role', secondary: '', reasoning: 'The supplied experience is relevant.' },
      gap_analysis: ['QuantumCAD is not supported by the supplied resume.'],
      summary_strategy: 'Prioritize documented achievements.',
    },
    resume: rowan
      ? `# ${name}\n\n## Profile Summary\nOperations analyst with documented reporting experience.\n\n## Work Experience\n### **Operations Analyst** ||| 2019–2025\n*Birch Services*\n- Reduced monthly errors by 8%.\n\n## Education\nB.Com., Valley College, 2018.`
      : `# ${name}\n\n## Profile Summary\nProduct designer with documented onboarding experience.\n\n## Work Experience\n### **Product Designer** ||| 2021–2025\n*Cedar Studio*\n- Improved completion by 12%.\n\n## Education\nB.A. Design, Lake College, 2020.`,
    cover_letter: 'Dear hiring team, my documented experience aligns with this role. Thank you for considering my application.',
    ats_score: { overall: 72, keyword_coverage: 60, strongest_areas: ['Reporting'], gaps: ['QuantumCAD'] },
    before_after: [{ before: originalBullet, after: originalBullet, why: 'Keeps the original factual claim.' }],
    six_second_test: 'The summary and first achievement clearly introduce the candidate.',
    cold_messages: {
      recruiter: `Hi [Name], I am applying to Cedar Labs. Please review my resume. Thanks, ${name}.`,
      designer: `Hi [Name], I am applying to your team at Cedar Labs. I would appreciate a conversation. Thanks, ${name}.`,
      subject_lines: { recruiter: 'Applying to Cedar Labs', designer: 'Connecting about Cedar Labs' },
    },
  };
}

function aiResponse(value, { status = 200, stopReason = 'end_turn' } = {}) {
  return Response.json({
    content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }],
    stop_reason: stopReason,
  }, { status });
}

function makeMockFetch(extraction = { hard_skills: [], soft_skills: [], tools: ['FlowSketch', 'SheetLogic', 'QuantumCAD'], phrases: [], variants: [] }, result = validResult()) {
  const calls = [];
  return {
    calls,
    fetchImpl: async (url, options) => {
      calls.push({ url, options, body: JSON.parse(options.body) });
      return aiResponse(calls.length === 1 ? extraction : result);
    },
  };
}

function request(body) {
  return new Request('http://localhost/api/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

async function setup(mock = makeMockFetch()) {
  const loaded = await loadSource('lib/generation.js');
  const handler = loaded.exports.createGenerateHandler({ fetchImpl: mock.fetchImpl, apiKey: 'test-key' });
  return { ...loaded, ...mock, handler };
}

function assertNoStore(response) {
  assert.match(response.headers.get('cache-control') || '', /no-store/i);
}

test('each visitor supplies their own resume and gets only their supported keyword checklist', async () => {
  for (const [baseResume, name, supported, other] of [
    [resumeA, 'Avery Morgan', 'FlowSketch', 'SheetLogic'],
    [resumeB, 'Rowan Patel', 'SheetLogic', 'FlowSketch'],
  ]) {
    const mock = makeMockFetch(undefined, validResult(name));
    const { handler, calls, exports } = await setup(mock);
    const response = await handler(request({ baseResume, jobDescription, companyHook: 'Cedar Labs builds reporting tools.' }));
    assert.equal(response.status, 200);
    assertNoStore(response);
    const result = await response.json();
    assert.equal(result.candidate_name, name);
    assert.equal(calls.length, 2);
    const generationInput = JSON.parse(calls[1].body.messages[0].content);
    assert.equal(generationInput.BASE_RESUME, baseResume);
    assert.equal(generationInput.JOB_DESCRIPTION, jobDescription);
    assert.deepEqual(generationInput.SUPPORTED_KEYWORD_HINTS, [supported]);
    assert.ok(!generationInput.SUPPORTED_KEYWORD_HINTS.includes('QuantumCAD'));
    assert.ok(!generationInput.SUPPORTED_KEYWORD_HINTS.includes(other));
    assert.ok(result.gaps.tools.includes(other));
    assert.ok(result.gaps.tools.includes('QuantumCAD'));
    for (const call of calls) {
      assert.equal(call.body.model, exports.DEFAULT_MODEL);
      assert.equal(call.body.thinking?.type, 'between_tools');
      assert.equal(call.body.output_config?.effort, 'medium');
      assert.ok(!Object.hasOwn(call.body, 'temperature'));
    }
  }
});

test('keyword matching uses supplied facts and tolerates malformed extraction fields', async () => {
  const { exports } = await loadSource('lib/keywords.js');
  const matched = exports.crossReference({ tools: ['FlowSketch', 'QuantumCAD'], hard_skills: ['invented qualification'], soft_skills: [], phrases: [], variants: [] }, resumeA);
  assert.deepEqual(Array.from(matched.resume_match), ['FlowSketch']);
  assert.ok(matched.gaps.tools.includes('QuantumCAD'));
  assert.ok(matched.gaps.skills.includes('invented qualification'));
  const malformed = exports.crossReference({ tools: [null, 42, {}, 'QuantumCAD'], hard_skills: 'bad shape', variants: [null, [42, 'FlowSketch'], ['unused']] }, resumeA);
  assert.equal(malformed.resume_match.length, 0);
  assert.ok(malformed.gaps.tools.includes('QuantumCAD'));
});

test('system prompt preserves candidate facts and contains no owner profile or forced owner toolkit', async () => {
  const { exports } = await loadSource('lib/system-prompt.js');
  const prompt = exports.SYSTEM_PROMPT;
  assert.equal(typeof prompt, 'string');
  assert.match(prompt, /never (invent|fabricate)|do not (invent|fabricate)|must not (invent|fabricate)/i);
  for (const fact of ['titles', 'dates', 'metrics', 'qualifications']) assert.match(prompt, new RegExp(fact, 'i'));
  assert.match(prompt, /use only the supplied base_resume/i);
  assert.match(prompt, /^You are a resume editor and career writing assistant\./);
  assert.ok(!/MANDATORY AI & DESIGN TOOLS|MUST always appear/.test(prompt));
  assert.ok(!Object.hasOwn(exports, 'BASE_RESUME'));
});

test('invalid inputs are rejected before any AI call', async () => {
  const { handler, calls } = await setup();
  for (const payload of [
    {}, null, [],
    { baseResume: 42, jobDescription },
    { baseResume: {}, jobDescription },
    { baseResume: 'short', jobDescription },
    { baseResume: 'x'.repeat(30001), jobDescription },
    { baseResume: resumeA, jobDescription: 42 },
    { baseResume: resumeA, jobDescription: 'short' },
    { baseResume: resumeA, jobDescription: 'x'.repeat(30001) },
    { baseResume: resumeA, jobDescription, companyHook: {} },
    { baseResume: resumeA, jobDescription, companyHook: 'x'.repeat(1001) },
  ]) {
    const response = await handler(request(payload));
    assert.ok([400, 413].includes(response.status), `Expected validation rejection for ${typeof payload}`);
    assertNoStore(response);
  }
  const malformedRequest = new Request('http://localhost/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken json' });
  assert.equal((await handler(malformedRequest)).status, 400);
  assert.equal(calls.length, 0);
});

test('oversized request bytes are rejected before parsing or AI calls', async () => {
  const { handler, calls } = await setup();
  const response = await handler(request({ baseResume: resumeA, jobDescription, ignored: 'x'.repeat(500000) }));
  assert.equal(response.status, 413);
  assertNoStore(response);
  assert.equal(calls.length, 0);
});

test('keyword extraction failure safely continues without inventing keywords', async () => {
  for (const firstResponse of [
    () => Response.json({ error: { message: 'Extraction unavailable' } }, { status: 503 }),
    () => aiResponse('{invalid extraction JSON'),
    () => aiResponse({ tools: 'not an array', hard_skills: null, variants: [null] }),
  ]) {
    let callCount = 0;
    const { handler } = await setup({
      calls: [],
      fetchImpl: async () => ++callCount === 1 ? firstResponse() : aiResponse(validResult()),
    });
    const response = await handler(request({ baseResume: resumeA, jobDescription }));
    assert.equal(response.status, 200);
    assert.equal(callCount, 2);
    assertNoStore(response);
    const result = await response.json();
    assert.equal(result.gaps.tools.length, 0);
  }
});

test('model unavailable is reported safely and never switches to an older model', async () => {
  const calls = [];
  const detail = 'provider-internal-detail-that-must-remain-private';
  const { handler } = await setup({ calls, fetchImpl: async (url, options) => {
    calls.push(JSON.parse(options.body));
    if (calls.length === 1) return aiResponse({ hard_skills: [], soft_skills: [], tools: [], phrases: [], variants: [] });
    return Response.json({ error: { type: 'not_found_error', message: detail } }, { status: 404 });
  } });
  const response = await handler(request({ baseResume: resumeA, jobDescription }));
  assert.ok(response.status >= 400);
  assertNoStore(response);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(call => call.model === 'claude-sonnet-5-5'));
  assert.ok(!(await response.text()).includes(detail));
});

test('malformed, incomplete, and truncated generated output is never returned as a successful resume', async () => {
  for (const [output, stopReason] of [
    ['{invalid result JSON', 'end_turn'],
    [{ resume: 'Only one incomplete field.' }, 'end_turn'],
    [{ ...validResult(), resume: null }, 'end_turn'],
    [{ ...validResult(), ats_score: { overall: 200, keyword_coverage: -20 } }, 'end_turn'],
    [validResult(), 'max_tokens'],
  ]) {
    let callCount = 0;
    const { handler } = await setup({ calls: [], fetchImpl: async () => {
      callCount++;
      return callCount === 1 ? aiResponse({ hard_skills: [], tools: [] }) : aiResponse(output, { stopReason });
    } });
    const response = await handler(request({ baseResume: resumeA, jobDescription }));
    assert.ok(response.status >= 400);
    assertNoStore(response);
    const body = await response.json();
    assert.equal(typeof body.error, 'string');
    assert.equal(callCount, 2);
  }
});

test('legacy history read, write, detail, and deletion routes are closed without database imports', async () => {
  for (const [filename, methods] of [
    ['app/api/history/route.js', ['GET', 'POST', 'DELETE']],
    ['app/api/history/[id]/route.js', ['GET']],
  ]) {
    const loaded = await loadSource(filename);
    for (const method of methods) {
      const response = await loaded.exports[method](new Request('http://localhost/api/history?id=1', { method }), { params: { id: '1' } });
      assert.equal(response.status, 410);
      assertNoStore(response);
      const body = await response.json();
      assert.ok(!Object.hasOwn(body, 'result'));
      assert.ok(!Object.hasOwn(body, 'job_description'));
    }
    assert.ok(!loaded.imports.some(specifier => specifier.includes('/db')));
  }
  const generate = await loadSource('app/api/generate/route.js');
  assert.equal(typeof generate.exports.POST, 'function');
  assert.ok(!generate.imports.some(specifier => specifier.includes('/db')));
});

test('owner resume is no longer a public static download and private backups are excluded from Git', async () => {
  await assert.rejects(access(path.join(projectRoot, 'public/base-resume.html')), { code: 'ENOENT' });
  assert.match(await readFile(path.join(projectRoot, '.gitignore'), 'utf8'), /^\.private\//m);
});

test('non-JSON content and an unconfigured generation service do not call AI', async () => {
  const { handler, calls } = await setup();
  const mediaResponse = await handler(new Request('http://localhost/api/generate', { method: 'POST', body: JSON.stringify({ baseResume: resumeA, jobDescription }) }));
  assert.equal(mediaResponse.status, 415);
  assertNoStore(mediaResponse);
  const { exports } = await loadSource('lib/generation.js');
  const unconfigured = exports.createGenerateHandler({ fetchImpl: async () => { throw new Error('AI must not be called without credentials'); } });
  const unavailableResponse = await unconfigured(request({ baseResume: resumeA, jobDescription }));
  assert.equal(unavailableResponse.status, 503);
  assertNoStore(unavailableResponse);
  assert.equal(calls.length, 0);
});

test('credential, model, and rate failures during extraction stop before the generation pass', async () => {
  for (const upstreamStatus of [400, 401, 403, 404, 429]) {
    let calls = 0;
    const privateDetail = 'do-not-return-provider-internal-details';
    const { handler } = await setup({ calls: [], fetchImpl: async () => {
      calls++;
      return Response.json({ error: { message: privateDetail } }, { status: upstreamStatus });
    } });
    const response = await handler(request({ baseResume: resumeA, jobDescription }));
    assert.equal(response.status, upstreamStatus === 429 ? 429 : 503);
    assertNoStore(response);
    assert.equal(calls, 1);
    assert.ok(!(await response.text()).includes(privateDetail));
  }
});

test('timeouts are sanitized and stop generation immediately', async () => {
  let calls = 0;
  const { handler } = await setup({ calls: [], fetchImpl: async () => {
    calls++;
    throw new DOMException('private timeout details', 'TimeoutError');
  } });
  const response = await handler(request({ baseResume: resumeA, jobDescription }));
  assert.equal(response.status, 504);
  assertNoStore(response);
  assert.equal(calls, 1);
  assert.ok(!(await response.text()).includes('private timeout details'));
});

test('keyword matching rejects word fragments and does not assume unsupported spelling variants', async () => {
  const { exports } = await loadSource('lib/keywords.js');
  const matched = exports.crossReference({ tools: ['R', 'SQL', 'Flow'], variants: [['data-driven', 'data driven']] }, `${resumeA}\nResearch supported data-driven decisions.`);
  assert.deepEqual(Array.from(matched.resume_match), ['data-driven']);
  assert.deepEqual(Array.from(matched.gaps.tools), ['R', 'SQL', 'Flow']);
  assert.deepEqual(Array.from(matched.gaps.skills), ['data driven']);
});

test('invented candidate details, original comparison bullets, and resume numbers are rejected', async () => {
  for (const result of [
    { ...validResult(), candidate_name: 'Unrelated Candidate' },
    { ...validResult(), before_after: [{ before: 'Invented original achievement.', after: 'Invented revised achievement.', why: 'Unsupported claim.' }] },
    { ...validResult(), resume: validResult().resume.replace('12%', '999%') },
  ]) {
    const { handler, calls } = await setup(makeMockFetch(undefined, result));
    const response = await handler(request({ baseResume: resumeA, jobDescription }));
    assert.equal(response.status, 502);
    assertNoStore(response);
    assert.equal(calls.length, 2);
    assert.equal(typeof (await response.json()).error, 'string');
  }
});

test('generation limiter enforces simultaneous and hourly limits, with idempotent permit release', async () => {
  const { exports } = await loadSource('lib/generation-limits.js');
  let now = 10000;
  const acquire = exports.createGenerationLimiter({ maxConcurrent: 2, maxPerHour: 3, now: () => now });
  const first = acquire();
  const second = acquire();
  assert.ok(first);
  assert.ok(second);
  assert.equal(acquire(), null);
  first.release();
  first.release();
  const third = acquire();
  assert.ok(third);
  assert.equal(acquire(), null);
  second.release();
  third.release();
  assert.equal(acquire(), null, 'Releasing concurrency slots must not erase admitted hourly usage');
  now += 3600000;
  const renewedFirst = acquire();
  const renewedSecond = acquire();
  assert.ok(renewedFirst);
  assert.ok(renewedSecond);
  assert.equal(acquire(), null, 'Double release must not allow a third simultaneous request');
  renewedFirst.release();
  renewedSecond.release();
});

test('limited API requests make no provider calls and accepted requests always release their permit', async () => {
  const { exports } = await loadSource('lib/generation.js');
  let calls = 0;
  const denied = exports.createGenerateHandler({
    apiKey: 'test-key', acquire: () => null,
    fetchImpl: async () => { calls++; throw new Error('Denied requests must not reach Claude'); },
  });
  const deniedResponse = await denied(request({ baseResume: resumeA, jobDescription }));
  assert.equal(deniedResponse.status, 429);
  assertNoStore(deniedResponse);
  assert.equal(calls, 0);
  for (const [makeSecondResponse, expectedStatus] of [
    [() => aiResponse(validResult()), 200],
    [() => Response.json({ error: { message: 'private failure detail' } }, { status: 404 }), 503],
    [() => aiResponse({ resume: 'Incomplete output' }), 502],
  ]) {
    let acquired = 0;
    let released = 0;
    let providerCalls = 0;
    const handler = exports.createGenerateHandler({
      apiKey: 'test-key',
      acquire: () => { acquired++; return { release() { released++; } }; },
      fetchImpl: async () => ++providerCalls === 1 ? aiResponse({ hard_skills: [], tools: [] }) : makeSecondResponse(),
    });
    const response = await handler(request({ baseResume: resumeA, jobDescription }));
    assert.equal(response.status, expectedStatus);
    assert.equal(acquired, 1);
    assert.equal(released, 1);
    assert.equal(providerCalls, 2);
    await handler(request({ baseResume: 'too short', jobDescription }));
    assert.equal(acquired, 1, 'Invalid input must not consume a generation permit');
  }
});


test('generated remote images are rejected in resumes and cover letters before preview or export', async () => {
  for (const field of ['resume', 'cover_letter']) {
    for (const image of [
      '![portrait](https://example.invalid/collect?candidate=private-text)',
      '! \n[portrait][tracking]\n\n[tracking]: https://example.invalid/collect?candidate=private-text',
      '<IMG SRC="https://example.invalid/collect?candidate=private-text">',
    ]) {
      const result = validResult();
      result[field] += `\n\n${image}`;
      const { handler, calls } = await setup(makeMockFetch(undefined, result));
      const response = await handler(request({ baseResume: resumeA, jobDescription }));
      assert.equal(response.status, 502);
      assertNoStore(response);
      const body = await response.json();
      assert.match(body.error, /unsupported image/i);
      assert.ok(!Object.hasOwn(body, 'resume'));
      assert.ok(!Object.hasOwn(body, 'cover_letter'));
      assert.ok(!JSON.stringify(body).includes('example.invalid'));
      assert.equal(calls.length, 2);
    }
  }
});

test('provider errors cannot expose submitted resume, job description, company note, or credentials', async () => {
  const inputs = {
    baseResume: `${resumeA}\nPRIVATE_RESUME_MARKER`,
    jobDescription: `${jobDescription}\nPRIVATE_JOB_MARKER`,
    companyHook: 'PRIVATE_COMPANY_NOTE_MARKER',
  };
  let calls = 0;
  const { handler } = await setup({ calls: [], fetchImpl: async () => {
    calls++;
    if (calls === 1) return aiResponse({ hard_skills: [], tools: [] });
    return Response.json({ error: { message: `${JSON.stringify(inputs)} test-key` } }, { status: 400 });
  } });
  const response = await handler(request(inputs));
  assert.equal(response.status, 503);
  assertNoStore(response);
  assert.equal(calls, 2);
  const text = await response.text();
  for (const privateText of ['Avery Morgan', 'PRIVATE_RESUME_MARKER', 'PRIVATE_JOB_MARKER', 'PRIVATE_COMPANY_NOTE_MARKER', 'test-key']) {
    assert.ok(!text.includes(privateText));
  }
});


// Small, synthetic PDFs stay in memory; no personal document or output file is used.
function pdfFixture(text = resumeA, pageCount = 1, { encrypted = false } = {}) {
  const objects = [null,
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Count ${pageCount} /Kids [${Array.from({ length: pageCount }, (_, i) => `${4 + i * 2} 0 R`).join(' ')}] >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  for (let page = 0; page < pageCount; page++) {
    const pageId = objects.length;
    const escaped = text.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('\n', ' ');
    const lines = escaped.match(/.{1,80}/g) || [];
    const stream = text ? `BT /F1 8 Tf 8 TL 48 744 Td ${lines.map(line => `(${line}) Tj T*`).join(' ')} ET` : '';
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageId + 1} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  }
  let encryptionId;
  if (encrypted) {
    encryptionId = objects.length;
    objects.push(`<< /Filter /Standard /V 1 /R 2 /Length 40 /P -4 /O <${'00'.repeat(32)}> /U <${'00'.repeat(32)}> >>`);
  }
  let document = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 1; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(document));
    document += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(document);
  document += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) document += `${String(offset).padStart(10, '0')} 00000 n \n`;
  document += `trailer\n<< /Size ${objects.length} /Root 1 0 R${encrypted ? ` /Encrypt ${encryptionId} 0 R /ID [<00112233445566778899aabbccddeeff><00112233445566778899aabbccddeeff>]` : ''} >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(document);
}

function uploadRequest(bytes, { type = 'application/pdf', field = 'file', duplicate = false } = {}) {
  const form = new FormData();
  form.append(field, new File([bytes], 'synthetic-resume.pdf', { type }));
  if (duplicate) form.append(field, new File([bytes], 'another.pdf', { type }));
  return new Request('http://localhost/api/resume/extract', { method: 'POST', body: form });
}

async function pdfHandler(options = {}) {
  const loaded = await loadSource('lib/pdf.js');
  return { ...loaded, handler: loaded.exports.createPdfExtractionHandler({ acquire: () => ({ release() {} }), ...options }) };
}

test('real PDF parser extracts each visitor document privately in memory', async () => {
  const { handler } = await pdfHandler();
  for (const [resume, name, other] of [[resumeA, 'Avery Morgan', 'Rowan Patel'], [resumeB, 'Rowan Patel', 'Avery Morgan']]) {
    const response = await handler(uploadRequest(pdfFixture(resume, 2)));
    assert.equal(response.status, 200, await response.clone().text());
    assertNoStore(response);
    const data = await response.json();
    assert.equal(data.pageCount, 2);
    assert.ok(data.text.includes(name));
    assert.ok(!data.text.includes(other));
    assert.ok(data.text.includes('\n\n'), 'Page boundaries should remain editable text line breaks');
    assert.deepEqual(Object.keys(data).sort(), ['pageCount', 'text']);
  }
});

test('PDF uploads enforce file type, magic, one file, size, and bounded request bytes', async () => {
  const { handler, exports } = await pdfHandler();
  for (const [request, expectedStatus] of [
    [uploadRequest(pdfFixture(), { type: 'text/plain' }), 415],
    [uploadRequest(Buffer.from('not a PDF file')), 415],
    [uploadRequest(pdfFixture(), { field: 'wrong-field' }), 400],
    [uploadRequest(pdfFixture(), { duplicate: true }), 400],
    [uploadRequest(Buffer.alloc(exports.MAX_PDF_BYTES + 1)), 413],
  ]) {
    const response = await handler(request);
    assert.equal(response.status, expectedStatus, await response.clone().text());
    assertNoStore(response);
    assert.equal(typeof (await response.json()).error, 'string');
  }
  let extractionCalls = 0;
  const bounded = (await pdfHandler({ extractImpl: async () => { extractionCalls++; throw new Error('Oversized input must not reach parser'); } })).handler;
  const oversized = new Request('http://localhost/api/resume/extract', {
    method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=test' }, body: Buffer.alloc(exports.MAX_UPLOAD_BYTES + 1),
  });
  assert.equal((await bounded(oversized)).status, 413);
  assert.equal(extractionCalls, 0);
});

test('encrypted, corrupt, image-only, excessive-page, and excessive-text PDFs return clear safe errors', async () => {
  const { handler } = await pdfHandler();
  for (const [bytes, expected] of [
    [pdfFixture(resumeA, 1, { encrypted: true }), /encrypted|password protected/i],
    [Buffer.from('%PDF-1.4\nPRIVATE_CORRUPT_MARKER'), /damaged|could not be read/i],
    [pdfFixture(''), /scanned|image-only/i],
    [pdfFixture(resumeA, 31), /30 pages/i],
    [pdfFixture('Sample resume text. '.repeat(80), 30), /30,000 characters/i],
  ]) {
    const response = await handler(uploadRequest(bytes));
    assert.equal(response.status, 422, await response.clone().text());
    assertNoStore(response);
    const data = await response.json();
    assert.match(data.error, expected);
    assert.ok(!JSON.stringify(data).includes('PRIVATE_CORRUPT_MARKER'));
    assert.ok(!Object.hasOwn(data, 'text'));
  }
});

test('PDF worker isolates credentials, bounds heap, terminates CPU timeout, and suppresses diagnostics', async () => {
  const { exports } = await pdfHandler();
  let instance;
  class HungWorker extends EventEmitter {
    constructor(program, options) {
      super();
      this.program = program;
      this.options = options;
      this.stdout = this.stderr = { resume() {} };
      this.terminated = 0;
      instance = this;
    }
    async terminate() { this.terminated++; return 1; }
  }
  await assert.rejects(exports.extractPdfInWorker(new Uint8Array([1, 2]), 'multipart/form-data; boundary=test', { timeoutMs: 5, WorkerImpl: HungWorker }), /timed out/i);
  assert.equal(instance.terminated, 1);
  assert.deepEqual(Object.keys(instance.options.env), []);
  assert.equal(instance.options.resourceLimits.maxOldGenerationSizeMb, 128);
  assert.equal(instance.options.stdout, true);
  assert.equal(instance.options.stderr, true);
  assert.match(instance.program, /isEvalSupported: false/);
  assert.match(instance.program, /useWorkerFetch: false/);
});

test('PDF concurrency denial does no work, upload timeout releases slots, and unexpected parser errors stay private', async () => {
  let extractionCalls = 0;
  const denied = (await pdfHandler({ acquire: () => null, extractImpl: async () => { extractionCalls++; } })).handler;
  const deniedResponse = await denied(uploadRequest(pdfFixture()));
  assert.equal(deniedResponse.status, 429);
  assertNoStore(deniedResponse);
  assert.equal(extractionCalls, 0);
  let releases = 0;
  const { handler } = await pdfHandler({
    acquire: () => ({ release() { releases++; } }),
    extractImpl: async () => { throw new Error('PRIVATE_FILE_TEXT_AND_PATH'); },
  });
  const failed = await handler(uploadRequest(pdfFixture()));
  assert.equal(failed.status, 422);
  assertNoStore(failed);
  assert.ok(!(await failed.text()).includes('PRIVATE_FILE_TEXT_AND_PATH'));
  assert.equal(releases, 1);
  const slow = (await pdfHandler({ timeoutMs: 5, acquire: () => ({ release() { releases++; } }) })).handler;
  const stalled = new Request('http://localhost/api/resume/extract', {
    method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=test' },
    body: new ReadableStream({ start() {} }), duplex: 'half',
  });
  const timedOut = await slow(stalled);
  assert.equal(timedOut.status, 408);
  assertNoStore(timedOut);
  assert.equal(releases, 2);
});

test('PDF extraction route exports a Node handler without database or generation-provider dependencies', async () => {
  const loaded = await loadSource('app/api/resume/extract/route.js');
  assert.equal(loaded.exports.runtime, 'nodejs');
  assert.equal(typeof loaded.exports.POST, 'function');
  assert.ok(!loaded.imports.some(specifier => /\/db|\/generation(?:\.js)?$/.test(specifier)));
});


test('generation rules do not infer current employment or missing qualifications from incomplete evidence', async () => {
  const { exports } = await loadSource('lib/system-prompt.js');
  const rules = exports.SYSTEM_PROMPT.split('\n');
  const employment = rules.find(rule => rule.includes('current-employment language')) || '';
  assert.match(employment, /only.*source explicitly.*current role/i);
  assert.match(employment, /finite end date.*past tense.*every output.*cover letters.*outreach/i);
  assert.match(employment, /unclear.*neutral wording/i);
  const missingEvidence = rules.find(rule => rule.includes('Absence from the resume')) || '';
  assert.match(missingEvidence, /missing evidence.*not proof of inexperience/i);
  assert.match(missingEvidence, /never say.*never used.*has not done.*lacks.*unless.*explicitly states/i);
  assert.match(missingEvidence, /omit unsupported-skill admissions.*letters.*outreach/i);
  const lexical = rules.find(rule => rule.includes('matched and unmatched keyword lists')) || '';
  assert.match(lexical, /lexical aids/i);
  assert.match(lexical, /unmatched exact phrase.*supported experience.*different words.*check the raw resume/i);
});
