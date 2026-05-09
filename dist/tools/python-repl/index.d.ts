/**
 * Python REPL Tool - Persistent Python execution environment
 *
 * Provides a persistent Python REPL with variable persistence across
 * tool invocations, session locking, and structured output markers.
 */
import { pythonReplHandler } from './tool.js';
export declare const pythonReplTool: {
    name: string;
    description: string;
    schema: import("zod/v3").ZodObject<{
        action: import("zod/v3").ZodEnum<["execute", "interrupt", "reset", "get_state"]>;
        researchSessionID: import("zod/v3").ZodString;
        code: import("zod/v3").ZodOptional<import("zod/v3").ZodString>;
        executionLabel: import("zod/v3").ZodOptional<import("zod/v3").ZodString>;
        executionTimeout: import("zod/v3").ZodDefault<import("zod/v3").ZodNumber>;
        queueTimeout: import("zod/v3").ZodDefault<import("zod/v3").ZodNumber>;
        projectDir: import("zod/v3").ZodOptional<import("zod/v3").ZodString>;
    }, "strip", import("zod/v3").ZodTypeAny, {
        action: "execute" | "interrupt" | "reset" | "get_state";
        researchSessionID: string;
        executionTimeout: number;
        queueTimeout: number;
        code?: string | undefined;
        executionLabel?: string | undefined;
        projectDir?: string | undefined;
    }, {
        action: "execute" | "interrupt" | "reset" | "get_state";
        researchSessionID: string;
        code?: string | undefined;
        executionLabel?: string | undefined;
        executionTimeout?: number | undefined;
        queueTimeout?: number | undefined;
        projectDir?: string | undefined;
    }>;
    handler: typeof pythonReplHandler;
};
export * from './types.js';
export { pythonReplSchema, pythonReplHandler } from './tool.js';
//# sourceMappingURL=index.d.ts.map