import { IDerivation, Document, SourceFromThreads } from 'flow/estuary/ai-poc/thread-summaries-v20230601.ts';
import { OpenAI } from "https://deno.land/x/openai@1.4.0/mod.ts";
import { pLimit } from "https://deno.land/x/p_limit@v1.0.0/mod.ts";

// TODO(johnny): Find a better way to thread this key into the derivation.
const openAIKey = "<replace with your OpenAI key>";
const openAI = new OpenAI(openAIKey);

// Async routine which rolls-up a source thread, prompts GPT for its summary,
// and then emits the source enriched with the rollup and completion (or error).
async function rollUpAndPrompt(doc: SourceFromThreads): Promise<Document> {
    // Build a human (and GPT!) accessible text rollup of the thread.
    const start = (new Date(doc.start_ts * 1000)).toISOString();
    const user_ids_seen: Record<string, boolean> = {};

    let rollup = doc.thread.map(msg => {
        const text = msg.text || "<image or attachment>";

        // Give GPT information to resolve @mentions within messages.
        // These appear with only the user id, such as "<@U0120UQMDE1> what do you think?".
        // So, upon the first message of a user in the chat, tell GPT of their user ID
        // "John Doe aka <@U0120UQMDE1>: sure sounds great!", and thereafter just use
        // their name to keep the token count down.
        if (!msg.user_name) {
            return `\t${msg.user_id}: ${text}`
        } else if (!user_ids_seen[msg.user_id]) {
            user_ids_seen[msg.user_id] = true;
            return `\t${msg.user_name} aka <@${msg.user_id}>: ${text}`
        } else {
            return `\t${msg.user_name}: ${text}`
        }
    }).join('\n');
    rollup = `Slack thread in #${doc.channel_name}, beginning ${start}:\n${rollup}`;

    const out : Document = {
        rollup: rollup,
        ...doc
    } as Document;

    // Prompt ChatGPT to summarize the thread.
    try {
        out.completion = await openAI.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [
                { "role": "user", "content": rollup },
                { "role": "user", "content": "Summarize into one terse sentence for a busy executive" },
            ],
        });
    } catch(error) {
        // TODO(johnny): This includes both terminal ("too many tokens") and
        // also retry-able ("rate limit exceeded") errors.
        out.error = (error as Error).message;
    }

    return out;
}

// We'll evaluate GPT completions with a small amount of parallelism.
const limiter = pLimit(3);

export class Derivation extends IDerivation {
    pending: Promise<Document>[];

    constructor(open: { state: unknown }) {
        super(open);
        this.pending = [];
    }

    // Transform each thread via a queued Promise which evaluates its roll-up and completion.
    fromThreads(read: { doc: SourceFromThreads }): Document[] {
        const doc = read.doc;

        // Filter threads which don't have a threaded response.
        if (doc.msg_count < 2) {
            return [];
        }
        this.pending.push(limiter(() => rollUpAndPrompt(doc)));
        return [];
    }

    // Await all previously-started completions and output them.
    async flush(): Promise<Document[]> {
        const out = [];
        for (const pending of this.pending) {
            out.push(await pending)
        }
        this.pending.length = 0; // Reset for next transaction.
        return out;
    }
}