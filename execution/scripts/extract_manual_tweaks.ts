// One-shot: dump Manual Tweaks for YJ Report.docx as plain text so we can
// hand-classify each entry into the SPLIT/ADJUST block format defined in
// sop_exceptions_format.md. Not part of the runtime engine.

import mammoth from 'mammoth';
import { resolve } from 'node:path';

const DOCX_PATH = resolve(
  import.meta.dirname,
  '..',
  '..',
  'Process Documentation',
  'Manual Tweaks for YJ Report.docx',
);

const { value: text, messages } = await mammoth.extractRawText({ path: DOCX_PATH });

console.log('=== EXTRACTED TEXT ===');
console.log(text);
console.log('=== MAMMOTH MESSAGES ===');
for (const m of messages) console.log(`- [${m.type}] ${m.message}`);
