// exceptions.txt parser.
// SOP: architecture/sop_exceptions_format.md
// File format: blocks separated by lines of exactly "---".

import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { IngestErrorCollector } from './ingest_errors.js';
import type {
  AdjustException,
  ExceptionMetric,
  ParsedException,
  Roster,
  SplitException,
} from './types.js';

const VALID_METRICS = new Set<ExceptionMetric>([
  'total_fundraising',
  'rate_bowl',
  'wishes_for_teachers',
  'total_points',
]);

export type ParseExceptionsOptions = {
  exceptionsPath: string;
  roster: Roster;
  errors: IngestErrorCollector;
};

export type ExceptionsParseResult = {
  parsed: ParsedException[];
  source_file_hash: string;
  file_present: boolean;
};

class BlockValidationError extends Error {
  constructor(public readonly reason: string) {
    super(reason);
  }
}

function isCommentOrEmptyBlock(block: string): boolean {
  const meaningful = block
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed !== '' && !trimmed.startsWith('#');
    });
  return meaningful.length === 0;
}

function parseKeyValueAndLists(block: string): {
  keyValues: Record<string, string>;
  lists: Record<string, string[]>;
} {
  const lines = block.split(/\r?\n/);
  const keyValues: Record<string, string> = {};
  const lists: Record<string, string[]> = {};
  let currentListKey: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, ''); // rtrim only
    if (line.trim() === '' || line.trim().startsWith('#')) {
      // Blank or comment line. Ends list context.
      continue;
    }
    const listItemMatch = /^\s+-\s+(.*)$/.exec(line);
    if (listItemMatch && currentListKey) {
      const item = listItemMatch[1]?.trim();
      if (item) {
        lists[currentListKey] ??= [];
        lists[currentListKey]!.push(item);
      }
      continue;
    }
    const kvMatch = /^([A-Za-z]+):\s*(.*)$/.exec(line);
    if (!kvMatch) {
      // Unrecognized line — keep parsing but record nothing.
      currentListKey = null;
      continue;
    }
    const key = kvMatch[1]!;
    const value = (kvMatch[2] ?? '').trim();
    if (value === '' && (key === 'Reps' || key === 'Adjustments')) {
      currentListKey = key;
      continue;
    }
    keyValues[key] = value;
    currentListKey = null;
  }

  return { keyValues, lists };
}

function validateBlock(
  block: string,
  roster: Roster,
): ParsedException {
  const { keyValues: kv, lists } = parseKeyValueAndLists(block);

  for (const required of ['ID', 'Added', 'Active', 'Type', 'Account', 'Notes']) {
    if (kv[required] == null) {
      throw new BlockValidationError(`missing required key "${required}"`);
    }
  }

  const id = kv['ID']!;
  const added_date = kv['Added']!;
  const active_raw = kv['Active']!.toLowerCase();
  if (active_raw !== 'yes' && active_raw !== 'no') {
    throw new BlockValidationError(`Active must be "yes" or "no", got "${kv['Active']}"`);
  }
  const active = active_raw === 'yes';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(added_date)) {
    throw new BlockValidationError(`Added must be YYYY-MM-DD, got "${added_date}"`);
  }

  const type_raw = kv['Type']!.toUpperCase();
  if (type_raw !== 'SPLIT' && type_raw !== 'ADJUST') {
    throw new BlockValidationError(`Type must be SPLIT or ADJUST, got "${kv['Type']}"`);
  }

  const account = kv['Account']!;
  const match_raw = (kv['Match'] ?? 'contains').toLowerCase();
  if (match_raw !== 'exact' && match_raw !== 'contains') {
    throw new BlockValidationError(`Match must be exact or contains, got "${kv['Match']}"`);
  }
  const account_match = match_raw as 'exact' | 'contains';
  const item = kv['Item'] ? kv['Item'] : null;
  const notes = kv['Notes']!;

  if (type_raw === 'SPLIT') {
    const repsLines = lists['Reps'] ?? [];
    if (repsLines.length === 0) {
      throw new BlockValidationError('SPLIT block has empty Reps list');
    }
    const reps: SplitException['reps'] = [];
    for (const line of repsLines) {
      // Format: "{rep_id} {display_name}: {percent}%"
      const m = /^(\d+)\s+([^:]+):\s*([0-9.]+)\s*%?\s*$/.exec(line);
      if (!m) {
        throw new BlockValidationError(`SPLIT Reps line unparseable: "${line}"`);
      }
      const sales_rep_id = parseInt(m[1]!, 10);
      const percent = parseFloat(m[3]!);
      if (!roster.by_sales_rep_id.has(sales_rep_id)) {
        throw new BlockValidationError(`SPLIT Reps line references sales_rep_id ${sales_rep_id} not in roster`);
      }
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        throw new BlockValidationError(`SPLIT Reps line has invalid percent: "${line}"`);
      }
      reps.push({ sales_rep_id, percent });
    }
    const sum = reps.reduce((s, r) => s + r.percent, 0);
    if (Math.abs(sum - 100) > 0.01) {
      throw new BlockValidationError(`SPLIT percentages sum to ${sum.toFixed(4)}, expected 100`);
    }
    return {
      id,
      added_date,
      active,
      type: 'SPLIT',
      account,
      account_match,
      item,
      reps,
      notes,
    } satisfies SplitException;
  }

  // ADJUST
  const adjLines = lists['Adjustments'] ?? [];
  if (adjLines.length === 0) {
    throw new BlockValidationError('ADJUST block has empty Adjustments list');
  }
  const adjustments: AdjustException['adjustments'] = [];
  for (const line of adjLines) {
    // Format: "{rep_id} {display_name}: {±amount} {metric}"
    const m = /^(\d+)\s+([^:]+):\s*([+-]?\d+(?:\.\d+)?)\s+([a-z_]+)\s*$/.exec(line);
    if (!m) {
      throw new BlockValidationError(`ADJUST line unparseable: "${line}"`);
    }
    const sales_rep_id = parseInt(m[1]!, 10);
    const amount = parseFloat(m[3]!);
    const metric = m[4]! as ExceptionMetric;
    if (!roster.by_sales_rep_id.has(sales_rep_id)) {
      throw new BlockValidationError(`ADJUST line references sales_rep_id ${sales_rep_id} not in roster`);
    }
    if (!VALID_METRICS.has(metric)) {
      throw new BlockValidationError(`ADJUST line has unknown metric "${metric}"`);
    }
    if (!Number.isFinite(amount)) {
      throw new BlockValidationError(`ADJUST line amount unparseable: "${line}"`);
    }
    adjustments.push({ sales_rep_id, amount, metric });
  }
  return {
    id,
    added_date,
    active,
    type: 'ADJUST',
    account,
    account_match,
    item,
    adjustments,
    notes,
  } satisfies AdjustException;
}

export function parseExceptions(opts: ParseExceptionsOptions): ExceptionsParseResult {
  const { exceptionsPath, roster, errors } = opts;
  if (!existsSync(exceptionsPath)) {
    errors.add({
      kind: 'exceptions_file_absent',
      source_file: exceptionsPath,
      detail: { reason: 'File not present; running with zero exceptions.' },
    });
    return { parsed: [], source_file_hash: '', file_present: false };
  }

  const text = readFileSync(exceptionsPath, 'utf8');
  const source_file_hash = createHash('sha256').update(text).digest('hex');

  // Split on lines of exactly "---" (tolerate trailing whitespace + \r\n).
  const blocks = text.split(/\r?\n---[ \t]*\r?\n/);
  const parsed: ParsedException[] = [];
  const seenIds = new Map<string, number>();

  blocks.forEach((rawBlock, blockIdx) => {
    if (isCommentOrEmptyBlock(rawBlock)) return;
    try {
      const result = validateBlock(rawBlock, roster);
      // Track ID uniqueness across the file. If we see a duplicate, both go to errors.
      const prior = seenIds.get(result.id);
      seenIds.set(result.id, (prior ?? 0) + 1);
      parsed.push(result);
    } catch (e) {
      const reason = e instanceof BlockValidationError ? e.reason : (e as Error).message;
      errors.add({
        kind: 'malformed_exception_block',
        source_file: exceptionsPath,
        source_row_number: blockIdx + 1, // 1-indexed block number
        detail: {
          block_index: blockIdx,
          reason,
          block_preview: rawBlock.slice(0, 240),
        },
      });
    }
  });

  // Duplicate-ID purge: per SOP, ALL blocks with a duplicate ID are skipped.
  const finalParsed: ParsedException[] = [];
  for (const block of parsed) {
    const count = seenIds.get(block.id) ?? 0;
    if (count > 1) {
      errors.add({
        kind: 'malformed_exception_block',
        source_file: exceptionsPath,
        detail: { reason: `duplicate ID "${block.id}" — all blocks with this ID skipped`, id: block.id },
      });
      continue;
    }
    finalParsed.push(block);
  }

  return { parsed: finalParsed, source_file_hash, file_present: true };
}
