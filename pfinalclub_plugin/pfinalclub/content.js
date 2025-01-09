document.addEventListener('DOMContentLoaded', function() {
    // 获取所有文章列表
    const articles = document.querySelectorAll('ul li');
    
    // 创建年份分类容器
    const yearCategories = {};
    
    articles.forEach(article => {
        const dateText = article.textContent.match(/\d{4}-\d{2}-\d{2}/);
        if (dateText) {
            const year = dateText[0].split('-')[0];
            if (!yearCategories[year]) {
                yearCategories[year] = [];
            }
            yearCategories[year].push(article.cloneNode(true));
        }
    });

    // 创建新的展示容器
    const container = document.createElement('div');
    container.className = 'enhanced-archive-container';

    // 按年份排序并创建分类显示
    Object.keys(yearCategories)
        .sort((a, b) => b - a)
        .forEach(year => {
            const yearSection = document.createElement('div');
            yearSection.className = 'year-section';
            
            const yearHeader = document.createElement('h2');
            yearHeader.textContent = year + '年';
            yearSection.appendChild(yearHeader);

            const articleList = document.createElement('ul');
            yearCategories[year].forEach(article => {
                articleList.appendChild(article);
            });

            yearSection.appendChild(articleList);
            container.appendChild(yearSection);
        });

    // 替换原有内容
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.innerHTML = '';
        mainContent.appendChild(container);
    }
}); 