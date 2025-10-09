import {z} from 'zod';
import archy from 'archy';
import fs from 'fs';
import type {ContentBlock} from '../types.js';
import {globby} from 'globby';
import path from 'path';

export const readFileArgsSchema = z.object({
	paths: z.array(z.string()),
});

export async function executeReadFile(
	args: z.infer<typeof readFileArgsSchema>,
): Promise<ContentBlock[]> {
	return args.paths.map(path => ({
		type: 'text' as const,
		text: fs.readFileSync(path, 'utf8'),
	}));
}

export const listFileArgSchema = z.object({
	directory: z.string(),
	maxDepth: z.int().optional().default(2),
});

function pathsToTree(paths: string[], rootDir: string, rootPath: string) {
	const tree: any = {label: path.basename(rootDir) + '/', nodes: []};

	paths.forEach(p => {
		const parts = p.split('/');
		let current = tree;

		parts.forEach((part, i) => {
			if (!current.nodes) current.nodes = [];

			const cleanPart = part.replace('/', '');
			let child = current.nodes.find(
				(n: any) => (n.label || n).replace('/', '') === cleanPart,
			);

			if (!child) {
				const fullPath = path.join(rootPath, parts.slice(0, i + 1).join('/'));
				const isDir =
					fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
				child = {label: part + (isDir ? '/' : '')};
				if (isDir) child.nodes = [];
				current.nodes.push(child);
			}

			current = child;
		});
	});

	return archy(tree);
}

async function executeListFile(
	args: z.infer<typeof listFileArgSchema>,
): Promise<ContentBlock[]> {
	const allFiles = await globby('**/*', {
		cwd: args.directory,
		gitignore: true,
		dot: false,
		deep: args.maxDepth + 1,
	});

	// Extract directories from all files
	const dirs = new Set<string>();
	allFiles.forEach(f => {
		const parts = f.split('/');
		for (let i = 0; i < parts.length - 1; i++) {
			dirs.add(parts.slice(0, i + 1).join('/'));
		}
	});

	// Combine files at maxDepth with dirs at maxDepth
	const files = [
		...allFiles.filter(f => f.split('/').length <= args.maxDepth),
		...Array.from(dirs).filter(d => d.split('/').length <= args.maxDepth),
	];

	const treeStr = pathsToTree(files, args.directory, args.directory);
	return [{type: 'text' as const, text: treeStr}];
}

export const createFileArgSchema = z.object({
	path: z.string(),
	content: z.string(),
});

async function executeCreateFile(args: z.infer<typeof createFileArgSchema>) {
	const {path, content} = args;
	fs.writeFileSync(path, content);

	return [{type: 'text' as const, text: `File ${args.path} created successfully`}];
}

export const replaceContentArgsSchema = z.object({
	path: z.string(),
	oldStr: z.string(),
	newStr: z.string(),
	replaceAll: z.boolean(),
});

async function executeReplaceContent(
	args: z.infer<typeof replaceContentArgsSchema>,
) {
	const {path, oldStr, newStr, replaceAll} = args;
	const fileContent = fs.readFileSync(path, 'utf8');

	if (!replaceAll) {
		const escaped = oldStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const occurrences = (fileContent.match(new RegExp(escaped, 'g')) || [])
			.length;
		if (occurrences === 0) {
			throw new Error(`String not found: "${oldStr}"`);
		}
		if (occurrences > 1) {
			throw new Error(
				`Found ${occurrences} instances of "${oldStr}". Use replace_all: true to replace all instances.`,
			);
		}
	}

	const newContent = fileContent.replaceAll(oldStr, newStr);

	fs.writeFileSync(path, newContent);

	return [{type: 'text' as const, text: 'Replaced content successfully'}];
}

export const FILE_TOOLS = [
	{
		name: 'read_file',
		description: 'Read files in parallel and return the contents',
		input_schema: readFileArgsSchema,
		execute: executeReadFile,
	},
	{
		name: 'list_files',
		description:
			'List files in a directory starting from the directory stated. Max depth of 2 by default',
		input_schema: listFileArgSchema,
		execute: executeListFile,
	},
	{
		name: 'create_file',
		description: 'Create a new file with the given content',
		input_schema: createFileArgSchema,
		execute: executeCreateFile,
	},
	{
		name: 'replace_content',
		description:
			'Replace content in a file. If replace_all is false, validates there is only one occurrence.',
		input_schema: replaceContentArgsSchema,
		execute: executeReplaceContent,
	},
];
