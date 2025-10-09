import React from 'react';
import {Box, Text} from 'ink';
import type {ConversationItem, Tool} from '../lib/types.js';
import MarkdownText from './MarkdownText.js';

interface MessageProps {
	message: ConversationItem;
}

export default function Message({message}: MessageProps) {
	if (message.type === 'tool') {
		const toolCall = message as Tool;

		if (toolCall.name === '') {
		}

		const statusColor =
			message.status === 'success'
				? 'green'
				: message.status === 'error'
				? 'red'
				: 'yellow';

		const errorOutput = message.output.find(item => item.type === 'text');

		return (
			<Box marginLeft={2} flexDirection="column" gap={1}>
				<Box
					borderStyle="round"
					borderColor={statusColor}
					padding={1}
					flexDirection="column"
				>
					<Text color={statusColor}>
						{message.status === 'error' ? '✗' : '✓'} {message.name} [
						{message.status}]
					</Text>
					{message.status === 'error' && errorOutput && (
						<>
							<Text>{'\n'}</Text>
							<Text color="red">{errorOutput.text}</Text>
						</>
					)}
				</Box>
			</Box>
		);
	}

	const textColor = 'white';

	return (
		<Box flexDirection="column">
			{message.content
				.filter(item => item.type === 'reasoning' || item.type === 'text')
				.map((item, index) => {
					if (item.type === 'reasoning') {
						return (
							<Box key={index} marginLeft={2} marginBottom={1}>
								<Box
									width={1}
									height="100%"
									justifyContent="center"
									borderColor="cyan"
									borderLeft={true}
									borderRight={false}
									borderTop={false}
									borderBottom={false}
									borderStyle="single"
									alignItems="flex-start"
								>
									<Text></Text>
								</Box>
								<Box flexGrow={1} flexShrink={1}>
									<MarkdownText color="cyan">
										{item.text.trimEnd()}
									</MarkdownText>
								</Box>
							</Box>
						);
					}
					return (
						<MarkdownText key={index} color={textColor}>
							{item.text}
						</MarkdownText>
					);
				})}
		</Box>
	);
}
