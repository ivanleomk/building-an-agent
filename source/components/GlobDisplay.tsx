import React from 'react';
import {Box, Text} from 'ink';
import type {Tool} from '../lib/types.js';

interface GlobDisplayProps {
	toolCall: Tool & {name: 'glob'};
}

export default function GlobDisplay({toolCall}: GlobDisplayProps) {
	const textOutput = toolCall.output.find(item => item.type === 'text');
	const args = toolCall.args as {
		pattern: string;
		directory: string;
		limit?: number;
		offset?: number;
	};

	if (!textOutput || textOutput.type !== 'text') {
		return null;
	}

	const lines = textOutput.text.split('\n').filter(Boolean);
	const maxLines = 25;
	const displayLines = lines.slice(0, maxLines);
	const hasMore = lines.length > maxLines;

	return (
		<Box flexDirection="column" marginY={0} width="90%" alignSelf="center">
			<Box
				borderStyle="round"
				borderColor="gray"
				borderBottom={false}
				paddingLeft={1}
				paddingRight={1}
			>
				<Text color="gray">glob </Text>
				<Text color="white">
					{' '}
					[{args.pattern}] in [{args.directory}]
				</Text>
			</Box>
			<Box
				borderStyle="round"
				borderColor="gray"
				borderTop={false}
				padding={1}
				flexDirection="column"
			>
				<Text color="white" wrap="wrap">
					{displayLines.join('\n')}
				</Text>
				{hasMore && (
					<Text color="dim">... found a total of ({lines.length}) files</Text>
				)}
			</Box>
		</Box>
	);
}
