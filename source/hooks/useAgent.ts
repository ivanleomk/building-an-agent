import {useState, useCallback} from 'react';
import type {
	Provider,
	ConversationItem,
	ProviderEvent,
	ContentBlock,
	Message,
	Tool,
} from '../lib/types.js';
import {TOOLS} from '../lib/types.js';

export function useAgent(provider: Provider) {
	const [conversation, setConversation] = useState<ConversationItem[]>([]);

	const handleEvent = useCallback(
		(event: ProviderEvent, currentConvo: ConversationItem[]) => {
			switch (event.type) {
				case 'start_message':
					return [
						...currentConvo,
						{
							type: 'message',
							role: event.role,
							content: [],
						} satisfies Message,
					];

				case 'content_delta': {
					const lastItem = currentConvo[currentConvo.length - 1];
					if (lastItem?.type !== 'message') return currentConvo;

					const updated = [...currentConvo];
					const message = updated[updated.length - 1] as Message;

					if (message.content.length !== event.index + 1) {
						message.content.push({type: 'text', text: ''});
					}

					const block = message.content[event.index];
					if (block?.type === 'text') {
						block.text += event.delta;
					}

					return updated;
				}

				case 'tool_call_start': {
					const lastItem = currentConvo[currentConvo.length - 1];
					if (lastItem?.type !== 'message') return currentConvo;

					const updated = [...currentConvo];
					const message = updated[updated.length - 1] as Message;

					if (message.content.length !== event.index + 1) {
						message.content.push({
							type: 'tool_call',
							tool_id: event.id,
							name: event.name,
							args: '',
						});
					}

					return updated;
				}

				case 'tool_call_delta': {
					const lastItem = currentConvo[currentConvo.length - 1];
					if (lastItem?.type !== 'message') return currentConvo;

					const updated = [...currentConvo];
					const message = updated[updated.length - 1] as Message;
					const block = message.content[event.index];

					if (block?.type === 'tool_call' && typeof block.args === 'string') {
						block.args += event.argsDelta;
					}

					return updated;
				}

				case 'content_block_end': {
					const lastItem = currentConvo[currentConvo.length - 1];
					if (lastItem?.type !== 'message') return currentConvo;

					const updated = [...currentConvo];
					const message = updated[updated.length - 1] as Message;
					const block = message.content[event.index];

					if (block?.type === 'tool_call' && typeof block.args === 'string') {
						block.args = JSON.parse(block.args);
					}

					return updated;
				}

				default:
					return currentConvo;
			}
		},
		[],
	);

	const executeTools = useCallback(
		async (currentConvo: ConversationItem[]): Promise<ConversationItem[]> => {
			const lastItem = currentConvo[currentConvo.length - 1];
			if (lastItem?.type !== 'message' || lastItem.role !== 'assistant') {
				return currentConvo;
			}

			const toolCalls = lastItem.content.filter(
				(block): block is Extract<ContentBlock, {type: 'tool_call'}> =>
					block.type === 'tool_call',
			);

			if (toolCalls.length === 0) return currentConvo;

			let updated = [...currentConvo];

			for (const toolCall of toolCalls) {
				const tool = TOOLS.find(t => t.name === toolCall.name);

				if (!tool) {
					updated.push({
						type: 'tool',
						tool_id: toolCall.tool_id,
						name: toolCall.name as any,
						args: toolCall.args as any,
						output: [{type: 'text', text: `Tool ${toolCall.name} not found`}],
						status: 'error',
					} satisfies Tool);
					continue;
				}

				try {
					const validatedArgs = tool.input_schema.parse(toolCall.args);
					const output = await tool.execute(validatedArgs);
					updated.push({
						type: 'tool',
						tool_id: toolCall.tool_id,
						name: toolCall.name as any,
						args: validatedArgs,
						output,
						status: 'success',
					} satisfies Tool);
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : String(error);
					updated.push({
						type: 'tool',
						tool_id: toolCall.tool_id,
						name: toolCall.name as any,
						args: toolCall.args as any,
						output: [{type: 'text', text: `Error: ${errorMessage}`}],
						status: 'error',
					} satisfies Tool);
				}
			}

			return updated;
		},
		[],
	);

	const processNextTurn = useCallback(
		async (currentConvo: ConversationItem[]): Promise<{updated: ConversationItem[], shouldContinue: boolean}> => {
			let updated = currentConvo;

			for await (const event of provider.complete(
				currentConvo,
				undefined,
				TOOLS,
			)) {
				updated = handleEvent(event, updated);
				setConversation(updated);
			}

			const withToolResults = await executeTools(updated);
			setConversation(withToolResults);

			const shouldContinue = withToolResults.length > updated.length;
			return {updated: withToolResults, shouldContinue};
		},
		[provider, handleEvent, executeTools],
	);

	const complete = useCallback(
		async (userInput: string) => {
			const userMessage: Message = {
				type: 'message',
				role: 'user',
				content: [{type: 'text', text: userInput}],
			};

			let currentConvo = [...conversation, userMessage];
			setConversation(currentConvo);

			while (true) {
				const {updated, shouldContinue} = await processNextTurn(currentConvo);
				currentConvo = updated;
				if (!shouldContinue) break;
			}
		},
		[conversation, processNextTurn],
	);

	return {
		conversation,
		complete,
	};
}
