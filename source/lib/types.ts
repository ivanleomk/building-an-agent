import {z} from 'zod';
import {FILE_TOOLS} from './tools/file.js';

export type ToolSchema = {
	name: string;
	description: string;
	input_schema: z.ZodType<any>;
	execute: (args: any) => Promise<any>;
};

export interface Provider {
	complete(
		conversation: ConversationItem[],
		model?: string,
		tools?: ToolSchema[],
	): AsyncGenerator<ProviderEvent>;
}

export type ContentBlock =
	| {type: 'text'; text: string}
	| {type: 'reasoning'; text: string; signature?: string}
	| {
			type: 'image';
			source:
				| {
						type: 'base64';
						data: string;
						mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
				  }
				| {type: 'url'; url: string};
	  }
	| {
			type: 'tool_call';
			tool_id: string;
			name: Tool['name'];
			args: Tool['args'] | string;
	  };

export type Message = {
	type: 'message';
	role: 'assistant' | 'user';
	content: ContentBlock[];
};

export type ConversationItem = Message | Tool;

export type ProviderEvent =
	| {type: 'start_message'; role: 'assistant' | 'user'}
	| {
			type: 'content_delta';
			delta: string;
			index: number;
			input_type: 'text' | 'reasoning';
	  }
	| {type: 'update_metadata'; index: number; key: string; value: string}
	| {type: 'tool_call_start'; index: number; id: string; name: string}
	| {type: 'tool_call_delta'; index: number; argsDelta: string}
	| {type: 'content_block_end'; index: number}
	| {type: 'end_message'}
	| {type: 'add_tool_result'; tool: Tool}
	| {type: 'error'; message: string};

export const TOOLS = [...FILE_TOOLS];

type ToolResult<T extends ToolSchema> = {
	type: 'tool';
	tool_id: string;
	name: T['name'];
	args: z.infer<T['input_schema']>;
	output: ContentBlock[];
	status: 'pending' | 'success' | 'error';
};

export type Tool = ToolResult<(typeof TOOLS)[number]>;
