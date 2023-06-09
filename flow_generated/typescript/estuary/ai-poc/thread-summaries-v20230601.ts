
// Generated for published documents of derived collection estuary/ai-poc/thread-summaries-v20230601.
export type Document = {
    channel_id?: string;
    channel_name?: string | null;
    completion?: {
        choices?: {
            finish_reason?: string;
            index?: number;
            message?: {
                content?: string;
                role?: string;
            };
        }[];
        created?: number;
        id?: string;
        model?: string;
        object?: string;
        usage?: {
            completion_tokens?: number;
            prompt_tokens?: number;
            total_tokens?: number;
        };
    };
    end_ts?: number;
    error?: string;
    msg_count?: number;
    rollup?: string;
    start_ts?: number;
    thread?: {
        text?: string;
        ts?: number;
        user_id?: string;
        user_name?: string | null;
    }[];
    thread_id?: string;
};


// Generated for read documents of sourced collection estuary/ai-poc/slack-threads-v20230601.
export type SourceFromThreads = {
    channel_id: string;
    channel_name: string | null;
    end_ts: number;
    msg_count: number;
    start_ts: number;
    thread: {
        text: string;
        ts: number;
        user_id: string;
        user_name: string | null;
    }[];
    thread_id: string;
};


export abstract class IDerivation {
    // Construct a new Derivation instance from a Request.Open message.
    constructor(_open: { state: unknown }) { }

    // flush awaits any remaining documents to be published and returns them.
    // deno-lint-ignore require-await
    async flush(): Promise<Document[]> {
        return [];
    }

    // reset is called only when running catalog tests, and must reset any internal state.
    async reset() { }

    // startCommit is notified of a runtime commit in progress, and returns an optional
    // connector state update to be committed.
    startCommit(_startCommit: { runtimeCheckpoint: unknown }): { state?: { updated: unknown, mergePatch: boolean } } {
        return {};
    }

    abstract fromThreads(read: { doc: SourceFromThreads }): Document[];
}
