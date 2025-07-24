import {z, toJSONSchema} from 'zod';
import fs from 'fs';
import {exec} from 'child_process';
import {promisify} from 'util';
const execAsync = promisify(exec);

const readFile = async (args: {path: string}) => {
	const fileExists = fs.existsSync(args.path);

	if (!fileExists) {
		return `File does not exist at ${args.path}`;
	}

	const stats = fs.statSync(args.path);
	if (stats.isDirectory()) {
		const files = fs.readdirSync(args.path);
		return `This is a directory. Contents:\n${files.join('\n')}`;
	}
	return fs.readFileSync(args.path, 'utf8');
};

const listFile = async (args: {path: string}) => {
	try {
		const {stdout} = await execAsync(
			`npx tree-cli ${args.path} -I "node_modules|.git|dist|build|.next|.vscode|coverage|node_modules"`,
		);
		return stdout;
	} catch (error) {
		return `Directory not found: ${args.path}`;
	}
};

const editFile = async (args: {
	path: string;
	old_string: string;
	new_string: string;
}) => {
	const content = await readFile({path: args.path});
	const updatedContent = content.replace(args.old_string, args.new_string);
	fs.writeFileSync(args.path, updatedContent);

	return `Updated ${args.path} with new content`;
};

const createFile = async (args: {path: string; content: string}) => {
	const dir = args.path.substring(0, args.path.lastIndexOf('/'));
	if (dir) {
		fs.mkdirSync(dir, {recursive: true});
	}
	fs.writeFileSync(args.path, args.content);
	return `File ${args.path} created successfully`;
};

export const tool_defs = [
	{
		name: 'read_file',
		description: 'Read a file from the local file system',
		args: z.object({
			path: z.string(),
		}),
		execute: readFile,
	},
	{
		name: 'create_file',
		description: 'Create a file in the local file system',
		args: z.object({
			path: z.string(),
			content: z.string(),
		}),
		execute: createFile,
	},
	{
		name: 'edit_file',
		description: 'Edit a file in the local file system',
		args: z.object({
			path: z.string(),
			old_string: z.string(),
			new_string: z.string(),
		}),
		execute: editFile,
	},
	{
		name: 'list_files',
		description: 'List files in a directory',
		args: z.object({
			path: z.string(),
		}),
		execute: listFile,
	},
];

export const tools = tool_defs.map(item => ({
	name: item.name,
	description: item.description,
	input_schema: {
		...toJSONSchema(item.args),
		type: 'object' as const,
	},
}));
