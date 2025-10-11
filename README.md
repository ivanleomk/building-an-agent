# Building An Agent

> Accompanying code for [Building An Agent](https://ivanleo.com/blog/building-an-agent) - implementing a coding agent in TypeScript.

This repository demonstrates how to build a functional AI coding agent. We go all the way from implementing a simple poc to a fully functional agent with advanced capabilities such as agentic search, subagents, todo-tasks and even memory.

Following Thorsten Ball's original [Go implementation](https://ampcode.com/how-to-build-an-agent), this TypeScript version shows how agents are just LLMs with the right tools in a conversation loop.

## What's Included

**Article 1**: [Building An Agent](https://ivanleo.com/blog/building-an-agent) - We build a complete coding agent in around 200 lines of TypeScript that can read, create, edit, and list files by giving Claude four simple tools with clear descriptions. The agent maintains conversation context and naturally combines tools to solve complex tasks like refactoring code or creating new projects. ([Commit `3c9b2c2`](https://github.com/ivanleomk/building-an-agent/commit/3c9b2c2))

**Article 2**: [Migrating to React Ink](https://ivanleo.com/blog/migrating-to-react-ink) - We migrate our basic coding agent to use React Ink for an interactive CLI with streaming responses and real-time updates. This enhances the user experience with a richer terminal interface while integrating file system tools for reading, writing, editing, and listing files. ([Commit `4e9f0ac`](https://github.com/ivanleomk/building-an-agent/commit/4e9f0ac))

**Article 3**: [Building an AI SDK](https://ivanleo.com/blog/building-an-ai-sdk) - We build a provider-agnostic abstraction layer that works with multiple AI providers (Anthropic, xAI, etc.). This makes our agent more flexible and easier to swap between different LLM providers. ([Commit `5446951`](https://github.com/ivanleomk/building-an-agent/commit/5446951))

**Article 4**: [Agentic Search](https://ivanleo.com/blog/agentic-search) - We extend our agent with powerful search capabilities including grep for code search, glob for file pattern matching, web search, and bash execution. This enables the agent to efficiently navigate large codebases and gather information from multiple sources. ([Commit `d2e0cbc`](https://github.com/ivanleomk/building-an-agent/commit/d2e0cbc))

## Getting Started

```bash
git clone https://github.com/ivanleomk/building-an-agent
cd building-an-agent
bun install
export ANTHROPIC_API_KEY="your-key-here"
bun agent.ts
```
