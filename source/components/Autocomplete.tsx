import React, {useState} from 'react';
import {Text, Box, useInput} from 'ink';
import {execSync} from 'child_process';

interface AutocompleteProps {
	searchTerm: string;
	updateUserInput: (newInput: string) => void;
}

const generateSuggestions = (input: string): string[] => {
	const lastWord = input.split(' ').at(-1);
	if (!lastWord?.includes('@')) {
		return [];
	}

	const searchTerm = lastWord.split('@')[1] || '';
	if (!searchTerm) {
		return [];
	}

	try {
		const result = execSync(`rg --files | rg -i "${searchTerm}"`, {
			encoding: 'utf-8',
			cwd: process.cwd(),
			stdio: ['pipe', 'pipe', 'ignore'],
		});
		return result.trim().split('\n').filter(Boolean).slice(0, 5);
	} catch (error) {
		return [];
	}
};

export default function Autocomplete({
	searchTerm,
	updateUserInput,
}: AutocompleteProps) {
	const suggestions = generateSuggestions(searchTerm);
	const [selectedIndex, setSelectedIndex] = useState(0);

	useInput((_, key) => {
		if (key.upArrow) {
			setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
		}
		if (key.downArrow) {
			setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
		}
		if ((key.tab || key.return) && suggestions[selectedIndex]) {
			const inputParts = searchTerm.split(' ');
			inputParts[inputParts.length - 1] = `@${suggestions[selectedIndex]}`;
			updateUserInput(inputParts.join(' '));
		}
	});

	return (
		<Box flexDirection="column" borderStyle="round" borderColor="cyan">
			{suggestions.map((suggestion, index) => {
				const isSelected = index === selectedIndex;
				return (
					<Box key={index}>
						<Text>{isSelected ? '> ' : '  '}</Text>
						<Text bold={isSelected}>{suggestion}</Text>
					</Box>
				);
			})}
		</Box>
	);
}
