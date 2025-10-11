import React from 'react';
import {Box, Text} from 'ink';
import {highlight} from 'cli-highlight';

interface MarkdownTextProps {
	children: string;
	color?: string;
}

function CodeBlock({code, language}: {code: string; language?: string}) {
	const processedCode = code
		.split('\n')
		.map(line => line.replace(/\t/g, ' ').trimEnd())
		.join('\n');

	const highlightedCode = language
		? highlight(processedCode, {language, ignoreIllegals: true})
		: processedCode;

	return (
		<Box
			flexDirection="column"
			marginY={0}
			padding={0}
			width="90%"
			alignSelf="center"
		>
			<Box
			padding={1}
			paddingLeft={2}
			borderStyle="round"
			borderColor="gray"
			 flexDirection="column"
		>
				{language && (
					<Text color="cyan" dimColor>
						{language}
					</Text>
				)}
				<Text color="white" wrap="wrap">
					{highlightedCode}
				</Text>
			</Box>
		</Box>
	);
}

function InlineMarkdown({children, color = 'white'}: MarkdownTextProps) {
	const parts: React.ReactNode[] = [];
	let currentIndex = 0;
	const text = children;

	const headerStyles = {
		1: {
			bold: true,
			underline: true,
			color: 'cyan',
			fontSize: 20,
			marginBottom: 1,
		},
		2: {bold: true, color: 'cyan', fontSize: 18, marginBottom: 1},
		3: {bold: true, color: 'white', fontSize: 16, marginBottom: 1},
	} as const;

	const patterns = [
		{
			regex: /^(#{1,4})\s+(.+)/gm,
			render: (match: string, level: number) => {
				const style =
					headerStyles[level as keyof typeof headerStyles] || headerStyles[3];
				return (
					<Text key={currentIndex++} {...style}>
						{match}
					</Text>
				);
			},
		},
		{
			regex: /`([^`]+)`/g,
			render: (match: string) => (
				<Text key={currentIndex++} backgroundColor="gray" color="white">
					{match}
				</Text>
			),
		},
		{
			regex: /\*\*([^*]+)\*\*/g,
			render: (match: string) => (
				<Text key={currentIndex++} bold>
					{match}
				</Text>
			),
		},
		{
			regex: /\*([^*]+)\*/g,
			render: (match: string) => (
				<Text key={currentIndex++} italic>
					{match}
				</Text>
			),
		},
	];

	let lastIndex = 0;
	const matches: Array<{start: number; end: number; node: React.ReactNode}> =
		[];

	for (const {regex, render} of patterns) {
		const re = new RegExp(regex);
		let match;
		while ((match = re.exec(text)) !== null) {
			if (match[1]) {
				const captureGroup = match[2] || match[1];
				const level = match[2] ? match[1].length : undefined;
				matches.push({
					start: match.index,
					end: match.index + match[0].length,
					node: render(captureGroup, level as number),
				});
			}
		}
	}

	matches.sort((a, b) => a.start - b.start);

	const nonOverlapping: Array<{
		start: number;
		end: number;
		node: React.ReactNode;
	}> = [];
	for (const match of matches) {
		const lastItem = nonOverlapping[nonOverlapping.length - 1];
		if (
			nonOverlapping.length === 0 ||
			(lastItem && match.start >= lastItem.end)
		) {
			nonOverlapping.push(match);
		}
	}

	lastIndex = 0;
	for (const {start, end, node} of nonOverlapping) {
		if (start > lastIndex) {
			parts.push(
				<Text key={currentIndex++} color={color}>
					{text.slice(lastIndex, start)}
				</Text>,
			);
		}
		parts.push(node);
		lastIndex = end;
	}

	if (lastIndex < text.length) {
		parts.push(
			<Text key={currentIndex++} color={color}>
				{text.slice(lastIndex)}
			</Text>,
		);
	}

	return <>{parts}</>;
}

export default function MarkdownText({children, color = 'white'}: MarkdownTextProps) {
	const codeBlockRegex = /```(\w+)?\n([\s\S]+?)\n?```/g;
	const segments: React.ReactNode[] = [];
	let lastIndex = 0;
	let match;
	let keyIndex = 0;

	while ((match = codeBlockRegex.exec(children)) !== null) {
		if (match.index > lastIndex) {
			const textBefore = children.slice(lastIndex, match.index);
			segments.push(
				<Box key={keyIndex++} marginLeft={2}>
					<Box flexGrow={1} flexShrink={1}>
						<Text color={color} wrap="wrap">
							<InlineMarkdown color={color}>{textBefore}</InlineMarkdown>
						</Text>
					</Box>
				</Box>,
			);
		}

		if (match[2]) {
			segments.push(
				<CodeBlock key={keyIndex++} code={match[2]} language={match[1]} />,
			);
		}
		lastIndex = match.index + match[0].length;
	}

	if (lastIndex < children.length) {
		const textAfter = children.slice(lastIndex);
		segments.push(
			<Box key={keyIndex++} marginLeft={2}>
				<Box flexGrow={1} flexShrink={1}>
					<Text color={color} wrap="wrap">
						<InlineMarkdown color={color}>{textAfter}</InlineMarkdown>
					</Text>
				</Box>
			</Box>,
		);
	}

	return <Box flexDirection="column">{segments}</Box>;
}
