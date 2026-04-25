# clawpipe-ai

> The only AI gateway SDK that skips LLM calls entirely.

[![npm version](https://img.shields.io/npm/v/clawpipe-ai)](https://www.npmjs.com/package/clawpipe-ai)
[![license: MIT](https://img.shields.io/badge/license-MIT-yellow)](./LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/clawpipe-ai)](https://bundlephobia.com/package/clawpipe-ai)

ClawPipe is an LLM pipeline that sits between your app and providers. The
**Booster** stage answers deterministic prompts (math, regex, dates, hashes,
JSON shaping, ~200 rules) with zero LLM tokens — sub-millisecond, free.
Everything else flows through context packing, prompt cache, smart routing,
multi-provider gateway, and a self-learning router that gets cheaper over time.

Drop it in front of your existing OpenAI or Anthropic code and cut spend
30-50% without changing application logic.

## Quick start

```bash
npm install clawpipe-ai
```

```ts
import { ClawPipe } from 'clawpipe-ai';

const pipe = new ClawPipe({
  apiKey: process.env.CLAWPIPE_API_KEY!,
  projectId: 'proj_xxx',
});

const result = await pipe.prompt('What is 2 + 2?');
console.log(result.text);  // "4"
console.log(result.meta);  // { boosted: true, cached: false, tokensIn: 0, ... }
```

The Booster answered locally — zero tokens, zero latency, zero cost. Try a
non-deterministic prompt (`pipe.prompt('Write a haiku about TypeScript')`) and
the pipeline routes it to the cheapest viable model that meets your quality
target.

## Pipeline stages

| Stage      | What it does                                                  |
|------------|---------------------------------------------------------------|
| Booster    | Deterministic transforms — skip LLM calls entirely.           |
| Packer     | Compress context to reduce tokens before send.                |
| Cache      | Hash-based prompt dedup (local + remote KV).                  |
| Router     | Cost / quality / latency-aware model selection.               |
| Gateway    | Multi-provider dispatch with failover and circuit breaking.   |
| Learner    | Tracks outcomes, refines routing weights per task type.       |

Every stage is independently toggleable in the `ClawPipe` config.

## Supported providers

ai21, anthropic, azure-openai, bedrock, cerebras, cohere, databricks, deepseek,
fireworks, gemini, groq, huggingface, mistral, openai, openrouter, perplexity,
replicate, together, vertex, writer, xai.

Drop-in compat layers for OpenAI (`clawpipe-ai/openai-compat`) and Anthropic
(`clawpipe-ai/anthropic-compat`) so existing code keeps working.

## Open source SDK + paid hosted service

This SDK is MIT-licensed and free to use. The hosted gateway at
[`clawpipe.ai`](https://clawpipe.ai) — which provides the multi-provider
dispatch, distributed cache, learner weights, and analytics — is operated by
ClawPipe and billed via LemonSqueezy. You can self-host the gateway from this
SDK if you prefer; the hosted service exists so you don't have to.

## Links

- Docs: [docs.clawpipe.ai](https://docs.clawpipe.ai)
- Benchmarks: [clawpipe.ai/benchmarks](https://clawpipe.ai/benchmarks)
- Sign up: [app.clawpipe.ai/signup](https://app.clawpipe.ai/signup)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). All contributions are governed by
our [Code of Conduct](./CODE_OF_CONDUCT.md).

## License

MIT — see [LICENSE](./LICENSE).
