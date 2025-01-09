import TweetStorage from '../utils/storage.js';
import TweetManager from '../utils/tweetManager.js';

class PopupManager {
  constructor() {
    this.currentTab = 'tweets';
    this.categories = [];
    this.init();
  }

  async init() {
    try {
      await this.loadCategories();
      await this.loadTweets();
      this.setupTabNavigation();
      this.setupEventListeners();
      this.setupBatchOperations();
      // 初始化时更新统计信息
      await this.updateStats();
    } catch (error) {
      console.error('初始化失败:', error);
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
    // 分类筛选
    document.getElementById('categoryFilter').addEventListener('change', () => this.filterTweets());
    document.getElementById('sentimentFilter').addEventListener('change', () => this.filterTweets());

    // 添加分类
    document.getElementById('addCategory').addEventListener('click', () => this.addNewCategory());

    // 生成文章
    document.getElementById('generateArticle').addEventListener('click', () => this.generateArticle());
    document.getElementById('exportMarkdown').addEventListener('click', () => this.exportToMarkdown());
  
    // 复制文章
    document.getElementById('copyButton').addEventListener('click', () => this.copyToClipboard());
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
    div.className = 'tweet-item';
    
    // 构建基本信息
    let html = `
      <div class="tweet-header">
        <input type="checkbox" class="tweet-select" ${tweet.selected ? 'checked' : ''}>
        <div class="tweet-author">${tweet.author || '未知来源'}</div>
        <div class="tweet-time">${new Date(tweet.timestamp).toLocaleString()}</div>
      </div>
      <div class="tweet-text">${tweet.text}</div>
      <div class="tweet-source">${tweet.source ? `来源: ${tweet.source}` : ''}</div>
      <div class="tweet-url"><a href="${tweet.url}" target="_blank">原文链接</a></div>
    `;

    // 只有当有分类时才显示分类选择器
    if (this.categories && this.categories.length > 0) {
      html += `
        <div class="tweet-actions">
          <select class="tweet-category" multiple>
            ${this.getCategoryOptions(tweet.categories || [])}
          </select>
          <button class="delete-tweet">删除</button>
        </div>
      `;
    } else {
      html += `
        <div class="tweet-actions">
          <button class="delete-tweet">删除</button>
        </div>
      `;
    }

    div.innerHTML = html;

    // 添加事件监听
    div.querySelector('.tweet-select').addEventListener('change', (e) => {
      TweetStorage.toggleTweetSelection(tweet.id);
    });

    // 只有当有分类选择器时才添加分类相关的事件监听
    const categorySelect = div.querySelector('.tweet-category');
    if (categorySelect) {
      categorySelect.addEventListener('change', (e) => {
        const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
        this.updateTweetCategories(tweet.id, selectedOptions);
      });
    }

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
      selector.innerHTML = `
        <option value="">全部分类</option>
        ${this.getCategoryOptions()}
      `;
    });

    const categoryList = document.getElementById('categoryList');
    categoryList.innerHTML = `
      <div class="category-list">
        ${this.getCategoryOptions()}
      </div>
    `;

  }



  async addNewCategory() {
    const input = document.getElementById('newCategory');
    const category = input.value.trim();
    
    if (category && !this.categories.includes(category)) {
      this.categories.push(category);
      await TweetStorage.saveCategories(this.categories);
      this.updateCategorySelectors();
      input.value = '';
    }
  }

  async generateArticle() {
    const selectedTweets = await TweetStorage.getSelectedTweets();
    if (selectedTweets.length === 0) {
      alert('请先选择要包含的推文');
      return;
    }

    // 确保 marked 已加载
    if (typeof marked === 'undefined') {
      console.error('Marked library not loaded');
      alert('文章生成组件加载失败');
      return;
    }

    const articlePreview = document.getElementById('articlePreview');
    articlePreview.innerHTML = '<p class="loading">正在生成文章...</p>';

    try {
      // 准备文章数据
      const articleData = {
        tweets: selectedTweets.map(tweet => ({
          text: tweet.text,
          author: tweet.author,
          source: tweet.source,
          url: tweet.url,
          categories: tweet.categories,
          timestamp: tweet.timestamp
        })),
        categories: [...new Set(selectedTweets.flatMap(t => t.categories))],
        totalCount: selectedTweets.length
      };

      // 调用 OpenAI API 生成文章
      const article = await this.callOpenAI(articleData);
      
      // 显示生成的文章
      articlePreview.innerHTML = `
        <div class="article-content">
          <div class="article-meta">
            <span class="article-date">${new Date().toLocaleDateString()}</span>
            <span class="article-stats">包含 ${selectedTweets.length} 条内容</span>
          </div>
          ${article.content}
          <div class="article-footer">
            <div class="article-tags">
              ${article.tags.map(tag => `<span class="tag">#${tag}</span>`).join(' ')}
            </div>
          </div>
        </div>
      `;

      // 启用导出按钮
      document.getElementById('exportMarkdown').disabled = false;
      
    } catch (error) {
      console.error('生成文章失败:', error);
      articlePreview.innerHTML = `<p class="error">生成文章失败: ${error.message}</p>`;
    }
  }

  async callOpenAI(articleData) {
    // 构建 prompt
    const prompt = `根据以下内容生成一篇高质量的技术文章：
    
**主题**： ${articleData.tweets.map(t => `- ${t.text}`).join('\n')}

**分类**：${articleData.categories.join(', ')}

**要求**：

1. 生成一篇结构清晰、内容连贯的技术文章。  
2. 包含一个主标题和多个小标题，适合开发者快速理解和实操。  
3. 保留原始内容的观点与核心思想，并自然整合必要的过渡语。  
4. 提供 3-5 个相关标签，便于分类与检索。  
5. 使用 Markdown 格式编写，确保易于复制与阅读。`;
    try {
      return this.generateLocalArticle(articleData,prompt);
    } catch (error) {
      console.error('生成文章失败:', error);
      // 如果 API 调用失败，使用本地模板生成简单文章
      return this.generateLocalArticle(articleData,prompt);
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
    const articleContent = document.getElementById('articlePreview').textContent;
    if (!articleContent || articleContent.includes('正在生成文章...')) {
      alert('请先生成文章');
      return;
    }

    await navigator.clipboard.writeText(articleContent);
    alert('文章已复制到剪贴板');
  }

  async exportToMarkdown() {
    const selectedTweets = await TweetStorage.getSelectedTweets();
    if (selectedTweets.length === 0) {
      alert('请先选择要导出的推文');
      return;
    }

    const articleContent = document.getElementById('articlePreview').textContent;
    if (!articleContent || articleContent.includes('正在生成文章...')) {
      alert('请先生成文章');
      return;
    }

    const markdown = this.generateMarkdown(selectedTweets, articleContent);
    
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

  setupBatchOperations() {
    const batchPanel = document.getElementById('batchOperations');
    batchPanel.innerHTML = `
      <div class="batch-actions">
        <button id="selectAll">全选</button>
        <button id="deselectAll">取消全选</button>
        <button id="batchDelete" class="danger">批量删除</button>
      </div>
      <div class="batch-categories">
        <select id="batchCategory" multiple>
          ${this.getCategoryOptions()}
        </select>
        <button id="addToCategory">添加到分类</button>
        <button id="removeFromCategory">从分类移除</button>
      </div>
    `;

    // 添加事件监听
    document.getElementById('selectAll').addEventListener('click', () => this.toggleAllSelection(true));
    document.getElementById('deselectAll').addEventListener('click', () => this.toggleAllSelection(false));
    document.getElementById('batchDelete').addEventListener('click', () => this.batchDeleteTweets());
    document.getElementById('addToCategory').addEventListener('click', () => this.batchAddToCategory());
    document.getElementById('removeFromCategory').addEventListener('click', () => this.batchRemoveFromCategory());
  }

  async toggleAllSelection(selected) {
    const tweets = await TweetStorage.getAllTweets();
    await Promise.all(tweets.map(tweet => 
      TweetStorage.toggleTweetSelection(tweet.id, selected)
    ));
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
      // 先移除所有分类
      const tweet = (await TweetStorage.getAllTweets()).find(t => t.id === tweetId);
      if (tweet) {
        const oldCategories = tweet.categories || [];
        
        // 移除不在新分类中的旧分类
        for (const oldCategory of oldCategories) {
          if (!categories.includes(oldCategory)) {
            await TweetStorage.removeTweetCategory(tweetId, oldCategory);
          }
        }
        
        // 添加新分类
        for (const newCategory of categories) {
          if (!oldCategories.includes(newCategory)) {
            await TweetStorage.updateTweetCategory(tweetId, newCategory);
          }
        }
        
        await this.loadTweets(); // 重新加载列表以更新显示
      }
    } catch (error) {
      console.error('更新分类失败:', error);
    }
  }
}

// 初始化 popup
new PopupManager(); 