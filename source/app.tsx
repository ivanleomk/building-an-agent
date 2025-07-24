import React, {useState} from 'react';
import {Text, Box, useInput, useApp} from 'ink';
import TextInput from 'ink-text-input';
import {useMessages} from './hooks/useMessages.js';
import Message from './components/Message.js';

export default function App() {
	const {messages, input, setInput, sendMessage} = useMessages();
	const [showShutdown, setShowShutdown] = useState(false);
	const {exit} = useApp();

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
				{messages.map((message, index) => (
					<Message key={index} message={message} />
				))}
				{messages.length > 0 && <Box flexGrow={1} />}
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
