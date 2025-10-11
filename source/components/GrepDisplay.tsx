import React from 'react';
import {Box, Text} from 'ink';
import type {Tool} from '../lib/types.js';

interface GrepDisplayProps {
	toolCall: Tool & {name: 'grep'};
}

export default function GrepDisplay({toolCall}: GrepDisplayProps) {
	const textOutputs = toolCall.output.filter(item => item.type === 'text');
	const args = toolCall.args as {
		pattern: string;
		path: string;
		caseSensitive: boolean;
		type: string;
	};

	return (
		<Box flexDirection="column" marginLeft={2} gap={1}>
			{textOutputs.map((output, index) => {
				if (output.type !== 'text') return null;

				const lines = output.text
					.split('\n')
					.map(line => line.replace(/\t/g, ' ').trimEnd());
				const previewLines = lines.slice(0, 10);
				const preview = previewLines.join('\n');
				const totalLines = lines.length;

				return (
					<Box key={index} flexDirection="column">
						<Box
							borderStyle="round"
							borderColor="blue"
							borderBottom={false}
							paddingLeft={1}
							paddingRight={1}
							flexDirection="column"
						>
							<Text color="blue">grep</Text>
							<Text color="gray">Arguments:</Text>
							<Text color="white">  pattern: "{args.pattern}"</Text>
							<Text color="white">  path: {args.path}</Text>
							<Text color="white">  caseSensitive: {args.caseSensitive ? 'true' : 'false'}</Text>
							<Text color="white">  type: {args.type}</Text>
						</Box>
						<Box
							borderStyle="round"
							borderColor="blue"
							borderTop={false}
							padding={1}
							flexDirection="column"
						>
							{lines.length === 0 ? (
								<Text color="gray">No matches found.</Text>
							) : (
								<>
									<Text color="gray">{preview}</Text>
									{totalLines > 10 && (
										<Text color="dim">... and {totalLines - 10} more matches</Text>
									)}
								</>
							)}
						</Box>
					</Box>
				);
			})}
		</Box>
	);
}