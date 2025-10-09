import React from 'react';
import {Box, Text} from 'ink';
import type {ConversationItem, Tool} from '../lib/types.js';
import MarkdownText from './MarkdownText.js';
import ReadFileDisplay from './ReadFileDisplay.js';
import ReplaceContentDisplay from './ReplaceContentDisplay.js';
import ListFileDisplay from './ListFileDisplay.js';
import CreateFileDisplay from './CreateFileDisplay.js';

interface MessageProps {
	message: ConversationItem;
}

export default function Message({message}: MessageProps) {
	if (message.type === 'tool') {
		const toolCall = message as Tool;

		if (toolCall.name === 'read_file') {
			return (
				<ReadFileDisplay toolCall={toolCall as Tool & {name: 'read_file'}} />
			);
		}

		if (toolCall.name === 'replace_content') {
			return (
				<ReplaceContentDisplay
					toolCall={toolCall as Tool & {name: 'replace_content'}}
				/>
			);
		}

		if (toolCall.name === 'list_files') {
			return (
				<ListFileDisplay toolCall={toolCall as Tool & {name: 'list_files'}} />
			);
		}

		if (toolCall.name === 'create_file') {
			return (
				<CreateFileDisplay
					toolCall={toolCall as Tool & {name: 'create_file'}}
				/>
			);
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
		<Box flexDirection="column" marginTop={1}>
			<Box marginBottom={1} marginLeft={1}>
				<Text color={message.role === 'user' ? 'blue' : 'green'} dimColor>
					{message.role === 'user' ? 'User' : 'Assistant'}
				</Text>
			</Box>
			{message.content
				.filter(item => item.type === 'reasoning' || item.type === 'text')
				.map((item, index) => {
					if (item.type === 'reasoning') {
						return (
							<Box
								key={index}
								marginLeft={2}
								marginBottom={1}
								flexDirection="column"
								gap={1}
							>
								<Box>
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
									<Box flexGrow={1} flexShrink={1} flexDirection="column">
										<Box marginBottom={0.5} marginLeft={0.5}>
											<Text color="cyan" dimColor>
												Reasoning
											</Text>
										</Box>
										<MarkdownText color="cyan">
											{item.text.trimEnd()}
										</MarkdownText>
									</Box>
								</Box>
							</Box>
						);
					}
					return (
						<Box key={index} marginBottom={1}>
							<MarkdownText color={textColor}>
								{item.text}
							</MarkdownText>
						</Box>
					);
				})}
		</Box>
	);
}
