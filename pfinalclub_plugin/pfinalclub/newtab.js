let articles = [];
let filteredArticles = [];

// 添加缓存控制
const CACHE_DURATION = 30 * 60 * 1000; // 30分钟缓存

// 添加性能监控
const performanceMonitor = {
    startTime: 0,
    endTime: 0,

    start() {
        this.startTime = window.performance.now();
    },

    end() {
        this.endTime = window.performance.now();
        const duration = this.endTime - this.startTime;
        console.log(`操作耗时: ${duration.toFixed(2)}ms`);
    }
};

let loadingProgress = 0;
let progressInterval;

function startLoadingProgress() {
    loadingProgress = 0;
    const progressBar = document.createElement('div');
    progressBar.className = 'h-1 bg-primary transition-all duration-300 ease-out';
    progressBar.style.width = '0%';
    progressBar.id = 'loadingProgress';
    
    const progressContainer = document.createElement('div');
    progressContainer.className = 'fixed top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700';
    progressContainer.appendChild(progressBar);
    
    document.body.prepend(progressContainer);
    
    progressInterval = setInterval(() => {
        if (loadingProgress < 90) {
            loadingProgress += (90 - loadingProgress) * 0.1;
            progressBar.style.width = `${loadingProgress}%`;
        }
    }, 100);
}

function completeLoadingProgress() {
    clearInterval(progressInterval);
    const progressBar = document.getElementById('loadingProgress');
    if (progressBar) {
        progressBar.style.width = '100%';
        setTimeout(() => {
            progressBar.parentElement?.remove();
        }, 500);
    }
}

async function fetchAndDisplayContent() {
    performanceMonitor.start();
    try {
        // 检查缓存
        const cached = await checkCache();
        if (cached) {
            articles = cached.articles;
            filteredArticles = [...articles];
            displayArticles(filteredArticles);
            return;
        }

        showLoading();

        // 获取实际的文章数据
        const response = await fetchWithRetry('https://friday-go.icu/archives/');
        const html = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const articleData = [];
        const articleElements = doc.querySelectorAll('.post-archive li, article li, .article-list li, .post-list li');
        
        articleElements.forEach((article, index) => {
            try {
                const link = article.querySelector('a');
                if (!link) return;

                // 处理文章链接
                let url = link.getAttribute('href');
                // 确保链接是完整的 URL
                if (url && !url.startsWith('http')) {
                    url = `https://friday-go.icu${url.startsWith('/') ? '' : '/'}${url}`;
                }

                const text = article.textContent.trim();
                const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);

                if (dateMatch) {
                    const date = dateMatch[0];
                    const title = text.replace(date, '').trim();

                    articleData.push({
                        title: title,
                        date: date,
                        url: url
                    });

                    console.log(`解析到文章 ${index + 1}:`, {
                        title: title,
                        date: date,
                        url: url
                    });
                }
            } catch (err) {
                console.error('解析文章时出错:', err);
            }
        });

        console.log('最终解析到的文章数量:', articleData.length);

        // 如果没有找到文章，尝试输出页面结构以便调试
        if (articleData.length === 0) {
            console.log('页面结构:', doc.body.innerHTML);
            throw new Error('未找到任何文章');
        }

        articles = articleData;
        filteredArticles = [...articles];
        
        // 保存到缓存
        await saveToCache(articles);
        
        displayArticles(filteredArticles);
        
    } catch (error) {
        console.error('获取文章失败:', error);
        showError();
    } finally {
        performanceMonitor.end();
    }
}

// 缓存相关函数
async function checkCache() {
    const cached = await chrome.storage.local.get(['articles', 'timestamp']);
    if (cached.articles && cached.timestamp) {
        const now = new Date().getTime();
        if (now - cached.timestamp < CACHE_DURATION) {
            return cached;
        }
    }
    return null;
}

async function saveToCache(articles) {
    await chrome.storage.local.set({
        articles: articles,
        timestamp: new Date().getTime()
    });
}

function displayArticles(articlesToShow) {
    const yearCategories = {};
    
    articlesToShow.forEach(article => {
        if (!article || !article.date) return;
        
        const dateMatch = article.date.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
            const year = dateMatch[1];
            if (!yearCategories[year]) {
                yearCategories[year] = [];
            }
            yearCategories[year].push(article);
        }
    });

    const contentDiv = document.getElementById('content');
    if (!contentDiv) return;
    
    contentDiv.innerHTML = '';

    if (Object.keys(yearCategories).length === 0) {
        contentDiv.innerHTML = `
            <div class="text-center py-12">
                <p class="text-gray-500 dark:text-gray-400">没有找到文章</p>
                <button id="retryBtn" class="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-blue-700 transition-colors">
                    重试
                </button>
            </div>
        `;
        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', fetchAndDisplayContent);
        }
        return;
    }

    Object.keys(yearCategories)
        .sort((a, b) => b - a)
        .forEach(year => {
            const yearSection = document.createElement('div');
            yearSection.className = 'mb-8';
            
            const yearHeader = document.createElement('h2');
            yearHeader.className = 'text-2xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700';
            yearHeader.textContent = `${year}年`;
            yearSection.appendChild(yearHeader);

            const articleList = document.createElement('ul');
            articleList.className = 'space-y-3';

            yearCategories[year].forEach(article => {
                const li = document.createElement('li');
                li.className = 'group hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-3 transition-colors duration-150';
                
                // 创建文章链接
                li.innerHTML = `
                    <a href="${article.url}" 
                       class="text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors duration-150 flex items-center"
                       target="_blank" 
                       rel="noopener noreferrer">
                        <span class="text-gray-500 dark:text-gray-400 min-w-[100px]">${article.date}</span>
                        <span class="flex-1">${article.title}</span>
                        <svg class="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                `;
                
                articleList.appendChild(li);
            });

            yearSection.appendChild(articleList);
            contentDiv.appendChild(yearSection);
        });

    // 添加统计信息
    const stats = document.createElement('div');
    stats.className = 'text-center text-sm text-gray-500 dark:text-gray-400 mt-8 pb-4';
    stats.innerHTML = `
        <div class="flex justify-center space-x-4">
            <span>总文章数: ${articlesToShow.length}</span>
            <span>|</span>
            <span>年份跨度: ${Object.keys(yearCategories).length} 年</span>
            <span>|</span>
            <span>最后更新: ${getLatestDate(articlesToShow)}</span>
        </div>
    `;
    contentDiv.appendChild(stats);

    // 添加事件监听器
    initializeEventListeners();
}

function getLatestDate(articles) {
    if (!articles.length) return '无数据';
    const dates = articles.map(article => new Date(article.date));
    const latest = new Date(Math.max(...dates));
    return latest.toLocaleDateString('zh-CN');
}

function showLoading() {
    const contentDiv = document.getElementById('content');
    if (contentDiv) {
        contentDiv.innerHTML = `
            <div class="loading flex flex-col items-center justify-center py-12">
                <svg class="animate-spin h-8 w-8 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <div class="text-center">
                    <span class="text-lg text-gray-600 dark:text-gray-300">正在加载文章...</span>
                    <div class="text-sm text-gray-500 dark:text-gray-400 mt-2">首次加载可能需要几秒钟</div>
                </div>
            </div>
        `;
    }
}

function showError() {
    const contentDiv = document.getElementById('content');
    if (contentDiv) {
        contentDiv.innerHTML = `
            <div class="text-center py-12">
                <div class="text-red-500 dark:text-red-400">
                    <svg class="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p class="mt-4 text-lg">加载失败，请稍后重试</p>
                    <p class="mt-2 text-sm text-gray-500">请打开开发者工具查看详细错误信息</p>
                    <button id="retryBtn" class="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-blue-700 transition-colors">
                        重试
                    </button>
                </div>
            </div>
        `;
        
        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', fetchAndDisplayContent);
        }
    }
}

// 添加防抖搜索
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 优化搜索功能
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const debouncedSearch = debounce((searchTerm) => {
        filteredArticles = articles.filter(article => 
            article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            article.date.includes(searchTerm)
        );
        displayArticles(filteredArticles);
    }, 300);

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
    }
}

// 添加键盘快捷键支持
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K 聚焦搜索框
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('searchInput')?.focus();
        }
        
        // Ctrl/Cmd + R 刷新内容
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            fetchAndDisplayContent().then(() => {
                // 重新应用主题
                themeManager.applyTheme();
            });
        }
        
        // Esc 清空搜索框
        if (e.key === 'Escape') {
            const searchInput = document.getElementById('searchInput');
            if (searchInput && document.activeElement === searchInput) {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
            }
        }
    });
}

// 添加错误重试机制
let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2秒

async function fetchWithRetry(url, retries = MAX_RETRIES) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response;
    } catch (error) {
        if (retries > 0) {
            console.log(`重试请求 (剩余 ${retries} 次)...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return fetchWithRetry(url, retries - 1);
        }
        throw error;
    }
}

// 主题切换
function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const isDark = localStorage.getItem('theme') === 'dark';
    
    if (isDark) {
        document.documentElement.classList.add('dark');
    }

    themeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem(
            'theme',
            document.documentElement.classList.contains('dark') ? 'dark' : 'light'
        );
    });
}

// 刷新功能
function setupRefresh() {
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.addEventListener('click', fetchAndDisplayContent);
}

// 初化所有事件监听器
function initializeEventListeners() {
    // 搜索功能
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filteredArticles = articles.filter(article => 
                article.textContent.toLowerCase().includes(searchTerm)
            );
            displayArticles(filteredArticles);
        });
    }

    // 主题切换
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            localStorage.setItem(
                'theme',
                document.documentElement.classList.contains('dark') ? 'dark' : 'light'
            );
        });
    }

    // 刷新按钮
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', fetchAndDisplayContent);
    }

    // 重试按钮（如果存在）
    const retryBtn = document.getElementById('retryBtn');
    if (retryBtn) {
        retryBtn.addEventListener('click', fetchAndDisplayContent);
    }
}

// 添加一个辅助函数来检查网络请求状态
async function checkConnection() {
    try {
        const response = await fetch('https://friday-go.icu/archives/');
        console.log('网络请求状态:', response.status);
        console.log('响应头:', Object.fromEntries(response.headers));
        return response.ok;
    } catch (error) {
        console.error('网络请求失败:', error);
        return false;
    }
}

// 主题管理相关代码
const themeManager = {
    init() {
        console.log('初始化主题管理...');
        // 初始化主题
        this.applyTheme();
        // 设置主题切换监听
        this.setupThemeToggle();
    },

    applyTheme() {
        // 检查本地存储的主题设置
        let isDark = localStorage.getItem('theme')?(localStorage.getItem('theme')=='dark'?true:false):false;

        // 如果没有设置主题，则默认使用暗色主题
        if (!isDark) {
            localStorage.setItem('theme', 'dark'); // 保存默认设置
        }else{
            localStorage.setItem('theme', 'light'); // 保存默认设置
        }

        console.log('当前主题状态:', isDark ? '暗色' : '亮色');
        
        // 应用主题
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // 更新切换按钮的状态
        this.updateToggleButton();
    },

    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) {
            console.warn('未找到主题切换按钮');
            return;
        }

        // 绑定点击事件
        themeToggle.addEventListener('click', () => {
            console.log('切换主题...');
            // 切换主题
            document.documentElement.classList.toggle('dark');
            
            // 保存设置
            const isDark = document.documentElement.classList.contains('dark');
            localStorage.setItem('theme', isDark ? 'light' : 'dark');
            console.log('主题已切换为:', isDark ? '暗色' : '亮色');

            // 更新按钮状态
            this.updateToggleButton();
            this.applyTheme();
        });
    },

    updateToggleButton() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;

        const isDark = document.documentElement.classList.contains('dark');
        console.log('更新按钮状态, 当前主题:', isDark ? '暗色' : '亮色');
        
        // 更新按钮内容
        themeToggle.innerHTML = `
            <svg class="h-4 w-4 mr-2 ${isDark ? 'hidden' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <svg class="h-4 w-4 mr-2 ${isDark ? '' : 'hidden'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span class="${isDark ? 'hidden' : ''}">暗色</span>
            <span class="${isDark ? '' : 'hidden'}">亮色</span>
        `;
    }
};

// 设置所有事件监听器
function setupEventListeners() {
    // 设置搜索功能
    setupSearch();
    
    // 设置键盘快捷键
    setupKeyboardShortcuts();
    
    // 设置在线状态监听
    setupOnlineStatus();

    // 设置刷新按钮
    setupRefreshButton();
}

// 设置刷新按钮
function setupRefreshButton() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            console.log('点击刷新按钮');
            await fetchAndDisplayContent();
            // 重新应用主题
            // themeManager.applyTheme();
        });
    }
}

// 搜索功能设置
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    const debouncedSearch = debounce((searchTerm) => {
        filteredArticles = articles.filter(article => 
            article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            article.date.includes(searchTerm)
        );
        displayArticles(filteredArticles);
    }, 300);

    searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
    });
}

// 在线状态监听设置
function setupOnlineStatus() {
    const updateOnlineStatus = () => {
        const statusDiv = document.getElementById('onlineStatus');
        if (!statusDiv) return;
        
        if (navigator.onLine) {
            statusDiv.classList.add('hidden');
        } else {
            statusDiv.classList.remove('hidden');
            statusDiv.innerHTML = `
                <div class="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                            </svg>
                        </div>
                        <div class="ml-3">
                            <h3 class="text-sm font-medium text-yellow-800 dark:text-yellow-100">
                                离线模式
                            </h3>
                            <div class="mt-2 text-sm text-yellow-700 dark:text-yellow-200">
                                <p>当前处于离线状态，显示的是缓存内容</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
}

// 初始化函数
async function initialize() {
    try {
        // 初始化主题管理
        themeManager.init();
        
        // 检查网络连接
        console.log('检查网络连接...');
        const isConnected = await checkConnection();
        
        if (isConnected) {
            console.log('网络连接正常，开始加载内容...');
            // 加载内容
            await fetchAndDisplayContent();
        } else {
            console.error('网络连接失败');
            showError();
        }

        // 设置事件监听器
        setupEventListeners();
        
    } catch (error) {
        console.error('初始化失败:', error);
        showError();
    }
}

// 确保在 DOM 加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// 监听系统主题变化
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        // 只有在用户没有手动设置主题时才跟随系统
        document.documentElement.classList.toggle('dark', e.matches);
        themeManager.updateToggleButton();
    }
}); 