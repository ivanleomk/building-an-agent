import type { READ_FILE_TOOL_NAME, ReadFileArgs } from './tools/file.js';

export type ItemID = string;

export type ToolName = typeof READ_FILE_TOOL_NAME;

export type ToolArgs = ReadFileArgs;

export type ToolCall = {
	type: 'tool_call';
	tool_id: string;
	name: ToolName;
	args: ToolArgs;
};

export type ContentBlock =
	| { type: 'text'; text: string }
	| { type: 'image'; mimeType: string; data: string }
	| ToolCall;

export type Message = {
	id: ItemID;
	role: 'assistant' | 'user';
	content: ContentBlock[];
};

export type Tool = {
	id: ItemID;
	name: ToolName;
	tool_id: string;
	args: ToolArgs;
	status: 'running' | 'completed' | 'error';
	content?: ContentBlock[];
	error?: string;
};

export type ConversationItem = Message | Tool;
