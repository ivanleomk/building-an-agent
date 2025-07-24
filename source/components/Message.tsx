import React from 'react';
import {Box, Text} from 'ink';
import Anthropic from '@anthropic-ai/sdk';

interface MessageProps {
	message: Anthropic.MessageParam;
}

export default function Message({message}: MessageProps) {
	const textColor = message.role === 'user' ? 'green' : 'yellow';
	const prefix = message.role === 'user' ? '>' : '●';

	// This is a simple user message ( or text response )
	if (typeof message.content === 'string') {
		return (
			<Box marginLeft={2}>
				<Text color={textColor}>
					{prefix} {message.content}
				</Text>
			</Box>
		);
	}

	// We want to return null for a tool result
	if (message.content[0]?.type == 'tool_result') {
		return null;
	}

	// We want to display a nice tool call message
	if (message.content[0]?.type == 'tool_use') {
		return (
			<Box
				marginLeft={2}
				width={50}
				borderStyle="round"
				borderColor="cyan"
				padding={1}
			>
				<Text color="cyan" wrap="wrap">
					Called {message.content[0].name}
				</Text>
			</Box>
		);
	}

	return (
		<Box marginLeft={2}>
			<Text color={textColor}>
				{prefix} {JSON.stringify(message.content, null, 2)}
			</Text>
		</Box>
	);
}
