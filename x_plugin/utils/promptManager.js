export default class PromptManager {
  static STORAGE_KEY = 'customPrompts';
  
  static DEFAULT_PROMPTS = {
    'technical': {
      name: '技术文章',
      template: `根据以下内容生成一篇高质量的技术文章：
    
**主题**： {{content}}

**分类**：{{categories}}

**要求**：  
1. 采用轻松、易读的语气，贴近读者。  
2. 结合实际案例和个人见解，增强文章的可信度和趣味性。  
3. 恰当引用原文的核心观点，并展开深入分析。  
4. 设计一个吸引读者的开头和令人印象深刻的总结。  
5. 使用 Markdown 格式，确保文章结构清晰，排版优美。

**提示**：  
- 提供实用建议和经验分享。  
- 用简洁的标题、小标题分隔内容。  
- 引入图表、代码块或引用格式，增强内容表现力。  

`
    },
    'summary': {
      name: '内容总结',
      template: `请总结以下内容的要点：

**主题**：{{content}}

**要求**：  
1. 提取内容中的核心观点与关键信息。  
2. 根据不同主题分类整理，确保逻辑清晰。  
3. 使用简洁、直观的语言表达，方便快速理解。  
4. 添加适当的标签（如关键字或主题标签），便于内容检索与归类。 

`
    },
    'blog': {
      name: '博客文章',
      template: `

**任务**：创作一篇博客文章  

**主题**: {{content}}

**分类**：{{categories}}

**要求**：  
1. 采用轻松、易读的语气，让内容更具亲和力。  
2. 融入实际案例和个人见解，增强文章的实用性与吸引力。  
3. 恰当引用原文观点，作为论据或补充说明。  
4. 设计一个吸引读者注意的开场，并以精彩的总结收尾。  
5. 使用 Markdown 格式，确保排版清晰、内容结构化。  

**提示**：  
- 包括小标题、列表等形式分段内容，便于阅读。  
- 分享实用的操作建议或经验，增加文章价值。  
- 突出独立开发者在平台运营中的独特挑战与机会。  
`
    },
    'tutorial': {
      name: '教程指南',
      template: `将以下内容转换为一篇实用教程：

主要内容：{{content}}

涉及领域：{{categories}}

要求：
1. 按步骤清晰讲解
2. 包含实际示例和注意事项
3. 添加必要的背景知识
4. 突出关键点和常见问题
5. 使用 Markdown 格式编写`
    },
    'analysis': {
      name: '深度分析',
      template: `对以下内容进行深度分析：

原文内容：{{content}}

相关领域：{{categories}}

要求：
1. 提供深入的见解和分析
2. 探讨潜在的影响和趋势
3. 对比不同观点
4. 给出合理的建议
5. 使用 Markdown 格式`
    },
    'review': {
      name: '综述评论',
      template: `
**任务**：撰写一篇综述评论  

**评论对象**：{{content}}

**分类**：{{categories}}

**要求**：  
1. **全面概述**：总结核心观点，确保内容简洁且信息完整。  
2. **优缺点分析**：从不同角度探讨建议的实际优势与潜在局限。  
3. **个人见解**：结合自身经验或观察，提出独到观点或改进建议。  
4. **关键启示**：提炼对读者有借鉴意义的要点，作为总结亮点。  
5. 字数限制：不超过 100 字，简洁明了。  
6. 使用 Markdown 格式，确保结构清晰、便于阅读。  

**提示**：  
- 使用小标题组织内容，例如“主要观点”、“优缺点分析”、“个人见解”、“关键启示”等。  
- 引入实际案例或简要说明，使内容更具说服力。  
- 在表达观点时平衡客观性与主观性，增强文章的深度与吸引力。   

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