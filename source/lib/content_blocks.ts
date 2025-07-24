import Anthropic from '@anthropic-ai/sdk';
import {z} from 'zod';

export const create_content_block = (
	content_block: Anthropic.RawContentBlockStartEvent,
): Anthropic.MessageParam => {
	if (content_block.content_block.type == 'text') {
		return {
			role: 'assistant',
			content: '',
		};
	}

	if (content_block.content_block.type == 'tool_use') {
		return {
			role: 'assistant',
			content: [
				{
					type: 'tool_use',
					id: content_block.content_block.id,
					input: '',
					name: content_block.content_block.name,
				},
			],
		};
	}

	throw new Error(
		`Unknown content block type: ${content_block.content_block.type}`,
	);
};

export const handle_content_delta = (
	chunk: Anthropic.RawContentBlockDeltaEvent,
	current_messages: Anthropic.MessageParam[],
): Anthropic.MessageParam[] => {
	if (chunk.delta.type == 'text_delta') {
		const newContent = chunk.delta.text;
		return current_messages.map((message, index) => {
			if (index != current_messages.length - 1) {
				return message;
			}

			return {
				...message,
				content: message.content + newContent,
			};
		});
	}

	if (chunk.delta.type == 'input_json_delta') {
		const newContent = chunk.delta.partial_json;
		return current_messages.map((message, index) => {
			if (index != current_messages.length - 1) {
				return message;
			}

			const tool_use = message.content[0] as Anthropic.ToolUseBlockParam;

			return {
				...message,
				content: [
					{
						...tool_use,
						input: tool_use.input + newContent,
					},
				],
			};
		});
	}

	throw new Error(`Unknown content block delta type: ${chunk.delta.type}`);
};

export const handle_content_end = async (
	current_messages: Anthropic.MessageParam[],
	tool_definitions: {
		name: string;
		description: string;
		args: z.ZodObject<any>;
		execute: (args: any) => Promise<string>;
	}[],
): Promise<Anthropic.MessageParam[]> => {
	const last_message = current_messages[current_messages.length - 1];
	// We want to check if the last message is a tool use
	if (!Array.isArray(last_message?.content)) {
		return current_messages;
	}

	const tool_use = last_message.content[0] as Anthropic.ToolUseBlockParam;

	const tool_definition = tool_definitions.find(
		tool => tool.name == tool_use.name,
	);

	if (!tool_definition) {
		return [
			...current_messages,
			{
				role: 'user',
				content: `Error: Tool ${tool_use.name} not found`,
			},
		];
	}

	// Validate that the tool use is valid
	const result = tool_definition?.args.safeParse(
		JSON.parse(tool_use.input as string),
	);
	if (!result?.success) {
		return [
			...current_messages,
			{
				role: 'user',
				content: `Error: Invalid tool use: ${result?.error?.message}`,
			},
		];
	}

	const args = result.data;
	const tool_use_invocation = await tool_definition.execute(args);

	return [
		...current_messages.slice(0, -1),
		{
			role: 'assistant',
			content: [
				{
					...tool_use,
					input: args,
				},
			],
		},
		{
			role: 'user',
			content: [
				{
					type: 'tool_result',
					tool_use_id: tool_use.id,
					content: tool_use_invocation,
				},
			],
		},
	];
};

export const is_tool_result = (messages: Anthropic.MessageParam[]): boolean => {
	const last_message = messages[messages.length - 1];
	if (!Array.isArray(last_message?.content)) {
		return false;
	}

	const tool_result = last_message.content[0] as Anthropic.ToolResultBlockParam;

	return tool_result.type == 'tool_result';
};
