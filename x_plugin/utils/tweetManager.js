import TweetStorage from './storage.js';

class TweetManager {
  static async batchUpdateCategories(tweetIds, categories) {
    const tweets = await TweetStorage.getAllTweets();
    const updatedTweets = tweets.map(tweet => {
      if (tweetIds.includes(tweet.id)) {
        return {
          ...tweet,
          categories: [...new Set([...tweet.categories, ...categories])]
        };
      }
      return tweet;
    });
    
    await chrome.storage.local.set({ tweets: updatedTweets });
  }

  static async batchRemoveCategories(tweetIds, categories) {
    const tweets = await TweetStorage.getAllTweets();
    const updatedTweets = tweets.map(tweet => {
      if (tweetIds.includes(tweet.id)) {
        return {
          ...tweet,
          categories: tweet.categories.filter(c => !categories.includes(c))
        };
      }
      return tweet;
    });
    
    await chrome.storage.local.set({ tweets: updatedTweets });
  }

  static async batchDelete(tweetIds) {
    const tweets = await TweetStorage.getAllTweets();
    const remainingTweets = tweets.filter(tweet => !tweetIds.includes(tweet.id));
    await chrome.storage.local.set({ tweets: remainingTweets });
  }

  static async getStats() {
    const tweets = await TweetStorage.getAllTweets();
    const categories = await TweetStorage.getCategories();
    
    return {
      total: tweets.length,
      tweets,
      categorized: tweets.filter(t => t.categories.length > 0).length,
      byCategory: categories.reduce((acc, category) => {
        acc[category] = tweets.filter(t => t.categories.includes(category)).length;
        return acc;
      }, {}),
      bySentiment: {
        positive: tweets.filter(t => t.sentiment === 'positive').length,
        negative: tweets.filter(t => t.sentiment === 'negative').length,
        neutral: tweets.filter(t => t.sentiment === 'neutral').length
      },
      bySource: tweets.reduce((acc, tweet) => {
        const source = tweet.source || 'unknown';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {})
    };
  }
}

export default TweetManager; 