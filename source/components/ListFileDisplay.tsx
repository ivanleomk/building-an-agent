import React from 'react';
import {Box, Text} from 'ink';
import type {Tool} from '../lib/types.js';

interface ListFileDisplayProps {
	toolCall: Tool & {name: 'list_files'};
}

export default function ListFileDisplay({toolCall}: ListFileDisplayProps) {
	const textOutput = toolCall.output.find(item => item.type === 'text');
	const args = toolCall.args as {directory: string; maxDepth: number};

	if (!textOutput || textOutput.type !== 'text') {
		return null;
	}

	const lines = textOutput.text
		.split('\n')
		.map(line => line.replace(/\t/g, ' ').trimEnd());
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
				<Text color="gray">list_files </Text>
				<Text color="white"> [{args.directory}]</Text>
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
					<Text color="dim">
						... found a total of ({lines.length}) files/directories
					</Text>
				)}
			</Box>
		</Box>
	);
}
