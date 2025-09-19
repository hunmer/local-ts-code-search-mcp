/**
 * Save Change Locator Result Tool
 * 
 * 保存使用Change Locator prompt处理后的AI结果到changes目录
 * 确保输出符合标准化JSON格式
 */

const fs = require('fs');
const path = require('path');

/**
 * 创建保存Change Locator结果的柯里化函数
 * @param {string} dataPath 数据目录路径
 * @param {string} codebasePath 代码库目录路径
 * @param {object} config 配置对象
 * @returns {function} 工具处理函数
 */
function createSaveChangeLocatorResultTool(dataPath, codebasePath, config) {
  /**
   * 保存Change Locator结果
   * @param {object} args 参数对象
   * @param {object} args.result Change Locator AI处理结果
   * @param {string} [args.filename] 保存的文件名（可选，默认基于时间戳）
   * @param {string} [args.outputDir] 输出目录路径，默认为 dataPath/changes
   * @returns {Promise<object>} 保存结果
   */
  return async function saveChangeLocatorResult(args) {
    try {
      const { result, filename, outputDir } = args;
      
      if (!result) {
        throw new Error('result parameter is required');
      }

      // 确保输出目录存在
      const resolvedOutputDir = outputDir ? path.resolve(outputDir) : path.join(dataPath, 'changes');
      if (!fs.existsSync(resolvedOutputDir)) {
        fs.mkdirSync(resolvedOutputDir, { recursive: true });
      }

      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const finalFilename = filename || `change-locator-result-${timestamp}.json`;
      const filePath = path.join(resolvedOutputDir, finalFilename);

      // 验证和标准化结果格式
      const standardizedResult = validateAndStandardizeResult(result);

      // 保存到changes目录
      const outputContent = JSON.stringify(standardizedResult, null, 2);
      fs.writeFileSync(filePath, outputContent, 'utf8');

      console.log(`Change Locator result saved to: ${filePath}`);

      return {
        success: true,
        filePath: filePath,
        filename: finalFilename,
        resultSummary: {
          matchesCount: standardizedResult.matches?.length || 0,
          stepsCount: standardizedResult.plan_draft?.steps?.length || 0,
          risksCount: standardizedResult.plan_draft?.risks?.length || 0
        },
        metadata: {
          timestamp: new Date().toISOString(),
          tool: 'save_change_locator_result',
          fileSize: outputContent.length
        }
      };

    } catch (error) {
      console.error('Save Change Locator result error:', error);
      return {
        success: false,
        error: error.message,
        stack: config.verbose ? error.stack : undefined
      };
    }
  };
}

/**
 * 验证和标准化Change Locator结果格式
 */
function validateAndStandardizeResult(result) {
  // 确保结果具有正确的结构
  const standardized = {
    matches: [],
    plan_draft: {
      summary: '',
      steps: [],
      risks: []
    },
    tooling: {
      lookups: [],
      errors: [],
      notes: ''
    }
  };

  // 处理matches
  if (Array.isArray(result.matches)) {
    standardized.matches = result.matches.map(match => ({
      file: String(match.file || ''),
      symbol: String(match.symbol || ''),
      kind: String(match.kind || 'unknown'),
      range: {
        startLine: Number(match.range?.startLine || 0),
        endLine: Number(match.range?.endLine || 0)
      },
      evidence: {
        from: String(match.evidence?.from || 'unknown'),
        signals: Array.isArray(match.evidence?.signals) ? match.evidence.signals : []
      },
      confidence: Number(match.confidence || 0),
      impact: String(match.impact || 'unknown'),
      suggested_actions: Array.isArray(match.suggested_actions) ? match.suggested_actions : []
    }));
  }

  // 处理plan_draft
  if (result.plan_draft) {
    standardized.plan_draft.summary = String(result.plan_draft.summary || '');
    
    if (Array.isArray(result.plan_draft.steps)) {
      standardized.plan_draft.steps = result.plan_draft.steps.map(step => ({
        id: String(step.id || ''),
        title: String(step.title || ''),
        can_parallel: Boolean(step.can_parallel),
        file_map: Array.isArray(step.file_map) ? step.file_map.map(fm => ({
          path: String(fm.path || ''),
          action: String(fm.action || 'edit'),
          why: String(fm.why || '')
        })) : [],
        acceptance_checks: Array.isArray(step.acceptance_checks) ? step.acceptance_checks : [],
        dev_constraints: Array.isArray(step.dev_constraints) ? step.dev_constraints : [
          '只修改列出的文件或 new_files',
          '函数柯里化与单一职责',
          '组件使用 Vue3 <script setup lang=ts> + Tailwind（若适用）'
        ]
      }));
    }
    
    if (Array.isArray(result.plan_draft.risks)) {
      standardized.plan_draft.risks = result.plan_draft.risks.map(risk => ({
        risk: String(risk.risk || ''),
        mitigation: String(risk.mitigation || '')
      }));
    }
  }

  // 处理tooling
  if (result.tooling) {
    standardized.tooling = {
      lookups: Array.isArray(result.tooling.lookups) ? result.tooling.lookups : [],
      errors: Array.isArray(result.tooling.errors) ? result.tooling.errors : [],
      notes: String(result.tooling.notes || '')
    };
  }

  return standardized;
}

module.exports = createSaveChangeLocatorResultTool;