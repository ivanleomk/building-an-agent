import {useState} from 'react';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
	apiKey: process.env['ANTHROPIC_API_KEY'],
});

export function useMessages() {
	const [messages, setMessages] = useState<Anthropic.MessageParam[]>([]);
	const [input, setInput] = useState('');

	const sendMessage = async () => {
		const userMessage = {content: input, role: 'user' as const};
		setMessages(prev => [...prev, userMessage]);
		setInput('');

		// Add empty assistant message that we'll update
		setMessages(prev => [...prev, {content: '', role: 'assistant'}]);

		const response = client.messages.stream({
			messages: [...messages, userMessage],
			model: 'claude-4-sonnet-20250514',
			max_tokens: 4096,
		});

		for await (const chunk of response) {
			if (chunk.type == 'content_block_delta') {
				if (chunk.delta.type == 'text_delta') {
					const newContent = chunk.delta.text;

					setMessages(prev => [
						...prev.slice(0, -1),
						{
							role: 'assistant',
							content: prev.slice(-1)[0]?.content + newContent,
						},
					]);
				}
			}
		}
	};

	return {
		messages,
		input,
		setInput,
		sendMessage,
	};
}
