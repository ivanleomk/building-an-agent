import {useState} from 'react';
import Anthropic from '@anthropic-ai/sdk';
import {
	create_content_block,
	handle_content_delta,
	handle_content_end,
	is_tool_result,
} from '../lib/content_blocks.js';
import {tool_defs, tools} from '../lib/tools.js';

const client = new Anthropic({
	apiKey: process.env['ANTHROPIC_API_KEY'],
});

export function useMessages() {
	const [messages, setMessages] = useState<Anthropic.MessageParam[]>([]);
	const [input, setInput] = useState('');

	const generateResponse = async (currentConvo: Anthropic.MessageParam[]) => {
		const response = client.messages.stream({
			messages: currentConvo,
			model: 'claude-4-sonnet-20250514',
			max_tokens: 4096,
			tools,
		});

		for await (const chunk of response) {
			if (chunk.type == 'content_block_start') {
				currentConvo = [...currentConvo, create_content_block(chunk)];
				setMessages(currentConvo);
			} else if (chunk.type == 'content_block_delta') {
				currentConvo = handle_content_delta(chunk, currentConvo);
				setMessages(currentConvo);
			} else if (chunk.type == 'content_block_stop') {
				currentConvo = await handle_content_end(currentConvo, tool_defs);
				setMessages(currentConvo);
			}
		}

		// Trigger a second request to get model response if the last message is a tool result ( This can be called recursively )
		if (is_tool_result(currentConvo)) {
			await generateResponse(currentConvo);
		}

		return currentConvo;
	};

	const sendMessage = async () => {
		if (input.trim().length == 0) {
			return;
		}
		const userMessage = {content: input, role: 'user' as const};
		const currentConvo = [...messages, userMessage];
		setMessages(currentConvo);
		setInput('');
		await generateResponse(currentConvo);
	};

	return {
		messages,
		input,
		setInput,
		sendMessage,
	};
}
