import {z} from 'zod';
import fs from 'fs';
import type {ContentBlock} from '../types.js';

export const readFileArgsSchema = z.object({
	paths: z.array(z.string()),
});

export async function executeReadFile(
	args: z.infer<typeof readFileArgsSchema>,
): Promise<ContentBlock[]> {
	return args.paths.map(path => ({
		type: 'text',
		text: fs.readFileSync(path, 'utf8'),
	}));
}

export const FILE_TOOLS = [
	{
		name: 'read_file',
		description: 'Read files in parallel and return the contents',
		input_schema: readFileArgsSchema,
		execute: executeReadFile,
	},
];
