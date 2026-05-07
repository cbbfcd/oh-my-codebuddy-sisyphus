/**
 * SDK Compatibility Shim
 *
 * Provides thin wrappers around `createSdkMcpServer` and `tool` that were
 * previously imported from the Claude Agent SDK.
 *
 * The @tencent-ai/agent-sdk is expected to expose the same API surface.
 * If the import fails at runtime, the shim falls back to a no-op placeholder
 * so that the rest of the server module can still be imported and inspected
 * without crashing (useful for tests or environments without the full SDK).
 */

// Attempt to load from the new CodeBuddy SDK.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _createSdkMcpServer: (...args: any[]) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _tool: (...args: any[]) => any;

try {
  // Dynamic require so TypeScript doesn't error on a package that may not have
  // type declarations installed yet.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sdk = require('@tencent-ai/agent-sdk');
  _createSdkMcpServer = sdk.createSdkMcpServer;
  _tool = sdk.tool;
} catch {
  // Fallback stubs — allow the module to load even if the SDK is not installed.
  // In production the real SDK must be present; this path exists only for CI
  // lint/type-check passes that don't install the private registry package.
  _tool = (
    _name: string,
    _description: string,
    _schema: unknown,
    handler: (...args: unknown[]) => unknown
  ) => ({ _name, _description, _schema, handler });

  _createSdkMcpServer = (config: { name: string; version: string; tools: unknown[] }) => ({
    ...config,
    _isStub: true,
  });
}

export const createSdkMcpServer = _createSdkMcpServer;
export const tool = _tool;
