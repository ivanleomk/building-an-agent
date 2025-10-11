import React, {useState, useEffect} from 'react';
import {Text, useInput} from 'ink';
import chalk from 'chalk';

export type Props = {
	readonly placeholder?: string;
	readonly focus?: boolean;
	readonly mask?: string;
	readonly showCursor?: boolean;
	readonly value: string;
	readonly cursorOffset?: number;
	readonly onChange: (value: string) => void;
	readonly onCursorOffsetChange?: (offset: number) => void;
	readonly onSubmit?: (value: string) => void;
};

function TextInput({
	value: originalValue,
	placeholder = '',
	focus = true,
	mask,
	showCursor = true,
	cursorOffset: externalCursorOffset,
	onChange,
	onCursorOffsetChange,
	onSubmit,
}: Props) {
	const [internalCursorOffset, setInternalCursorOffset] = useState(
		(originalValue || '').length,
	);

	const cursorOffset =
		externalCursorOffset !== undefined
			? externalCursorOffset
			: internalCursorOffset;

	const setCursorOffset = (offset: number) => {
		if (onCursorOffsetChange) {
			onCursorOffsetChange(offset);
		} else {
			setInternalCursorOffset(offset);
		}
	};

	useEffect(() => {
		if (!focus || !showCursor) {
			return;
		}

		const newValue = originalValue || '';

		if (cursorOffset > newValue.length) {
			setCursorOffset(newValue.length);
		}
	}, [originalValue, focus, showCursor, cursorOffset]);

	const value = mask ? mask.repeat(originalValue.length) : originalValue;
	let renderedValue = value;
	let renderedPlaceholder = placeholder ? chalk.grey(placeholder) : undefined;

	if (showCursor && focus) {
		renderedPlaceholder =
			placeholder.length > 0
				? chalk.inverse(placeholder[0]) + chalk.grey(placeholder.slice(1))
				: chalk.inverse(' ');

		renderedValue = value.length > 0 ? '' : chalk.inverse(' ');

		let i = 0;

		for (const char of value) {
			renderedValue += i === cursorOffset ? chalk.inverse(char) : char;
			i++;
		}

		if (value.length > 0 && cursorOffset === value.length) {
			renderedValue += chalk.inverse(' ');
		}
	}

	useInput(
		(input, key) => {
			if (
				key.upArrow ||
				key.downArrow ||
				(key.ctrl && input === 'c') ||
				key.tab ||
				(key.shift && key.tab)
			) {
				return;
			}

			if (key.return) {
				if (onSubmit) {
					onSubmit(originalValue);
				}

				return;
			}

			let nextCursorOffset = cursorOffset;
			let nextValue = originalValue;

			// Handle option+b (backward word) and option+f (forward word)
			if (input === 'b' && key.meta) {
				// Jump to previous word boundary
				if (showCursor && cursorOffset > 0) {
					const beforeCursor = originalValue.slice(0, cursorOffset);
					const match = beforeCursor.match(/\S+\s*$/);
					nextCursorOffset = match ? cursorOffset - match[0].length : 0;
				}
			} else if (input === 'f' && key.meta) {
				// Jump to next word boundary
				if (showCursor && cursorOffset < originalValue.length) {
					const afterCursor = originalValue.slice(cursorOffset);
					const match = afterCursor.match(/^\S+/);
					nextCursorOffset = match
						? cursorOffset + match[0].length
						: originalValue.length;
				}
			} else if (key.leftArrow) {
				if (showCursor && cursorOffset > 0) {
					nextCursorOffset--;
				}
			} else if (key.rightArrow) {
				if (showCursor && cursorOffset < originalValue.length) {
					nextCursorOffset++;
				}
			} else if (key.backspace || key.delete) {
				if (key.meta) {
					// Cmd + Backspace: delete everything
					nextValue = '';
					nextCursorOffset = 0;
				} else if (cursorOffset > 0) {
					nextValue =
						originalValue.slice(0, cursorOffset - 1) +
						originalValue.slice(cursorOffset, originalValue.length);

					nextCursorOffset--;
				}
			} else {
				nextValue =
					originalValue.slice(0, cursorOffset) +
					input +
					originalValue.slice(cursorOffset, originalValue.length);

				nextCursorOffset += input.length;
			}

			setCursorOffset(nextCursorOffset);

			if (nextValue !== originalValue) {
				onChange(nextValue);
			}
		},
		{isActive: focus},
	);

	return (
		<Text>
			{placeholder
				? value.length > 0
					? renderedValue
					: renderedPlaceholder
				: renderedValue}
		</Text>
	);
}

export default TextInput;
