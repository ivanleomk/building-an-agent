import readline from "readline";
import chalk from "chalk";
import Anthropic from "@anthropic-ai/sdk";
import { toJSONSchema, z } from "zod";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const client = new Anthropic();
const execAsync = promisify(exec);

const readFile = (args: { path: string }) => {
  const fileExists = fs.existsSync(args.path);

  if (!fileExists) {
    return `File does not exist at ${args.path}`;
  }

  return fs.readFileSync(args.path, "utf8");
};

const listFile = async (args: { path: string }) => {
  try {
    const { stdout } = await execAsync(
      `npx tree-cli ${args.path} -I "node_modules|.git|dist|build|.next|.vscode|coverage|node_modules"`
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
  const content = readFile({ path: args.path });
  const updatedContent = content.replace(args.old_string, args.new_string);
  fs.writeFileSync(args.path, updatedContent);
};

const createFile = async (args: { path: string; content: string }) => {
  const dir = args.path.substring(0, args.path.lastIndexOf("/"));
  if (dir) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(args.path, args.content);
  return `File ${args.path} created successfully`;
};

const tool_defs = [
  {
    name: "read_file",
    description: "Read a file from the local file system",
    args: z.object({
      path: z.string(),
    }),
    execute: readFile,
  },
  {
    name: "create_file",
    description: "Create a file in the local file system",
    args: z.object({
      path: z.string(),
      content: z.string(),
    }),
    execute: createFile,
  },
  {
    name: "edit_file",
    description: "Edit a file in the local file system",
    args: z.object({
      path: z.string(),
      old_string: z.string(),
      new_string: z.string(),
    }),
    execute: editFile,
  },
  {
    name: "list_files",
    description: "List files in a directory",
    args: z.object({
      path: z.string(),
    }),
    execute: listFile,
  },
];

const tools = tool_defs.map((item) => ({
  name: item.name,
  description: item.description,
  input_schema: {
    ...toJSONSchema(item.args),
    type: "object" as const,
  },
}));

const getUserInput = (): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(chalk.green("You: "), (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

const executeTool = async (tool_name: string, args: any) => {
  const tool = tool_defs.find((tool) => tool.name === tool_name);
  if (!tool) {
    return "Tool not found";
  }
  // Execute and validate that we have the right tools
  try {
    const result = await tool.execute(tool.args.parse(args));
    return result;
  } catch (e) {
    console.log(e);
    return "Error executing tool";
  }
};

const run = async () => {
  console.log(chalk.cyanBright("Welcome to Amie!"));
  const conversations: Anthropic.MessageParam[] = [];
  let processUserInput: boolean = true;
  while (true) {
    if (processUserInput) {
      const userInput = await getUserInput();
      if (userInput === "q" || userInput === "quit") {
        break;
      }
      conversations.push({ role: "user", content: userInput });
    }

    // Reset processUserInput
    processUserInput = true;

    const completion = await client.messages.create({
      model: "claude-sonnet-4-0",
      messages: conversations,
      max_tokens: 4096,
      tools: tools,
    });

    for (const message of completion.content) {
      switch (message.type) {
        case "text": {
          conversations.push({ role: "assistant", content: message.text });
          console.log(chalk.blue(`Claude: ${message.text}`));
          break;
        }
        case "tool_use": {
          console.log(
            chalk.yellow(
              `tool : ${message.name}(${JSON.stringify(message.input)})`
            )
          );
          conversations.push({
            role: "assistant",
            content: [
              {
                id: message.id,
                input: message.input,
                name: message.name,
                type: "tool_use",
              },
            ],
          });

          const tool_execution_result = await executeTool(
            message.name,
            message.input
          );
          conversations.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: message.id,
                content: tool_execution_result,
              },
            ],
          });
          processUserInput = false;
          break;
        }
        default: {
          console.log("Unknown message type:", JSON.stringify(message));
        }
      }
    }
  }

  console.log("Exiting...");
};

run();
