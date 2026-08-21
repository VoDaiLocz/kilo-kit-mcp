---
name: "mcp-agent-patterns"
description: >-
  Use when integrating or optimizing Model Context Protocol (MCP) servers and clients. Keywords: MCP, Model Context Protocol, tool discovery, lazy loading, sampling, resource subscription, MCP server.
---
# MCP Agent Patterns (Model Context Protocol)

## Overview
The Model Context Protocol (MCP) provides a standardized way for AI agents to interact with external tools, data resources, and environments. This skill defines architectural patterns and implementation best practices for building, connecting, and optimizing MCP-based systems within the KILO-KIT ecosystem.

## When To Use
- Implementing custom MCP servers or clients.
- Integrating external services (APIs, DBs, filesystems) as MCP servers.
- Optimizing context windows when dealing with large tool catalogs.
- Implementing real-time resource synchronization or complex multi-server orchestrations.
- Security-critical integrations requiring isolated execution environments.

## Core MCP Concepts
- **Tools**: Executable functions exposed to the LLM.
- **Resources**: Data sources that can be read by the LLM (e.g., file contents, database records).
- **Prompts**: Reusable templates or workflows designed to be used by the LLM.
- **Sampling**: A protocol allowing an MCP server to request the host client to perform LLM inference on its behalf, enabling agentic tool behavior.

## Advanced Patterns

### Dynamic Tool Catalog & Progressive Loading
To prevent token bloat:
1. **Manifest Exposure**: Expose only essential, high-level tool definitions initially.
2. **On-Demand Loading**: Load detailed JSON Schemas only when a tool is selected or explicitly requested by the agent context.

### MCP Sampling Protocol
When a server needs LLM intelligence (e.g., parsing unstructured output or making a decision):
- The server issues a `sampling/createMessage` request to the client.
- The client acts as the host/gateway, maintaining control over the model selection and cost.

### Resource Streaming & Subscriptions
- Use **URI Templates** (`res://server/type/{id}`) to create flexible resource paths.
- Implement **Resource Subscriptions** to push data updates from the server to the client without polling.

### Eager vs Lazy Tool Registration
- **Eager**: Best for small sets of essential core tools (zero-latency startup).
- **Lazy**: Mandatory for large or dynamic catalogs to keep initial prompts lean.

### Multi-Server Orchestration
- **Namespace Routing**: Prefix tool names with server aliases (`serverA:toolX`).
- **Conflict Resolution**: Implement a central router to handle collisions between tools of the same name across different servers.

## Security Considerations
- **Server Sandboxing**: Run MCP servers in isolated containers or limited-permission processes.
- **Credential Isolation**: Inject sensitive environment variables (API keys, tokens) only into the specific server process that requires them. Use a secure configuration store (e.g., HashiCorp Vault) for production deployments.

## Quality Gates
- **Contract Verification**: Ensure MCP server implementations conform to the JSON-RPC message schema.
- **Context Hygiene**: Verify that only relevant tools/resources are included in the prompt; prune dormant subscriptions.
- **Error Handling**: Standardize error codes for common failures (e.g., timeout, auth denied, connection lost).

## MCP 2.0 Features (2025-2026)
- **OAuth 2.0 Auth**: Native support for delegated access without sharing long-lived keys.
- **Elicitation API**: Interactive flow where the client helps the user provide missing inputs for a tool call.
- **Structured Tool Results**: Formalized response types beyond simple strings (e.g., rich content types, UI components).

## References
- [MCP Official Documentation](https://modelcontextprotocol.io)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [KILO-KIT MCP Integration Best Practices](/home/vodailoc/KILO-KIT/docs/mcp-integration.md)
