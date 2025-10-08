import {
	ContentBlock,
	ConversationItem,
	Message,
	Provider,
	ProviderEvent,
	Tool,
	ToolSchema,
} from '../lib/types.js';
import OpenAI from 'openai';
import {z} from 'zod';

export class XAIProvider implements Provider {
	client: OpenAI;
	defaultModel: string;
	maxTokens: number;
	private currentContentBlockIndex = 0;
	private priorContentBlockType: 'tool_call' | 'reasoning' | 'text' | undefined;

	constructor(config: {
		apiKey?: string;
		baseURL?: string;
		defaultModel?: string;
		maxTokens?: number;
	}) {
		this.client = new OpenAI({
			apiKey: config.apiKey || process.env['XAI_API_KEY'],
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
		const messages = conversation.map(this.fromConversationItem);

		this.currentContentBlockIndex = 0;
		this.priorContentBlockType = undefined;

		const stream = await this.client.chat.completions.create({
			model: model || this.defaultModel,
			max_tokens: this.maxTokens,
			messages,
			stream: true,
			...(tools && {tools: tools.map(this.toOpenAITool)}),
		});

		yield {type: 'start_message', role: 'assistant'};

		for await (const chunk of stream) {
			yield* this.handleStreamChunk(chunk);
		}

		yield {type: 'end_message'};
	}

	private *handleStreamChunk(
		chunk: OpenAI.Chat.Completions.ChatCompletionChunk,
	): Generator<ProviderEvent> {
		// Remove Redundant chunks
		if (!chunk.choices || chunk.choices.length === 0) return;

		if (!chunk.choices[0]?.delta) return;

		const delta = chunk.choices[0].delta;

		if (Object.keys(delta).length == 0) return;

		if (delta.content) {
			if (
				this.priorContentBlockType != 'text' &&
				this.priorContentBlockType != undefined
			) {
				this.currentContentBlockIndex++;
			}
			this.priorContentBlockType = 'text';
			yield {
				type: 'content_delta',
				index: this.currentContentBlockIndex,
				input_type: 'text',
				delta: delta.content,
			};
		}

		if ('reasoning_content' in delta && delta.reasoning_content) {
			if (
				this.priorContentBlockType != 'reasoning' &&
				this.priorContentBlockType != undefined
			) {
				this.currentContentBlockIndex++;
			}
			this.priorContentBlockType = 'reasoning';
			yield {
				type: 'content_delta',
				index: this.currentContentBlockIndex,
				input_type: 'reasoning',
				delta: delta.reasoning_content as string,
			};
		}

		if ('tool_calls' in delta && delta.tool_calls) {
			if (
				this.priorContentBlockType != 'tool_call' &&
				this.priorContentBlockType != undefined
			) {
				this.currentContentBlockIndex++;
			}
			this.priorContentBlockType = 'tool_call';

			for (const toolCall of delta.tool_calls) {
				yield {
					type: 'tool_call_start',
					index: this.currentContentBlockIndex,
					id: toolCall.id as string,
					name: toolCall.function?.name as string,
				};

				yield {
					type: 'tool_call_delta',
					index: this.currentContentBlockIndex,
					argsDelta: toolCall.function?.arguments as string,
				};

				yield {
					type: 'content_block_end',
					index: this.currentContentBlockIndex,
				};
			}
		}

		// console.log(JSON.stringify(chunk, null, 2));
	}

	private toOpenAITool = (
		tool: ToolSchema,
	): OpenAI.Chat.ChatCompletionTool => ({
		type: 'function',
		function: {
			parameters: z.toJSONSchema(tool.input_schema),
			name: tool.name,
			description: tool.description,
		},
	});

	private fromConversationItem = (
		block: ConversationItem,
	): OpenAI.ChatCompletionMessageParam => {
		if (block.type === 'message') {
			return this.fromMessageBlock(block);
		}
		return this.fromToolBlock(block);
	};

	private fromToolBlock = (
		block: Tool,
	): OpenAI.ChatCompletionToolMessageParam => {
		return {
			role: 'tool',
			content: block.output
				.filter(item => item.type == 'text')
				.map(
					item =>
						this.fromContentBlock(item) as OpenAI.ChatCompletionContentPartText,
				),
			tool_call_id: block.tool_id,
		};
	};

	private fromMessageBlock = (
		message: Message,
	): OpenAI.ChatCompletionMessageParam => {
		if (message.role == 'user') {
			return {
				role: 'user',
				content: message.content.map(
					item =>
						this.fromContentBlock(item) as OpenAI.ChatCompletionContentPart,
				),
			};
		}

		const toolCalls = message.content.filter(item => item.type == 'tool_call');
		const textResponse = message.content.filter(item => item.type === 'text');

		return {
			role: 'assistant',
			content: textResponse.map(
				item =>
					this.fromContentBlock(item) as OpenAI.ChatCompletionContentPartText,
			),
			tool_calls: toolCalls.map(
				item =>
					this.fromContentBlock(item) as OpenAI.ChatCompletionMessageToolCall,
			),
		};
	};

	private fromContentBlock = (
		block: ContentBlock,
	):
		| OpenAI.ChatCompletionContentPart
		| OpenAI.ChatCompletionMessageToolCall => {
		switch (block.type) {
			case 'reasoning':
			case 'text':
				return {
					type: 'text',
					text: block.text,
				};
			case 'image':
				{
					if (block.source.type === 'base64') {
						return {
							type: 'image_url',
							image_url: {
								url: block.source.data,
							},
						};
					}
				}

				return {
					type: 'image_url',
					image_url: {
						url: block.source.url,
					},
				};

			case 'tool_call': {
				return {
					id: block.tool_id,
					type: 'function',
					function: {
						arguments: JSON.stringify(block.args),
						name: block.name,
					},
				};
			}
		}
	};
}
