import { describe, it, expect, vi } from 'vitest';
import { spawnSync } from 'child_process';
import {
  getContract,
  buildLaunchArgs,
  buildWorkerArgv,
  getWorkerEnv,
  parseCliOutput,
  isPromptModeAgent,
  getPromptModeArgs,
  isCliAvailable,
  shouldLoadShellRc,
  resolveCliBinaryPath,
  clearResolvedPathCache,
  validateCliBinaryPath,
  resolveClaudeWorkerModel,
  shouldUseClaudeBareMode,
  _testInternals,
} from '../model-contract.js';

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    spawnSync: vi.fn(actual.spawnSync),
  };
});

function setProcessPlatform(platform: NodeJS.Platform): () => void {
  const originalPlatform = process.platform;
  Object.defineProperty(process, 'platform', { value: platform, configurable: true });
  return () => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
  };
}

function withAnthropicApiKey(value: string | undefined, fn: () => void): void {
  const original = process.env.ANTHROPIC_API_KEY;
  if (value === undefined) {
    delete process.env.ANTHROPIC_API_KEY;
  } else {
    process.env.ANTHROPIC_API_KEY = value;
  }
  try {
    fn();
  } finally {
    if (original === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = original;
    }
  }
}

function countArg(args: string[], expected: string): number {
  return args.filter(arg => arg === expected).length;
}

describe('model-contract', () => {
  describe('backward-compat API shims', () => {
    it('shouldLoadShellRc returns false for non-interactive compatibility mode', () => {
      expect(shouldLoadShellRc()).toBe(false);
    });

    it('resolveCliBinaryPath resolves and caches paths', () => {
      const mockSpawnSync = vi.mocked(spawnSync);
      mockSpawnSync.mockReturnValue({ status: 0, stdout: '/usr/local/bin/codebuddy\n', stderr: '', pid: 0, output: [], signal: null });

      clearResolvedPathCache();
      expect(resolveCliBinaryPath('codebuddy')).toBe('/usr/local/bin/codebuddy');
      expect(resolveCliBinaryPath('codebuddy')).toBe('/usr/local/bin/codebuddy');
      expect(mockSpawnSync).toHaveBeenCalledTimes(1);
      clearResolvedPathCache();
    });

    it('resolveCliBinaryPath rejects unsafe names and paths', () => {
      const mockSpawnSync = vi.mocked(spawnSync);
      expect(() => resolveCliBinaryPath('../evil')).toThrow('Invalid CLI binary name');

      mockSpawnSync.mockReturnValue({ status: 0, stdout: '/tmp/evil/codebuddy\n', stderr: '', pid: 0, output: [], signal: null });
      clearResolvedPathCache();
      expect(() => resolveCliBinaryPath('codebuddy')).toThrow('untrusted location');
      clearResolvedPathCache();
      mockSpawnSync.mockRestore();
    });

    it('validateCliBinaryPath returns compatibility result object', () => {
      const mockSpawnSync = vi.mocked(spawnSync);
      mockSpawnSync.mockReturnValue({ status: 0, stdout: '/usr/local/bin/codebuddy\n', stderr: '', pid: 0, output: [], signal: null });

      clearResolvedPathCache();
      expect(validateCliBinaryPath('codebuddy')).toEqual({
        valid: true,
        binary: 'codebuddy',
        resolvedPath: '/usr/local/bin/codebuddy',
      });

      mockSpawnSync.mockReturnValue({ status: 1, stdout: '', stderr: 'not found', pid: 0, output: [], signal: null });
      clearResolvedPathCache();
      const invalid = validateCliBinaryPath('missing-cli');
      expect(invalid.valid).toBe(false);
      expect(invalid.binary).toBe('missing-cli');
      expect(invalid.reason).toContain('not found in PATH');
      clearResolvedPathCache();
      mockSpawnSync.mockRestore();
    });

    it('exposes compatibility test internals for path policy', () => {
      expect(_testInternals.UNTRUSTED_PATH_PATTERNS.some(p => p.test('/tmp/evil'))).toBe(true);
      expect(_testInternals.UNTRUSTED_PATH_PATTERNS.some(p => p.test('/usr/local/bin/codebuddy'))).toBe(false);
      const prefixes = _testInternals.getTrustedPrefixes();
      expect(prefixes).toContain('/usr/local/bin');
      expect(prefixes).toContain('/usr/bin');
    });
  });
  describe('getContract', () => {
    it('returns contract for codebuddy', () => {
      const c = getContract('codebuddy');
      expect(c.agentType).toBe('codebuddy');
      expect(c.binary).toBe('codebuddy');
    });
    it('returns contract for codex', () => {
      const c = getContract('codex');
      expect(c.agentType).toBe('codex');
      expect(c.binary).toBe('codex');
    });
    it('returns contract for gemini', () => {
      const c = getContract('gemini');
      expect(c.agentType).toBe('gemini');
      expect(c.binary).toBe('gemini');
    });
    it('throws for unknown agent type', () => {
      expect(() => getContract('unknown' as any)).toThrow('Unknown agent type');
    });

    it('blocks codex when external LLM is disabled', async () => {
      const origSecurity = process.env.OMC_SECURITY;
      process.env.OMC_SECURITY = 'strict';
      try {
        const { clearSecurityConfigCache } = await import('../../lib/security-config.js');
        clearSecurityConfigCache();
        expect(() => getContract('codex')).toThrow('blocked by security policy');
      } finally {
        if (origSecurity === undefined) {
          delete process.env.OMC_SECURITY;
        } else {
          process.env.OMC_SECURITY = origSecurity;
        }
        const { clearSecurityConfigCache } = await import('../../lib/security-config.js');
        clearSecurityConfigCache();
      }
    });

    it('blocks gemini when external LLM is disabled', async () => {
      const origSecurity = process.env.OMC_SECURITY;
      process.env.OMC_SECURITY = 'strict';
      try {
        const { clearSecurityConfigCache } = await import('../../lib/security-config.js');
        clearSecurityConfigCache();
        expect(() => getContract('gemini')).toThrow('blocked by security policy');
      } finally {
        if (origSecurity === undefined) {
          delete process.env.OMC_SECURITY;
        } else {
          process.env.OMC_SECURITY = origSecurity;
        }
        const { clearSecurityConfigCache } = await import('../../lib/security-config.js');
        clearSecurityConfigCache();
      }
    });

    it('allows codebuddy even when external LLM is disabled', async () => {
      const origSecurity = process.env.OMC_SECURITY;
      process.env.OMC_SECURITY = 'strict';
      try {
        const { clearSecurityConfigCache } = await import('../../lib/security-config.js');
        clearSecurityConfigCache();
        expect(() => getContract('codebuddy')).not.toThrow();
      } finally {
        if (origSecurity === undefined) {
          delete process.env.OMC_SECURITY;
        } else {
          process.env.OMC_SECURITY = origSecurity;
        }
        const { clearSecurityConfigCache } = await import('../../lib/security-config.js');
        clearSecurityConfigCache();
      }
    });
  });

  describe('buildLaunchArgs', () => {
    it('codebuddy includes --dangerously-skip-permissions', () => {
      const args = buildLaunchArgs('codebuddy', { teamName: 't', workerName: 'w', cwd: '/tmp' });
      expect(args).toContain('--dangerously-skip-permissions');
    });
    it('detects Claude bare mode only for non-empty ANTHROPIC_API_KEY', () => {
      expect(shouldUseClaudeBareMode({ ANTHROPIC_API_KEY: 'sk-test' })).toBe(true);
      expect(shouldUseClaudeBareMode({ ANTHROPIC_API_KEY: '' })).toBe(false);
      expect(shouldUseClaudeBareMode({ ANTHROPIC_API_KEY: '   ' })).toBe(false);
      expect(shouldUseClaudeBareMode({})).toBe(false);
    });
    it('codebuddy omits --bare when ANTHROPIC_API_KEY is absent, empty, or whitespace', () => {
      for (const value of [undefined, '', '   ']) {
        withAnthropicApiKey(value, () => {
          const args = buildLaunchArgs('codebuddy', { teamName: 't', workerName: 'w', cwd: '/tmp' });
          expect(args).toContain('--dangerously-skip-permissions');
          expect(args).not.toContain('--bare');
        });
      }
    });
    it('codebuddy includes --bare with API-key auth and dedupes exact extra flag', () => {
      withAnthropicApiKey('sk-test', () => {
        const args = buildLaunchArgs('codebuddy', { teamName: 't', workerName: 'w', cwd: '/tmp' });
        expect(args).toContain('--dangerously-skip-permissions');
        expect(args).toContain('--bare');
        expect(countArg(args, '--bare')).toBe(1);

        const deduped = buildLaunchArgs('codebuddy', {
          teamName: 't',
          workerName: 'w',
          cwd: '/tmp',
          extraFlags: ['--bare'],
        });
        expect(countArg(deduped, '--bare')).toBe(1);
      });
    });
    it('codex includes --dangerously-bypass-approvals-and-sandbox', () => {
      const args = buildLaunchArgs('codex', { teamName: 't', workerName: 'w', cwd: '/tmp' });
      expect(args).not.toContain('exec');
      expect(args).not.toContain('--full-auto');
      expect(args).toContain('--dangerously-bypass-approvals-and-sandbox');
    });
    it('gemini includes --approval-mode yolo', () => {
      const args = buildLaunchArgs('gemini', { teamName: 't', workerName: 'w', cwd: '/tmp' });
      expect(args).toContain('--approval-mode');
      expect(args).toContain('yolo');
      expect(args).not.toContain('-p');
    });
    it('passes model flag when specified', () => {
      const args = buildLaunchArgs('codex', { teamName: 't', workerName: 'w', cwd: '/tmp', model: 'gpt-4' });
      expect(args).toContain('--model');
      expect(args).toContain('gpt-4');
    });
    it('normalizes full Claude model ID to alias for codebuddy agent (issue #1415)', () => {
      const args = buildLaunchArgs('codebuddy', { teamName: 't', workerName: 'w', cwd: '/tmp', model: 'claude-sonnet-4-6' });
      expect(args).toContain('--model');
      expect(args).toContain('sonnet');
      expect(args).not.toContain('claude-sonnet-4-6');
    });
    it('passes Bedrock model ID through without normalization for codebuddy agent (issue #1695)', () => {
      withAnthropicApiKey('sk-test', () => {
        const args = buildLaunchArgs('codebuddy', { teamName: 't', workerName: 'w', cwd: '/tmp', model: 'us.anthropic.codebuddy-opus-4-6-v1:0' });
        expect(args).toContain('--bare');
        expect(countArg(args, '--bare')).toBe(1);
        expect(args).toContain('--model');
        expect(args).toContain('us.anthropic.codebuddy-opus-4-6-v1:0');
        expect(args).not.toContain('opus');
      });
    });
    it('passes Bedrock ARN model ID through without normalization (issue #1695)', () => {
      const arn = 'arn:aws:bedrock:us-east-2:123456789012:inference-profile/global.anthropic.codebuddy-sonnet-4-6-v1:0';
      const args = buildLaunchArgs('codebuddy', { teamName: 't', workerName: 'w', cwd: '/tmp', model: arn });
      expect(args).toContain('--model');
      expect(args).toContain(arn);
    });
    it('passes Vertex AI model ID through without normalization (issue #1695)', () => {
      const args = buildLaunchArgs('codebuddy', { teamName: 't', workerName: 'w', cwd: '/tmp', model: 'vertex_ai/codebuddy-sonnet-4-6@20250514' });
      expect(args).toContain('--model');
      expect(args).toContain('vertex_ai/codebuddy-sonnet-4-6@20250514');
      expect(args).not.toContain('sonnet');
    });
    it('does not normalize non-Claude models for codex/gemini agents', () => {
      const args = buildLaunchArgs('codex', { teamName: 't', workerName: 'w', cwd: '/tmp', model: 'gpt-4o' });
      expect(args).toContain('gpt-4o');
    });
  });

  describe('getWorkerEnv', () => {
    it('returns correct env vars', () => {
      const env = getWorkerEnv('my-team', 'worker-1', 'codex');
      expect(env.OMC_TEAM_WORKER).toBe('my-team/worker-1');
      expect(env.OMC_TEAM_NAME).toBe('my-team');
      expect(env.OMC_WORKER_AGENT_TYPE).toBe('codex');
    });

    it('propagates allowlisted model selection env vars into worker startup env', () => {
      const env = getWorkerEnv('my-team', 'worker-1', 'codebuddy', {
        ANTHROPIC_MODEL: 'codebuddy-opus-4-1',
        CLAUDE_MODEL: 'codebuddy-sonnet-4-5',
        ANTHROPIC_BASE_URL: 'https://example-gateway.invalid',
        CODEBUDDY_CODE_USE_BEDROCK: '1',
        CODEBUDDY_CODE_BEDROCK_OPUS_MODEL: 'us.anthropic.codebuddy-opus-4-6-v1:0',
        CODEBUDDY_CODE_BEDROCK_SONNET_MODEL: 'us.anthropic.codebuddy-sonnet-4-6-v1:0',
        CODEBUDDY_CODE_BEDROCK_HAIKU_MODEL: 'us.anthropic.codebuddy-haiku-4-5-v1:0',
        ANTHROPIC_DEFAULT_OPUS_MODEL: 'codebuddy-opus-4-6-custom',
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'codebuddy-sonnet-4-6-custom',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: 'codebuddy-haiku-4-5-custom',
        OMC_MODEL_HIGH: 'codebuddy-opus-4-6-override',
        OMC_MODEL_MEDIUM: 'codebuddy-sonnet-4-6-override',
        OMC_MODEL_LOW: 'codebuddy-haiku-4-5-override',
        OMC_EXTERNAL_MODELS_DEFAULT_CODEX_MODEL: 'gpt-5',
        OMC_GEMINI_DEFAULT_MODEL: 'gemini-2.5-pro',
        ANTHROPIC_API_KEY: 'should-not-be-forwarded',
      });

      expect(env.ANTHROPIC_MODEL).toBe('codebuddy-opus-4-1');
      expect(env.CLAUDE_MODEL).toBe('codebuddy-sonnet-4-5');
      expect(env.ANTHROPIC_BASE_URL).toBe('https://example-gateway.invalid');
      expect(env.CODEBUDDY_CODE_USE_BEDROCK).toBe('1');
      expect(env.CODEBUDDY_CODE_BEDROCK_OPUS_MODEL).toBe('us.anthropic.codebuddy-opus-4-6-v1:0');
      expect(env.CODEBUDDY_CODE_BEDROCK_SONNET_MODEL).toBe('us.anthropic.codebuddy-sonnet-4-6-v1:0');
      expect(env.CODEBUDDY_CODE_BEDROCK_HAIKU_MODEL).toBe('us.anthropic.codebuddy-haiku-4-5-v1:0');
      expect(env.ANTHROPIC_DEFAULT_OPUS_MODEL).toBe('codebuddy-opus-4-6-custom');
      expect(env.ANTHROPIC_DEFAULT_SONNET_MODEL).toBe('codebuddy-sonnet-4-6-custom');
      expect(env.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe('codebuddy-haiku-4-5-custom');
      expect(env.OMC_MODEL_HIGH).toBe('codebuddy-opus-4-6-override');
      expect(env.OMC_MODEL_MEDIUM).toBe('codebuddy-sonnet-4-6-override');
      expect(env.OMC_MODEL_LOW).toBe('codebuddy-haiku-4-5-override');
      expect(env.OMC_EXTERNAL_MODELS_DEFAULT_CODEX_MODEL).toBe('gpt-5');
      expect(env.OMC_GEMINI_DEFAULT_MODEL).toBe('gemini-2.5-pro');
      expect(env.ANTHROPIC_API_KEY).toBeUndefined();
    });

    it('rejects invalid team names', () => {
      expect(() => getWorkerEnv('Bad-Team', 'worker-1', 'codex')).toThrow('Invalid team name');
    });
  });

  describe('buildWorkerArgv', () => {
    it('builds codex interactive worker argv without the exec subcommand', () => {
      const mockSpawnSync = vi.mocked(spawnSync);
      mockSpawnSync.mockReturnValueOnce({ status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as any);

      const argv = buildWorkerArgv('codex', { teamName: 'my-team', workerName: 'worker-1', cwd: '/tmp' });
      expect(argv).toEqual([
        'codex',
        '--dangerously-bypass-approvals-and-sandbox',
      ]);
      expect(argv).not.toContain('exec');
      expect(mockSpawnSync).toHaveBeenCalledWith('which', ['codex'], { timeout: 5000, encoding: 'utf8' });
      mockSpawnSync.mockRestore();
    });

    it('builds codebuddy interactive worker argv without the exec subcommand', () => {
      const mockSpawnSync = vi.mocked(spawnSync);
      mockSpawnSync.mockReturnValueOnce({ status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as any);

      let argv: string[] = [];
      withAnthropicApiKey('sk-test', () => {
        argv = buildWorkerArgv('codebuddy', { teamName: 'my-team', workerName: 'worker-1', cwd: '/tmp' });
      });

      expect(argv[0]).toBe('codebuddy');
      expect(argv).toContain('--dangerously-skip-permissions');
      expect(argv).toContain('--bare');
      expect(countArg(argv, '--bare')).toBe(1);
      expect(argv).not.toContain('exec');
      expect(mockSpawnSync).toHaveBeenCalledWith('which', ['codebuddy'], { timeout: 5000, encoding: 'utf8' });
      mockSpawnSync.mockRestore();
    });

    it('prefers resolved absolute binary path when available', () => {
      const mockSpawnSync = vi.mocked(spawnSync);
      mockSpawnSync.mockReturnValueOnce({ status: 0, stdout: '/usr/local/bin/codex\n', stderr: '', pid: 0, output: [], signal: null } as any);

      expect(buildWorkerArgv('codex', { teamName: 'my-team', workerName: 'worker-1', cwd: '/tmp' })[0]).toBe('/usr/local/bin/codex');
      mockSpawnSync.mockRestore();
    });
  });

  describe('parseCliOutput', () => {
    it('codebuddy returns trimmed output', () => {
      expect(parseCliOutput('codebuddy', '  hello  ')).toBe('hello');
    });
    it('codex extracts result from JSONL', () => {
      const jsonl = JSON.stringify({ type: 'result', output: 'the answer' });
      expect(parseCliOutput('codex', jsonl)).toBe('the answer');
    });
    it('codex falls back to raw output if no JSONL', () => {
      expect(parseCliOutput('codex', 'plain text')).toBe('plain text');
    });
  });

  describe('isCliAvailable', () => {
    it('checks version without shell:true for standard binaries', () => {
      const mockSpawnSync = vi.mocked(spawnSync);
      clearResolvedPathCache();
      mockSpawnSync
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as any)
        .mockReturnValueOnce({ status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as any);

      isCliAvailable('codex');

      expect(mockSpawnSync).toHaveBeenNthCalledWith(1, 'which', ['codex'], { timeout: 5000, encoding: 'utf8' });
      expect(mockSpawnSync).toHaveBeenNthCalledWith(2, 'codex', ['--version'], { timeout: 5000, shell: false });
      clearResolvedPathCache();
      mockSpawnSync.mockRestore();
    });

    it('uses COMSPEC for .cmd binaries on win32', () => {
      const mockSpawnSync = vi.mocked(spawnSync);
      const restorePlatform = setProcessPlatform('win32');
      vi.stubEnv('COMSPEC', 'C:\\Windows\\System32\\cmd.exe');
      clearResolvedPathCache();

      mockSpawnSync
        .mockReturnValueOnce({ status: 0, stdout: 'C:\\Tools\\codex.cmd\n', stderr: '', pid: 0, output: [], signal: null } as any)
        .mockReturnValueOnce({ status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as any);

      isCliAvailable('codex');

      expect(mockSpawnSync).toHaveBeenNthCalledWith(1, 'where', ['codex'], { timeout: 5000, encoding: 'utf8' });
      expect(mockSpawnSync).toHaveBeenNthCalledWith(
        2,
        'C:\\Windows\\System32\\cmd.exe',
        ['/d', '/s', '/c', '"C:\\Tools\\codex.cmd" --version'],
        { timeout: 5000 }
      );
      restorePlatform();
      clearResolvedPathCache();
      mockSpawnSync.mockRestore();
      vi.unstubAllEnvs();
    });

    it('uses shell:true for unresolved binaries on win32', () => {
      const mockSpawnSync = vi.mocked(spawnSync);
      const restorePlatform = setProcessPlatform('win32');
      clearResolvedPathCache();

      mockSpawnSync
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as any)
        .mockReturnValueOnce({ status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as any);

      isCliAvailable('gemini');

      expect(mockSpawnSync).toHaveBeenNthCalledWith(1, 'where', ['gemini'], { timeout: 5000, encoding: 'utf8' });
      expect(mockSpawnSync).toHaveBeenNthCalledWith(2, 'gemini', ['--version'], { timeout: 5000, shell: true });
      restorePlatform();
      clearResolvedPathCache();
      mockSpawnSync.mockRestore();
    });
  });

  describe('prompt mode (headless TUI bypass)', () => {
    it('gemini supports prompt mode', () => {
      expect(isPromptModeAgent('gemini')).toBe(true);
      const c = getContract('gemini');
      expect(c.supportsPromptMode).toBe(true);
      expect(c.promptModeFlag).toBe('-p');
    });

    it('codebuddy does not support prompt mode', () => {
      expect(isPromptModeAgent('codebuddy')).toBe(false);
    });

    it('codex launches as a persistent interactive worker, not prompt/exec mode', () => {
      expect(isPromptModeAgent('codex')).toBe(false);
      const c = getContract('codex');
      expect(c.supportsPromptMode).toBe(false);
      expect(c.promptModeFlag).toBeUndefined();
    });

    it('getPromptModeArgs returns flag + instruction for gemini', () => {
      const args = getPromptModeArgs('gemini', 'Read inbox');
      expect(args).toEqual(['-p', 'Read inbox']);
    });

    it('getPromptModeArgs returns empty array for interactive codex and codebuddy workers', () => {
      expect(getPromptModeArgs('codex', 'Read inbox')).toEqual([]);
      expect(getPromptModeArgs('codebuddy', 'Read inbox')).toEqual([]);
    });
  });

  describe('resolveClaudeWorkerModel (issue #1695)', () => {
    it('returns undefined when OMC_ROUTING_FORCE_INHERIT=true even if Bedrock model env vars are set', () => {
      vi.stubEnv('OMC_ROUTING_FORCE_INHERIT', 'true');
      vi.stubEnv('CODEBUDDY_CODE_USE_BEDROCK', '1');
      vi.stubEnv('ANTHROPIC_MODEL', 'us.anthropic.codebuddy-sonnet-4-5-20250929-v1:0');
      vi.stubEnv('CLAUDE_MODEL', 'us.anthropic.codebuddy-opus-4-6-v1:0');
      vi.stubEnv('CODEBUDDY_CODE_BEDROCK_SONNET_MODEL', 'us.anthropic.codebuddy-sonnet-4-6-v1:0');
      vi.stubEnv('OMC_MODEL_MEDIUM', 'us.anthropic.codebuddy-sonnet-4-5-20250929-v1:0');
      expect(resolveClaudeWorkerModel()).toBeUndefined();
      vi.unstubAllEnvs();
    });

    it('returns undefined when OMC_ROUTING_FORCE_INHERIT=true on Vertex', () => {
      vi.stubEnv('OMC_ROUTING_FORCE_INHERIT', 'true');
      vi.stubEnv('CODEBUDDY_CODE_USE_BEDROCK', '');
      vi.stubEnv('CODEBUDDY_CODE_USE_VERTEX', '1');
      vi.stubEnv('ANTHROPIC_MODEL', 'vertex_ai/codebuddy-sonnet-4-6@20250514');
      expect(resolveClaudeWorkerModel()).toBeUndefined();
      vi.unstubAllEnvs();
    });

    it('returns undefined when not on Bedrock or Vertex', () => {
      vi.stubEnv('CODEBUDDY_CODE_USE_BEDROCK', '');
      vi.stubEnv('CODEBUDDY_CODE_USE_VERTEX', '');
      vi.stubEnv('ANTHROPIC_MODEL', '');
      vi.stubEnv('CLAUDE_MODEL', '');
      expect(resolveClaudeWorkerModel()).toBeUndefined();
      vi.unstubAllEnvs();
    });

    it('returns ANTHROPIC_MODEL on Bedrock when set', () => {
      vi.stubEnv('CODEBUDDY_CODE_USE_BEDROCK', '1');
      vi.stubEnv('ANTHROPIC_MODEL', 'us.anthropic.codebuddy-sonnet-4-5-20250929-v1:0');
      vi.stubEnv('CLAUDE_MODEL', '');
      expect(resolveClaudeWorkerModel()).toBe('us.anthropic.codebuddy-sonnet-4-5-20250929-v1:0');
      vi.unstubAllEnvs();
    });

    it('returns CLAUDE_MODEL on Bedrock when ANTHROPIC_MODEL is not set', () => {
      vi.stubEnv('CODEBUDDY_CODE_USE_BEDROCK', '1');
      vi.stubEnv('ANTHROPIC_MODEL', '');
      vi.stubEnv('CLAUDE_MODEL', 'us.anthropic.codebuddy-opus-4-6-v1:0');
      expect(resolveClaudeWorkerModel()).toBe('us.anthropic.codebuddy-opus-4-6-v1:0');
      vi.unstubAllEnvs();
    });

    it('falls back to CODEBUDDY_CODE_BEDROCK_SONNET_MODEL tier env var', () => {
      vi.stubEnv('CODEBUDDY_CODE_USE_BEDROCK', '1');
      vi.stubEnv('ANTHROPIC_MODEL', '');
      vi.stubEnv('CLAUDE_MODEL', '');
      vi.stubEnv('CODEBUDDY_CODE_BEDROCK_SONNET_MODEL', 'us.anthropic.codebuddy-sonnet-4-6-v1:0');
      expect(resolveClaudeWorkerModel()).toBe('us.anthropic.codebuddy-sonnet-4-6-v1:0');
      vi.unstubAllEnvs();
    });

    it('falls back to OMC_MODEL_MEDIUM tier env var', () => {
      vi.stubEnv('CODEBUDDY_CODE_USE_BEDROCK', '1');
      vi.stubEnv('ANTHROPIC_MODEL', '');
      vi.stubEnv('CLAUDE_MODEL', '');
      vi.stubEnv('CODEBUDDY_CODE_BEDROCK_SONNET_MODEL', '');
      vi.stubEnv('ANTHROPIC_DEFAULT_SONNET_MODEL', '');
      vi.stubEnv('OMC_MODEL_MEDIUM', 'us.anthropic.codebuddy-sonnet-4-5-20250929-v1:0');
      expect(resolveClaudeWorkerModel()).toBe('us.anthropic.codebuddy-sonnet-4-5-20250929-v1:0');
      vi.unstubAllEnvs();
    });

    it('returns ANTHROPIC_MODEL on Vertex when set', () => {
      vi.stubEnv('CODEBUDDY_CODE_USE_BEDROCK', '');
      vi.stubEnv('CODEBUDDY_CODE_USE_VERTEX', '1');
      vi.stubEnv('ANTHROPIC_MODEL', 'vertex_ai/codebuddy-sonnet-4-6@20250514');
      expect(resolveClaudeWorkerModel()).toBe('vertex_ai/codebuddy-sonnet-4-6@20250514');
      vi.unstubAllEnvs();
    });

    it('returns undefined on Bedrock when no model env vars are set', () => {
      vi.stubEnv('CODEBUDDY_CODE_USE_BEDROCK', '1');
      vi.stubEnv('ANTHROPIC_MODEL', '');
      vi.stubEnv('CLAUDE_MODEL', '');
      vi.stubEnv('CODEBUDDY_CODE_BEDROCK_SONNET_MODEL', '');
      vi.stubEnv('ANTHROPIC_DEFAULT_SONNET_MODEL', '');
      vi.stubEnv('OMC_MODEL_MEDIUM', '');
      expect(resolveClaudeWorkerModel()).toBeUndefined();
      vi.unstubAllEnvs();
    });

    it('detects Bedrock from model ID pattern even without CODEBUDDY_CODE_USE_BEDROCK', () => {
      vi.stubEnv('CODEBUDDY_CODE_USE_BEDROCK', '');
      vi.stubEnv('CODEBUDDY_CODE_USE_VERTEX', '');
      vi.stubEnv('ANTHROPIC_MODEL', 'us.anthropic.codebuddy-sonnet-4-5-20250929-v1:0');
      vi.stubEnv('CLAUDE_MODEL', '');
      // isBedrock() detects Bedrock from the model ID pattern
      expect(resolveClaudeWorkerModel()).toBe('us.anthropic.codebuddy-sonnet-4-5-20250929-v1:0');
      vi.unstubAllEnvs();
    });
  });
});
