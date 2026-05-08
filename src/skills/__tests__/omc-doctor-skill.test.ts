import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('omc-doctor skill (issue #2254)', () => {
  it('documents CODEBUDDY.md OMC version drift check against cached plugin version', () => {
    const skillPath = join(process.cwd(), 'skills', 'omc-doctor', 'SKILL.md');
    const content = readFileSync(skillPath, 'utf8');

    expect(content).toContain('CODEBUDDY.md OMC version:');
    expect(content).toContain('OMC version source:');
    expect(content).toContain('Latest cached plugin version:');
    expect(content).toContain('VERSION DRIFT: CODEBUDDY.md and plugin versions differ');
    expect(content).toContain('VERSION CHECK SKIPPED: missing CODEBUDDY marker or plugin cache');
    expect(content).toContain('VERSION MATCH: CLAUDE and plugin cache are aligned');
    expect(content).toContain('CLAUDE-*.md');
    expect(content).toContain('deterministic companion');
    expect(content).toContain('scanned deterministic CODEBUDDY sources');
    expect(content).not.toContain('!==');
    expect(content).toContain('If `CODEBUDDY.md OMC version` != `Latest cached plugin version`: WARN - version drift detected');
  });
});
