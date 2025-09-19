#!/usr/bin/env node

/**
 * MCP Server Test Client
 * Run this to test if the MCP server is working correctly
 *
 * Usage: node test-mcp-server.js
 */

const WebSocket = require('ws');
const http = require('http');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const WS_PORT = 3030;
const HTTP_PORT = 3031;

console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
console.log(`${colors.cyan}MCP Server Test Client${colors.reset}`);
console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

let testsRun = 0;
let testsPassed = 0;

/**
 * Test HTTP Health endpoint
 */
function testHTTPHealth() {
    return new Promise((resolve) => {
        console.log(`${colors.blue}[TEST 1] HTTP Health Check${colors.reset}`);
        console.log(`  Checking http://localhost:${HTTP_PORT}/api/health`);

        const options = {
            hostname: 'localhost',
            port: HTTP_PORT,
            path: '/api/health',
            method: 'GET',
            timeout: 3000
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log(`  ${colors.green}✅ PASS${colors.reset} - HTTP health check successful`);
                    console.log(`  Response: ${data}\n`);
                    testsPassed++;
                    resolve(true);
                } else {
                    console.log(`  ${colors.red}❌ FAIL${colors.reset} - HTTP returned status ${res.statusCode}\n`);
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.log(`  ${colors.red}❌ FAIL${colors.reset} - Could not connect to HTTP server`);
            console.log(`  Error: ${error.message}`);
            console.log(`  ${colors.yellow}Is the MCP server running on port ${HTTP_PORT}?${colors.reset}\n`);
            resolve(false);
        });

        req.on('timeout', () => {
            console.log(`  ${colors.red}❌ FAIL${colors.reset} - HTTP request timeout\n`);
            req.destroy();
            resolve(false);
        });

        req.end();
        testsRun++;
    });
}

/**
 * Test WebSocket connection
 */
function testWebSocket() {
    return new Promise((resolve) => {
        console.log(`${colors.blue}[TEST 2] WebSocket Connection${colors.reset}`);
        console.log(`  Connecting to ws://localhost:${WS_PORT}`);

        let ws;
        try {
            ws = new WebSocket(`ws://localhost:${WS_PORT}`);
        } catch (error) {
            console.log(`  ${colors.red}❌ FAIL${colors.reset} - Could not create WebSocket`);
            console.log(`  Error: ${error.message}\n`);
            testsRun++;
            resolve(false);
            return;
        }

        const timeout = setTimeout(() => {
            console.log(`  ${colors.red}❌ FAIL${colors.reset} - WebSocket connection timeout\n`);
            ws.close();
            resolve(false);
        }, 5000);

        ws.on('open', () => {
            console.log(`  ${colors.green}✅ Connected${colors.reset}`);

            // Send heartbeat
            console.log(`  Sending heartbeat...`);
            ws.send(JSON.stringify({ type: 'heartbeat' }));
        });

        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            console.log(`  Received: ${JSON.stringify(message)}`);

            if (message.type === 'connected' || message.type === 'heartbeat') {
                console.log(`  ${colors.green}✅ PASS${colors.reset} - WebSocket working correctly\n`);
                clearTimeout(timeout);
                testsPassed++;
                ws.close();
                resolve(true);
            }
        });

        ws.on('error', (error) => {
            console.log(`  ${colors.red}❌ FAIL${colors.reset} - WebSocket error`);
            console.log(`  Error: ${error.message}`);
            console.log(`  ${colors.yellow}Is the MCP server running on port ${WS_PORT}?${colors.reset}\n`);
            clearTimeout(timeout);
            resolve(false);
        });

        testsRun++;
    });
}

/**
 * Test agent response
 */
function testAgentResponse() {
    return new Promise((resolve) => {
        console.log(`${colors.blue}[TEST 3] Agent Response Test${colors.reset}`);
        console.log(`  Testing agent response via WebSocket...`);

        let ws;
        try {
            ws = new WebSocket(`ws://localhost:${WS_PORT}`);
        } catch (error) {
            console.log(`  ${colors.red}❌ FAIL${colors.reset} - Could not connect\n`);
            testsRun++;
            resolve(false);
            return;
        }

        const messageId = `test_${Date.now()}`;
        let startTime;

        const timeout = setTimeout(() => {
            console.log(`  ${colors.red}❌ FAIL${colors.reset} - Agent response timeout\n`);
            ws.close();
            resolve(false);
        }, 10000);

        ws.on('open', () => {
            const testMessage = {
                id: messageId,
                type: 'agent_request',
                agent: 'coder',
                role: 'Implementation',
                message: 'Test: Say "Hello from MCP Server"',
                timestamp: Date.now()
            };

            console.log(`  Sending test request to 'coder' agent...`);
            startTime = Date.now();
            ws.send(JSON.stringify(testMessage));
        });

        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());

            if (message.type === 'response' && message.id === messageId) {
                const responseTime = Date.now() - startTime;
                console.log(`  Response received in ${responseTime}ms`);
                console.log(`  Content: "${message.content?.substring(0, 100)}..."`);

                if (responseTime < 1000) {
                    console.log(`  ${colors.green}🚀 Excellent performance!${colors.reset}`);
                } else if (responseTime < 3000) {
                    console.log(`  ${colors.green}✅ Good performance${colors.reset}`);
                } else {
                    console.log(`  ${colors.yellow}⚠️ Slow response${colors.reset}`);
                }

                console.log(`  ${colors.green}✅ PASS${colors.reset} - Agent response working\n`);
                clearTimeout(timeout);
                testsPassed++;
                ws.close();
                resolve(true);
            }
        });

        ws.on('error', (error) => {
            console.log(`  ${colors.red}❌ FAIL${colors.reset} - WebSocket error: ${error.message}\n`);
            clearTimeout(timeout);
            resolve(false);
        });

        testsRun++;
    });
}

/**
 * Test HTTP API chat endpoint
 */
function testHTTPChat() {
    return new Promise((resolve) => {
        console.log(`${colors.blue}[TEST 4] HTTP API Chat${colors.reset}`);
        console.log(`  Testing POST to http://localhost:${HTTP_PORT}/api/chat`);

        const payload = JSON.stringify({
            agent: 'reviewer',
            message: 'Test: Review this code quality',
            role: 'Code Review'
        });

        const options = {
            hostname: 'localhost',
            port: HTTP_PORT,
            path: '/api/chat',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            },
            timeout: 5000
        };

        const startTime = Date.now();
        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                const responseTime = Date.now() - startTime;

                if (res.statusCode === 200) {
                    const response = JSON.parse(data);
                    console.log(`  Response received in ${responseTime}ms`);
                    console.log(`  Content: "${response.content?.substring(0, 100)}..."`);
                    console.log(`  ${colors.green}✅ PASS${colors.reset} - HTTP API working\n`);
                    testsPassed++;
                    resolve(true);
                } else {
                    console.log(`  ${colors.red}❌ FAIL${colors.reset} - HTTP returned status ${res.statusCode}\n`);
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.log(`  ${colors.red}❌ FAIL${colors.reset} - HTTP request failed`);
            console.log(`  Error: ${error.message}\n`);
            resolve(false);
        });

        req.on('timeout', () => {
            console.log(`  ${colors.red}❌ FAIL${colors.reset} - HTTP request timeout\n`);
            req.destroy();
            resolve(false);
        });

        req.write(payload);
        req.end();
        testsRun++;
    });
}

/**
 * Run all tests
 */
async function runTests() {
    await testHTTPHealth();
    await testWebSocket();
    await testAgentResponse();
    await testHTTPChat();

    // Summary
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}TEST SUMMARY${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);

    const passRate = Math.round((testsPassed / testsRun) * 100);

    console.log(`Tests Run: ${testsRun}`);
    console.log(`Tests Passed: ${testsPassed}`);
    console.log(`Pass Rate: ${passRate}%`);

    if (testsPassed === testsRun) {
        console.log(`\n${colors.green}🎉 All tests PASSED! MCP Server is working correctly.${colors.reset}`);
    } else if (testsPassed > 0) {
        console.log(`\n${colors.yellow}⚠️ Some tests failed. Check server configuration.${colors.reset}`);
    } else {
        console.log(`\n${colors.red}❌ All tests failed. Is the MCP server running?${colors.reset}`);
        console.log(`\nTo start the server:`);
        console.log(`1. Open VS Code with the Multi-Agent Chat extension`);
        console.log(`2. Check status bar for "MCP Server" indicator`);
        console.log(`3. Click to start, or use Command Palette: "Multi Agent Chat: Start MCP Server"`);
    }

    process.exit(testsPassed === testsRun ? 0 : 1);
}

// Run tests
runTests().catch(console.error);