# mcp-anilist

AniList MCP — wraps AniList GraphQL API (free, no auth)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_anime` | Search for anime by title. Returns title, episode count, status, score, genres, and synopsis. Use get_anime with the ID for full details. |
| `get_anime` | Get full anime details by ID. Returns title, synopsis, episodes, duration, status, score, genres, studios, and season information. |
| `trending_anime` | Get currently trending anime ranked by popularity. Returns title, status, score, episode count, and genres. Use get_anime with the ID for full details. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "anilist": {
      "url": "https://gateway.pipeworx.io/anilist/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Anilist data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
