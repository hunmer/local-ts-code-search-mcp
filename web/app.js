/**
 * Local TS Code Search MCP Web UI Application
 * 
 * Provides interactive interface for MCP tools
 */

class MCPWebApp {
    constructor() {
        // 自动检测API端口，默认为Web UI端口+1
        const currentPort = window.location.port;
        const apiPort = currentPort ? (parseInt(currentPort) + 1).toString() : '3003';
        // 总是使用绝对URL指向API端口
        this.apiBase = `http://${window.location.hostname}:${apiPort}/api`;
        this.results = [];
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.bindEvents();
        this.loadAvailableTools();
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Tool buttons
        document.getElementById('search-btn').addEventListener('click', () => this.executeSearch());
        document.getElementById('analysis-btn').addEventListener('click', () => this.executeAnalysis());
        document.getElementById('parse-btn').addEventListener('click', () => this.executeParse());
        
        // Clear results button
        document.getElementById('clear-results').addEventListener('click', () => this.clearResults());
        
        // Enter key support for inputs
        this.bindEnterKey('search-file-path', () => this.executeSearch());
        this.bindEnterKey('analysis-file-path', () => this.executeAnalysis());
        this.bindEnterKey('parse-file-path', () => this.executeParse());
    }

    /**
     * Bind Enter key to input fields
     */
    bindEnterKey(inputId, callback) {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    callback();
                }
            });
        }
    }

    /**
     * Load available tools from the API
     */
    async loadAvailableTools() {
        try {
            const response = await fetch(`${this.apiBase}/tools`);
            if (response.ok) {
                const data = await response.json();
                console.log('Available tools:', data);
                this.showNotification('Connected to MCP server', 'success');
            } else {
                throw new Error(`Server responded with ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to connect to MCP server:', error);
            this.showNotification('Failed to connect to MCP server. Please ensure the server is running.', 'warning');
        }
    }

    /**
     * Execute search tool
     */
    async executeSearch() {
        const filePath = document.getElementById('search-file-path').value.trim();
        const query = document.getElementById('search-query').value.trim();

        if (!filePath) {
            this.showNotification('Please enter a file path', 'warning');
            return;
        }

        const args = { filePath };
        if (query) {
            args.query = query;
        }

        await this.executeTool('search_local_ts_code', args, 'Search');
    }

    /**
     * Execute analysis tool
     */
    async executeAnalysis() {
        const filePath = document.getElementById('analysis-file-path').value.trim();

        if (!filePath) {
            this.showNotification('Please enter a file path', 'warning');
            return;
        }

        await this.executeTool('analysis_local_ts_code', { filePath }, 'Analysis');
    }

    /**
     * Execute parse tool
     */
    async executeParse() {
        const filePath = document.getElementById('parse-file-path').value.trim();

        if (!filePath) {
            this.showNotification('Please enter a file path', 'warning');
            return;
        }

        await this.executeTool('parse_local_ts_code', { filePath }, 'Parse');
    }

    /**
     * Execute a tool via the API
     */
    async executeTool(toolName, args, displayName) {
        this.showLoading(true);
        this.disableButtons(true);

        try {
            const response = await fetch(`${this.apiBase}/call`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tool: toolName,
                    args: args
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.addResult(displayName, data, true);
                this.showNotification(`${displayName} completed successfully`, 'success');
            } else {
                this.addResult(displayName, data, false);
                this.showNotification(`${displayName} failed: ${data.error || 'Unknown error'}`, 'error');
            }

        } catch (error) {
            console.error(`${displayName} error:`, error);
            this.addResult(displayName, { error: error.message }, false);
            this.showNotification(`${displayName} failed: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
            this.disableButtons(false);
        }
    }

    /**
     * Add a result to the results section
     */
    addResult(toolName, data, success) {
        const resultId = `result-${Date.now()}`;
        const resultCard = this.createResultCard(resultId, toolName, data, success);
        
        const container = document.getElementById('results-container');
        container.insertBefore(resultCard, container.firstChild);
        
        // Show results section
        document.getElementById('results-section').style.display = 'block';
        
        // Scroll to the new result
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        this.results.push({ id: resultId, toolName, data, success, timestamp: new Date() });
    }

    /**
     * Create a result card element
     */
    createResultCard(id, toolName, data, success) {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.id = id;

        const timestamp = new Date().toLocaleString();
        const statusClass = success ? 'meta-success' : 'meta-error';
        const statusText = success ? 'Success' : 'Error';

        card.innerHTML = `
            <div class="result-header" onclick="this.parentElement.querySelector('.result-body').classList.toggle('show')">
                <h4>${toolName} - ${timestamp}</h4>
                <span class="meta-item ${statusClass}">${statusText}</span>
            </div>
            <div class="result-body">
                <div class="result-meta">
                    <span class="meta-item meta-info">Tool: ${toolName}</span>
                    <span class="meta-item meta-info">Time: ${timestamp}</span>
                    ${this.createMetaItems(data)}
                </div>
                ${this.createResultContent(data, success)}
            </div>
        `;

        return card;
    }

    /**
     * Create meta items for result
     */
    createMetaItems(data) {
        let metaItems = '';
        
        if (data.content && data.content[0] && data.content[0].text) {
            try {
                const result = JSON.parse(data.content[0].text);
                
                if (result.filePath) {
                    metaItems += `<span class="meta-item meta-info">File: ${result.filePath}</span>`;
                }
                
                if (result.success !== undefined) {
                    const successClass = result.success ? 'meta-success' : 'meta-error';
                    metaItems += `<span class="meta-item ${successClass}">${result.success ? 'Success' : 'Failed'}</span>`;
                }
                
                if (result.summary && result.summary.healthLevel) {
                    metaItems += `<span class="meta-item meta-info">Health: ${result.summary.healthLevel}</span>`;
                }
                
                if (result.annotations && result.annotations.length) {
                    metaItems += `<span class="meta-item meta-info">Annotations: ${result.annotations.length}</span>`;
                }
            } catch (e) {
                // Ignore parsing errors
            }
        }
        
        return metaItems;
    }

    /**
     * Create result content based on data
     */
    createResultContent(data, success) {
        let content = '';
        
        if (data.error) {
            content += `<div class="alert alert-warning"><strong>Error:</strong> ${data.error}</div>`;
        }
        
        if (data.content && data.content[0] && data.content[0].text) {
            try {
                const result = JSON.parse(data.content[0].text);
                content += this.formatResult(result);
            } catch (e) {
                content += `<div class="code-block">${data.content[0].text}</div>`;
            }
        } else if (typeof data === 'object') {
            content += `<div class="code-block">${JSON.stringify(data, null, 2)}</div>`;
        } else {
            content += `<div class="code-block">${data}</div>`;
        }
        
        return content;
    }

    /**
     * Format result data for display
     */
    formatResult(result) {
        let content = '';
        
        // Summary section
        if (result.summary) {
            content += '<h5>Summary</h5>';
            content += `<div class="code-block">${JSON.stringify(result.summary, null, 2)}</div>`;
        }
        
        // Annotations section
        if (result.annotations && result.annotations.length > 0) {
            content += '<h5>Annotations</h5>';
            for (let i = 0; i < Math.min(3, result.annotations.length); i++) {
                const annotation = result.annotations[i];
                content += `
                    <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 6px;">
                        <strong>${annotation.symbol || 'Unknown'}</strong> (${annotation.kind || 'unknown'})
                        <br><small>Lines ${annotation.range?.startLine || 0}-${annotation.range?.endLine || 0}</small>
                        ${annotation.complexity ? `<br><small>Complexity: ${annotation.complexity}</small>` : ''}
                        ${annotation.minimal_comments ? `<br><em>${annotation.minimal_comments.join(', ')}</em>` : ''}
                    </div>
                `;
            }
            if (result.annotations.length > 3) {
                content += `<p><em>... and ${result.annotations.length - 3} more annotations</em></p>`;
            }
        }
        
        // Search results section
        if (result.results && Array.isArray(result.results)) {
            content += '<h5>Search Results</h5>';
            result.results.forEach((item, index) => {
                content += `
                    <div style="margin-bottom: 10px; padding: 8px; background: #f8f9fa; border-radius: 4px;">
                        <strong>${item.file || 'Unknown file'}</strong> (${item.type || 'unknown'})
                        ${item.details ? `<br><small>${JSON.stringify(item.details)}</small>` : ''}
                    </div>
                `;
            });
        }
        
        // Analysis section
        if (result.analysis) {
            content += '<h5>Analysis Details</h5>';
            content += `<div class="code-block">${JSON.stringify(result.analysis, null, 2)}</div>`;
        }
        
        // Next steps
        if (result.nextSteps) {
            content += '<h5>Next Steps</h5>';
            content += '<ul>';
            result.nextSteps.forEach(step => {
                content += `<li>${step}</li>`;
            });
            content += '</ul>';
        }
        
        // Raw data (collapsed by default)
        content += `
            <details style="margin-top: 20px;">
                <summary>Raw Data</summary>
                <div class="code-block">${JSON.stringify(result, null, 2)}</div>
            </details>
        `;
        
        return content;
    }

    /**
     * Show or hide loading indicator
     */
    showLoading(show) {
        const loading = document.getElementById('loading');
        if (show) {
            loading.classList.add('show');
        } else {
            loading.classList.remove('show');
        }
    }

    /**
     * Enable or disable all buttons
     */
    disableButtons(disable) {
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(btn => {
            btn.disabled = disable;
        });
    }

    /**
     * Clear all results
     */
    clearResults() {
        const container = document.getElementById('results-container');
        container.innerHTML = '';
        document.getElementById('results-section').style.display = 'none';
        this.results = [];
        this.showNotification('Results cleared', 'info');
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type}`;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.style.maxWidth = '300px';
        notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        notification.textContent = message;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);

        // Click to dismiss
        notification.addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }

    /**
     * Export results to JSON
     */
    exportResults() {
        const exportData = {
            timestamp: new Date().toISOString(),
            results: this.results
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `mcp-results-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        this.showNotification('Results exported successfully', 'success');
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.mcpApp = new MCPWebApp();
    
    // Add export button to results header
    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-secondary';
    exportBtn.style.marginLeft = '10px';
    exportBtn.innerHTML = '📥 Export';
    exportBtn.onclick = () => window.mcpApp.exportResults();
    
    const resultsHeader = document.querySelector('.results-header');
    if (resultsHeader) {
        resultsHeader.appendChild(exportBtn);
    }
    
    console.log('MCP Web App initialized');
});