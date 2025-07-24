# Building An Agent

> Accompanying code for [Building An Agent](https://ivanleo.com/blog/building-an-agent) - implementing a coding agent in TypeScript.

This repository demonstrates how to build a functional AI coding agent using Claude and the Anthropic API.

Following Thorsten Ball's original [Go implementation](https://ampcode.com/how-to-build-an-agent), this TypeScript version shows how agents are just LLMs with the right tools in a conversation loop.

## What's Included

**Article 1**: [Building An Agent](https://ivanleo.com/blog/building-an-agent) - We build a complete coding agent in around 200 lines of TypeScript that can read, create, edit, and list files by giving Claude four simple tools with clear descriptions. The agent maintains conversation context and naturally combines tools to solve complex tasks like refactoring code or creating new projects. ([Commit `3c9b2c2`](https://github.com/ivanleomk/building-an-agent/commit/3c9b2c2))

**Article 2**: [Migrating to React Ink](https://ivanleo.com/blog/migrating-to-react-ink) - We migrate our basic coding agent to use React Ink for an interactive CLI with streaming responses and real-time updates. This enhances the user experience with a richer terminal interface while integrating file system tools for reading, writing, editing, and listing files. ([Commit `4e9f0ac`](https://github.com/ivanleomk/building-an-agent/commit/4e9f0ac))

**Article 3**: Agentic Search : This is on the way! We show how to use things like grep and glob to search for files and code in the agent's file system so that our model can find relevant information quickly and efficiently.

## Getting Started

```bash
git clone https://github.com/ivanleomk/building-an-agent
cd building-an-agent
bun install
export ANTHROPIC_API_KEY="your-key-here"
bun agent.ts
```
