import React from 'react';
import {Box, Text} from 'ink';
import type {Tool} from '../lib/types.js';

interface SearchWebDisplayProps {
	toolCall: Tool & {name: 'search_web'};
}

export default function SearchWebDisplay({toolCall}: SearchWebDisplayProps) {
	const textOutputs = toolCall.output.filter(item => item.type === 'text');
	const args = toolCall.args as {
		query: string;
		numResults: number;
		category?: string;
		type?: string;
	};

	return (
		<Box flexDirection="column" marginLeft={2} gap={1}>
			{textOutputs.map((output, index) => {
				if (output.type !== 'text') return null;

				const results = output.text.split('\n\n').filter(r => r.trim());

				return (
					<Box key={index} flexDirection="column">
						<Box
							borderStyle="round"
							borderColor="magenta"
							borderBottom={false}
							paddingLeft={1}
							paddingRight={1}
							flexDirection="column"
						>
							<Text color="magenta"> search_web</Text>
							<Text color="gray">Query: "{args.query}"</Text>
							{args.category && (
								<Text color="gray">Category: {args.category}</Text>
							)}
							<Text color="gray">
								Results: {args.numResults} ({args.type || 'auto'} search)
							</Text>
						</Box>
						<Box
							borderStyle="round"
							borderColor="magenta"
							borderTop={false}
							padding={1}
							flexDirection="column"
						>
							{results.length === 0 ? (
								<Text color="gray">No results found.</Text>
							) : (
								results.slice(0, 3).map((result, idx) => {
									const lines = result.split('\n');
									const title = lines[0];
									const url = lines.find(l => l.includes('URL:'));
									const contentLine = lines.find(l => l.includes('Content:'));
									const content = contentLine?.substring(
										contentLine.indexOf('Content:') + 9,
									);

									return (
										<Box key={idx} flexDirection="column" marginBottom={1}>
											<Text color="magenta" bold>
												{title}
											</Text>
											{url && <Text color="cyan">{url}</Text>}
											{content && (
												<Text color="gray">
													{content.length > 150
														? content.slice(0, 150) + '...'
														: content}
												</Text>
											)}
										</Box>
									);
								})
							)}
							{results.length > 3 && (
								<Text color="dim">
									... and {results.length - 3} more results
								</Text>
							)}
						</Box>
					</Box>
				);
			})}
		</Box>
	);
}
