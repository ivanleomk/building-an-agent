import React from 'react';
import {Box, Text} from 'ink';
import type {Tool} from '../lib/types.js';

interface ReplaceContentDisplayProps {
	toolCall: Tool & {name: 'replace_content'};
}

export default function ReplaceContentDisplay({
	toolCall,
}: ReplaceContentDisplayProps) {
	const args = toolCall.args as {
		filePath: string;
		oldStr: string;
		newStr: string;
		replaceAll: boolean;
	};

	const oldLines = args.oldStr
		.split('\n')
		.map(line => line.trimEnd().replace(/\t/g, ' '));
	const newLines = args.newStr
		.split('\n')
		.map(line => line.trimEnd().replace(/\t/g, ' '));

	return (
		<Box flexDirection="column" marginY={0} width="90%" alignSelf="center">
			<Box
				borderStyle="round"
				borderColor="gray"
				borderBottom={false}
				paddingLeft={1}
				paddingRight={1}
			>
				<Text color="gray">replace_content </Text>
				<Text color="white">[{args.filePath}]</Text>
			</Box>
			<Box
				borderStyle="round"
				borderColor="gray"
				borderTop={false}
				padding={1}
				flexDirection="column"
			>
				<Text color="white" wrap="wrap">
					{oldLines.map((line, index) => (
						<Text key={`old-${index}`} color="red">
							{`- ${line}\n`}
						</Text>
					))}
					{newLines.map((line, index) => (
						<Text key={`new-${index}`} color="green">
							{`+ ${line}\n`}
						</Text>
					))}
				</Text>
			</Box>
		</Box>
	);
}
