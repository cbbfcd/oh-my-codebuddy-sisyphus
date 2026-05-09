/**
 * Validate that a config path is under the user's home directory
 * and contains a trusted subpath (Claude config dir or ~/.omc/).
 * Resolves the path first to defeat traversal attacks like ~/foo/.codebuddy/../../evil.json.
 */
export declare function validateConfigPath(configPath: string, homeDir: string, claudeConfigDir: string): boolean;
//# sourceMappingURL=bridge-entry.d.ts.map