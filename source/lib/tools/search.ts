import {z} from 'zod';
import type {ContentBlock} from '../types.js';
import Exa from 'exa-js';

//@ts-ignore
const exa = new Exa(process.env['EXA_API_KEY'] || '');

export const searchWebArgsSchema = z.object({
	query: z.string(),
	numResults: z.number().optional().default(5),
	includeDomains: z.array(z.string()).optional(),
	excludeDomains: z.array(z.string()).optional(),
	startPublishedDate: z.string().optional(),
	endPublishedDate: z.string().optional(),
	type: z.enum(['keyword', 'neural', 'auto']).optional().default('auto'),
	category: z
		.enum([
			'company',
			'research paper',
			'news',
			'linkedin profile',
			'github',
			'tweet',
			'movie',
			'song',
			'personal site',
			'pdf',
			'financial report',
		])
		.optional(),
	includeText: z.boolean().optional().default(true),
	maxCharacters: z.number().optional().default(2000),
});

async function executeSearchWeb(
	args: z.infer<typeof searchWebArgsSchema>,
): Promise<ContentBlock[]> {
	if (!process.env['EXA_API_KEY']) {
		throw new Error('EXA_API_KEY environment variable is not set');
	}

	const {includeText, maxCharacters, ...searchParams} = args;

	const result = await exa.searchAndContents(searchParams.query, {
		...searchParams,
		text: includeText ? {maxCharacters} : undefined,
	});

	const formattedResults = result.results
		.map((r: any, idx: number) => {
			let output = `${idx + 1}. ${r.title}\n`;
			output += `   URL: ${r.url}\n`;
			if (r.publishedDate) {
				output += `   Published: ${r.publishedDate}\n`;
			}
			if (r.author) {
				output += `   Author: ${r.author}\n`;
			}
			if (r.text) {
				output += `   Content: ${r.text.slice(0, maxCharacters)}${
					r.text.length > maxCharacters ? '...' : ''
				}\n`;
			}
			return output;
		})
		.join('\n');

	return [{type: 'text' as const, text: formattedResults}];
}

export const queryArgsSchema = z.object({
	query: z.string(),
	includeText: z.boolean().optional().default(false),
});

async function executeQuery(
	args: z.infer<typeof queryArgsSchema>,
): Promise<ContentBlock[]> {
	if (!process.env['EXA_API_KEY']) {
		throw new Error('EXA_API_KEY environment variable is not set');
	}

	const result = await exa.answer(args.query, {text: args.includeText});

	let output = `Answer: ${result.answer}\n\nCitations:\n`;
	output += result.citations
		.map((citation: any, idx: number) => {
			let citationText = `${idx + 1}. ${citation.title}\n`;
			citationText += `   URL: ${citation.url}\n`;
			if (citation.publishedDate) {
				citationText += `   Published: ${citation.publishedDate}\n`;
			}
			if (args.includeText && citation.text) {
				citationText += `   Content: ${citation.text}\n`;
			}
			return citationText;
		})
		.join('\n');

	return [{type: 'text' as const, text: output}];
}

export const SEARCH_TOOLS = [
	{
		name: 'search_web',
		description:
			'Search the web. Returns relevant results with optional full text content. Best for finding recent information, research papers, news, or specific types of content.',
		input_schema: searchWebArgsSchema,
		execute: executeSearchWeb,
	},
	{
		name: 'query',
		description:
			'Ask a question and get a direct answer. Returns an answer with citations. Best for getting quick factual answers to questions.',
		input_schema: queryArgsSchema,
		execute: executeQuery,
	},
] as const;
