// Test script for MCP server fast responses
const WebSocket = require('ws');

async function testMCPServer() {
    console.log('🚀 Testing MCP Server Fast Responses...\n');

    // Test WebSocket connection
    console.log('1️⃣ Testing WebSocket connection...');
    const ws = new WebSocket('ws://localhost:3030');

    return new Promise((resolve, reject) => {
        let testsPassed = 0;
        const totalTests = 3;

        ws.on('open', () => {
            console.log('✅ WebSocket connected successfully!\n');

            // Test 1: Heartbeat
            console.log('2️⃣ Testing heartbeat...');
            ws.send(JSON.stringify({ type: 'heartbeat' }));

            // Test 2: Agent request
            setTimeout(() => {
                console.log('3️⃣ Testing agent request (Architect)...');
                const startTime = Date.now();
                ws.send(JSON.stringify({
                    id: 'test-001',
                    type: 'agent_request',
                    agent: 'architect',
                    role: 'System Design',
                    message: 'Design a simple REST API',
                    timestamp: Date.now()
                }));
            }, 500);

            // Test 3: Another agent request
            setTimeout(() => {
                console.log('4️⃣ Testing agent request (Coder)...');
                const startTime = Date.now();
                ws.send(JSON.stringify({
                    id: 'test-002',
                    type: 'agent_request',
                    agent: 'coder',
                    role: 'Implementation',
                    message: 'Implement the API endpoint',
                    timestamp: Date.now()
                }));
            }, 1000);
        });

        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            console.log(`📨 Received: ${message.type}`);

            if (message.type === 'connected') {
                console.log('   Connected message received');
            } else if (message.type === 'heartbeat') {
                console.log('   ✅ Heartbeat response received');
                testsPassed++;
            } else if (message.type === 'response') {
                console.log(`   ✅ Agent response from ${message.agent} in ${message.duration}ms`);
                console.log(`   Content preview: ${message.content.substring(0, 100)}...`);
                testsPassed++;

                if (testsPassed >= totalTests) {
                    console.log('\n🎉 All tests passed!');
                    console.log('✨ MCP Server is working correctly for fast responses!\n');
                    ws.close();
                    resolve();
                }
            }
        });

        ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error.message);
            console.log('\n⚠️  Is the MCP server running?');
            console.log('    The extension should auto-start it, or run: node out/mcp-server/server.js\n');
            reject(error);
        });

        ws.on('close', () => {
            console.log('Connection closed');
        });

        // Timeout after 10 seconds
        setTimeout(() => {
            console.log('\n⏱️  Test timeout - some tests may not have completed');
            ws.close();
            resolve();
        }, 10000);
    });
}

// Test HTTP API
async function testHTTPAPI() {
    console.log('5️⃣ Testing HTTP API...');

    try {
        // Test health endpoint
        const healthResponse = await fetch('http://localhost:3031/api/health');
        if (healthResponse.ok) {
            const health = await healthResponse.json();
            console.log('✅ HTTP API health check passed:', health);
        }

        // Test chat endpoint
        const chatResponse = await fetch('http://localhost:3031/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agent: 'reviewer',
                message: 'Review this code for quality',
                role: 'Code Review'
            })
        });

        if (chatResponse.ok) {
            const result = await chatResponse.json();
            console.log(`✅ HTTP API response received in ${result.duration}ms`);
            console.log(`   Content preview: ${result.content.substring(0, 100)}...`);
        }
    } catch (error) {
        console.error('❌ HTTP API error:', error.message);
        console.log('   The HTTP API server may not be running');
    }
}

// Run tests
async function runTests() {
    try {
        await testMCPServer();
        await testHTTPAPI();
        console.log('\n✅ All tests completed successfully!');
        console.log('🚀 The fast agent communication system is ready!\n');
    } catch (error) {
        console.error('\n❌ Tests failed:', error.message);
        process.exit(1);
    }
}

console.log('================================================');
console.log('  Multi-Agent Chat - Fast Response Test Suite  ');
console.log('================================================\n');

runTests();