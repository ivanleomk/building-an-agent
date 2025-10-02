import {z} from 'zod';
import {promises as fs} from 'fs';
import type {ContentBlock} from '../types.js';

export const READ_FILE_TOOL_NAME = 'read_file' as const;

export const ReadFileArgsSchema = z.object({
	files: z
		.array(
			z.object({
				file_path: z
					.string()
					.describe('Relative or absolute path to the file'),
			}),
		)
		.min(1)
		.describe('Array of files to read'),
});

export type ReadFileArgs = z.infer<typeof ReadFileArgsSchema>;

export async function executeReadFile(
	args: ReadFileArgs,
): Promise<ContentBlock[]> {
	const results: ContentBlock[] = [];

	for (const file of args.files) {
		try {
			const content = await fs.readFile(file.file_path, 'utf8');
			results.push({
				type: 'text',
				text: `File: ${file.file_path}\n\n${content}`,
			});
		} catch (error) {
			results.push({
				type: 'text',
				text: `Error reading ${file.file_path}: ${
					error instanceof Error ? error.message : String(error)
				}`,
			});
		}
	}

	return results;
}
