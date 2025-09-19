# JSON Search Tool

A powerful Node.js tool to search and analyze JSON files in `reports/` and `parsed/` directories with support for dependency filtering, function filtering, and JSONPath queries.

## Installation

This tool requires Node.js to run. No additional dependencies are needed.

## Usage

```bash
# Basic usage
node tools/json-search.js [OPTIONS]

# Or with explicit node invocation  
node tools/json-search.js --help
```

## Options

| Option | Short | Description |
|--------|--------|-------------|
| `--dependencies <pattern>` | `-d` | Search for files with specific dependencies |
| `--function <name>` | `-f` | Search for files containing specific function |
| `--target <path>` | `-t` | Limit search to specific file or directory |
| `--use jsonpath <expr>` | `-u` | Use JSONPath expression for advanced queries |
| `--verbose` | `-v` | Show verbose output |
| `--help` | `-h` | Show help message |

## Examples

### Basic Searches

```bash
# Find files that depend on lib/utils.ts
node tools/json-search.js --dependencies lib/utils.ts

# Find files containing a Button function
node tools/json-search.js --function Button

# Search specific file only
node tools/json-search.js --target reports/button.json --function Button

# Complex search: files with specific dependency AND function
node tools/json-search.js --dependencies @radix-ui --function Button
```

### JSONPath Queries

```bash
# Extract all function names
node tools/json-search.js --use jsonpath "$.analysis.functions[*].name"

# Extract health levels
node tools/json-search.js --use jsonpath "$.healthLevel"

# Get all import module specifiers
node tools/json-search.js --use jsonpath "$.analysis.imports[*].moduleSpecifier"

# Get function complexities
node tools/json-search.js --use jsonpath "$.analysis.functions[*].complexity"
```

### Advanced JSONPath Examples

```bash
# Get all dependencies paths
node tools/json-search.js --use jsonpath "$.analysis.dependencies.dependencies[*].path"

# Extract maintainability scores
node tools/json-search.js --use jsonpath "$.analysis.maintainability"

# Get all annotation symbols
node tools/json-search.js --use jsonpath "$.annotations[*].symbol"
```

## Output Format

The tool outputs results in a structured format showing:

- File path (relative to project root)
- File type (report or parsed)
- Health level (if available)
- Maintainability score (if available)
- Matched functions with complexity and line count
- Matched imports
- JSONPath query results

## Features

- **Multi-format Support**: Works with both `reports/` and `parsed/` JSON formats
- **Flexible Filtering**: Filter by dependencies, functions, or both
- **JSONPath Queries**: Advanced querying with JSONPath expressions
- **Recursive Search**: Searches subdirectories automatically
- **Error Handling**: Graceful handling of malformed JSON files
- **Verbose Mode**: Detailed output for debugging

## JSONPath Support

The tool includes a built-in JSONPath implementation supporting:

- Basic property access: `$.property`
- Array access: `$.array[0]`
- Wildcard: `$.array[*]` or `$.*`
- Nested access: `$.analysis.functions[*].name`

## Error Handling

The tool handles various error conditions gracefully:

- Missing directories (reports/ or parsed/)
- Malformed JSON files
- Invalid JSONPath expressions
- Permission errors

Warnings are displayed for non-critical errors while continuing execution.