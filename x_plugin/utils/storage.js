class TweetStorage {
  static async saveTweet(tweet) {
    const tweets = await this.getAllTweets();
    tweets.push({
      ...tweet,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      categories: [],
      sentiment: null
    });
    
    return chrome.storage.local.set({ tweets });
  }

  static async getAllTweets() {
    try {
      const data = await chrome.storage.local.get('tweets');
      return data.tweets || [];
    } catch (error) {
      console.error('获取推文失败:', error);
      return [];
    }
  }

  static async getTweetsByCategory(category) {
    const tweets = await this.getAllTweets();
    return tweets.filter(tweet => tweet.categories.includes(category));
  }

  static async updateTweet(tweetId, updates) {
    const tweets = await this.getAllTweets();
    const index = tweets.findIndex(t => t.id === tweetId);
    if (index !== -1) {
      tweets[index] = { ...tweets[index], ...updates };
      await chrome.storage.local.set({ tweets });
    }
  }

  static async getCategories() {
    try {
      const data = await chrome.storage.local.get('categories');
      return data.categories || [];
    } catch (error) {
      console.error('获取分类失败:', error);
      return [];
    }
  }

  static async saveCategories(categories) {
    return chrome.storage.local.set({ categories });
  }

  static async updateTweetCategory(tweetId, category) {
    const tweets = await this.getAllTweets();
    const index = tweets.findIndex(t => t.id === tweetId);
    
    if (index !== -1) {
      if (!tweets[index].categories.includes(category)) {
        tweets[index].categories.push(category);
        await chrome.storage.local.set({ tweets });
      }
    }
  }

  static async removeTweetCategory(tweetId, category) {
    const tweets = await this.getAllTweets();
    const index = tweets.findIndex(t => t.id === tweetId);
    
    if (index !== -1) {
      tweets[index].categories = tweets[index].categories.filter(c => c !== category);
      await chrome.storage.local.set({ tweets });
    }
  }

  static async deleteTweet(tweetId) {
    const tweets = await this.getAllTweets();
    const filteredTweets = tweets.filter(t => t.id !== tweetId);
    await chrome.storage.local.set({ tweets: filteredTweets });
  }

  static async updateTweetCategories(tweetId, categories) {
    const tweets = await this.getAllTweets();
    const index = tweets.findIndex(t => t.id === tweetId);
    
    if (index !== -1) {
      tweets[index].categories = categories;
      await chrome.storage.local.set({ tweets });
    }
  }

  static async getSelectedTweets() {
    const tweets = await this.getAllTweets();
    return tweets.filter(t => t.selected);
  }

  static async toggleTweetSelection(tweetId) {
    const tweets = await this.getAllTweets();
    const index = tweets.findIndex(t => t.id === tweetId);
    
    if (index !== -1) {
      tweets[index].selected = !tweets[index].selected;
      await chrome.storage.local.set({ tweets });
    }
  }
}

export default TweetStorage; 