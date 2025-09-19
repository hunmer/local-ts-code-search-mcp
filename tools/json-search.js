#!/usr/bin/env node

/**
 * JSON Search Tool
 * 
 * A powerful tool to search through JSON files in reports/ and parsed/ directories
 * with support for dependency filtering, function filtering, and JSONPath queries.
 * 
 * Usage:
 *   node tools/json-search.js --dependencies lib/utils.ts --function Button
 *   node tools/json-search.js --target reports/button.json --dependencies @radix-ui
 *   node tools/json-search.js --use jsonpath "$.analysis.functions[*].name"
 *   node tools/json-search.js --help
 */

const fs = require('fs');
const path = require('path');

// Simple JSONPath implementation for basic queries
class JSONPath {
  static query(obj, expression) {
    if (!expression.startsWith('$.')) {
      throw new Error('JSONPath expression must start with "$."');
    }

    const parts = expression.slice(2).split('.');
    let results = [obj];

    for (const part of parts) {
      const newResults = [];
      
      for (const current of results) {
        if (current === null || current === undefined) continue;

        if (part === '*') {
          if (Array.isArray(current)) {
            newResults.push(...current);
          } else if (typeof current === 'object') {
            newResults.push(...Object.values(current));
          }
        } else if (part.includes('[*]')) {
          const arrayProp = part.replace('[*]', '');
          if (current[arrayProp] && Array.isArray(current[arrayProp])) {
            newResults.push(...current[arrayProp]);
          }
        } else if (part.includes('[') && part.includes(']')) {
          const match = part.match(/(.+)\[(\d+)\]/);
          if (match) {
            const [, arrayProp, index] = match;
            if (current[arrayProp] && Array.isArray(current[arrayProp])) {
              const item = current[arrayProp][parseInt(index)];
              if (item !== undefined) newResults.push(item);
            }
          }
        } else {
          if (current[part] !== undefined) {
            newResults.push(current[part]);
          }
        }
      }
      
      results = newResults;
    }

    return results;
  }
}

class JSONSearchTool {
  constructor(options = {}) {
    this.baseDir = options.baseDir || process.cwd();
    this.reportsDir = options.reportsDir || path.join(this.baseDir, 'reports');
    this.parsedDir = options.parsedDir || path.join(this.baseDir, 'parsed');
  }

  /**
   * Parse command line arguments
   */
  parseArgs(args) {
    const options = {
      dependencies: null,
      function: null,
      target: null,
      jsonpath: null,
      help: false,
      verbose: false,
      searchDir: null,
      reportsDir: null,
      parsedDir: null
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--dependencies':
        case '-d':
          options.dependencies = args[++i];
          break;
        case '--function':
        case '-f':
          options.function = args[++i];
          break;
        case '--target':
        case '-t':
          options.target = args[++i];
          break;
        case '--use':
        case '-u':
          if (args[i + 1] === 'jsonpath' && args[i + 2]) {
            options.jsonpath = args[i + 2];
            i += 2;
          } else {
            throw new Error('--use requires "jsonpath" followed by a JSONPath expression');
          }
          break;
        case '--help':
        case '-h':
          options.help = true;
          break;
        case '--verbose':
        case '-v':
          options.verbose = true;
          break;
        case '--search-dir':
        case '-s':
          options.searchDir = args[++i];
          break;
        case '--reports-dir':
        case '-r':
          options.reportsDir = args[++i];
          break;
        case '--parsed-dir':
        case '-p':
          options.parsedDir = args[++i];
          break;
      }
    }

    return options;
  }

  /**
   * Display help information
   */
  showHelp() {
    console.log(`
JSON Search Tool - Search through analysis reports and parsed data

USAGE:
    node tools/json-search.js [OPTIONS]

OPTIONS:
    -d, --dependencies <pattern>    Search for files with specific dependencies
    -f, --function <name>          Search for files containing specific function
    -t, --target <path>           Limit search to specific file or directory
    -u, --use jsonpath <expr>     Use JSONPath expression for advanced queries
    -s, --search-dir <path>       Base search directory (default: current directory)
    -r, --reports-dir <path>      Reports directory path (default: <search-dir>/reports)
    -p, --parsed-dir <path>       Parsed directory path (default: <search-dir>/parsed)
    -v, --verbose                 Show verbose output
    -h, --help                    Show this help message

EXAMPLES:
    # Find files that depend on lib/utils.ts
    node tools/json-search.js --dependencies lib/utils.ts

    # Find files containing a Button function
    node tools/json-search.js --function Button

    # Search specific file only
    node tools/json-search.js --target reports/button.json --function Button

    # Use JSONPath to extract all function names
    node tools/json-search.js --use jsonpath "$.analysis.functions[*].name"

    # Complex search: files with specific dependency AND function
    node tools/json-search.js --dependencies @radix-ui --function Button

    # Extract health levels using JSONPath
    node tools/json-search.js --use jsonpath "$.healthLevel"

    # Search in custom directory structure
    node tools/json-search.js --search-dir /path/to/project --function Button

    # Use specific reports and parsed directories
    node tools/json-search.js -r ./custom-reports -p ./custom-parsed --dependencies utils
    `);
  }

  /**
   * 更新目录配置
   */
  updateDirectories(options) {
    if (options.searchDir) {
      this.baseDir = path.resolve(options.searchDir);
      
      // 如果没有指定具体的 reports 和 parsed 目录，使用 searchDir 下的默认目录
      if (!options.reportsDir) {
        this.reportsDir = path.join(this.baseDir, 'reports');
      }
      if (!options.parsedDir) {
        this.parsedDir = path.join(this.baseDir, 'parsed');
      }
    }
    
    if (options.reportsDir) {
      this.reportsDir = path.resolve(options.reportsDir);
    }
    
    if (options.parsedDir) {
      this.parsedDir = path.resolve(options.parsedDir);
    }
  }

  /**
   * Get all JSON files from both reports and parsed directories
   */
  getAllJsonFiles(targetPath = null) {
    const files = [];

    if (targetPath) {
      const fullPath = path.resolve(this.baseDir, targetPath);
      
      if (fs.existsSync(fullPath)) {
        if (fs.statSync(fullPath).isFile()) {
          if (fullPath.endsWith('.json')) {
            files.push(fullPath);
          }
        } else if (fs.statSync(fullPath).isDirectory()) {
          this.scanDirectory(fullPath, files);
        }
      } else {
        console.warn(`Warning: Target path does not exist: ${fullPath}`);
      }
    } else {
      // Scan both reports and parsed directories
      if (fs.existsSync(this.reportsDir)) {
        this.scanDirectory(this.reportsDir, files);
      }
      if (fs.existsSync(this.parsedDir)) {
        this.scanDirectory(this.parsedDir, files);
      }
    }

    return files;
  }

  /**
   * Recursively scan directory for JSON files
   */
  scanDirectory(dirPath, files) {
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          this.scanDirectory(fullPath, files);
        } else if (stat.isFile() && item.endsWith('.json')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Warning: Cannot read directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Load and parse JSON file
   */
  loadJsonFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`Warning: Cannot parse JSON file ${filePath}: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if file matches dependency criteria
   */
  matchesDependency(jsonData, dependencyPattern) {
    if (!dependencyPattern) return true;

    // Check in analysis.imports (reports format)
    if (jsonData.analysis?.imports) {
      for (const importItem of jsonData.analysis.imports) {
        if (importItem.moduleSpecifier?.includes(dependencyPattern)) {
          return true;
        }
      }
    }

    // Check in analysis.dependencies (reports format)
    if (jsonData.analysis?.dependencies?.dependencies) {
      for (const dep of jsonData.analysis.dependencies.dependencies) {
        if (dep.path?.includes(dependencyPattern) || 
            dep.absolutePath?.includes(dependencyPattern)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if file matches function criteria
   */
  matchesFunction(jsonData, functionName) {
    if (!functionName) return true;

    // Check in analysis.functions (reports format)
    if (jsonData.analysis?.functions) {
      for (const func of jsonData.analysis.functions) {
        if (func.name === functionName) {
          return true;
        }
      }
    }

    // Check in annotations (parsed format)
    if (jsonData.annotations) {
      for (const annotation of jsonData.annotations) {
        if (annotation.symbol === functionName) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Extract specific fields for display
   */
  extractRelevantFields(jsonData, filePath, options) {
    const result = {
      file: path.relative(this.baseDir, filePath),
      type: filePath.includes('reports/') ? 'report' : 'parsed'
    };

    // Basic info
    if (jsonData.healthLevel) {
      result.healthLevel = jsonData.healthLevel;
    }
    if (jsonData.summary?.healthLevel) {
      result.healthLevel = jsonData.summary.healthLevel;
    }
    if (jsonData.analysis?.maintainability) {
      result.maintainability = jsonData.analysis.maintainability;
    }
    if (jsonData.summary?.maintainability) {
      result.maintainability = jsonData.summary.maintainability;
    }

    // Function info if function filter is used
    if (options.function) {
      if (jsonData.analysis?.functions) {
        result.functions = jsonData.analysis.functions
          .filter(f => f.name === options.function)
          .map(f => ({ name: f.name, complexity: f.complexity, lines: f.length }));
      }
      if (jsonData.annotations) {
        result.annotations = jsonData.annotations
          .filter(a => a.symbol === options.function)
          .map(a => ({ symbol: a.symbol, kind: a.kind, complexity: a.complexity }));
      }
    }

    // Dependency info if dependency filter is used
    if (options.dependencies) {
      if (jsonData.analysis?.imports) {
        result.matchedImports = jsonData.analysis.imports
          .filter(imp => imp.moduleSpecifier?.includes(options.dependencies))
          .map(imp => imp.moduleSpecifier);
      }
    }

    return result;
  }

  /**
   * Main search function
   */
  search(options) {
    if (options.help) {
      this.showHelp();
      return;
    }

    // 根据参数更新目录配置
    this.updateDirectories(options);

    const files = this.getAllJsonFiles(options.target);
    const results = [];

    if (options.verbose) {
      console.log(`Scanning ${files.length} JSON files...`);
    }

    for (const filePath of files) {
      const jsonData = this.loadJsonFile(filePath);
      if (!jsonData) continue;

      // Apply JSONPath query if specified
      if (options.jsonpath) {
        try {
          const jsonpathResults = JSONPath.query(jsonData, options.jsonpath);
          if (jsonpathResults.length > 0) {
            results.push({
              file: path.relative(this.baseDir, filePath),
              type: filePath.includes('reports/') ? 'report' : 'parsed',
              jsonpath: options.jsonpath,
              results: jsonpathResults
            });
          }
        } catch (error) {
          console.warn(`JSONPath error in ${filePath}: ${error.message}`);
        }
        continue;
      }

      // Apply filters
      if (this.matchesDependency(jsonData, options.dependencies) && 
          this.matchesFunction(jsonData, options.function)) {
        
        const extracted = this.extractRelevantFields(jsonData, filePath, options);
        results.push(extracted);
      }
    }

    return results;
  }

  /**
   * Format and display results
   */
  displayResults(results, options) {
    if (results.length === 0) {
      console.log('No matching files found.');
      return;
    }

    console.log(`\n🔍 Found ${results.length} matching file(s):\n`);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      console.log(`${i + 1}. ${result.file} (${result.type})`);

      if (result.jsonpath) {
        console.log(`   JSONPath: ${result.jsonpath}`);
        console.log(`   Results:`);
        result.results.forEach((item, idx) => {
          console.log(`     [${idx}] ${JSON.stringify(item, null, 2)}`);
        });
      } else {
        if (result.healthLevel) {
          console.log(`   Health: ${result.healthLevel}`);
        }
        if (result.maintainability) {
          console.log(`   Maintainability: ${result.maintainability}`);
        }
        if (result.functions && result.functions.length > 0) {
          console.log(`   Functions:`);
          result.functions.forEach(f => {
            console.log(`     - ${f.name} (complexity: ${f.complexity}, lines: ${f.lines})`);
          });
        }
        if (result.annotations && result.annotations.length > 0) {
          console.log(`   Annotations:`);
          result.annotations.forEach(a => {
            console.log(`     - ${a.symbol} (${a.kind}, complexity: ${a.complexity})`);
          });
        }
        if (result.matchedImports && result.matchedImports.length > 0) {
          console.log(`   Matched Imports:`);
          result.matchedImports.forEach(imp => {
            console.log(`     - ${imp}`);
          });
        }
      }
      console.log();
    }
  }
}

// Main execution
if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      const tool = new JSONSearchTool();
      tool.showHelp();
      process.exit(0);
    }

    // 先解析参数以获取目录配置
    const tempTool = new JSONSearchTool();
    const options = tempTool.parseArgs(args);
    
    // 使用解析出的目录配置创建工具实例
    const toolOptions = {};
    if (options.searchDir) {
      toolOptions.baseDir = path.resolve(options.searchDir);
    }
    if (options.reportsDir) {
      toolOptions.reportsDir = path.resolve(options.reportsDir);
    }
    if (options.parsedDir) {
      toolOptions.parsedDir = path.resolve(options.parsedDir);
    }
    
    const tool = new JSONSearchTool(toolOptions);
    const results = tool.search(options);
    
    if (results !== undefined) {
      tool.displayResults(results, options);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = JSONSearchTool;