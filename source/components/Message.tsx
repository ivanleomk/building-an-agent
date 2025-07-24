import React from 'react';
import {Box, Text} from 'ink';
import Anthropic from '@anthropic-ai/sdk';
import BlinkingDot from './BlinkingDot.js';

interface MessageProps {
	message: Anthropic.MessageParam;
}

export default function Message({message}: MessageProps) {
	if (message.role === 'user') {
		return (
			<Box marginLeft={2}>
				<Text color="yellow">&gt; {message.content as string}</Text>
			</Box>
		);
	}

	if (message.role === 'assistant' && message.content === '') {
		return (
			<Box marginLeft={2}>
				<BlinkingDot color="green" />
			</Box>
		);
	}

	if (typeof message.content === 'object') {
		return (
			<Box marginLeft={2}>
				<Text color="green">● {JSON.stringify(message.content, null, 2)}</Text>
			</Box>
		);
	}

	return (
		<Box marginLeft={2}>
			<Text color="green">● {message.content}</Text>
		</Box>
	);
}
