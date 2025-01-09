class ContentCollector {
  constructor() {
    this.init();
    console.log('Content Collector initialized');
  }

  init() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Received message in content script:', message);

      // 立即响应 PING 消息
      if (message.type === 'PING') {
        sendResponse({ status: 'alive' });
        return false;
      }

      // 对于其他消息，使用 Promise 处理
      const handleMessage = async () => {
        try {
          if (message.type === 'GET_CONTENT_CONTEXT') {
            const contentData = this.getContentData(message.payload);
            console.log('Sending content data:', contentData);
            sendResponse({ contentData });
          } else if (message.type === 'SAVE_SUCCESS') {
            this.showNotification('收藏成功！', 'success');
            sendResponse({ success: true });
          } else if (message.type === 'SAVE_ERROR') {
            this.showNotification('保存失败：' + message.payload, 'error');
            sendResponse({ success: false });
          }
        } catch (error) {
          console.error('Error handling message:', error);
          sendResponse({ error: error.message });
        }
      };

      // 对于需要异步处理的消息
      if (message.type !== 'PING') {
        handleMessage();
        return true; // 保持消息通道打开
      }
    });
  }

  getContentData({ selectedText, pageUrl, pageTitle }) {
    let source = 'web';
    let author = '';

    // 检测不同网站并提取特定信息
    if (window.location.hostname.includes('twitter.com')) {
      source = 'twitter';
      const tweetElement = this.findParentTweet(window.getSelection().anchorNode);
      if (tweetElement) {
        author = this.getTweetAuthor(tweetElement);
      }
    } else if (window.location.hostname.includes('weibo.com')) {
      source = 'weibo';
      // 添加微博特定的作者提取逻辑
    }

    // 如果没有获取到作者，使用网站标题
    if (!author) {
      author = pageTitle || document.title || window.location.hostname;
    }

    return {
      selectedText,
      url: pageUrl,
      title: pageTitle,
      source,
      author,
      timestamp: new Date().toISOString()
    };
  }

  // Twitter 特定的方法
  findParentTweet(element) {
    let current = element;
    while (current && !current.matches('article[data-testid="tweet"]')) {
      current = current.parentElement;
    }
    return current;
  }

  getTweetAuthor(tweet) {
    const authorElement = tweet.querySelector('[data-testid="User-Name"]');
    return authorElement ? authorElement.textContent : '';
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `content-collector-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      background: ${type === 'success' ? '#4caf50' : '#f44336'};
      color: white;
      font-size: 14px;
      z-index: 999999;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      transition: opacity 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// 初始化收藏器
const collector = new ContentCollector();
console.log('ContentCollector instance created'); 