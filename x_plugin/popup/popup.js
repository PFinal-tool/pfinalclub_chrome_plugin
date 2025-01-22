import TweetStorage from '../utils/storage.js';
import TweetManager from '../utils/tweetManager.js';
import PromptManager from '../utils/promptManager.js';

class PopupManager {
  constructor() {
    this.currentTab = 'tweets';
    this.categories = [];
    this.currentPrompt = null; // 添加新属性来保存当前使用的 prompt
    this.init();
  }

  async init() {
    try {
      await this.loadCategories();
      await this.loadTweets();
      await this.loadPrompts();
      
      // 确保DOM元素存在后再设置事件监听
      if (document.readyState === 'complete') {
        this.setupTabNavigation();
        this.setupEventListeners();
        this.setupBatchOperations();
        // 初始化时更新统计信息
        await this.updateStats();
      } else {
        window.addEventListener('load', async () => {
          this.setupTabNavigation();
          this.setupEventListeners();
          this.setupBatchOperations();
          await this.updateStats();
        });
      }
    } catch (error) {
      console.error('初始化失败:', error);
      // 显示错误信息给用户
      const tweetList = document.getElementById('tweetList');
      if (tweetList) {
        tweetList.innerHTML = `
          <div class="error-state">
            <p>加载失败</p>
            <p class="error-message">${error.message}</p>
          </div>
        `;
      }
    }
  }

  setupTabNavigation() {
    document.querySelectorAll('nav button').forEach(button => {
      button.addEventListener('click', async () => {
        // 切换标签页
        this.switchTab(button.dataset.tab);
        
        // 如果切换到统计标签页，更新统计信息
        if (button.dataset.tab === 'stats') {
          await this.updateStats();
        }
      });
    });
  }

  setupEventListeners() {
    try {
      // 分类筛选
      const categoryFilter = document.getElementById('categoryFilter');
      const sentimentFilter = document.getElementById('sentimentFilter');
      const addCategoryBtn = document.getElementById('addCategory');
      const generateArticleBtn = document.getElementById('generateArticle');
      const exportMarkdownBtn = document.getElementById('exportMarkdown');
      const copyButton = document.getElementById('copyButton');

      // 添加分类相关事件
      if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => this.addNewCategory());
      }

      // 生成文章相关功能
      if (generateArticleBtn) {
        generateArticleBtn.addEventListener('click', () => this.generateArticle());
      }

      if (exportMarkdownBtn) {
        exportMarkdownBtn.addEventListener('click', () => this.exportToMarkdown());
      }

      // 复制文章
      if (copyButton) {
        copyButton.addEventListener('click', () => this.copyToClipboard());
      }

      // 分类和情感过滤器
      if (categoryFilter) {
        categoryFilter.addEventListener('change', () => this.filterTweets());
      }
      if (sentimentFilter) {
        sentimentFilter.addEventListener('change', () => this.filterTweets());
      }
    } catch (error) {
      console.error('设置事件监听器失败:', error);
    }
  }

  switchTab(tabId) {
    this.currentTab = tabId;
    
    // 更新标签页状态
    document.querySelectorAll('nav button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === tabId);
    });
  }

  async loadTweets() {
    const tweets = await TweetStorage.getAllTweets();
    const tweetList = document.getElementById('tweetList');
    tweetList.innerHTML = '';

    tweets.forEach(tweet => {
      const tweetElement = this.createTweetElement(tweet);
      tweetList.appendChild(tweetElement);
    });
  }

  createTweetElement(tweet) {
    const div = document.createElement('div');
    div.className = `tweet-item ${tweet.selected ? 'selected' : ''}`;
    div.dataset.tweetId = tweet.id;
    
    // 构建基本信息
    let html = `
     
      <div class="tweet-content">
        <div class="tweet-title">${tweet.text}</div>
        <div class="tweet-text">${tweet.author || '未知来源'}</div>
        <div class="tweet-meta">
          <div class="tweet-time">${new Date(tweet.timestamp).toLocaleString()}</div>
          <div class="tweet-source">${tweet.source ? `来源: ${tweet.source}` : ''}</div>
          <div class="tweet-url"><a href="${tweet.url}" target="_blank">原文链接</a></div>
        </div>
      </div>
    `;

    // 使用标签式分类选择器
    if (this.categories && this.categories.length > 0) {
      html += `
        <div class="tweet-actions">
          <div class="category-chips">
            ${this.categories.map(category => `
              <div class="category-chip ${(tweet.categories || []).includes(category) ? 'selected' : ''}" 
                   data-category="${category}">
                ${category}
              </div>
            `).join('')}
          </div>
          <button class="delete-tweet danger">删除</button>
        </div>
      `;
    } else {
      html += `
        <div class="tweet-actions">
          <button class="delete-tweet danger">删除</button>
        </div>
      `;
    }

    div.innerHTML = html;

    // 添加点击选择事件
    div.addEventListener('click', async (e) => {
      // 如果点击的是删除按钮、链接或分类标签，不触发选择
      if (!e.target.closest('.delete-tweet') && !e.target.closest('a') && !e.target.closest('.category-chip')) {
        const newSelected = !div.classList.contains('selected');
        div.classList.toggle('selected', newSelected);
        await TweetStorage.toggleTweetSelection(tweet.id, newSelected);
      }
    });

    // 分类标签的事件处理
    const categoryChips = div.querySelectorAll('.category-chip');
    categoryChips.forEach(chip => {
      chip.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation(); // 阻止冒泡，避免触发tweet选择
        
        const category = chip.dataset.category;
        const wasSelected = chip.classList.contains('selected');
        
        try {
          // 先更新视觉状态
          chip.classList.toggle('selected', !wasSelected);
          
          // 获取当前选中的所有分类
          const selectedCategories = Array.from(div.querySelectorAll('.category-chip.selected'))
            .map(chip => chip.dataset.category);
          
          // 更新分类
          await this.updateTweetCategories(tweet.id, selectedCategories);
        } catch (error) {
          console.error('更新分类失败:', error);
          // 如果更新失败，恢复原始状态
          chip.classList.toggle('selected', wasSelected);
          alert('更新分类失败，请重试');
        }
      });
    });

    // 添加删除按钮的事件监听
    div.querySelector('.delete-tweet').addEventListener('click', () => {
      this.deleteTweet(tweet.id);
    });

    return div;
  }

  getCategoryOptions(selectedCategories = []) {
    if (!this.categories || this.categories.length === 0) {
      return '';
    }

    return this.categories
      .map(category => `
        <option value="${category}" ${selectedCategories.includes(category) ? 'selected' : ''}>
          ${category}
        </option>
      `)
      .join('');
  }

  async loadCategories() {
    try {
      this.categories = await TweetStorage.getCategories();
      this.updateCategoryList();
    } catch (error) {
      console.error('加载分类失败:', error);
      this.categories = [];
    }
  }

  updateCategorySelectors() {
    if (!this.categories || this.categories.length === 0) {
      return;
    }

    const selectors = document.querySelectorAll('.tweet-category, #categoryFilter');
    selectors.forEach(selector => {
      const selectedValues = Array.from(selector.selectedOptions).map(opt => opt.value);
      selector.innerHTML = `
        ${selector.id === 'categoryFilter' ? '<option value="">全部分类</option>' : ''}
        ${this.getCategoryOptions(selectedValues)}
      `;
    });
  }

  updateCategoryList() {
    if (!this.categories || this.categories.length === 0) {
      return;
    }
    const categoryList = document.getElementById('categoryList');
    let html = '<ul class="category-list">';
    this.categories.forEach(category => {
      html += `
          <li class="category-item">
           <span class="category-name">${category}</span>
           <button class="delete-category" aria-label="${category}">删除</button>
          </li>
      `;
    });

    html += '</ul>';

    categoryList.innerHTML = html;

    // 添加事件监听
    document.querySelectorAll('.delete-category').forEach(button => {
      button.addEventListener('click', () => this.deleteCategory(button.getAttribute('aria-label')));
    });
  }


  async deleteCategory(category) {
    if (confirm(`确定要删除分类 "${category}" 吗？`)) {
      try {
        // 获取所有使用该分类的推文
        const tweets = await TweetStorage.getAllTweets();
        const affectedTweets = tweets.filter(tweet => 
          tweet.categories && tweet.categories.includes(category)
        );
        
        // 从分类列表中移除
        this.categories = this.categories.filter(c => c !== category);
        await TweetStorage.saveCategories(this.categories);
        
        // 从所有相关推文中移除该分类
        for (const tweet of affectedTweets) {
          const updatedCategories = tweet.categories.filter(c => c !== category);
          await this.updateTweetCategories(tweet.id, updatedCategories);
        }
        
        // 更新界面
        if (this.categories.length === 0) {
          // 当删除最后一个分类时，清空分类列表
          const categoryList = document.getElementById('categoryList');
          if (categoryList) {
            categoryList.innerHTML = '';
          }
          
          // 清空所有分类选择器
          const selectors = document.querySelectorAll('.tweet-category, #categoryFilter, #batchCategory');
          selectors.forEach(selector => {
            if (selector) {
              selector.innerHTML = selector.id === 'categoryFilter' ? '<option value="">全部分类</option>' : '';
            }
          });
        } else {
          this.updateCategorySelectors();
          this.updateCategoryList();
        }
        
        await this.loadTweets();
        
        // 如果在统计页面，更新统计信息
        if (this.currentTab === 'stats') {
          await this.updateStats();
        }
      } catch (error) {
        console.error('删除分类失败:', error);
        alert('删除分类失败，请重试');
      }
    }
  }


  async addNewCategory() {
    const input = document.getElementById('newCategory');
    const category = input.value.trim();
    
    if (category && !this.categories.includes(category)) {
      // 添加到分类列表
      this.categories.push(category);
      await TweetStorage.saveCategories(this.categories);
      
      // 获取所有推文
      const tweets = await TweetStorage.getAllTweets();
      
      // 更新所有已选中该分类的推文
      const selectedTweets = tweets.filter(tweet => 
        tweet.categories && tweet.categories.includes(category)
      );
      
      if (selectedTweets.length > 0) {
        for (const tweet of selectedTweets) {
          await this.updateTweetCategories(tweet.id, [...tweet.categories]);
        }
      }
      
      // 更新所有分类选择器
      this.updateAllCategorySelectors(category);
      
      // 清空输入框
      input.value = '';
      
      // 重新加载推文列表以显示更新
      await this.loadTweets();
    }
  }

  // 添加新方法来更新所有分类选择器
  updateAllCategorySelectors(newCategory = null) {
    // 更新主分类选择器
    this.updateCategorySelectors();
    
    // 更新批量操作的分类选择器
    const batchCategorySelect = document.getElementById('batchCategory');
    if (batchCategorySelect) {
      const batchSelectedValues = Array.from(batchCategorySelect.selectedOptions).map(opt => opt.value);
      batchCategorySelect.innerHTML = this.getCategoryOptions(batchSelectedValues);
    }
    
    // 更新每个推文的分类选择器和标签显示
    const tweetItems = document.querySelectorAll('.tweet-item');
    tweetItems.forEach(async item => {
      const selector = item.querySelector('.tweet-category');
      const categoriesDisplay = item.querySelector('.selected-categories');
      
      if (selector && categoriesDisplay) {
        const selectedValues = Array.from(selector.selectedOptions).map(opt => opt.value);
        
        // 更新选择器
        selector.innerHTML = this.getCategoryOptions(selectedValues);
        
        // 更新标签显示
        categoriesDisplay.innerHTML = selectedValues.map(cat => 
          `<span class="category-tag">${cat}</span>`
        ).join('');
      }
    });
    
    // 更新分类过滤器
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      const currentValue = categoryFilter.value;
      categoryFilter.innerHTML = `
        <option value="">全部分类</option>
        ${this.getCategoryOptions([currentValue])}
      `;
    }
    
    // 更新分类列表
    this.updateCategoryList();
  }

  async generateArticle() {
    try {
      const promptSelect = document.getElementById('promptSelect');
      if (!promptSelect.value) {
        alert('请先选择一个模板');
        return;
      }

      // Get selected tweets
      const selectedTweets = await TweetStorage.getSelectedTweets();
      if (selectedTweets.length === 0) {
        alert('请先选择要生成文章的推文');
        return;
      }

      // Get prompt template
      const { default: defaultPrompts, custom: customPrompts } = await PromptManager.getAllPrompts();
      const prompts = { ...defaultPrompts, ...customPrompts };
      const promptTemplate = prompts[promptSelect.value]?.template;
      if (!promptTemplate) {
        alert('模板加载失败');
        return;
      }

      // Save current template
      this.currentPrompt = promptTemplate;

      // Generate content from tweets
      const tweetContent = this.formatTweetsForArticle(selectedTweets);
      const categories = this.getCategoriesFromTweets(selectedTweets);
      console.log('tweetContent:', tweetContent);
      // Replace template variables
      const prompt = promptTemplate
        .replace('{{content}}', tweetContent)
        .replace('{{categories}}', categories.join('、'));

      // Call API to generate article
      const response = await this.callOpenAI(prompt);
      
      // Display result
      this.displayGeneratedArticle(response, selectedTweets);
      
    } catch (error) {
      console.error('生成文章失败:', error);
      alert('生成文章失败: ' + error.message);
    }
  }

  async loadPrompts() {
    try {
      const { default: defaultPrompts } = await PromptManager.getAllPrompts();
      const promptSelect = document.getElementById('promptSelect');
      if (!promptSelect) return;
      
      // Clear existing options
      promptSelect.innerHTML = `
        <option value="">选择模板</option>
        <optgroup label="内置模板"></optgroup>
      `;
      
      const defaultGroup = promptSelect.querySelector('optgroup[label="内置模板"]');
      
      // Add default templates
      Object.entries(defaultPrompts).forEach(([id, prompt]) => {
        this.addPromptOption(defaultGroup, id, prompt);
      });
    } catch (error) {
      console.error('加载模板失败:', error);
    }
  }

  addPromptOption(group, id, prompt) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = prompt.name;
    group.appendChild(option);
  }

  async callOpenAI(prompt) {
    try {
      // 直接返回格式化后的内容
      return {
        content: marked(prompt),
        tags: ['技术', '开发', '学习']
      };
    } catch (error) {
      console.error('生成文章失败:', error);
      throw new Error('生成文章失败，请稍后重试');
    }
  }

  async getHuggingFaceKey() {
    const data = await chrome.storage.local.get('huggingfaceKey');
    if (!data.huggingfaceKey) {
      const key = prompt('请输入 Hugging Face API Token:');
      if (!key) throw new Error('需要 Hugging Face API Token');
      await chrome.storage.local.set({ huggingfaceKey: key });
      return key;
    }
    return data.huggingfaceKey;
  }

  // 本地文章生成（作为备选方案）
  generateLocalArticle(articleData,prompt) {
    const title = `${articleData.categories[0] || '内容'} 汇总`;
    const date = new Date().toLocaleDateString();
    
    const content = `
    # ${title}

    *生成时间：${date}*

    ## 内容概览

    本文整理了 ${articleData.totalCount} 条相关内容，涉及 ${articleData.categories.join('、')} 等主题。

    ## 详细内容

    ${articleData.tweets.map(tweet => `
    ### 来自 ${tweet.author}

    ${tweet.text}

    *来源：[原文链接](${tweet.url})*
    `).join('\n\n')}

    ## 总结

    以上内容来自 ${new Set(articleData.tweets.map(t => t.author)).size} 个不同来源，
    涵盖了 ${articleData.categories.join('、')} 等领域的观点和讨论。

    #内容汇总 #${articleData.categories[0] || '资料'} #${articleData.tweets[0].source || '网络'} #${new Date().getFullYear()}
    `;

    return {
      content: marked(prompt),
      tags: ['内容汇总', articleData.categories[0] || '资料', 
             articleData.tweets[0].source || '网络', 
             new Date().getFullYear().toString()]
    };
  }

  extractTags(content) {
    // 从文章内容中提取标签
    const tagMatch = content.match(/#[\w\u4e00-\u9fa5]+/g);
    return tagMatch ? tagMatch.map(t => t.slice(1)) : [];
  }

  async copyToClipboard() {
    if (!this.currentPrompt) {
      alert('请先生成文章');
      return;
    }

    const selectedTweets = await TweetStorage.getSelectedTweets();
    const categories = [...new Set(selectedTweets.flatMap(t => t.categories))].join(', ');
    
    // 组合完整的 prompt
    const fullPrompt = this.currentPrompt
      .replace('{{content}}', selectedTweets.map(t => t.text).join('\n'))
      .replace('{{categories}}', categories);

    // 复制到剪贴板
    await navigator.clipboard.writeText(fullPrompt);
    alert('Prompt 已复制到剪贴板');
}

  async exportToMarkdown() {
    const articlePreview = document.getElementById('articlePreview');
    const mainContent = articlePreview.querySelector('.main-content');
    
    if (!mainContent) {
      alert('请先生成文章');
      return;
    }

    const selectedTweets = await TweetStorage.getSelectedTweets();
    const markdown = this.generateMarkdown(selectedTweets, mainContent.textContent);
    
    // 创建下载链接
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `article-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  generateMarkdown(tweets) {
    return `# Twitter 收藏整理

## 收藏时间：${new Date().toLocaleString()}

${tweets.map(tweet => `
### @${tweet.author}

${tweet.text}

- 时间：${new Date(tweet.timestamp).toLocaleString()}
- 分类：${tweet.categories.join(', ') || '未分类'}
- 情感：${tweet.sentiment || '未分析'}
- 链接：${tweet.url}
`).join('\n---\n')}
`;
  }

  async filterTweets() {
    const categoryFilter = document.getElementById('categoryFilter').value;
    const sentimentFilter = document.getElementById('sentimentFilter').value;
    
    const tweets = await TweetStorage.getAllTweets();
    const filteredTweets = tweets.filter(tweet => {
      const matchesCategory = !categoryFilter || tweet.categories.includes(categoryFilter);
      const matchesSentiment = !sentimentFilter || tweet.sentiment === sentimentFilter;
      return matchesCategory && matchesSentiment;
    });

    const tweetList = document.getElementById('tweetList');
    tweetList.innerHTML = '';
    filteredTweets.forEach(tweet => {
      const tweetElement = this.createTweetElement(tweet);
      tweetList.appendChild(tweetElement);
    });
  }

  async updateTweetCategory(tweetId, category) {
    await TweetStorage.updateTweetCategory(tweetId, category);
    await this.loadTweets(); // 重新加载列表以更新显示
  }

  async deleteTweet(tweetId) {
    if (confirm('确定要删除这条推文吗？')) {
      await TweetStorage.deleteTweet(tweetId);
      await this.loadTweets();
    }
  }

  async updateStats() {
    try {
      const stats = await TweetManager.getStats();
      const statsElement = document.getElementById('statsPanel');
      
      if (!statsElement) {
        console.error('Stats panel element not found');
        return;
      }

      console.log('Updating stats with:', stats); // 调试日志

      statsElement.innerHTML = `
        <div class="stats-panel">
          <div class="stats-summary">
            <div class="stat-item">
              <span class="stat-label">总收藏数</span>
              <span class="stat-value">${stats.total}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">已分类</span>
              <span class="stat-value">${stats.categorized}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">本周新增</span>
              <span class="stat-value">${this.getThisWeekCount(stats.tweets)}</span>
            </div>
          </div>
          
          <div class="stats-section">
            <h4>分类统计</h4>
            <div class="category-stats">
              ${Object.entries(stats.byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([category, count]) => `
                  <div class="category-stat">
                    <span class="category-name">${category}</span>
                    <span class="category-count">${count}</span>
                  </div>
                `).join('')}
            </div>
          </div>
          
          <div class="stats-section">
            <h4>情感分析</h4>
            <div class="sentiment-stats">
              <div class="sentiment-bars">
                ${this.renderSentimentBars(stats)}
              </div>
              <div class="sentiment-legend">
                <div class="legend-item">
                  <div class="legend-color" style="background: #28a745"></div>
                  <span>正面 (${stats.bySentiment.positive})</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color" style="background: #6c757d"></div>
                  <span>中立 (${stats.bySentiment.neutral})</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color" style="background: #dc3545"></div>
                  <span>负面 (${stats.bySentiment.negative})</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="stats-section">
            <h4>来源分布</h4>
            <div class="category-stats">
              ${Object.entries(stats.bySource)
                .sort((a, b) => b[1] - a[1])
                .map(([source, count]) => `
                  <div class="category-stat">
                    <span class="category-name">${source}</span>
                    <span class="category-count">${count}</span>
                  </div>
                `).join('')}
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('更新统计信息失败:', error);
    }
  }

  getThisWeekCount(tweets) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return tweets.filter(tweet => new Date(tweet.timestamp) > oneWeekAgo).length;
  }

  renderSentimentBars(stats) {
    const total = stats.total || 1; // 防止除以0
    const positive = (stats.bySentiment.positive / total) * 100;
    const neutral = (stats.bySentiment.neutral / total) * 100;
    const negative = (stats.bySentiment.negative / total) * 100;

    return `
      <div class="sentiment-bar positive" style="width: ${positive}%">
        ${positive > 10 ? `${Math.round(positive)}%` : ''}
      </div>
      <div class="sentiment-bar neutral" style="width: ${neutral}%">
        ${neutral > 10 ? `${Math.round(neutral)}%` : ''}
      </div>
      <div class="sentiment-bar negative" style="width: ${negative}%">
        ${negative > 10 ? `${Math.round(negative)}%` : ''}
      </div>
    `;
  }

  formatTweetsForArticle(tweets) {
    return tweets.map(tweet => tweet.text).join('\n\n');
  }

  getCategoriesFromTweets(tweets) {
    // 从所有推文中提取唯一的分类列表
    const categories = new Set();
    tweets.forEach(tweet => {
      if (tweet.categories && Array.isArray(tweet.categories)) {
        tweet.categories.forEach(category => categories.add(category));
      }
    });
    return Array.from(categories);
  }

  setupBatchOperations() {
    const batchPanel = document.getElementById('batchOperations');
    batchPanel.innerHTML = `
      <div class="batch-actions">
        <button id="selectAll">全选</button>
        <button id="deselectAll">取消全选</button>
        <button id="batchDelete" class="danger">批量删除</button>
      </div>
    `;

    // 添加事件监听
    document.getElementById('selectAll').addEventListener('click', () => this.toggleAllSelection(true));
    document.getElementById('deselectAll').addEventListener('click', () => this.toggleAllSelection(false));
    document.getElementById('batchDelete').addEventListener('click', () => this.batchDeleteTweets());
  }

  async toggleAllSelection(selected) {
    const tweets = await TweetStorage.getAllTweets();
    // 更新所有推文的选择状态
    for (const tweet of tweets) {
      await TweetStorage.toggleTweetSelection(tweet.id, selected);
      // 更新 UI 显示
      const tweetElement = document.querySelector(`[data-tweet-id="${tweet.id}"]`);
      if (tweetElement) {
        tweetElement.classList.toggle('selected', selected);
      }
    }
    // 重新加载推文列表以确保 UI 状态同步
    await this.loadTweets();
  }

  async batchDeleteTweets() {
    const selectedTweets = await TweetStorage.getSelectedTweets();
    if (selectedTweets.length === 0) {
      alert('请先选择要删除的推文');
      return;
    }

    if (confirm(`确定要删除选中的 ${selectedTweets.length} 条推文吗？`)) {
      await TweetManager.batchDelete(selectedTweets.map(t => t.id));
      await this.loadTweets();
    }
  }

  async batchAddToCategory() {
    const selectedTweets = await TweetStorage.getSelectedTweets();
    const categorySelect = document.getElementById('batchCategory');
    const selectedCategories = Array.from(categorySelect.selectedOptions).map(opt => opt.value);

    if (selectedTweets.length === 0 || selectedCategories.length === 0) {
      alert('请选择推文和分类');
      return;
    }

    await TweetManager.batchUpdateCategories(
      selectedTweets.map(t => t.id),
      selectedCategories
    );
    await this.loadTweets();
  }

  async batchRemoveFromCategory() {
    const selectedTweets = await TweetStorage.getSelectedTweets();
    const categorySelect = document.getElementById('batchCategory');
    const selectedCategories = Array.from(categorySelect.selectedOptions).map(opt => opt.value);

    if (selectedTweets.length === 0 || selectedCategories.length === 0) {
      alert('请选择推文和分类');
      return;
    }

    await TweetManager.batchRemoveCategories(
      selectedTweets.map(t => t.id),
      selectedCategories
    );
    await this.loadTweets();
  }

  async updateTweetCategories(tweetId, categories) {
    try {
      const tweet = (await TweetStorage.getAllTweets()).find(t => t.id === tweetId);
      if (tweet) {
        const oldCategories = tweet.categories || [];
        
        // 获取需要移除和添加的分类
        const categoriesToRemove = oldCategories.filter(c => !categories.includes(c));
        const categoriesToAdd = categories.filter(c => !oldCategories.includes(c));
        
        // 移除旧分类
        for (const category of categoriesToRemove) {
          await TweetStorage.removeTweetCategory(tweetId, category);
        }
        
        // 添加新分类
        for (const category of categoriesToAdd) {
          await TweetStorage.updateTweetCategory(tweetId, category);
        }
        
        // 更新所有相关推文的分类显示
        const allTweets = await TweetStorage.getAllTweets();
        const relatedTweets = allTweets.filter(t => 
          t.categories.some(c => categoriesToAdd.includes(c) || categoriesToRemove.includes(c))
        );
        
        for (const relatedTweet of relatedTweets) {
          if (relatedTweet.id !== tweetId) {
            const updatedCategories = relatedTweet.categories.map(c => {
              if (categoriesToRemove.includes(c)) {
                return categories.find(newCat => newCat !== c) || c;
              }
              return c;
            });
            await TweetStorage.updateTweetCategories(relatedTweet.id, updatedCategories);
          }
        }
        
        // 重新加载推文列表
        await this.loadTweets();
        
        // 如果在统计页面，更新统计信息
        if (this.currentTab === 'stats') {
          await this.updateStats();
        }
      }
    } catch (error) {
      console.error('更新分类失败:', error);
    }
  }

  displayGeneratedArticle(response, selectedTweets) {
    const articlePreview = document.getElementById('articlePreview');
    if (!articlePreview) return;

    // 从选中的推文中获取基本信息
    const categories = this.getCategoriesFromTweets(selectedTweets);
    const date = new Date().toLocaleString();

    // 构建文章预览 HTML
    articlePreview.innerHTML = `
      <div class="article-meta">
        <span>生成时间：${date}</span>
        <span>分类：${categories.join('、') || '未分类'}</span>
      </div>
      <div class="main-content">
        ${response.content}
      </div>
      <div class="article-footer">
        <div class="article-tags">
          ${response.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
        </div>
      </div>
    `;
  }

}

// 初始化 popup
new PopupManager();