import {useState, useCallback} from 'react';
import type {
	Provider,
	ConversationItem,
	ProviderEvent,
	ContentBlock,
	Message,
	Tool,
} from '../lib/types.js';
import * as fs from 'fs';
import {TOOLS} from '../lib/types.js';

export function useAgent(provider: Provider) {
	const [conversation, setConversation] = useState<ConversationItem[]>([]);

	const handleEvent = useCallback(
		(event: ProviderEvent, currentConvo: ConversationItem[]) => {
			switch (event.type) {
				case 'START_MESSAGE':
					return [
						...currentConvo,
						{
							type: 'message',
							role: event.role,
							content: [],
						} satisfies Message,
					];

				case 'ADD_CONTENT_BLOCK': {
					const lastItem = currentConvo[currentConvo.length - 1];
					if (lastItem?.type !== 'message') return currentConvo;

					const updated = [...currentConvo];
					const message = updated[updated.length - 1] as Message;
					message.content[event.index] = event.block;

					return updated;
				}

				case 'UPDATE_CONTENT_BLOCK': {
					const lastItem = currentConvo[currentConvo.length - 1];
					if (lastItem?.type !== 'message') return currentConvo;

					const updated = [...currentConvo];
					const message = updated[updated.length - 1] as Message;
					const block = message.content[event.index];

					if (!block) return updated;

					if (event.delta) {
						if (block.type === 'text' || block.type === 'reasoning') {
							block.text += event.delta;
						} else if (block.type === 'tool_call' && typeof block.args === 'string') {
							block.args += event.delta;
						}
					}

					if (event.final && block.type === 'tool_call' && typeof block.args === 'string') {
						try {
							block.args = JSON.parse(block.args);
						} catch {
							// Leave as string if parsing fails
						}
					}

					return updated;
				}

				case 'UPDATE_CONTENT_BLOCK_METADATA': {
					const lastItem = currentConvo[currentConvo.length - 1];
					if (lastItem?.type !== 'message') return currentConvo;

					const updated = [...currentConvo];
					const message = updated[updated.length - 1] as Message;
					const block = message.content[event.index];

					if (block?.type === 'reasoning' && event.key === 'signature') {
						block.signature = event.value;
					}

					return updated;
				}

				case 'END_MESSAGE':
				case 'ERROR':
					return currentConvo;

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
						name: toolCall.name,
						args: (typeof toolCall.args === 'string' ? {} : toolCall.args) as any,
						output: [{type: 'text', text: `Tool ${toolCall.name} not found`}],
						status: 'error',
					} satisfies Tool);
					continue;
				}

				if (typeof toolCall.args === 'string') {
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

	const writeFile = useCallback(async (path: string, data: string) => {
		await fs.promises.writeFile(path, data);
	}, []);

	const processNextTurn = useCallback(
		async (
			currentConvo: ConversationItem[],
		): Promise<{updated: ConversationItem[]; shouldContinue: boolean}> => {
			let updated = currentConvo;

			for await (const event of provider.complete(
				currentConvo,
				undefined,
				TOOLS,
			)) {
				updated = handleEvent(event, updated);
				setConversation(updated);
				await writeFile('./data.json', JSON.stringify(updated, null, 2));
			}

			const withToolResults = await executeTools(updated);
			setConversation(withToolResults);
			await writeFile('./data.json', JSON.stringify(withToolResults, null, 2));

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
