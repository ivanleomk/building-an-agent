import {z} from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import fs from 'fs';

// Types

interface Provider {
	complete(
		conversation: ConversationItem[],
		model?: string,
		tools?: ToolSchema[],
	): AsyncGenerator<ProviderEvent>;
}

type ContentBlock =
	| {type: 'text'; text: string}
	| {
			type: 'image';
			source:
				| {
						type: 'base64';
						data: string;
						mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
				  }
				| {type: 'url'; url: string};
	  }
	| {
			type: 'tool_call';
			tool_id: string;
			name: string;
			args: Record<string, any> | string;
	  };

type Message = {
	type: 'message';
	role: 'assistant' | 'user';
	content: ContentBlock[];
};

type Tool = {
	type: 'tool';
	tool_id: string;
	name: 'read_file';
	args: z.infer<typeof readFileArgsSchema>;
	output: ContentBlock[];
	status: 'pending' | 'success' | 'error';
};

type ConversationItem = Message | Tool;

type ProviderEvent =
	| {type: 'start_message'; role: 'assistant' | 'user'}
	| {type: 'content_delta'; delta: string; index: number; input_type: 'text'}
	| {type: 'tool_call_start'; index: number; id: string; name: string}
	| {type: 'tool_call_delta'; index: number; argsDelta: string}
	| {type: 'content_block_end'; index: number}
	| {type: 'end_message'}
	| {type: 'add_tool_result'; tool: Tool}
	| {type: 'error'; message: string};

type ToolSchema = {
	name: string;
	description: string;
	input_schema: z.ZodType<any>;
	execute: (args: any) => Promise<any>;
};

// Tools

const readFileArgsSchema = z.object({
	paths: z.array(z.string()),
});

const TOOLS: ToolSchema[] = [
	{
		name: 'read_file',
		description: 'Reads a file and returns its contents.',
		input_schema: readFileArgsSchema,
		execute: async args => {
			return args.paths.map(path => ({
				type: 'text',
				text: fs.readFileSync(path, 'utf8'),
			}));
		},
	},
];

// Providers

class AnthropicProvider implements Provider {
	client: Anthropic;
	defaultModel: string;
	maxTokens: number;

	constructor(
		client: Anthropic,
		defaultModel = 'claude-3-5-sonnet-20241022',
		maxTokens = 8096,
	) {
		this.client = client;
		this.defaultModel = defaultModel;
		this.maxTokens = maxTokens;
	}

	async *complete(
		conversation: ConversationItem[],
		model?: string,
		tools?: ToolSchema[],
	): AsyncGenerator<ProviderEvent> {
		const messages = conversation.map(item => this.toMessageParam(item));

		const stream = await this.client.messages.create({
			model: model || this.defaultModel,
			max_tokens: this.maxTokens,
			messages,
			stream: true,
			...(tools && {tools: tools.map(this.toAnthropicTool)}),
		});

		yield {type: 'start_message', role: 'assistant'};

		for await (const event of stream) {
			yield* this.handleStreamEvent(event);
		}

		yield {type: 'end_message'};
	}

	private *handleStreamEvent(
		event: Anthropic.MessageStreamEvent,
	): Generator<ProviderEvent> {
		switch (event.type) {
			case 'content_block_start':
				if (event.content_block.type === 'text') {
					yield {
						type: 'content_delta',
						index: 0,
						delta: event.content_block.text,
						input_type: 'text',
					};
				} else if (event.content_block.type === 'tool_use') {
					yield {
						type: 'tool_call_start',
						index: event.index,
						id: event.content_block.id,
						name: event.content_block.name,
					};
				}
				break;

			case 'content_block_delta':
				if (event.delta.type === 'text_delta') {
					yield {
						type: 'content_delta',
						index: 0,
						delta: event.delta.text,
						input_type: 'text',
					};
				} else if (event.delta.type === 'input_json_delta') {
					yield {
						type: 'tool_call_delta',
						index: event.index,
						argsDelta: event.delta.partial_json,
					};
				}
				break;

			case 'content_block_stop':
				yield {type: 'content_block_end', index: event.index};
				break;
		}
	}

	private toMessageParam(item: ConversationItem): Anthropic.MessageParam {
		if (item.type === 'message') {
			return {
				role: item.role,
				content: item.content.map(this.toAnthropicBlock),
			};
		}

		return {
			role: 'user',
			content: [
				{
					type: 'tool_result',
					tool_use_id: item.tool_id,
					content: item.output
						.filter(block => block.type !== 'tool_call')
						.map(this.toAnthropicBlock) as (
						| Anthropic.TextBlockParam
						| Anthropic.ImageBlockParam
					)[],
					...(item.status === 'error' && {is_error: true}),
				},
			],
		};
	}

	private toAnthropicBlock = (
		block: ContentBlock,
	):
		| Anthropic.TextBlockParam
		| Anthropic.ImageBlockParam
		| Anthropic.ToolUseBlockParam => {
		switch (block.type) {
			case 'text':
				return {type: 'text', text: block.text};

			case 'image':
				return {
					type: 'image',
					source:
						block.source.type === 'base64'
							? {
									type: 'base64',
									data: block.source.data,
									media_type: block.source.mimeType,
							  }
							: {type: 'url', url: block.source.url},
				};

			case 'tool_call':
				return {
					type: 'tool_use',
					id: block.tool_id,
					name: block.name,
					input: block.args,
				};
		}
	};

	private toAnthropicTool = (tool: ToolSchema): Anthropic.Tool => ({
		name: tool.name,
		description: tool.description,
		// @ts-ignore
		input_schema: z.toJSONSchema(tool.input_schema),
	});
}

class XAIProvider implements Provider {
	client: OpenAI;
	defaultModel: string;
	maxTokens: number;

	constructor(config: {
		apiKey?: string;
		baseURL?: string;
		defaultModel?: string;
		maxTokens?: number;
	}) {
		this.client = new OpenAI({
			apiKey: config.apiKey || process.env.OPENAI_API_KEY,
			baseURL: config.baseURL,
		});
		this.defaultModel = config.defaultModel || 'gpt-4o';
		this.maxTokens = config.maxTokens || 4096;
	}

	async *complete(
		conversation: ConversationItem[],
		model?: string,
		tools?: ToolSchema[],
	): AsyncGenerator<ProviderEvent> {
		const messages = conversation.map(item => this.toMessageParam(item));

		const stream = await this.client.chat.completions.create({
			model: model || this.defaultModel,
			max_tokens: this.maxTokens,
			messages,
			stream: true,
			...(tools && {tools: tools.map(this.toOpenAITool)}),
		});

		yield {type: 'start_message', role: 'assistant'};

		let currentToolCallId: string | null = null;

		for await (const chunk of stream) {
			const delta = chunk.choices[0]?.delta;
			if (!delta) continue;

			if (delta.reasoning_content) {
				yield {
					type: 'content_delta',
					delta: delta.reasoning_content,
					index: 0,
					input_type: 'text',
				};
			}

			if (delta.content) {
				yield {
					type: 'content_delta',
					index: 0,
					delta: delta.content,
					input_type: 'text',
				};
			}

			if (delta.tool_calls?.[0]) {
				const toolCall = delta.tool_calls[0];

				if (toolCall.id) {
					currentToolCallId = toolCall.id;
					yield {
						type: 'tool_call_start',
						index: 1,
						id: toolCall.id,
						name: toolCall.function?.name || '',
					};
				}

				if (toolCall.function?.arguments) {
					yield {
						type: 'tool_call_delta',
						index: 1,
						argsDelta: toolCall.function.arguments,
					};
				}
			}
		}

		if (currentToolCallId) {
			yield {type: 'content_block_end', index: 1};
		}

		yield {type: 'end_message'};
	}

	private toMessageParam(
		item: ConversationItem,
	): OpenAI.ChatCompletionMessageParam {
		if (item.type === 'message') {
			const textContent = item.content
				.filter(
					(block): block is Extract<ContentBlock, {type: 'text'}> =>
						block.type === 'text',
				)
				.map(block => block.text)
				.join('');

			const toolCalls = item.content
				.filter(
					(block): block is Extract<ContentBlock, {type: 'tool_call'}> =>
						block.type === 'tool_call',
				)
				.map(block => ({
					id: block.tool_id,
					type: 'function' as const,
					function: {
						name: block.name,
						arguments:
							typeof block.args === 'string'
								? block.args
								: JSON.stringify(block.args),
					},
				}));

			if (item.role === 'assistant' && toolCalls.length > 0) {
				return {
					role: 'assistant',
					content: textContent || null,
					tool_calls: toolCalls,
				};
			}

			return {
				role: item.role,
				content: textContent,
			};
		}

		return {
			role: 'tool',
			tool_call_id: item.tool_id,
			content: item.output
				.filter(
					(block): block is Extract<ContentBlock, {type: 'text'}> =>
						block.type === 'text',
				)
				.map(block => block.text)
				.join('\n'),
		};
	}

	private toOpenAITool = (tool: ToolSchema): OpenAI.ChatCompletionTool => ({
		type: 'function',
		function: {
			name: tool.name,
			description: tool.description,
			// @ts-ignore
			parameters: z.toJSONSchema(tool.input_schema),
		},
	});
}

// Agent

class Agent {
	conversation: ConversationItem[];
	provider: Provider;

	constructor(provider: Provider, initialState: ConversationItem[] = []) {
		this.conversation = initialState;
		this.provider = provider;
	}

	async run(userInput: string) {
		this.addUserMessage(userInput);

		while (await this.processNextTurn()) {
			// Continue until no more tools to execute
		}

		console.log(JSON.stringify(this.conversation, null, 2));
	}

	private addUserMessage(text: string) {
		this.conversation.push({
			type: 'message',
			role: 'user',
			content: [{type: 'text', text}],
		});
	}

	private async processNextTurn(): Promise<boolean> {
		for await (const event of this.provider.complete(
			this.conversation,
			undefined,
			TOOLS,
		)) {
			this.handleEvent(event);
		}

		return this.executeTools();
	}

	private async executeTools(): Promise<boolean> {
		const toolCalls = this.getPendingToolCalls();
		if (toolCalls.length === 0) return false;

		for (const toolCall of toolCalls) {
			await this.executeTool(toolCall);
		}

		return true;
	}

	private getPendingToolCalls() {
		const lastItem = this.conversation[this.conversation.length - 1];
		if (lastItem?.type !== 'message' || lastItem.role !== 'assistant') {
			return [];
		}

		return lastItem.content.filter(
			(block): block is Extract<ContentBlock, {type: 'tool_call'}> =>
				block.type === 'tool_call',
		);
	}

	private async executeTool(
		toolCall: Extract<ContentBlock, {type: 'tool_call'}>,
	) {
		const tool = TOOLS.find(t => t.name === toolCall.name);

		if (!tool) {
			this.addToolResult(
				toolCall,
				[{type: 'text', text: `Tool ${toolCall.name} not found`}],
				'error',
			);
			return;
		}

		try {
			const validatedArgs = tool.input_schema.parse(toolCall.args);
			const output = await tool.execute(validatedArgs);
			this.addToolResult(toolCall, output, 'success');
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			this.addToolResult(
				toolCall,
				[{type: 'text', text: `Error: ${errorMessage}`}],
				'error',
			);
		}
	}

	private addToolResult(
		toolCall: Extract<ContentBlock, {type: 'tool_call'}>,
		output: ContentBlock[],
		status: 'success' | 'error',
	) {
		this.conversation.push({
			type: 'tool',
			tool_id: toolCall.tool_id,
			name: toolCall.name as 'read_file',
			args: toolCall.args as any,
			output,
			status,
		});
	}

	private handleEvent(event: ProviderEvent) {
		console.log(event);
		switch (event.type) {
			case 'start_message':
				this.handleStartMessage(event);
				break;
			case 'content_delta':
				this.handleContentDelta(event);
				break;
			case 'tool_call_start':
				this.handleToolCallStart(event);
				break;
			case 'tool_call_delta':
				this.handleToolCallDelta(event);
				break;
			case 'content_block_end':
				this.handleContentBlockEnd(event);
				break;
			case 'end_message':
				break;
			default:
				console.log(event);
		}
	}

	private handleStartMessage(
		event: Extract<ProviderEvent, {type: 'start_message'}>,
	) {
		this.conversation.push({
			type: 'message',
			role: event.role,
			content: [],
		});
	}

	private handleContentDelta(
		event: Extract<ProviderEvent, {type: 'content_delta'}>,
	) {
		const message = this.getLastMessage();
		if (!message) return;

		this.ensureContentBlockExists(message, event.index, {
			type: 'text',
			text: '',
		});

		const block = message.content[event.index];
		if (block?.type === 'text') {
			block.text += event.delta;
		}
	}

	private handleToolCallStart(
		event: Extract<ProviderEvent, {type: 'tool_call_start'}>,
	) {
		const message = this.getLastMessage();
		if (!message) return;

		this.ensureContentBlockExists(message, event.index, {
			type: 'tool_call',
			tool_id: event.id,
			name: event.name,
			args: '',
		});
	}

	private handleToolCallDelta(
		event: Extract<ProviderEvent, {type: 'tool_call_delta'}>,
	) {
		const message = this.getLastMessage();
		if (!message) return;

		const block = message.content[event.index];
		if (block?.type === 'tool_call' && typeof block.args === 'string') {
			block.args += event.argsDelta;
		}
	}

	private handleContentBlockEnd(
		event: Extract<ProviderEvent, {type: 'content_block_end'}>,
	) {
		const message = this.getLastMessage();
		if (!message) return;

		const block = message.content[event.index];
		if (block?.type === 'tool_call' && typeof block.args === 'string') {
			block.args = JSON.parse(block.args);
		}
	}

	private getLastMessage(): Message | null {
		const lastItem = this.conversation[this.conversation.length - 1];
		return lastItem?.type === 'message' ? lastItem : null;
	}

	private ensureContentBlockExists(
		message: Message,
		index: number,
		defaultBlock: ContentBlock,
	) {
		if (message.content.length !== index + 1) {
			message.content.push(defaultBlock);
		}
	}
}

// Main

async function main() {
	// Example with Anthropic
	// const provider = new AnthropicProvider(
	// 	new Anthropic(),
	// 	'claude-3-7-sonnet-latest',
	// 	8096,
	// );

	// Example with XAI (OpenAI-compatible)
	const provider = new XAIProvider({
		baseURL: 'https://api.x.ai/v1',
		apiKey: process.env.XAI_API_KEY,
		defaultModel: 'grok-code-fast-1',
		maxTokens: 4096,
	});

	const agent = new Agent(provider);
	await agent.run('Can you read index.ts for me?');

	// for await (const event of provider.complete(
	// 	[
	// 		{
	// 			type: 'message',
	// 			role: 'user',
	// 			content: [
	// 				{
	// 					type: 'text',
	// 					text: 'Can you read index.ts for me?',
	// 				},
	// 			],
	// 		},
	// 	],
	// 	undefined,
	// 	TOOLS,
	// )) {
	// 	console.log(JSON.stringify(event, null, 2));
	// }
}

main();
