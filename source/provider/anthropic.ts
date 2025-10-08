import {
	ContentBlock,
	ConversationItem,
	Message,
	Provider,
	ProviderEvent,
	Tool,
	ToolSchema,
} from '../lib/types.js';
import Anthropic from '@anthropic-ai/sdk';
import {z} from 'zod';
import {appendFileSync} from 'node:fs';

export class AnthropicProvider implements Provider {
	client: Anthropic;
	defaultModel: string;
	maxTokens: number;
	reasoningBudget?: number;

	constructor(config: {
		apiKey?: string;
		defaultModel?: string;
		maxTokens?: number;
		reasoningBudget?: number;
	}) {
		this.client = new Anthropic({
			apiKey: config.apiKey || process.env['ANTHROPIC_API_KEY'],
		});
		this.defaultModel = config.defaultModel || 'claude-3-5-sonnet-20241022';
		this.maxTokens = config.maxTokens || 4096;
		this.reasoningBudget = config.reasoningBudget;
	}

	async *complete(
		conversation: ConversationItem[],
		model?: string,
		tools?: ToolSchema[],
	): AsyncGenerator<ProviderEvent> {
		const messages = this.toAnthropicMessages(conversation);

		const stream = await this.client.messages.stream({
			model: model || this.defaultModel,
			max_tokens: this.maxTokens,
			messages,
			...(tools && {tools: tools.map(this.toAnthropicTool)}),
			...(this.reasoningBudget && {
				thinking: {
					type: 'enabled',
					budget_tokens: this.reasoningBudget,
				},
			}),
		});

		const startEvent = {
			type: 'START_MESSAGE' as const,
			role: 'assistant' as const,
		};
		appendFileSync('anthropic_events.jsonl', JSON.stringify(startEvent) + '\n');
		yield startEvent;

		for await (const chunk of stream) {
			appendFileSync('anthropic_events.jsonl', JSON.stringify(chunk) + '\n');
			for (const event of this.handleStreamChunk(chunk)) {
				yield event;
			}
		}

		const endEvent = {type: 'END_MESSAGE' as const};
		appendFileSync('anthropic_events.jsonl', JSON.stringify(endEvent) + '\n');
		yield endEvent;
	}

	private *handleStreamChunk(
		chunk: Anthropic.MessageStreamEvent,
	): Generator<ProviderEvent> {
		switch (chunk.type) {
			case 'content_block_start':
				if (chunk.content_block.type === 'text') {
					yield {
						type: 'ADD_CONTENT_BLOCK',
						index: chunk.index,
						block: {type: 'text', text: ''},
					};
				} else if (chunk.content_block.type === 'tool_use') {
					yield {
						type: 'ADD_CONTENT_BLOCK',
						index: chunk.index,
						block: {
							type: 'tool_call',
							tool_id: chunk.content_block.id,
							name: chunk.content_block.name,
							args: '',
						},
					};
				} else if (chunk.content_block.type === 'thinking') {
					yield {
						type: 'ADD_CONTENT_BLOCK',
						index: chunk.index,
						block: {type: 'reasoning', text: ''},
					};
				}
				break;

			case 'content_block_delta':
				if (chunk.delta.type === 'text_delta') {
					yield {
						type: 'UPDATE_CONTENT_BLOCK',
						index: chunk.index,
						delta: chunk.delta.text,
					};
				} else if (chunk.delta.type === 'input_json_delta') {
					yield {
						type: 'UPDATE_CONTENT_BLOCK',
						index: chunk.index,
						delta: chunk.delta.partial_json,
					};
				} else if (chunk.delta.type === 'thinking_delta') {
					yield {
						type: 'UPDATE_CONTENT_BLOCK',
						index: chunk.index,
						delta: chunk.delta.thinking,
					};
				} else if (chunk.delta.type === 'signature_delta') {
					yield {
						type: 'UPDATE_CONTENT_BLOCK_METADATA',
						index: chunk.index,
						key: 'signature',
						value: chunk.delta.signature,
					};
				}
				break;

			case 'content_block_stop':
				yield {
					type: 'UPDATE_CONTENT_BLOCK',
					index: chunk.index,
					final: true,
				};
				break;
		}
	}

	private toAnthropicTool = (tool: ToolSchema): Anthropic.Tool => ({
		name: tool.name,
		description: tool.description,
		//@ts-ignore
		input_schema: z.toJSONSchema(tool.input_schema),
	});

	private toAnthropicMessages(
		conversation: ConversationItem[],
	): Anthropic.MessageParam[] {
		const messages: Anthropic.MessageParam[] = [];

		for (const item of conversation) {
			if (item.type === 'message') {
				messages.push(this.fromMessageBlock(item));
			} else {
				messages.push(this.fromToolBlock(item));
			}
		}

		return messages;
	}

	private fromToolBlock = (block: Tool): Anthropic.MessageParam => {
		return {
			role: 'user',
			content: [
				{
					type: 'tool_result',
					tool_use_id: block.tool_id,
					content: block.output
						.filter(item => item.type === 'text')
						.map(item => (item.type === 'text' ? item.text : ''))
						.join('\n'),
				},
			],
		};
	};

	private fromMessageBlock = (message: Message): Anthropic.MessageParam => {
		const content: Anthropic.ContentBlockParam[] = [];

		for (const block of message.content) {
			const converted = this.fromContentBlock(block);
			if (converted) {
				content.push(converted);
			}
		}

		return {
			role: message.role === 'user' ? 'user' : 'assistant',
			content,
		};
	};

	private fromContentBlock = (
		block: ContentBlock,
	): Anthropic.ContentBlockParam | null => {
		switch (block.type) {
			case 'text':
				return {
					type: 'text',
					text: block.text,
					citations: null,
				};
			case 'reasoning':
				if (!block.signature) return null;
				return {
					type: 'thinking',
					thinking: block.text,
					signature: block.signature,
				};
			case 'image':
				if (block.source.type === 'base64') {
					return {
						type: 'image',
						source: {
							type: 'base64',
							media_type: block.source.mimeType,
							data: block.source.data,
						},
					};
				}
				return {
					type: 'image',
					source: {
						type: 'url',
						url: block.source.url,
					},
				};
			case 'tool_call':
				return {
					type: 'tool_use',
					id: block.tool_id,
					name: block.name,
					input: block.args,
				};
			default:
				return null;
		}
	};
}
