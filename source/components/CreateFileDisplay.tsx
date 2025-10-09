import React from 'react';
import {Box, Text} from 'ink';
import type {Tool} from '../lib/types.js';

interface CreateFileDisplayProps {
	toolCall: Tool & {name: 'create_file'};
}

export default function CreateFileDisplay({toolCall}: CreateFileDisplayProps) {
	const args = toolCall.args as {path: string; content: string};
	const lines = args.content.split('\n');
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
				<Text color="gray">create_file </Text>
				<Text color="white">[{args.path}]</Text>
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
				{hasMore && <Text color="dim">... total({lines.length}) lines</Text>}
			</Box>
		</Box>
	);
}
