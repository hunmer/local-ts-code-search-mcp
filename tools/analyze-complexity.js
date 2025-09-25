#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const madge = require('madge');

/**
 * 解析命令行参数
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let targetDir = '.';
  let outputDir = 'reports'; // 默认导出目录
  let baseDir = null; // 基础目录，用于保持目录结构

  // 简单参数解析
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' || args[i] === '-d') {
      targetDir = args[i + 1] || '.';
      i++; // 跳过下一个参数
    } else if (args[i] === '--output' || args[i] === '-o') {
      outputDir = args[i + 1] || 'reports';
      i++; // 跳过下一个参数
    } else if (args[i] === '--base') {
      baseDir = args[i + 1] || null;
      i++; // 跳过下一个参数
    } else if (!args[i].startsWith('-')) {
      targetDir = args[i];
    }
  }

  return { targetDir, outputDir, baseDir };
}

/**
 * 递归获取所有TypeScript文件
 */
function getAllTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // 跳过node_modules等目录
      if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(file)) {
        getAllTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') ||
               file.endsWith('.js') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * 计算代码健康度等级
 * 基于圈复杂度、维护性指数、依赖复杂度等指标
 */
function calculateHealthLevel(analysis, dependencyAnalysis = null) {
  const { maintainability, complexity, difficulty } = analysis.aggregate;
  
  // 健康度评分规则
  let score = 0;
  
  // 维护性指数（0-171，越高越好）
  if (maintainability > 85) score += 3;
  else if (maintainability > 65) score += 2;
  else if (maintainability > 50) score += 1;
  
  // 圈复杂度（越低越好）
  if (complexity.cyclomatic < 5) score += 3;
  else if (complexity.cyclomatic < 10) score += 2;
  else if (complexity.cyclomatic < 20) score += 1;
  
  // Halstead雾度（越低越好）
  if (difficulty < 10) score += 2;
  else if (difficulty < 20) score += 1;
  
  // 函数数量考虑
  const functionCount = analysis.functions.length;
  if (functionCount < 5) score += 1;
  else if (functionCount > 20) score -= 1;
  
  // 依赖复杂度考虑
  if (dependencyAnalysis) {
    // 依赖数量评分
    if (dependencyAnalysis.dependencyCount < 5) score += 1;
    else if (dependencyAnalysis.dependencyCount > 15) score -= 1;
    
    // 依赖深度评分
    if (dependencyAnalysis.depth < 3) score += 1;
    else if (dependencyAnalysis.depth > 6) score -= 1;
    
    // 循环依赖罚分
    if (dependencyAnalysis.hasCircularDependencies) score -= 2;
    
    // 被依赖数量（越多说明越重要）
    if (dependencyAnalysis.dependentCount > 10) score += 1;
  }
  
  // 转换为健康度等级
  if (score >= 8) return 'excellent';
  if (score >= 6) return 'good';
  if (score >= 4) return 'fair';
  if (score >= 2) return 'poor';
  return 'critical';
}

/**
 * 使用TypeScript编译器API解析AST，提取详细的代码结构信息
 */
function parseWithTypeScript(source, filePath) {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const functions = [];
  const classes = [];
  const interfaces = [];
  const types = [];
  const imports = [];
  const exports = [];

  function visit(node) {
    switch (node.kind) {
      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.MethodDeclaration:
      case ts.SyntaxKind.ArrowFunction:
      case ts.SyntaxKind.FunctionExpression:
        functions.push(extractFunctionInfo(node, sourceFile));
        break;
      
      case ts.SyntaxKind.VariableDeclaration:
        // 检查是否是箭头函数变量
        if (node.initializer && 
            (node.initializer.kind === ts.SyntaxKind.ArrowFunction ||
             node.initializer.kind === ts.SyntaxKind.FunctionExpression)) {
          functions.push(extractFunctionInfo(node.initializer, sourceFile, node.name?.getText(sourceFile)));
        }
        break;

      case ts.SyntaxKind.ClassDeclaration:
        classes.push(extractClassInfo(node, sourceFile));
        break;

      case ts.SyntaxKind.InterfaceDeclaration:
        interfaces.push(extractInterfaceInfo(node, sourceFile));
        break;

      case ts.SyntaxKind.TypeAliasDeclaration:
        types.push(extractTypeInfo(node, sourceFile));
        break;

      case ts.SyntaxKind.ImportDeclaration:
        imports.push(extractImportInfo(node, sourceFile));
        break;

      case ts.SyntaxKind.ExportDeclaration:
      case ts.SyntaxKind.ExportAssignment:
        exports.push(extractExportInfo(node, sourceFile));
        break;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return {
    functions,
    classes,
    interfaces,
    types,
    imports,
    exports,
    sourceFile
  };
}

/**
 * 提取函数信息
 */
function extractFunctionInfo(node, sourceFile, nameOverride = null) {
  const name = nameOverride || 
    (node.name ? node.name.getText(sourceFile) : '<anonymous>');
  
  const parameters = node.parameters ? node.parameters.map(param => ({
    name: param.name.getText(sourceFile),
    type: param.type ? param.type.getText(sourceFile) : 'any',
    optional: !!param.questionToken,
    defaultValue: param.initializer ? param.initializer.getText(sourceFile) : null
  })) : [];

  const returnType = node.type ? node.type.getText(sourceFile) : 'unknown';
  
  const isAsync = !!(node.modifiers && 
    node.modifiers.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword));
  
  const isExported = !!(node.modifiers &&
    node.modifiers.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword));

  // 计算函数复杂度
  const complexity = calculateNodeComplexity(node);
  
  const startPos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const endPos = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

  return {
    name,
    parameters,
    returnType,
    isAsync,
    isExported,
    complexity,
    startLine: startPos.line + 1,
    endLine: endPos.line + 1,
    length: endPos.line - startPos.line + 1
  };
}

/**
 * 提取类信息
 */
function extractClassInfo(node, sourceFile) {
  const name = node.name ? node.name.getText(sourceFile) : '<anonymous>';
  
  const methods = [];
  const properties = [];
  
  const isExported = !!(node.modifiers &&
    node.modifiers.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword));
  
  const isAbstract = !!(node.modifiers &&
    node.modifiers.some(mod => mod.kind === ts.SyntaxKind.AbstractKeyword));

  // 继承信息
  const heritage = node.heritageClauses ? node.heritageClauses.map(clause => ({
    type: clause.token === ts.SyntaxKind.ExtendsKeyword ? 'extends' : 'implements',
    types: clause.types.map(type => type.getText(sourceFile))
  })) : [];

  // 遍历类成员
  node.members.forEach(member => {
    if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member)) {
      methods.push(extractFunctionInfo(member, sourceFile));
    } else if (ts.isPropertyDeclaration(member)) {
      properties.push({
        name: member.name ? member.name.getText(sourceFile) : '<unknown>',
        type: member.type ? member.type.getText(sourceFile) : 'any',
        isStatic: !!(member.modifiers && 
          member.modifiers.some(mod => mod.kind === ts.SyntaxKind.StaticKeyword)),
        isPrivate: !!(member.modifiers &&
          member.modifiers.some(mod => mod.kind === ts.SyntaxKind.PrivateKeyword)),
        isProtected: !!(member.modifiers &&
          member.modifiers.some(mod => mod.kind === ts.SyntaxKind.ProtectedKeyword)),
        isReadonly: !!(member.modifiers &&
          member.modifiers.some(mod => mod.kind === ts.SyntaxKind.ReadonlyKeyword))
      });
    }
  });

  const startPos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const endPos = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

  return {
    name,
    isExported,
    isAbstract,
    heritage,
    methods,
    properties,
    startLine: startPos.line + 1,
    endLine: endPos.line + 1,
    length: endPos.line - startPos.line + 1
  };
}

/**
 * 提取接口信息
 */
function extractInterfaceInfo(node, sourceFile) {
  const name = node.name.getText(sourceFile);
  
  const properties = [];
  const methods = [];
  
  const isExported = !!(node.modifiers &&
    node.modifiers.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword));

  // 继承信息
  const heritage = node.heritageClauses ? node.heritageClauses.map(clause => ({
    types: clause.types.map(type => type.getText(sourceFile))
  })) : [];

  node.members.forEach(member => {
    if (ts.isPropertySignature(member)) {
      properties.push({
        name: member.name ? member.name.getText(sourceFile) : '<unknown>',
        type: member.type ? member.type.getText(sourceFile) : 'any',
        optional: !!member.questionToken
      });
    } else if (ts.isMethodSignature(member)) {
      methods.push({
        name: member.name ? member.name.getText(sourceFile) : '<unknown>',
        parameters: member.parameters ? member.parameters.map(param => ({
          name: param.name.getText(sourceFile),
          type: param.type ? param.type.getText(sourceFile) : 'any',
          optional: !!param.questionToken
        })) : [],
        returnType: member.type ? member.type.getText(sourceFile) : 'unknown'
      });
    }
  });

  const startPos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const endPos = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

  return {
    name,
    isExported,
    heritage,
    properties,
    methods,
    startLine: startPos.line + 1,
    endLine: endPos.line + 1,
    length: endPos.line - startPos.line + 1
  };
}

/**
 * 提取类型别名信息
 */
function extractTypeInfo(node, sourceFile) {
  const name = node.name.getText(sourceFile);
  const type = node.type.getText(sourceFile);
  
  const isExported = !!(node.modifiers &&
    node.modifiers.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword));

  const startPos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const endPos = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

  return {
    name,
    type,
    isExported,
    startLine: startPos.line + 1,
    endLine: endPos.line + 1
  };
}

/**
 * 提取导入信息
 */
function extractImportInfo(node, sourceFile) {
  const moduleSpecifier = node.moduleSpecifier.getText(sourceFile).slice(1, -1); // 去掉引号
  
  const imports = [];
  if (node.importClause) {
    if (node.importClause.name) {
      imports.push({
        type: 'default',
        name: node.importClause.name.getText(sourceFile)
      });
    }
    if (node.importClause.namedBindings) {
      if (ts.isNamespaceImport(node.importClause.namedBindings)) {
        imports.push({
          type: 'namespace',
          name: node.importClause.namedBindings.name.getText(sourceFile)
        });
      } else if (ts.isNamedImports(node.importClause.namedBindings)) {
        node.importClause.namedBindings.elements.forEach(element => {
          imports.push({
            type: 'named',
            name: element.name.getText(sourceFile),
            alias: element.propertyName ? element.propertyName.getText(sourceFile) : null
          });
        });
      }
    }
  }

  return {
    moduleSpecifier,
    imports
  };
}

/**
 * 提取导出信息
 */
function extractExportInfo(node, sourceFile) {
  if (ts.isExportDeclaration(node)) {
    const moduleSpecifier = node.moduleSpecifier ? 
      node.moduleSpecifier.getText(sourceFile).slice(1, -1) : null;
    
    const exports = [];
    if (node.exportClause && ts.isNamedExports(node.exportClause)) {
      node.exportClause.elements.forEach(element => {
        exports.push({
          type: 'named',
          name: element.name.getText(sourceFile),
          alias: element.propertyName ? element.propertyName.getText(sourceFile) : null
        });
      });
    }

    return {
      type: 'declaration',
      moduleSpecifier,
      exports
    };
  } else if (ts.isExportAssignment(node)) {
    return {
      type: 'assignment',
      isDefault: !!node.isExportEquals,
      expression: node.expression.getText(sourceFile)
    };
  }

  return null;
}

/**
 * 计算节点复杂度
 */
function calculateNodeComplexity(node) {
  let complexity = 1; // 基础复杂度

  function visit(node) {
    switch (node.kind) {
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.DoWhileStatement:
      case ts.SyntaxKind.SwitchStatement:
      case ts.SyntaxKind.CaseClause:
      case ts.SyntaxKind.CatchClause:
      case ts.SyntaxKind.ConditionalExpression:
        complexity++;
        break;
      
      case ts.SyntaxKind.BinaryExpression:
        const binaryExpr = node;
        if (binaryExpr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
            binaryExpr.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
          complexity++;
        }
        break;
    }

    ts.forEachChild(node, visit);
  }

  visit(node);
  return complexity;
}

// 全局缓存依赖图
 let globalDependencyGraph = null;
 let graphProjectRoot = null;

/**
 * 获取或创建全局依赖图
 */
async function getOrCreateDependencyGraph(projectRoot) {
  if (globalDependencyGraph && graphProjectRoot === projectRoot) {
    return globalDependencyGraph;
  }
  
  try {
    console.log(`Building dependency graph for project...`);
    const res = await madge(projectRoot, {
      fileExtensions: ['js', 'jsx', 'ts', 'tsx'],
      excludeRegExp: [/node_modules/, /\.next/, /dist/, /build/, /out/],
      baseDir: projectRoot,
      tsConfig: {
        compilerOptions: {
          module: 'esnext',
          moduleResolution: 'node',
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          jsx: 'react-jsx',
          skipLibCheck: true,
          resolveJsonModule: true,
          paths: {
            '@/*': ['./*']
          }
        }
      }
    });
    
    globalDependencyGraph = {
      tree: res.obj(),
      circular: res.circular()
    };
    graphProjectRoot = projectRoot;
    
    console.log(`Dependency graph built with ${Object.keys(globalDependencyGraph.tree).length} files`);
    return globalDependencyGraph;
  } catch (error) {
    console.warn(`Warning: Could not build dependency graph: ${error.message}`);
    return { tree: {}, circular: [] };
  }
}

/**
 * 使用 madge 分析文件的依赖关系
 */
async function analyzeDependenciesWithMadge(filePath, projectRoot) {
  try {
    // 获取全局依赖图
    const dependencyGraph = await getOrCreateDependencyGraph(projectRoot);
    
    // 将文件路径转换为相对路径
    let relativePath = path.relative(projectRoot, filePath);
    relativePath = relativePath.replace(/\\/g, '/'); // 统一使用正斜杠
    
    const dependencyTree = dependencyGraph.tree;
    
    // 在依赖树中查找匹配的文件
    let fileKey = relativePath;
    if (!dependencyTree[fileKey]) {
      // 尝试不同的文件路径格式
      const possibleKeys = [
        relativePath,
        './' + relativePath,
        relativePath.replace(/\.(tsx?)$/, ''),
        './' + relativePath.replace(/\.(tsx?)$/, '')
      ];
      
      for (const key of possibleKeys) {
        if (dependencyTree[key]) {
          fileKey = key;
          break;
        }
      }
    }

    if (!dependencyTree[fileKey]) {
      return {
        dependencies: [],
        dependents: [],
        circularDependencies: [],
        dependencyCount: 0,
        dependentCount: 0,
        depth: 0,
        hasCircularDependencies: false,
        note: `File not found in dependency tree. Tried keys: ${[relativePath, './' + relativePath, relativePath.replace(/\.(tsx?)$/, ''), './' + relativePath.replace(/\.(tsx?)$/, '')].join(', ')}`
      };
    }

    const dependencies = dependencyTree[fileKey] || [];
    
    // 查找依赖者（谁依赖于这个文件）
    const dependents = [];
    for (const [file, deps] of Object.entries(dependencyTree)) {
      if (deps.includes(fileKey)) {
        dependents.push(file);
      }
    }

    // 检查循环依赖
    const circularDependencies = dependencyGraph.circular;
    const fileCirculars = circularDependencies.filter(cycle => 
      cycle.includes(fileKey)
    );

    // 计算依赖深度（最大依赖链长度）
    const depth = calculateDependencyDepth(fileKey, dependencyTree, new Set());

    return {
      dependencies: dependencies.map(dep => {
        // 尝试解析绝对路径
        let absolutePath = null;
        
        if (dep.startsWith('./') || dep.startsWith('../')) {
          const basePath = path.dirname(filePath);
          absolutePath = path.resolve(basePath, dep);
        } else if (dep.startsWith('@/')) {
          absolutePath = path.resolve(projectRoot, dep.replace('@/', ''));
        } else {
          absolutePath = path.resolve(projectRoot, dep);
        }
        
        // 检查文件是否存在（可能需要添加扩展名）
        let exists = false;
        let finalPath = absolutePath;
        
        if (fs.existsSync(absolutePath)) {
          exists = true;
          finalPath = absolutePath;
        } else if (fs.existsSync(absolutePath + '.ts')) {
          exists = true;
          finalPath = absolutePath + '.ts';
        } else if (fs.existsSync(absolutePath + '.tsx')) {
          exists = true;
          finalPath = absolutePath + '.tsx';
        } else if (fs.existsSync(absolutePath + '.js')) {
          exists = true;
          finalPath = absolutePath + '.js';
        } else if (fs.existsSync(absolutePath + '.jsx')) {
          exists = true;
          finalPath = absolutePath + '.jsx';
        } else if (fs.existsSync(path.join(absolutePath, 'index.ts'))) {
          exists = true;
          finalPath = path.join(absolutePath, 'index.ts');
        } else if (fs.existsSync(path.join(absolutePath, 'index.tsx'))) {
          exists = true;
          finalPath = path.join(absolutePath, 'index.tsx');
        }
        
        return {
          path: dep,
          absolutePath: exists ? finalPath : absolutePath,
          exists: exists,
          isExternal: !dep.startsWith('.') && !dep.startsWith('/') && !dep.startsWith('@/'),
          extension: path.extname(dep) || (exists ? path.extname(finalPath) : ''),
          type: dep.startsWith('@/') ? 'internal-alias' : 
                (dep.startsWith('./') || dep.startsWith('../')) ? 'relative' : 
                (!dep.startsWith('.') && !dep.startsWith('/')) ? 'external' : 'absolute'
        };
      }),
      dependents: dependents.map(dep => ({
        path: dep,
        absolutePath: path.resolve(projectRoot, dep.replace('./', ''))
      })),
      circularDependencies: fileCirculars,
      dependencyCount: dependencies.length,
      dependentCount: dependents.length,
      depth: depth,
      hasCircularDependencies: fileCirculars.length > 0
    };
  } catch (error) {
    console.warn(`Warning: Could not analyze dependencies for ${filePath}: ${error.message}`);
    return {
      dependencies: [],
      dependents: [],
      circularDependencies: [],
      dependencyCount: 0,
      dependentCount: 0,
      depth: 0,
      error: error.message
    };
  }
}

/**
 * 计算依赖深度
 */
function calculateDependencyDepth(file, dependencyTree, visited) {
  if (visited.has(file) || !dependencyTree[file]) {
    return 0;
  }
  
  visited.add(file);
  let maxDepth = 0;
  
  for (const dep of dependencyTree[file]) {
    const depthFromDep = calculateDependencyDepth(dep, dependencyTree, new Set(visited));
    maxDepth = Math.max(maxDepth, depthFromDep + 1);
  }
  
  return maxDepth;
}

/**
 * 简单的代码度量分析（保留作为备用）
 * 不依赖复杂的AST解析，直接进行基于文本的分析
 */
function simpleAnalyzeFile(source, filePath) {
  const lines = source.split('\n');
  const nonEmptyLines = lines.filter(line => line.trim().length > 0);
  const codeLines = nonEmptyLines.filter(line => {
    const trimmed = line.trim();
    return !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*');
  });
  
  // 计算函数数量
  const functionRegex = /(?:function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>|\w+\s*\([^)]*\)\s*{|export\s+(?:default\s+)?function)/g;
  const functions = source.match(functionRegex) || [];
  
  // 计算条件语句复杂度 (if, else, for, while, switch, case, catch, &&, ||)
  const complexityRegex = /\b(?:if|else|for|while|switch|case|catch)\b|&&|\|\|/g;
  const complexityMatches = source.match(complexityRegex) || [];
  const cyclomaticComplexity = Math.max(1, complexityMatches.length);
  
  // 计算嵌套深度
  let maxNestingDepth = 0;
  let currentDepth = 0;
  for (const line of lines) {
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    currentDepth += openBraces - closeBraces;
    maxNestingDepth = Math.max(maxNestingDepth, currentDepth);
  }
  
  // 计算维护性指数 (基于代码行数、复杂度、函数数量)
  const loc = codeLines.length;
  const functionCount = functions.length;
  
  // 简化的维护性计算
  let maintainability = 100;
  if (loc > 100) maintainability -= (loc - 100) * 0.1;
  if (cyclomaticComplexity > 10) maintainability -= (cyclomaticComplexity - 10) * 2;
  if (functionCount > 10) maintainability -= (functionCount - 10) * 1;
  if (maxNestingDepth > 3) maintainability -= (maxNestingDepth - 3) * 5;
  maintainability = Math.max(0, Math.min(100, maintainability));
  
  // 计算难度 (基于复杂度和函数数量)
  const difficulty = Math.max(1, cyclomaticComplexity * 0.5 + functionCount * 0.2);
  
  return {
    aggregate: {
      maintainability: maintainability,
      complexity: { cyclomatic: cyclomaticComplexity },
      difficulty: difficulty,
      effort: cyclomaticComplexity * difficulty,
      sloc: { logical: loc }
    },
    functions: functions.map((fn, index) => ({
      name: `function_${index}`,
      complexity: { cyclomatic: Math.max(1, Math.floor(cyclomaticComplexity / functions.length)) },
      difficulty: Math.max(1, Math.floor(difficulty / functions.length)),
      effort: 1,
      sloc: { logical: Math.floor(loc / functions.length) }
    })),
    metrics: {
      totalLines: lines.length,
      codeLines: loc,
      functionCount: functionCount,
      maxNestingDepth: maxNestingDepth
    }
  };
}

/**
 * 分析单个文件 - 使用TypeScript AST解析
 */
async function analyzeFile(filePath, projectRoot = process.cwd()) {
  try {
    const source = fs.readFileSync(filePath, 'utf8');
    
    // 使用TypeScript AST解析
    const tsAnalysis = parseWithTypeScript(source, filePath);
    
    // 使用简单分析作为补充度量
    const simpleAnalysis = simpleAnalyzeFile(source, filePath);
    
    // 综合计算复杂度
    const totalComplexity = tsAnalysis.functions.reduce((sum, fn) => sum + fn.complexity, 1);
    
    // 构建综合分析结果
    const analysis = {
      aggregate: {
        maintainability: simpleAnalysis.aggregate.maintainability,
        complexity: { cyclomatic: Math.max(totalComplexity, simpleAnalysis.aggregate.complexity.cyclomatic) },
        difficulty: simpleAnalysis.aggregate.difficulty,
        effort: simpleAnalysis.aggregate.effort,
        sloc: { logical: simpleAnalysis.aggregate.sloc.logical }
      },
      functions: tsAnalysis.functions,
      classes: tsAnalysis.classes,
      interfaces: tsAnalysis.interfaces,
      types: tsAnalysis.types,
      imports: tsAnalysis.imports,
      exports: tsAnalysis.exports,
      metrics: simpleAnalysis.metrics
    };
    
    // 使用 madge 分析依赖关系
    const dependencyAnalysis = await analyzeDependenciesWithMadge(filePath, projectRoot);
    
    const healthLevel = calculateHealthLevel(analysis, dependencyAnalysis);
    
    return {
      filePath,
      healthLevel,
      analysis: {
        maintainability: analysis.aggregate.maintainability,
        complexity: analysis.aggregate.complexity.cyclomatic,
        difficulty: analysis.aggregate.difficulty,
        effort: analysis.aggregate.effort,
        loc: analysis.aggregate.sloc.logical,
        totalLines: analysis.metrics.totalLines,
        maxNestingDepth: analysis.metrics.maxNestingDepth,
        
        // 详细的代码结构信息
        functions: analysis.functions,
        classes: analysis.classes,
        interfaces: analysis.interfaces,
        types: analysis.types,
        imports: analysis.imports,
        exports: analysis.exports,
        
        // madge 依赖分析结果
        dependencies: dependencyAnalysis,
        
        // 统计信息
        stats: {
          functionCount: analysis.functions.length,
          classCount: analysis.classes.length,
          interfaceCount: analysis.interfaces.length,
          typeCount: analysis.types.length,
          importCount: analysis.imports.length,
          exportCount: analysis.exports.length,
          
          // 添加依赖统计
          dependencyCount: dependencyAnalysis.dependencyCount,
          dependentCount: dependencyAnalysis.dependentCount,
          dependencyDepth: dependencyAnalysis.depth,
          hasCircularDependencies: dependencyAnalysis.hasCircularDependencies,
          
          averageFunctionComplexity: analysis.functions.length > 0 ? 
            (analysis.functions.reduce((sum, fn) => sum + fn.complexity, 0) / analysis.functions.length).toFixed(2) : 0,
          
          mostComplexFunction: analysis.functions.length > 0 ? 
            analysis.functions.reduce((max, fn) => fn.complexity > max.complexity ? fn : max, analysis.functions[0]) : null
        }
      }
    };
  } catch (error) {
    console.warn(`Warning: Could not analyze ${filePath}: ${error.message}`);
    // 如果TypeScript解析失败，回退到简单分析
    try {
      const source = fs.readFileSync(filePath, 'utf8');
      const analysis = simpleAnalyzeFile(source, filePath);
      const healthLevel = calculateHealthLevel(analysis);
      
      return {
        filePath,
        healthLevel,
        analysis: {
          maintainability: analysis.aggregate.maintainability,
          complexity: analysis.aggregate.complexity.cyclomatic,
          difficulty: analysis.aggregate.difficulty,
          effort: analysis.aggregate.effort,
          loc: analysis.aggregate.sloc.logical,
          totalLines: analysis.metrics.totalLines,
          maxNestingDepth: analysis.metrics.maxNestingDepth,
          functions: analysis.functions.map(fn => ({
            name: fn.name,
            complexity: fn.complexity.cyclomatic,
            difficulty: fn.difficulty,
            effort: fn.effort,
            loc: fn.sloc.logical
          })),
          note: 'Fallback to simple analysis - TypeScript parsing failed'
        }
      };
    } catch (fallbackError) {
      console.warn(`Warning: Fallback analysis also failed for ${filePath}: ${fallbackError.message}`);
      return null;
    }
  }
}

/**
 * 确保目录存在
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 保存分析结果到指定输出目录
 */
function saveResult(result, baseDir, outputDir, customBaseDir = null) {
  let relativePath;

  // 如果提供了自定义基础目录（项目根目录），使用它来计算相对路径
  if (customBaseDir && fs.existsSync(customBaseDir)) {
    // customBaseDir 应该始终指向项目根目录
    relativePath = path.relative(customBaseDir, result.filePath);
  } else if (fs.existsSync(baseDir) && fs.statSync(baseDir).isFile()) {
    // 如果 baseDir 是文件，使用文件名（向后兼容单文件模式）
    relativePath = path.basename(result.filePath);
  } else {
    // 如果 baseDir 是目录，使用相对路径
    relativePath = path.relative(baseDir, result.filePath);
  }

  const reportPath = path.join(outputDir, relativePath);
  const reportDir = path.dirname(reportPath);

  // 确保报告目录存在
  ensureDir(reportDir);

  // 保存详细分析结果
  const reportFile = reportPath.replace(/\.(ts|tsx|js|jsx)$/, '.json');
  fs.writeFileSync(reportFile, JSON.stringify(result, null, 2));

  return reportFile;
}

/**
 * 更新健康度索引文件
 */
function updateHealthIndex(result, outputDir) {
  const { healthLevel } = result;
  const indexFile = path.join(outputDir, `${healthLevel}.json`);
  
  let index = [];
  if (fs.existsSync(indexFile)) {
    try {
      index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
    } catch (error) {
      console.warn(`Warning: Could not read ${indexFile}: ${error.message}`);
      index = [];
    }
  }
  
  // 移除同一文件的旧记录
  index = index.filter(item => item.filePath !== result.filePath);
  
  // 添加新记录
  index.push({
    filePath: result.filePath,
    maintainability: result.analysis.maintainability,
    complexity: result.analysis.complexity,
    difficulty: result.analysis.difficulty,
    loc: result.analysis.loc,
    functionCount: result.analysis.functions.length,
    analyzedAt: new Date().toISOString()
  });
  
  // 按复杂度排序
  index.sort((a, b) => b.complexity - a.complexity);
  
  fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
}

/**
 * 主函数
 */
async function main() {
  const { targetDir, outputDir, baseDir } = parseArgs();
  
  console.log(`Analyzing TypeScript files in: ${path.resolve(targetDir)}`);
  console.log(`Output directory: ${path.resolve(outputDir)}`);
  
  let tsFiles = [];
  
  // 检查是文件还是目录
  const targetPath = path.resolve(targetDir);
  const stat = fs.statSync(targetPath);
  
  if (stat.isFile()) {
    // 如果是单个文件
    if (targetPath.endsWith('.ts') || targetPath.endsWith('.tsx') ||
        targetPath.endsWith('.js') || targetPath.endsWith('.jsx')) {
      tsFiles = [targetPath];
    } else {
      console.log('The specified file is not a TypeScript/JavaScript file.');
      return;
    }
  } else if (stat.isDirectory()) {
    // 如果是目录，递归获取所有TypeScript文件
    tsFiles = getAllTsFiles(targetDir);
  } else {
    console.log('Invalid target path.');
    return;
  }
  
  console.log(`Found ${tsFiles.length} TypeScript files`);
  
  if (tsFiles.length === 0) {
    console.log('No TypeScript files found.');
    return;
  }
  
  // 统计信息
  const stats = {
    excellent: 0,
    good: 0,
    fair: 0,
    poor: 0,
    critical: 0,
    total: 0,
    errors: 0
  };
  
  // 分析每个文件
  for (let index = 0; index < tsFiles.length; index++) {
    const filePath = tsFiles[index];
    process.stdout.write(`\rAnalyzing... ${index + 1}/${tsFiles.length}`);
    
    try {
      const result = await analyzeFile(filePath, targetPath);
      if (result) {
        // 保存详细结果
        saveResult(result, targetDir, outputDir, baseDir);
        
        // 更新健康度索引
        updateHealthIndex(result, outputDir);
        
        // 更新统计
        stats[result.healthLevel]++;
        stats.total++;
      } else {
        stats.errors++;
      }
    } catch (error) {
      console.warn(`\nWarning: Error analyzing ${filePath}: ${error.message}`);
      stats.errors++;
    }
  }
  
  console.log('\n\nAnalysis completed!');
  console.log('\n=== Summary ===');
  console.log(`Total files analyzed: ${stats.total}`);
  console.log(`Errors: ${stats.errors}`);
  console.log(`\nHealth Distribution:`);
  console.log(`  Excellent: ${stats.excellent} (${((stats.excellent/stats.total)*100).toFixed(1)}%)`);
  console.log(`  Good:      ${stats.good} (${((stats.good/stats.total)*100).toFixed(1)}%)`);
  console.log(`  Fair:      ${stats.fair} (${((stats.fair/stats.total)*100).toFixed(1)}%)`);
  console.log(`  Poor:      ${stats.poor} (${((stats.poor/stats.total)*100).toFixed(1)}%)`);
  console.log(`  Critical:  ${stats.critical} (${((stats.critical/stats.total)*100).toFixed(1)}%)`);
  
  console.log(`\nReports saved to ${path.resolve(outputDir)}/`);
  console.log(`Health indexes: excellent.json, good.json, fair.json, poor.json, critical.json`);
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  analyzeFile,
  calculateHealthLevel,
  getAllTsFiles
};