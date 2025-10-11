import {z} from 'zod';
import type {ContentBlock} from '../types.js';
import {execa} from 'execa';

export const bashArgsSchema = z.object({
	command: z.string(),
	cwd: z.string().optional(),
});

async function executeBash(
	args: z.infer<typeof bashArgsSchema>,
): Promise<ContentBlock[]> {
	const result = await execa(args.command, {
		shell: process.env['SHELL'],
		cwd: args.cwd,
		reject: false,
	});
	const output = result.stdout + (result.stderr ? '\n' + result.stderr : '');
	return [{type: 'text' as const, text: output}];
}

export const BASH_TOOLS = [
	{
		name: 'bash',
		description: 'Execute a shell command and return the output. Note: Use absolute paths, as tilde (~) expansion is not supported.',
		input_schema: bashArgsSchema,
		execute: executeBash,
	},
] as const;
