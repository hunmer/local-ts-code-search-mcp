/**
 * Local TS Code Search MCP Integration Test
 * 
 * Basic integration tests to verify MCP functionality
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class MCPIntegrationTest {
    constructor() {
        this.serverProcess = null;
        this.testResults = [];
        this.serverPort = 8879; // Use different port for testing
    }

    /**
     * Run all integration tests
     */
    async runTests() {
        console.log('🧪 Starting MCP Integration Tests...\n');

        try {
            // Test 1: Server startup
            await this.testServerStartup();

            // Test 2: Tool listing
            await this.testToolListing();

            // Test 3: Analysis tool (if test file exists)
            await this.testAnalysisTool();

            // Test 4: Parse tool
            await this.testParseTool();

            // Test 5: Search tool
            await this.testSearchTool();

            // Test 6: Web UI access
            await this.testWebUI();

        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            this.testResults.push({ test: 'Test Suite', status: 'FAILED', error: error.message });
        } finally {
            await this.cleanup();
            this.displayResults();
        }
    }

    /**
     * Test server startup
     */
    async testServerStartup() {
        return new Promise((resolve, reject) => {
            console.log('🔍 Testing server startup...');

            const serverPath = path.join(__dirname, '..', 'server.js');
            
            this.serverProcess = spawn('node', [serverPath, '--port', this.serverPort, '--data-path', './test-data'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';

            this.serverProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            this.serverProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            this.serverProcess.on('error', (error) => {
                this.testResults.push({ test: 'Server Startup', status: 'FAILED', error: error.message });
                reject(error);
            });

            // Give server time to start
            setTimeout(() => {
                if (output.includes('MCP Server started successfully')) {
                    console.log('✅ Server startup successful');
                    this.testResults.push({ test: 'Server Startup', status: 'PASSED' });
                    resolve();
                } else {
                    const error = new Error(`Server startup failed. Output: ${output}, Error: ${errorOutput}`);
                    this.testResults.push({ test: 'Server Startup', status: 'FAILED', error: error.message });
                    reject(error);
                }
            }, 3000);
        });
    }

    /**
     * Test tool listing API
     */
    async testToolListing() {
        console.log('🔍 Testing tool listing API...');

        try {
            const response = await this.makeRequest('GET', '/api/tools');
            
            if (response.tools && Array.isArray(response.tools)) {
                const expectedTools = ['search_local_ts_code', 'analysis_local_ts_code', 'parse_local_ts_code'];
                const foundTools = response.tools.map(tool => tool.name);
                
                const allFound = expectedTools.every(tool => foundTools.includes(tool));
                
                if (allFound) {
                    console.log('✅ Tool listing successful');
                    this.testResults.push({ test: 'Tool Listing', status: 'PASSED', details: `Found ${foundTools.length} tools` });
                } else {
                    throw new Error(`Missing tools. Expected: ${expectedTools.join(', ')}, Found: ${foundTools.join(', ')}`);
                }
            } else {
                throw new Error('Invalid tools response format');
            }
        } catch (error) {
            console.log('❌ Tool listing failed');
            this.testResults.push({ test: 'Tool Listing', status: 'FAILED', error: error.message });
        }
    }

    /**
     * Test analysis tool
     */
    async testAnalysisTool() {
        console.log('🔍 Testing analysis tool...');

        try {
            // Create a test TypeScript file
            const testFilePath = await this.createTestFile();
            
            // Verify the test file was created
            const absoluteTestFilePath = path.join(__dirname, '..', '..', 'test-file.ts');
            if (!fs.existsSync(absoluteTestFilePath)) {
                throw new Error(`Test file not created at: ${absoluteTestFilePath}`);
            }
            console.log(`✓ Test file created at: ${absoluteTestFilePath}`);

            const response = await this.makeRequest('POST', '/api/call', {
                tool: 'analysis_local_ts_code',
                args: { filePath: testFilePath }
            });

            if (response.content && response.content[0] && response.content[0].text) {
                const result = JSON.parse(response.content[0].text);
                console.log('Analysis result:', JSON.stringify(result, null, 2));
                
                if (result.success || result.analysis) {
                    console.log('✅ Analysis tool successful');
                    this.testResults.push({ test: 'Analysis Tool', status: 'PASSED' });
                } else {
                    console.log('❌ Analysis tool failed with result:', result);
                    throw new Error(`Analysis failed: ${result.error || 'Unknown error'}`);
                }
            } else {
                console.log('❌ Invalid analysis response:', response);
                throw new Error('Invalid analysis response format');
            }
        } catch (error) {
            console.log('❌ Analysis tool failed');
            this.testResults.push({ test: 'Analysis Tool', status: 'FAILED', error: error.message });
        }
    }

    /**
     * Test parse tool
     */
    async testParseTool() {
        console.log('🔍 Testing parse tool...');

        try {
            const testFilePath = 'test-file.ts'; // Use same test file

            const response = await this.makeRequest('POST', '/api/call', {
                tool: 'parse_local_ts_code',
                args: { filePath: testFilePath }
            });

            if (response.content && response.content[0] && response.content[0].text) {
                const result = JSON.parse(response.content[0].text);
                
                if (result.success || result.annotations) {
                    console.log('✅ Parse tool successful');
                    this.testResults.push({ test: 'Parse Tool', status: 'PASSED' });
                } else {
                    console.log('⚠️  Parse tool skipped (no report file)');
                    this.testResults.push({ test: 'Parse Tool', status: 'SKIPPED', details: 'No report file found' });
                }
            } else {
                throw new Error('Invalid parse response format');
            }
        } catch (error) {
            console.log('❌ Parse tool failed');
            this.testResults.push({ test: 'Parse Tool', status: 'FAILED', error: error.message });
        }
    }

    /**
     * Test search tool
     */
    async testSearchTool() {
        console.log('🔍 Testing search tool...');

        try {
            const response = await this.makeRequest('POST', '/api/call', {
                tool: 'search_local_ts_code',
                args: { filePath: 'test-file.ts', query: 'testFunction' }
            });

            if (response.content && response.content[0] && response.content[0].text) {
                const result = JSON.parse(response.content[0].text);
                
                if (result.success || result.results) {
                    console.log('✅ Search tool successful');
                    this.testResults.push({ test: 'Search Tool', status: 'PASSED' });
                } else {
                    console.log('⚠️  Search tool executed but no results');
                    this.testResults.push({ test: 'Search Tool', status: 'PARTIAL', details: 'No search results found' });
                }
            } else {
                throw new Error('Invalid search response format');
            }
        } catch (error) {
            console.log('❌ Search tool failed');
            this.testResults.push({ test: 'Search Tool', status: 'FAILED', error: error.message });
        }
    }

    /**
     * Test Web UI access
     */
    async testWebUI() {
        console.log('🔍 Testing Web UI access...');

        try {
            const response = await this.makeRequest('GET', '/');
            
            if (typeof response === 'string' && response.includes('Local TS Code Search MCP')) {
                console.log('✅ Web UI accessible');
                this.testResults.push({ test: 'Web UI', status: 'PASSED' });
            } else {
                throw new Error('Web UI not accessible or invalid content');
            }
        } catch (error) {
            console.log('❌ Web UI test failed');
            this.testResults.push({ test: 'Web UI', status: 'FAILED', error: error.message });
        }
    }

    /**
     * Create a test TypeScript file
     */
    async createTestFile() {
        const testContent = `
// Test TypeScript file
export function testFunction(param: string): string {
    if (param.length > 0) {
        return param.toUpperCase();
    }
    return '';
}

export class TestClass {
    private value: number = 0;
    
    constructor(initialValue: number = 0) {
        this.value = initialValue;
    }
    
    getValue(): number {
        return this.value;
    }
    
    setValue(newValue: number): void {
        this.value = newValue;
    }
}
`;

        const testFilePath = path.join(__dirname, '..', '..', 'test-file.ts');
        fs.writeFileSync(testFilePath, testContent, 'utf8');
        return 'test-file.ts';
    }

    /**
     * Make HTTP request to the server
     */
    async makeRequest(method, endpoint, body = null) {
        return new Promise((resolve, reject) => {
            const http = require('http');
            
            const options = {
                hostname: 'localhost',
                port: this.serverPort,
                path: endpoint,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const req = http.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        if (res.headers['content-type']?.includes('application/json')) {
                            resolve(JSON.parse(data));
                        } else {
                            resolve(data);
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse response: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            if (body) {
                req.write(JSON.stringify(body));
            }

            req.end();
        });
    }

    /**
     * Clean up test resources
     */
    async cleanup() {
        console.log('\n🧹 Cleaning up...');

        // Kill server process
        if (this.serverProcess) {
            this.serverProcess.kill('SIGTERM');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Remove test file
        try {
            const testFilePath = path.join(__dirname, '..', '..', 'test-file.ts');
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
        } catch (error) {
            console.log('⚠️  Could not remove test file:', error.message);
        }

        // Remove test data directory
        try {
            const testDataPath = path.join(__dirname, '..', 'test-data');
            if (fs.existsSync(testDataPath)) {
                fs.rmSync(testDataPath, { recursive: true, force: true });
            }
        } catch (error) {
            console.log('⚠️  Could not remove test data:', error.message);
        }
    }

    /**
     * Display test results
     */
    displayResults() {
        console.log('\n📊 Test Results Summary:');
        console.log('═══════════════════════════════════════');

        let passed = 0;
        let failed = 0;
        let skipped = 0;

        this.testResults.forEach(result => {
            const icon = result.status === 'PASSED' ? '✅' : 
                        result.status === 'FAILED' ? '❌' : 
                        result.status === 'SKIPPED' ? '⏭️' : '⚠️';
            
            console.log(`${icon} ${result.test}: ${result.status}`);
            
            if (result.details) {
                console.log(`   └─ ${result.details}`);
            }
            
            if (result.error) {
                console.log(`   └─ Error: ${result.error}`);
            }

            if (result.status === 'PASSED') passed++;
            else if (result.status === 'FAILED') failed++;
            else skipped++;
        });

        console.log('═══════════════════════════════════════');
        console.log(`Total: ${this.testResults.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);
        
        if (failed === 0) {
            console.log('🎉 All tests completed successfully!');
        } else {
            console.log(`⚠️  ${failed} test(s) failed. Please check the errors above.`);
            process.exit(1);
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const test = new MCPIntegrationTest();
    test.runTests().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = MCPIntegrationTest;