export default class PromptManager {
  static STORAGE_KEY = 'customPrompts';
  
  static DEFAULT_PROMPTS = {
    'technical': {
      name: '技术文章',
      template: `根据以下内容生成一篇高质量的技术文章：
    
**主题**： {{content}}

**分类**：{{categories}}

**要求**：  
1. 采用专业且易懂的语气，适合技术读者。
2. 结构清晰，层次分明，重点突出。
3. 结合实际案例和代码示例，增强实用性。
4. 包含技术原理解析和最佳实践建议。
5. 考虑不同技术水平读者的需求。

**文章结构**：
1. 引言：介绍问题背景和技术意义
2. 核心概念：解释关键技术点
3. 实现方案：详细的技术实现步骤
4. 最佳实践：经验总结和注意事项
5. 总结展望：技术趋势和建议

**提示**：  
- 使用代码块展示关键代码
- 加入流程图或架构图辅助说明
- 提供实用的调试和优化建议
- 注意代码和文档的可维护性

使用 Markdown 格式排版，确保文章结构清晰。
`
    },
    'summary': {
      name: '内容总结',
      template: `请总结以下内容的要点：

**原文内容**：{{content}}

**分类**：{{categories}}

**总结要求**：  
1. 提取核心观点和关键信息
2. 按主题分类整理，突出重点
3. 保持逻辑清晰，层次分明
4. 使用简洁直观的语言
5. 添加适当的标签，便于归类

**结构安排**：
- 核心要点（3-5点）
- 重要细节
- 相关链接
- 标签分类

使用 Markdown 格式，突出重点内容。
`
    },
    'blog': {
      name: '博客文章',
      template: `创作一篇吸引人的博客文章：

**主题**: {{content}}

**分类**：{{categories}}

**写作要求**：  
1. 引人入胜的开场和结尾
2. 生动有趣的叙述风格
3. 结合实际案例和个人经验
4. 注重实用性和可操作性
5. 适当互动，引发读者思考

**文章结构**：
1. 开场引子：吸引读者注意
2. 问题引入：说明文章要解决的问题
3. 主体内容：分点论述，案例支撑
4. 经验分享：个人见解和建议
5. 总结互动：鼓励读者参与讨论

**风格指南**：
- 使用生动的例子和类比
- 加入适当的幽默元素
- 设置悬念和引导
- 注重文章节奏感

使用 Markdown 格式，确保排版美观。
`
    },
    'tutorial': {
      name: '教程指南',
      template: `制作一份详细的教程指南：

**主题内容**：{{content}}

**适用领域**：{{categories}}

**教程要求**：
1. 循序渐进的步骤说明
2. 每步配有详细解释
3. 包含实际案例和示例
4. 提供故障排除指南
5. 补充扩展阅读资源

**教程结构**：
1. 前置准备
   - 环境要求
   - 所需工具
   - 基础知识

2. 步骤详解
   - 步骤1：[具体操作]
   - 步骤2：[具体操作]
   （每步包含操作说明和预期结果）

3. 注意事项
   - 常见问题
   - 解决方案
   - 优化建议

4. 进阶内容
   - 高级特性
   - 性能优化
   - 最佳实践

使用 Markdown 格式，配图配代码，清晰易懂。
`
    },
    'analysis': {
      name: '深度分析',
      template: `进行深度分析和见解：

**分析对象**：{{content}}

**涉及领域**：{{categories}}

**分析框架**：
1. 现状分析
   - 背景介绍
   - 问题定义
   - 现有解决方案

2. 深入探讨
   - 核心问题剖析
   - 影响因素分析
   - 潜在机会点

3. 多维度对比
   - 优势分析
   - 劣势分析
   - 可能的风险

4. 发展趋势
   - 行业动态
   - 技术演进
   - 未来展望

5. 建议与对策
   - 短期建议
   - 长期策略
   - 实施路径

**输出要求**：
- 数据支撑论点
- 图表辅助说明
- 多角度思考
- 实用性建议

使用 Markdown 格式，确保专业性和可读性。
`
    },
    'review': {
      name: '综述评论',
      template: `撰写一篇专业的综述评论：

**评论对象**：{{content}}

**所属领域**：{{categories}}

**评论框架**：
1. 概述
   - 背景介绍
   - 主要观点
   - 创新之处

2. 分析评价
   - 优势特点
   - 存在不足
   - 改进空间

3. 对比研究
   - 横向对比
   - 纵向发展
   - 特色创新

4. 应用价值
   - 实际意义
   - 推广价值
   - 局限性

5. 总结建议
   - 核心启示
   - 改进建议
   - 未来展望

**评论要求**：
- 客观公正的态度
- 深入的分析见解
- 建设性的改进建议
- 前瞻性的发展建议

使用 Markdown 格式，突出重点，论证充分。
`
    },
    'news': {
      name: '新闻报道',
      template: `撰写一篇新闻报道文章：

**新闻主题**：{{content}}

**相关领域**：{{categories}}

**写作要求**：
1. 遵循5W1H原则（何人、何事、何时、何地、为何、如何）
2. 客观准确报道事实
3. 注重时效性和新闻价值
4. 引用可靠消息来源

**文章结构**：
1. 新闻导语
   - 核心信息
   - 吸引读者兴趣

2. 主体内容
   - 事件经过
   - 各方观点
   - 影响分析

3. 背景资料
   - 相关背景
   - 历史context

4. 延伸报道
   - 专家观点
   - 未来展望

**注意事项**：
- 保持客观中立
- 信息准确完整
- 逻辑清晰连贯
- 语言简洁明了

使用 Markdown 格式，新闻性与可读性兼具。
`
    },
    'product': {
      name: '产品介绍',
      template: `编写一份专业的产品介绍：

**产品信息**：{{content}}

**产品类别**：{{categories}}

**内容框架**：
1. 产品概述
   - 核心功能
   - 主要特点
   - 适用场景

2. 功能特性
   - 主要功能列表
   - 技术规格
   - 创新亮点

3. 应用场景
   - 典型用例
   - 解决方案
   - 实际效果

4. 产品优势
   - 竞争优势
   - 技术创新
   - 用户价值

5. 使用指南
   - 快速上手
   - 常见问题
   - 注意事项

**写作要求**：
- 突出产品价值
- 强调用户利益
- 数据支撑论点
- 案例说明效果

使用 Markdown 格式，突出重点，专业规范。
`
    }
  };

  static async getCustomPrompts() {
    const data = await chrome.storage.local.get(this.STORAGE_KEY);
    return data[this.STORAGE_KEY] || {};
  }

  static async saveCustomPrompt(id, prompt) {
    const prompts = await this.getCustomPrompts();
    prompts[id] = prompt;
    await chrome.storage.local.set({ [this.STORAGE_KEY]: prompts });
  }

  static async deleteCustomPrompt(id) {
    const prompts = await this.getCustomPrompts();
    delete prompts[id];
    await chrome.storage.local.set({ [this.STORAGE_KEY]: prompts });
  }

  static async getAllPrompts() {
    const customPrompts = await this.getCustomPrompts();
    return {
      default: this.DEFAULT_PROMPTS,
      custom: customPrompts
    };
  }
}