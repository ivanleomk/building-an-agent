# Building An Agent

> Accompanying code for [Building An Agent](https://ivanleo.com/blog/building-an-agent) - implementing a coding agent in TypeScript.

This repository demonstrates how to build a functional AI coding agent using Claude and the Anthropic API.

Following Thorsten Ball's original [Go implementation](https://ampcode.com/how-to-build-an-agent), this TypeScript version shows how agents are just LLMs with the right tools in a conversation loop.

## What's Included

**Article 1**: [Building An Agent](https://ivanleo.com/blog/building-an-agent) - We build a complete coding agent in under 300 lines of TypeScript that can read, create, edit, and list files by giving Claude four simple tools with clear descriptions. The agent maintains conversation context and naturally combines tools to solve complex tasks like refactoring code or creating new projects. ([Commit `3c9b2c2`](https://github.com/ivanleomk/building-an-agent/commit/3c9b2c2))

## Getting Started

```bash
git clone https://github.com/ivanleomk/building-an-agent
cd building-an-agent
bun install
export ANTHROPIC_API_KEY="your-key-here"
bun agent.ts
```
