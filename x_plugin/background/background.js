// 存储相关函数
const TweetStorage = {
  async saveTweet(tweet) {
    const tweets = await this.getAllTweets();
    tweets.push({
      ...tweet,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      categories: [],
      sentiment: null
    });
    
    return chrome.storage.local.set({ tweets });
  },

  async getAllTweets() {
    const data = await chrome.storage.local.get('tweets');
    return data.tweets || [];
  },

  async updateTweet(tweetId, updates) {
    const tweets = await this.getAllTweets();
    const index = tweets.findIndex(t => t.id === tweetId);
    if (index !== -1) {
      tweets[index] = { ...tweets[index], ...updates };
      await chrome.storage.local.set({ tweets });
    }
  }
};

// 创建右键菜单
function createContextMenu() {
  // 先移除已有的菜单
  chrome.contextMenus.removeAll(() => {
    // 创建新菜单
    chrome.contextMenus.create({
      id: 'saveContent',
      title: '收藏选中内容',
      contexts: ['selection'],
      // 移除 documentUrlPatterns 限制，允许在所有网页使用
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error creating context menu:', chrome.runtime.lastError);
      } else {
        console.log('Context menu created successfully');
      }
    });
  });
}

// 在插件安装和更新时创建菜单
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated');
  createContextMenu();
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'saveContent') {
    console.log('Menu clicked, selection:', info.selectionText);

    // 使用 Promise 链处理异步操作
    ensureContentScriptLoaded(tab.id)
      .then(() => {
        return new Promise((resolve, reject) => {
          chrome.tabs.sendMessage(tab.id, {
            type: 'GET_CONTENT_CONTEXT',
            payload: {
              selectedText: info.selectionText,
              pageUrl: tab.url,
              pageTitle: tab.title
            }
          }, response => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (!response) {
              reject(new Error('No response from content script'));
            } else {
              resolve(response);
            }
          });
        });
      })
      .then(response => {
        if (response && response.contentData) {
          return TweetStorage.saveTweet({
            text: response.contentData.selectedText,
            author: response.contentData.author || '未知来源',
            timestamp: new Date().toISOString(),
            url: response.contentData.url,
            source: response.contentData.source,
            title: response.contentData.title
          });
        } else {
          throw new Error('Invalid content data received');
        }
      })
      .then(() => {
        console.log('Content saved successfully');
        return new Promise((resolve, reject) => {
          chrome.tabs.sendMessage(tab.id, {
            type: 'SAVE_SUCCESS'
          }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      })
      .catch(error => {
        console.error('Error handling context menu click:', error.message);
        chrome.tabs.sendMessage(tab.id, {
          type: 'SAVE_ERROR',
          payload: error.message || '保存失败'
        });
      });
  }
});

// 确保 content script 已加载的辅助函数
async function ensureContentScriptLoaded(tabId) {
  try {
    // 尝试执行脚本检查
    await chrome.tabs.sendMessage(tabId, { type: 'PING' });
  } catch (error) {
    // 如果 content script 未加载，则注入它
    console.log('Content script not loaded, injecting...');
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/content.js']
    });
    // 等待一小段时间确保脚本初始化
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// 处理来自 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);

  if (message.type === 'SAVE_TWEET') {
    TweetStorage.saveTweet(message.payload)
      .then(() => {
        console.log('Tweet saved successfully');
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('Error saving tweet:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

console.log('Background script initialized'); 