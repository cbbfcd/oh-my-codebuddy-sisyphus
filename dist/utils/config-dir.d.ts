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
/**
 * Resolve the CodeBuddy Code configuration directory.
 *
 * Honours CODEBUDDY_CONFIG_DIR (absolute path, or ~-prefixed) with fallback
 * to CLAUDE_CONFIG_DIR for backward compatibility, then ~/.codebuddy.
 * Trailing separators are stripped; filesystem roots are preserved.
 */
export declare function getCodebuddyConfigDir(): string;
/** @deprecated Use getCodebuddyConfigDir instead */
export declare const getClaudeConfigDir: typeof getCodebuddyConfigDir;
//# sourceMappingURL=config-dir.d.ts.map