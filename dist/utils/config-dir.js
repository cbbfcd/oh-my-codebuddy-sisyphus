/**
 * CodeBuddy Code Configuration Directory Resolution
 *
 * Resolves the active CodeBuddy Code configuration directory, honouring
 * CODEBUDDY_CONFIG_DIR (absolute path, or ~-prefixed) with fallback to
 * ~/.codebuddy.  Trailing separators are stripped; filesystem roots are
 * preserved.
 *
 * Multi-surface mirrors (keep in sync):
 *   scripts/lib/config-dir.mjs   — ESM hook/HUD runtime
 *   scripts/lib/config-dir.cjs   — CJS bridge runtime
 *   scripts/lib/config-dir.sh    — POSIX shell runtime
 */
import { join, normalize, parse, sep } from 'path';
import { homedir } from 'os';
/**
 * Strip a single trailing path separator (preserve filesystem root).
 * @internal Shared with scripts/lib/config-dir.{mjs,cjs,sh} — keep in sync.
 */
function stripTrailingSep(p) {
    if (!p.endsWith(sep)) {
        return p;
    }
    return p === parse(p).root ? p : p.slice(0, -1);
}
/**
 * Resolve the CodeBuddy Code configuration directory.
 *
 * Honours CODEBUDDY_CONFIG_DIR (absolute path, or ~-prefixed) with fallback
 * to CLAUDE_CONFIG_DIR for backward compatibility, then ~/.codebuddy.
 * Trailing separators are stripped; filesystem roots are preserved.
 */
export function getCodebuddyConfigDir() {
    const home = homedir();
    const configured = (process.env.CODEBUDDY_CONFIG_DIR ?? process.env.CLAUDE_CONFIG_DIR)?.trim();
    if (!configured) {
        return stripTrailingSep(normalize(join(home, '.codebuddy')));
    }
    if (configured === '~') {
        return stripTrailingSep(normalize(home));
    }
    if (configured.startsWith('~/') || configured.startsWith('~\\')) {
        return stripTrailingSep(normalize(join(home, configured.slice(2))));
    }
    return stripTrailingSep(normalize(configured));
}
/** @deprecated Use getCodebuddyConfigDir instead */
export const getClaudeConfigDir = getCodebuddyConfigDir;
//# sourceMappingURL=config-dir.js.map