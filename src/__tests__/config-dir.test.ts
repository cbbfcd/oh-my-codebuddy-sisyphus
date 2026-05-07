import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'fs';
import { homedir, tmpdir } from 'os';
import { basename, join, normalize } from 'path';
import { getCodebuddyConfigDir } from '../utils/config-dir.js'
import { isValidTranscriptPath } from '../lib/worktree-paths.js';
import { findRuleFiles } from '../hooks/rules-injector/finder.js';

const originalConfigDir = process.env.CODEBUDDY_CONFIG_DIR;
const originalClaudeConfigDir = process.env.CLAUDE_CONFIG_DIR;

describe('getCodebuddyConfigDir', () => {
  afterEach(() => {
    if (originalConfigDir === undefined) {
      delete process.env.CODEBUDDY_CONFIG_DIR;
    } else {
      process.env.CODEBUDDY_CONFIG_DIR = originalConfigDir;
    }
    if (originalClaudeConfigDir === undefined) {
      delete process.env.CLAUDE_CONFIG_DIR;
    } else {
      process.env.CLAUDE_CONFIG_DIR = originalClaudeConfigDir;
    }
  });

  it('falls back to ~/.codebuddy when CODEBUDDY_CONFIG_DIR is unset', () => {
    delete process.env.CODEBUDDY_CONFIG_DIR;
    delete process.env.CLAUDE_CONFIG_DIR;
    expect(getCodebuddyConfigDir()).toBe(normalize(join(homedir(), '.codebuddy')));
  });

  it('falls back to ~/.codebuddy when CODEBUDDY_CONFIG_DIR is empty', () => {
    process.env.CODEBUDDY_CONFIG_DIR = '   ';
    delete process.env.CLAUDE_CONFIG_DIR;
    expect(getCodebuddyConfigDir()).toBe(normalize(join(homedir(), '.codebuddy')));
  });

  it('returns an absolute custom path unchanged aside from normalization', () => {
    process.env.CODEBUDDY_CONFIG_DIR = join(tmpdir(), 'custom-claude-config', '..', 'custom-claude-config');
    expect(getCodebuddyConfigDir()).toBe(normalize(join(tmpdir(), 'custom-claude-config', '..', 'custom-claude-config')));
  });

  it('expands a bare tilde to the home directory', () => {
    process.env.CODEBUDDY_CONFIG_DIR = '~';
    expect(getCodebuddyConfigDir()).toBe(normalize(homedir()));
  });

  it('expands a ~-prefixed config path', () => {
    process.env.CODEBUDDY_CONFIG_DIR = '~/.claude-alt';
    expect(getCodebuddyConfigDir()).toBe(normalize(join(homedir(), '.claude-alt')));
  });

  it('strips a trailing separator from custom paths', () => {
    process.env.CODEBUDDY_CONFIG_DIR = join(tmpdir(), 'custom-claude-config') + '/';
    expect(getCodebuddyConfigDir()).toBe(normalize(join(tmpdir(), 'custom-claude-config')));
    expect(getCodebuddyConfigDir().endsWith('/')).toBe(false);
  });

  it('preserves a Windows drive root when trimming separators', async () => {
    process.env.CODEBUDDY_CONFIG_DIR = 'C:\\';

    vi.resetModules();
    vi.doMock('node:os', () => ({
      homedir: () => 'C:\\Users\\tester',
    }));
    vi.doMock('node:path', async () => import('node:path/win32'));

    try {
      const { getCodebuddyConfigDir: getWindowsConfigDir } = await import('../utils/config-dir.js');
      expect(getWindowsConfigDir()).toBe('C:\\');
    } finally {
      vi.doUnmock('node:os');
      vi.doUnmock('node:path');
      vi.resetModules();
    }
  });

  it('keeps the script helper aligned with the TypeScript helper', async () => {
    process.env.CODEBUDDY_CONFIG_DIR = '~/.claude-alt';
    const output = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "import { getCodebuddyConfigDir } from './scripts/lib/config-dir.mjs'; process.stdout.write(getCodebuddyConfigDir());",
      ],
      {
        cwd: process.cwd(),
        env: process.env,
        encoding: 'utf-8',
      },
    );
    expect(output).toBe(normalize(join(homedir(), '.claude-alt')));
  });

  it('find-node.sh resolves a ~-prefixed CODEBUDDY_CONFIG_DIR before reading .omc-config.json', () => {
    const homeDir = mkdtempSync(join(tmpdir(), 'omc-find-node-home-'));
    const configDir = join(homeDir, '.claude-alt');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(join(configDir, '.omc-config.json'), JSON.stringify({ nodeBinary: process.execPath }));

    const output = execFileSync(
      '/bin/sh',
      [join(process.cwd(), 'scripts', 'find-node.sh'), '-e', "process.stdout.write('ok')"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          HOME: homeDir,
          PATH: '/bin:/usr/bin',
          CODEBUDDY_CONFIG_DIR: '~/.claude-alt',
        },
        encoding: 'utf-8',
      },
    );

    expect(output).toBe('ok');
  });

  it('shared shell helper expands a ~-prefixed CODEBUDDY_CONFIG_DIR', () => {
    const homeDir = mkdtempSync(join(tmpdir(), 'omc-uninstall-home-'));
    // The shell script reads CLAUDE_CONFIG_DIR (legacy name) for tilde expansion.
    // Spread process.env but override CLAUDE_CONFIG_DIR and HOME, and unset
    // CODEBUDDY_CONFIG_DIR so inherited values don't interfere.
    const { CODEBUDDY_CONFIG_DIR: _omit, ...restEnv } = process.env as Record<string, string | undefined>;
    const output = execFileSync('bash', ['-c', `. "${join(process.cwd(), 'scripts', 'lib', 'config-dir.sh')}"; resolve_claude_config_dir`], {
      cwd: process.cwd(),
      env: {
        ...restEnv,
        HOME: homeDir,
        CLAUDE_CONFIG_DIR: '~/.claude-alt',
      },
      encoding: 'utf-8',
    });

    expect(output.trim()).toBe(join(homeDir, '.claude-alt'));
  });

  it('keeps the CJS helper aligned with the TypeScript helper', () => {
    process.env.CODEBUDDY_CONFIG_DIR = '~/.claude-alt';
    const cjsPath = join(process.cwd(), 'scripts', 'lib', 'config-dir.cjs');
    const output = execFileSync(
      process.execPath,
      ['-e', `const { getCodebuddyConfigDir } = require(${JSON.stringify(cjsPath)}); process.stdout.write(getCodebuddyConfigDir());`],
      {
        cwd: process.cwd(),
        env: process.env,
        encoding: 'utf-8',
      },
    );
    expect(output).toBe(normalize(join(homedir(), '.claude-alt')));
  });
});

describe('CODEBUDDY_CONFIG_DIR downstream integration', () => {
  let origConfigDir: string | undefined;
  let tempDir: string;
  let tildeConfigDir: string;

  beforeEach(() => {
    origConfigDir = process.env.CODEBUDDY_CONFIG_DIR;
    tempDir = join(tmpdir(), `omc-test-configdir-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    tildeConfigDir = join(homedir(), `.omc-test-configdir-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (origConfigDir === undefined) {
      delete process.env.CODEBUDDY_CONFIG_DIR;
    } else {
      process.env.CODEBUDDY_CONFIG_DIR = origConfigDir;
    }
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
    try {
      rmSync(tildeConfigDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it('accepts transcript paths under custom CODEBUDDY_CONFIG_DIR', () => {
    process.env.CODEBUDDY_CONFIG_DIR = '/opt/custom-claude-config';
    const transcriptPath = '/opt/custom-claude-config/projects/-foo/bar/session.jsonl';
    expect(isValidTranscriptPath(transcriptPath)).toBe(true);
  });

  it('accepts transcript paths when CODEBUDDY_CONFIG_DIR uses a ~-prefixed path', () => {
    process.env.CODEBUDDY_CONFIG_DIR = `~/${basename(tildeConfigDir)}`;
    const transcriptPath = join(tildeConfigDir, 'projects', '-foo', 'bar', 'session.jsonl');
    expect(isValidTranscriptPath(transcriptPath)).toBe(true);
  });

  it('discovers user rules from custom CODEBUDDY_CONFIG_DIR/rules', () => {
    const customRulesDir = join(tempDir, 'rules');
    mkdirSync(customRulesDir, { recursive: true });
    writeFileSync(join(customRulesDir, 'my-rule.md'), '# My Rule\nRule content');

    process.env.CODEBUDDY_CONFIG_DIR = tempDir;

    const candidates = findRuleFiles(null, '/some/file.ts');
    const globalRules = candidates.filter(c => c.isGlobal);

    expect(globalRules.length).toBeGreaterThanOrEqual(1);
    expect(globalRules.some(c => c.path.includes('my-rule.md'))).toBe(true);
  });

  it('uses the active config dir rather than default ~/.codebuddy/rules for user rules', () => {
    const customRulesDir = join(tempDir, 'rules');
    mkdirSync(customRulesDir, { recursive: true });
    writeFileSync(join(customRulesDir, 'custom-rule.md'), '# Custom Rule');

    process.env.CODEBUDDY_CONFIG_DIR = tempDir;

    const candidates = findRuleFiles(null, '/some/file.ts');
    const globalRules = candidates.filter(c => c.isGlobal);

    expect(globalRules.some(c => c.path.includes('custom-rule.md'))).toBe(true);
  });

  it('discovers user rules when CODEBUDDY_CONFIG_DIR uses a ~-prefixed path', () => {
    const customRulesDir = join(tildeConfigDir, 'rules');
    mkdirSync(customRulesDir, { recursive: true });
    writeFileSync(join(customRulesDir, 'tilde-rule.md'), '# Tilde Rule');

    process.env.CODEBUDDY_CONFIG_DIR = `~/${basename(tildeConfigDir)}`;

    const candidates = findRuleFiles(null, '/some/file.ts');
    const globalRules = candidates.filter(c => c.isGlobal);

    expect(globalRules.some(c => c.path.includes('tilde-rule.md'))).toBe(true);
  });
});
