# AI Assistant CLI

AI Assistant CLI is a powerful command-line interface tool that leverages large language models (LLMs) to assist with various tasks. It provides a flexible and extensible framework for interacting with AI models, managing tools, and handling multiple sessions.

## Features

- Interactive command-line interface
- Multiple session support
- Extensible tool system
- Integration with Claude and Gemini AI models
- Memory management with Chroma vector database
- Error handling and logging
- Customizable workflows

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/ai-assistant-cli.git
   ```

2. Install dependencies:
   ```
   cd ai-assistant-cli
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the project root and add the following:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key
   GOOGLE_API_KEY=your_google_api_key
   GOOGLE_CX_ID=your_google_cx_id
   NEWS_API_KEY=your_news_api_key
   PLAYHT_AUTHORIZATION=your_playht_authorization
   PLAYHT_USER_ID=your_playht_user_id
   PLAYHT_MALE_VOICE=your_playht_male_voice_id
   PLAYHT_FEMALE_VOICE=your_playht_female_voice_id
   ```

4. Start the Chroma vector database:
   ```
   docker run -p 8000:8000 chromadb/chroma
   ```

5. Run the AI Assistant CLI:
   ```
   npm start
   ```

## Usage

### Interactive Mode

To start the AI Assistant CLI in interactive mode, simply run:

```
npm start
```

This will launch the CLI interface where you can enter commands and interact with the AI assistant.

### Command-line Mode

You can also use the AI Assistant CLI directly from the command line by passing a query:

```
npm start "What is the weather like today?"
```

### Special Commands

- `.help`: Show help message
- `.debug`: Toggle debug mode on/off
- `.history`: Show command history for the current session
- `.state`: Show current state of the session
- `.exit`: Exit the current session
- `Ctrl+A`: Create a new session
- `Ctrl+C`: Switch to the next session

### Tool Management

- `.tool list`: List all available tools
- `.tool add <name> <file> [tags]`: Add a new tool
- `.tool update <name> <file>`: Update an existing tool
- `.tool rollback <name> <version>`: Rollback a tool to a specific version
- `.tool history <name>`: Show version history of a tool

## Extending the AI Assistant

### Adding New Tools

1. Create a new TypeScript file in the `assistant/tools` directory.
2. Define your tool's functionality, including its schema and execute function.
3. Export the tool as a module.
4. The tool will be automatically loaded and available for use.

### Customizing Workflows

You can customize the behavior of the AI Assistant by modifying the `CoreWorkflow` class in `assistant/workflow.ts`. This allows you to add new features, change how tasks are processed, or integrate with additional services.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.