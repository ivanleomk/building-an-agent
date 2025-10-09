import React from 'react';
import {Box, Text} from 'ink';
import type {Tool} from '../lib/types.js';

interface ReadFileDisplayProps {
	toolCall: Tool & {name: 'read_file'};
}

export default function ReadFileDisplay({toolCall}: ReadFileDisplayProps) {
	const textOutputs = toolCall.output.filter(item => item.type === 'text');
	const paths = (toolCall.args as {paths: string[]}).paths || [];

	return (
		<Box flexDirection="column" marginLeft={2} gap={1}>
			{textOutputs.map((output, index) => {
				if (output.type !== 'text') return null;

				const lines = output.text.split('\n');
				const preview = lines.slice(0, 3).join('\n');
				const totalLines = lines.length;
				const filePath = paths[index] || 'unknown';

				return (
					<Box key={index} flexDirection="column">
						<Box
							borderStyle="round"
							borderColor="gray"
							borderBottom={false}
							paddingLeft={1}
							paddingRight={1}
						>
							<Text color="gray">read_file </Text>
							<Text color="white">{filePath}</Text>
						</Box>
						<Box
							borderStyle="round"
							borderColor="gray"
							borderTop={false}
							padding={1}
							flexDirection="column"
						>
							<Text color="gray">{preview}</Text>
							{totalLines > 3 && (
								<Text color="dim">... read {totalLines} lines</Text>
							)}
						</Box>
					</Box>
				);
			})}
		</Box>
	);
}
