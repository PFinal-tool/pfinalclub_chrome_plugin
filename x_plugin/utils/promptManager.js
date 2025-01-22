export default class PromptManager {
  static STORAGE_KEY = 'customPrompts';
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
    try {
      // 从 templates 目录加载 JSON 模板
      const templatePrompts = {};
      const templateFiles = ['technical.json', 'xiaohongshu.json'];
      
      for (const file of templateFiles) {
        const response = await fetch(chrome.runtime.getURL(`templates/${file}`));
        if (response.ok) {
          const templates = await response.json();
          Object.assign(templatePrompts, templates);
        }
      }
      
      // 获取自定义模板
      const customPrompts = await this.getCustomPrompts();
      
      return {
        default: templatePrompts,
        custom: customPrompts
      };
    } catch (error) {
      console.error('加载模板失败:', error);
      return {
        default: {},
        custom: {}
      };
    }
  }
}