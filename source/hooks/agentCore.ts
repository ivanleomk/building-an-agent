import type {
	ConversationItem,
	ProviderEvent,
	ContentBlock,
	Message,
	Tool,
} from '../lib/types.js';
import {TOOLS} from '../lib/types.js';

export function applyProviderEvent(
	event: ProviderEvent,
	conversation: ConversationItem[],
): ConversationItem[] {
	switch (event.type) {
		case 'START_MESSAGE':
			return [
				...conversation,
				{
					type: 'message',
					role: event.role,
					content: [],
				} satisfies Message,
			];

		case 'ADD_CONTENT_BLOCK': {
			const lastItem = conversation[conversation.length - 1];
			if (lastItem?.type !== 'message') return conversation;

			const updated = [...conversation];
			const message = updated[updated.length - 1] as Message;
			message.content[event.index] = event.block;

			return updated;
		}

		case 'UPDATE_CONTENT_BLOCK': {
			const lastItem = conversation[conversation.length - 1];
			if (lastItem?.type !== 'message') return conversation;

			const updated = [...conversation];
			const message = updated[updated.length - 1] as Message;
			const block = message.content[event.index];

			if (!block) return updated;

			if (event.delta) {
				if (block.type === 'text' || block.type === 'reasoning') {
					block.text += event.delta;
				} else if (
					block.type === 'tool_call' &&
					typeof block.args === 'string'
				) {
					block.args += event.delta;
				}
			}

			if (
				event.final &&
				block.type === 'tool_call' &&
				typeof block.args === 'string'
			) {
				try {
					block.args = JSON.parse(block.args);
				} catch {
					// Leave as string if parsing fails
				}
			}

			return updated;
		}

		case 'UPDATE_CONTENT_BLOCK_METADATA': {
			const lastItem = conversation[conversation.length - 1];
			if (lastItem?.type !== 'message') return conversation;

			const updated = [...conversation];
			const message = updated[updated.length - 1] as Message;
			const block = message.content[event.index];

			if (block?.type === 'reasoning' && event.key === 'signature') {
				block.signature = event.value;
			}

			return updated;
		}

		case 'END_MESSAGE':
		case 'ERROR':
			return conversation;

		default:
			return conversation;
	}
}

export async function executeTools(
	conversation: ConversationItem[],
): Promise<{updated: ConversationItem[]; executedAny: boolean}> {
	const lastItem = conversation[conversation.length - 1];
	if (lastItem?.type !== 'message' || lastItem.role !== 'assistant') {
		return {updated: conversation, executedAny: false};
	}

	const toolCalls = lastItem.content.filter(
		(block): block is Extract<ContentBlock, {type: 'tool_call'}> =>
			block.type === 'tool_call',
	);

	if (toolCalls.length === 0) {
		return {updated: conversation, executedAny: false};
	}

	let updated = [...conversation];
	let executedAny = false;

	for (const toolCall of toolCalls) {
		const tool = TOOLS.find(t => t.name === toolCall.name);

		if (!tool) {
			updated.push({
				type: 'tool',
				tool_id: toolCall.tool_id,
				name: toolCall.name,
				args: (typeof toolCall.args === 'string' ? {} : toolCall.args) as any,
				output: [{type: 'text', text: `Tool ${toolCall.name} not found`}],
				status: 'error',
			} satisfies Tool);
			executedAny = true;
			continue;
		}

		if (typeof toolCall.args === 'string') {
			continue;
		}

		try {
			const validatedArgs = tool.input_schema.parse(toolCall.args);
			// @ts-ignore
			const output = await tool.execute(validatedArgs);
			updated.push({
				type: 'tool',
				tool_id: toolCall.tool_id,
				name: toolCall.name,
				args: validatedArgs,
				output,
				status: 'success',
			} satisfies Tool);
			executedAny = true;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			updated.push({
				type: 'tool',
				tool_id: toolCall.tool_id,
				name: toolCall.name,
				args: toolCall.args,
				output: [{type: 'text', text: `Error: ${errorMessage}`}],
				status: 'error',
			} satisfies Tool);
			executedAny = true;
		}
	}

	return {updated, executedAny};
}
