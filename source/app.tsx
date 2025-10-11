import React, {useState, useMemo} from 'react';
import {Text, Box, useInput, useApp} from 'ink';

import {useAgent} from './hooks/useAgent.js';
import Message from './components/Message.js';
import Autocomplete from './components/Autocomplete.js';
import TextInput from './components/TextInput.js';
// import {XAIProvider} from './provider/xai.js';
// import {AnthropicProvider} from './provider/anthropic.js';
import {XAIProvider} from './provider/xai.js';

export default function App() {
	const provider = useMemo(
		() =>
			new XAIProvider({
				baseURL: 'https://api.x.ai/v1',
				apiKey: process.env['XAI_API_KEY'],
				defaultModel: 'grok-code-fast-1',
				maxTokens: 4096,
			}),
		// new AnthropicProvider({
		// 	defaultModel: 'claude-3-7-sonnet-latest',
		// 	maxTokens: 8092,
		// 	reasoningBudget: 4096,
		// }),
		[],
	);

	const {conversation, complete} = useAgent(provider);
	const [input, setInput] = useState('');
	const [cursorOffset, setCursorOffset] = useState(0);
	const [showShutdown, setShowShutdown] = useState(false);
	const {exit} = useApp();

	const lastTerm = input.split(' ').at(-1) || '';
	const showAutocomplete = lastTerm.includes('@');

	const sendMessage = async () => {
		if (input.trim().length === 0) {
			return;
		}
		setInput('');
		await complete(input);
	};

	useInput((input, key) => {
		if (key.ctrl && input === 'd') {
			setShowShutdown(true);
			exit();
		}
		if (key.return) {
			sendMessage();
		}
	});

	return (
		<Box flexDirection="column" height="100%">
			<Box flexGrow={1} flexDirection="column" gap={1}>
				{conversation.map((message, index) => (
					<Message key={index} message={message} />
				))}
				{conversation.length > 0 && <Box flexGrow={1} />}
			</Box>
			<Box>
				{showAutocomplete ? (
					<Autocomplete
						searchTerm={lastTerm}
						updateUserInput={newTerm => {
							const prevParts = input.split(/\s+/);
							prevParts[prevParts.length - 1] = newTerm;
							const newInput = prevParts.join(' ') + ' ';
							setInput(newInput);
							setCursorOffset(newInput.length);
						}}
					/>
				) : null}
			</Box>
			<Box
				width="100%"
				borderStyle="round"
				borderColor="gray"
				paddingX={1}
				paddingY={0}
			>
				<Text color="green">&gt; </Text>
				<TextInput
					value={input}
					onChange={setInput}
					cursorOffset={cursorOffset}
					onCursorOffsetChange={setCursorOffset}
					placeholder="Type a command..."
				/>
			</Box>
			{showShutdown && (
				<Box>
					<Text color="yellow">Shutting down...</Text>
				</Box>
			)}
		</Box>
	);
}
