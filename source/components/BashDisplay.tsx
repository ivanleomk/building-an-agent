import React from 'react';
import {Box, Text} from 'ink';
import type {Tool} from '../lib/types.js';

interface BashDisplayProps {
	toolCall: Tool & {name: 'bash'};
}

export default function BashDisplay({toolCall}: BashDisplayProps) {
	const textOutputs = toolCall.output.filter(item => item.type === 'text');
	const args = toolCall.args as {
		command: string;
		cwd?: string;
	};

	return (
		<Box flexDirection="column" marginLeft={2} gap={1}>
			{textOutputs.map((output, index) => {
				if (output.type !== 'text') return null;

				const lines = output.text
					.split('\n')
					.map(line => line.trimEnd());

				return (
					<Box key={index} flexDirection="column">
						<Box
							borderStyle="round"
							borderColor="green"
							padding={1}
							flexDirection="column"
						>
							<Text color="green">$ {args.command}</Text>
							{args.cwd && <Text color="gray" dimColor>cwd: {args.cwd}</Text>}
							<Text>{'\n'}</Text>
							<Text color="white">{lines.join('\n')}</Text>
						</Box>
					</Box>
				);
			})}
		</Box>
	);
}
