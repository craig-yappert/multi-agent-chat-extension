# Architecture Documentation

This directory contains technical architecture documentation for the Multi Agent Chat extension.

## Contents

### Core Architecture
- **[ARCHITECTURE_REDESIGN.md](./ARCHITECTURE_REDESIGN.md)** - Complete system redesign with enhanced multi-agent capabilities, provider system, and performance optimizations

### MCP Implementation
- **[MCP_ARCHITECTURE.md](./MCP_ARCHITECTURE.md)** - Model Context Protocol server implementation, including WebSocket and HTTP API servers, message routing, and validation

### Communication Systems
- **[INTER_AGENT_COMM.md](./INTER_AGENT_COMM.md)** - Inter-agent communication hub design for collaborative responses and context sharing

## Key Concepts

### Agent System
- 7 specialized agents with unique roles
- Team agent for coordinated responses
- Configurable providers per agent

### Provider Architecture
- WebSocket provider for MCP server
- HTTP API fallback
- CLI provider for direct Claude integration
- Intelligent routing with performance metrics

### Performance Features
- Response caching (5-minute TTL)
- Streaming support
- Quick team mode
- Adaptive timeouts

## Adding New Documentation

When adding new architecture documents:
1. Place technical design documents here
2. Update this README with a description
3. Link from the main docs index
4. Include diagrams in a subfolder if needed