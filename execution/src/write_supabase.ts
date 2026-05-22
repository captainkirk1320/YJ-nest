// Supabase sink — stub for this session. The orchestrator writes through an
// IngestSink interface so the engine can run end-to-end against an
// InMemorySink in tests, and against the real SupabaseSink once credentials
// land (separate session).
//
// SOP: architecture/sop_orchestrator.md (idempotency contract)

import type {
  IngestError,
  IngestRunSummary,
  IngestSink,
  ParsedException,
  TeamOutput,
  VolunteerOutput,
} from './types.js';

export class InMemorySink implements IngestSink {
  volunteers: VolunteerOutput[] = [];
  teams: TeamOutput[] = [];
  ingestErrors: IngestError[] = [];
  exceptionsMirror: { rows: ParsedException[]; source_file_hash: string } | null = null;
  ingestRun: IngestRunSummary | null = null;

  async writeVolunteers(rows: VolunteerOutput[]): Promise<void> {
    this.volunteers = rows;
  }
  async writeTeams(rows: TeamOutput[]): Promise<void> {
    this.teams = rows;
  }
  async writeIngestErrors(rows: IngestError[]): Promise<void> {
    this.ingestErrors = rows;
  }
  async writeExceptionsMirror(rows: ParsedException[], sourceFileHash: string): Promise<void> {
    this.exceptionsMirror = { rows, source_file_hash: sourceFileHash };
  }
  async writeIngestRun(summary: IngestRunSummary): Promise<void> {
    this.ingestRun = summary;
  }
}

export class SupabaseSink implements IngestSink {
  constructor(private readonly _config: { url: string; serviceRoleKey: string }) {}
  async writeVolunteers(_rows: VolunteerOutput[]): Promise<void> {
    throw new Error('SupabaseSink.writeVolunteers: not implemented in this session — pending Supabase credentials and table migrations.');
  }
  async writeTeams(_rows: TeamOutput[]): Promise<void> {
    throw new Error('SupabaseSink.writeTeams: not implemented.');
  }
  async writeIngestErrors(_rows: IngestError[]): Promise<void> {
    throw new Error('SupabaseSink.writeIngestErrors: not implemented.');
  }
  async writeExceptionsMirror(_rows: ParsedException[], _hash: string): Promise<void> {
    throw new Error('SupabaseSink.writeExceptionsMirror: not implemented.');
  }
  async writeIngestRun(_summary: IngestRunSummary): Promise<void> {
    throw new Error('SupabaseSink.writeIngestRun: not implemented.');
  }
}
