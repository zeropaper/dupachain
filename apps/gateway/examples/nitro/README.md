# Example: Nitro snowboards

This folder contains the file for the Nitro snowboards example.

## Structure

### `prompts`

Contains a set of prompts, as `.txt` files, for the example.

### `personas`

Contains a set of personas to test the example with.

The persona files are YAML files with the following structure:

```yaml
profile: A description of the persona
maxCalls: The maximum number of calls the persona will make
```

When running an evaluation, the persona will answer an JSON object with the
following structure:

```json
{
  "message": "The message to be sent to the bot",
  "reasoning": "The reasoning behind the message",
  "goalMet": false // whenever the goal of the chat was met or not
}
```

## How to run

From the app directory (`../../`), run the following command:

```bash
pnpm eval
```
