import React from 'react';
import {Box, Text} from 'ink';
import type {Tool} from '../lib/types.js';

interface QueryDisplayProps {
	toolCall: Tool & {name: 'query'};
}

export default function QueryDisplay({toolCall}: QueryDisplayProps) {
	const textOutputs = toolCall.output.filter(item => item.type === 'text');
	const args = toolCall.args as {
		query: string;
		includeText: boolean;
	};

	return (
		<Box flexDirection="column" marginLeft={2} gap={1}>
			{textOutputs.map((output, index) => {
				if (output.type !== 'text') return null;

				const parts = output.text.split('\n\nCitations:\n');
				const answer = parts[0]?.replace('Answer: ', '') || '';
				const citationsText = parts[1] || '';
				const citations = citationsText
					.split('\n\n')
					.filter(c => c.trim())
					.map(citation => {
						const lines = citation.split('\n');
						const title = lines[0];
						const url = lines.find(l => l.includes('URL:'));
						return {title, url};
					});

				return (
					<Box key={index} flexDirection="column">
						<Box
							borderStyle="round"
							borderColor="yellow"
							borderBottom={false}
							paddingLeft={1}
							paddingRight={1}
							flexDirection="column"
						>
							<Text color="yellow">query</Text>
							<Text color="gray">Question: "{args.query}"</Text>
						</Box>
						<Box
							borderStyle="round"
							borderColor="yellow"
							borderTop={false}
							padding={1}
							flexDirection="column"
						>
							<Box flexDirection="column" marginBottom={1}>
								<Text color="yellow" bold>
									Answer:
								</Text>
								<Text color="white">{answer}</Text>
							</Box>

							{citations.length > 0 && (
								<Box flexDirection="column">
									<Text color="gray" bold>
										Citations:
									</Text>
									{citations.map((citation, idx) => (
										<Box key={idx} flexDirection="column" marginTop={0.5}>
											<Text color="yellow">{citation.title}</Text>
											{citation.url && <Text color="cyan">{citation.url}</Text>}
										</Box>
									))}
								</Box>
							)}
						</Box>
					</Box>
				);
			})}
		</Box>
	);
}
