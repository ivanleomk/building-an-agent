import React, {useState, useMemo} from 'react';
import {Text, Box, useInput, useApp} from 'ink';
import TextInput from 'ink-text-input';
import {useAgent} from './hooks/useAgent.js';
import Message from './components/Message.js';
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
		[],
	);

	const {conversation, complete} = useAgent(provider);
	const [input, setInput] = useState('');
	const [showShutdown, setShowShutdown] = useState(false);
	const {exit} = useApp();

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
			<Box width="100%">
				<Text color="blue">$ </Text>
				<TextInput
					value={input}
					onChange={setInput}
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
