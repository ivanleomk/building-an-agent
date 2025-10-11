import React from 'react';
import {Box, Text} from 'ink';
import {highlight} from 'cli-highlight';
import type {Tool} from '../lib/types.js';

const languageMap: Record<string, string> = {
	'.ts': 'typescript',
	'.tsx': 'typescript',
	'.js': 'javascript',
	'.jsx': 'javascript',
	'.py': 'python',
	'.rb': 'ruby',
	'.java': 'java',
	'.cpp': 'cpp',
	'.c': 'c',
	'.php': 'php',
	'.go': 'go',
	'.rs': 'rust',
	'.sh': 'bash',
	'.json': 'json',
	'.xml': 'xml',
	'.html': 'html',
	'.css': 'css',
	'.sql': 'sql',
	'.md': 'markdown',
	'.yaml': 'yaml',
	'.yml': 'yaml',
};

function getLanguageFromPath(filePath: string): string | undefined {
	const ext = filePath.substring(filePath.lastIndexOf('.'));
	return languageMap[ext];
}

interface CreateFileDisplayProps {
	toolCall: Tool & {name: 'create_file'};
}

export default function CreateFileDisplay({toolCall}: CreateFileDisplayProps) {
	const args = toolCall.args as {filePath: string; content: string};
	const processedContent = args.content
		.split('\n')
		.map(line => line.replace(/\t/g, ' ').trimEnd())
		.join('\n');
	const language = getLanguageFromPath(args.filePath);
	const highlightedContent = language
		? highlight(processedContent, {language, ignoreIllegals: true})
		: processedContent;
	const lines = highlightedContent.split('\n');
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
				<Text color="white">[{args.filePath}]</Text>
				{language && <Text color="cyan"> ({language})</Text>}
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
