import {useState, useCallback} from 'react';
import type {Provider, ConversationItem, Message} from '../lib/types.js';
import * as fs from 'fs';
import {TOOLS} from '../lib/types.js';
import {applyProviderEvent, executeTools} from './agentCore.js';

export function useAgent(provider: Provider) {
	const [conversation, setConversation] = useState<ConversationItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);

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
				setIsLoading(false);
				updated = applyProviderEvent(event, updated);
				setConversation(updated);
			}

			const {updated: withToolResults, executedAny} = await executeTools(
				updated,
			);
			setConversation(withToolResults);

			return {updated: withToolResults, shouldContinue: executedAny};
		},
		[provider],
	);

	const complete = useCallback(
		async (userInput: string) => {
			try {
				const userMessage: Message = {
					type: 'message',
					role: 'user',
					content: [{type: 'text', text: userInput}],
				};

				let currentConvo = [...conversation];
				if (conversation.length === 0) {
					const systemMessage: Message = {
						type: 'message',
						role: 'system',
						content: [{
							type: 'text',
							text: `Today's date is ${new Date().toDateString()}. You are Amie, a coding agent. Be respectful and always ask the user for confirmation before making any irreversible changes.`
						}],
					};
					currentConvo.push(systemMessage);
				}
				currentConvo.push(userMessage);
				setConversation(currentConvo);

				while (true) {
					setIsLoading(true);
					const {updated, shouldContinue} = await processNextTurn(currentConvo);
					currentConvo = updated;
					if (!shouldContinue) break;
				}

				await fs.promises.writeFile(
					'./data.json',
					JSON.stringify(currentConvo, null, 2),
				);
			} finally {
				setIsLoading(false);
			}
		},
		[conversation, processNextTurn],
	);

	return {
		conversation,
		complete,
		isLoading,
	};
}
