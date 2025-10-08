import React from 'react';
import {Box, Text} from 'ink';
import type {ConversationItem} from '../lib/types.js';

interface MessageProps {
	message: ConversationItem;
}

export default function Message({message}: MessageProps) {
	if (message.type === 'tool') {
		const statusColor = message.status === 'success' ? 'green' : message.status === 'error' ? 'red' : 'yellow';
		const textBlocks = message.output.filter(block => block.type === 'text');

		return (
			<Box marginLeft={2} flexDirection="column" gap={1}>
				<Box borderStyle="round" borderColor={statusColor} padding={1}>
					<Text color={statusColor}>
						✓ {message.name} [{message.status}]
					</Text>
				</Box>
				{textBlocks.map((block, i) => (
					<Box key={i} paddingLeft={2}>
						<Text dimColor>{block.type === 'text' ? block.text : ''}</Text>
					</Box>
				))}
			</Box>
		);
	}

	const textColor = message.role === 'user' ? 'green' : 'yellow';
	const prefix = message.role === 'user' ? '>' : '●';

	const textBlocks = message.content.filter(block => block.type === 'text');
	const toolCall = message.content.find(block => block.type === 'tool_call');

	if (toolCall) {
		return (
			<Box
				marginLeft={2}
				width={50}
				borderStyle="round"
				borderColor="cyan"
				padding={1}
			>
				<Text color="cyan" wrap="wrap">
					Called {toolCall.name}
				</Text>
			</Box>
		);
	}

	if (textBlocks.length > 0) {
		return (
			<Box marginLeft={2} flexDirection="column">
				{textBlocks.map((block, i) => (
					<Text key={i} color={textColor}>
						{prefix} {block.type === 'text' ? block.text : ''}
					</Text>
				))}
			</Box>
		);
	}

	return null;
}
