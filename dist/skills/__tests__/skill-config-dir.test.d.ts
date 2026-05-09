/**
 * Regression test: skill markdown files must use CODEBUDDY_CONFIG_DIR
 *
 * Ensures that bash code blocks in skill files never hardcode $HOME/.claude
 * without a ${CODEBUDDY_CONFIG_DIR:-...} fallback. This prevents skills from
 * ignoring the user's custom config directory.
 */
export {};
//# sourceMappingURL=skill-config-dir.test.d.ts.map