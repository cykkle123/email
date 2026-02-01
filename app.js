// 全局状态
const state = {
    currentProvider: 'maildrop',
    currentEmail: null,
    currentEmails: [],
    currentEmailDetail: null,
    currentView: 'html',
    // Mail.gw 特定状态
    mailgwToken: null,
    mailgwAccountId: null,
    // 自动刷新
    autoRefreshInterval: null,
    refreshIntervalSeconds: 10,
    isRefreshing: false
};

// API 配置
const API = {
    maildrop: {
        graphql: 'https://api.maildrop.cc/graphql'
    },
    mailgw: {
        base: 'https://api.mail.gw'
    }
};

// DOM 元素
const elements = {
    providerBtns: document.querySelectorAll('.provider-btn'),
    maildropInput: document.getElementById('maildropInput'),
    mailgwInput: document.getElementById('mailgwInput'),
    mailboxName: document.getElementById('mailboxName'),
    useMaildrop: document.getElementById('useMaildrop'),
    randomMaildrop: document.getElementById('randomMaildrop'),
    generateMailgw: document.getElementById('generateMailgw'),
    currentEmail: document.getElementById('currentEmail'),
    emailDisplay: document.getElementById('emailDisplay'),
    copyEmail: document.getElementById('copyEmail'),
    inboxSection: document.getElementById('inboxSection'),
    emailList: document.getElementById('emailList'),
    loading: document.getElementById('loading'),
    emptyState: document.getElementById('emptyState'),
    refreshBtn: document.getElementById('refreshBtn'),
    emailDetail: document.getElementById('emailDetail'),
    backBtn: document.getElementById('backBtn'),
    detailSubject: document.getElementById('detailSubject'),
    detailFrom: document.getElementById('detailFrom'),
    detailDate: document.getElementById('detailDate'),
    detailBody: document.getElementById('detailBody'),
    viewBtns: document.querySelectorAll('.view-btn')
};

// 初始化
function init() {
    // 服务商切换
    elements.providerBtns.forEach(btn => {
        btn.addEventListener('click', () => switchProvider(btn.dataset.provider));
    });

    // Maildrop
    elements.useMaildrop.addEventListener('click', useMaildropEmail);
    elements.randomMaildrop.addEventListener('click', generateRandomMaildropName);
    elements.mailboxName.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') useMaildropEmail();
    });

    // Mail.gw
    elements.generateMailgw.addEventListener('click', generateMailgwEmail);

    // 复制邮箱
    elements.copyEmail.addEventListener('click', copyEmailToClipboard);

    // 刷新收件箱
    elements.refreshBtn.addEventListener('click', refreshInbox);

    // 返回收件箱
    elements.backBtn.addEventListener('click', showInbox);

    // 视图切换
    elements.viewBtns.forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });
}

// 切换服务商
function switchProvider(provider) {
    state.currentProvider = provider;
    
    // 更新按钮状态
    elements.providerBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.provider === provider);
    });

    // 切换输入区域
    elements.maildropInput.classList.add('hidden');
    elements.mailgwInput.classList.add('hidden');
    
    if (provider === 'maildrop') {
        elements.maildropInput.classList.remove('hidden');
    } else if (provider === 'mailgw') {
        elements.mailgwInput.classList.remove('hidden');
    }

    // 重置状态
    resetState();
}

// ==================== Maildrop ====================

function generateRandomMaildropName() {
    // 生成随机邮箱名：6-10位字母数字组合
    const length = Math.floor(Math.random() * 5) + 6; // 6-10位
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let randomName = '';
    
    // 第一个字符必须是字母
    randomName += chars.charAt(Math.floor(Math.random() * 26));
    
    // 其余字符可以是字母或数字
    for (let i = 1; i < length; i++) {
        randomName += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    elements.mailboxName.value = randomName;
    
    // 添加一个小动画效果
    elements.mailboxName.style.animation = 'none';
    setTimeout(() => {
        elements.mailboxName.style.animation = 'slideIn 0.3s ease-out';
    }, 10);
}

function useMaildropEmail() {
    const mailbox = elements.mailboxName.value.trim();
    
    if (!mailbox) {
        alert('请输入邮箱名');
        return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(mailbox)) {
        alert('邮箱名只能包含字母、数字、连字符(-)和下划线(_)');
        return;
    }

    state.currentEmail = `${mailbox}@maildrop.cc`;
    showCurrentEmail();
    loadMaildropInbox(mailbox);
}

async function loadMaildropInbox(mailbox, isAuto = false) {
    if (!isAuto) showLoading();

    try {
        const query = `query GetInbox($mailbox: String!) { inbox(mailbox: $mailbox) { id subject date headerfrom } }`;

        const response = await fetch(API.maildrop.graphql, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { mailbox } })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        if (data.errors) throw new Error(data.errors[0].message);
        
        const newEmails = data.data?.inbox || [];
        
        // 检查是否有新邮件
        if (isAuto && newEmails.length > state.currentEmails.length) {
            showNewEmailNotification(newEmails.length - state.currentEmails.length);
        }
        
        state.currentEmails = newEmails;
        renderEmailList();
    } catch (error) {
        console.error('加载收件箱错误:', error);
        if (!isAuto) {
            alert(`加载收件箱失败: ${error.message}`);
        }
        hideLoading();
    } finally {
        state.isRefreshing = false;
        if (!isAuto) {
            elements.refreshBtn.disabled = false;
            elements.refreshBtn.innerHTML = '🔄 刷新';
            elements.refreshBtn.style.animation = '';
        }
    }
}

async function loadMaildropDetail(emailId) {
    try {
        const mailbox = state.currentEmail.split('@')[0];
        const query = `query GetMessage($mailbox: String!, $id: String!) { message(mailbox: $mailbox, id: $id) { id subject date headerfrom html data } }`;

        const response = await fetch(API.maildrop.graphql, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { mailbox, id: emailId } })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        if (data.errors) throw new Error(data.errors[0].message);
        
        state.currentEmailDetail = data.data?.message;
        if (state.currentEmailDetail) {
            showEmailDetail();
        } else {
            throw new Error('邮件不存在');
        }
    } catch (error) {
        console.error('加载邮件详情错误:', error);
        alert(`加载邮件详情失败: ${error.message}`);
    }
}

// ==================== Mail.gw ====================

async function generateMailgwEmail() {
    try {
        elements.generateMailgw.disabled = true;
        elements.generateMailgw.textContent = '生成中...';

        // 1. 获取可用域名
        const domainsRes = await fetch(`${API.mailgw.base}/domains`);
        
        if (!domainsRes.ok) {
            throw new Error('无法连接到 Mail.gw API');
        }
        
        const domainsData = await domainsRes.json();
        const domain = domainsData['hydra:member'][0].domain;

        // 2. 生成随机用户名
        const username = 'user' + Math.random().toString(36).substring(2, 10);
        const password = Math.random().toString(36).substring(2, 15);
        const address = `${username}@${domain}`;

        // 3. 创建账户
        const accountRes = await fetch(`${API.mailgw.base}/accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, password })
        });

        if (!accountRes.ok) throw new Error('创建账户失败');

        const accountData = await accountRes.json();
        state.mailgwAccountId = accountData.id;

        // 4. 获取 Token
        const tokenRes = await fetch(`${API.mailgw.base}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, password })
        });

        const tokenData = await tokenRes.json();
        state.mailgwToken = tokenData.token;

        state.currentEmail = address;
        showCurrentEmail();
        loadMailgwInbox();
    } catch (error) {
        console.error('生成邮箱错误:', error);
        alert(`生成邮箱失败: ${error.message}`);
    } finally {
        elements.generateMailgw.disabled = false;
        elements.generateMailgw.textContent = '🎲 生成随机邮箱';
    }
}

async function loadMailgwInbox(isAuto = false) {
    if (!isAuto) showLoading();

    try {
        const response = await fetch(`${API.mailgw.base}/messages`, {
            headers: { 'Authorization': `Bearer ${state.mailgwToken}` }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        const newEmails = data['hydra:member'] || [];
        
        // 检查是否有新邮件
        if (isAuto && newEmails.length > state.currentEmails.length) {
            showNewEmailNotification(newEmails.length - state.currentEmails.length);
        }
        
        state.currentEmails = newEmails;
        renderEmailList();
    } catch (error) {
        console.error('加载收件箱错误:', error);
        if (!isAuto) {
            alert(`加载收件箱失败: ${error.message}`);
        }
        hideLoading();
    } finally {
        state.isRefreshing = false;
        if (!isAuto) {
            elements.refreshBtn.disabled = false;
            elements.refreshBtn.innerHTML = '🔄 刷新';
            elements.refreshBtn.style.animation = '';
        }
    }
}

async function loadMailgwDetail(emailId) {
    try {
        const response = await fetch(`${API.mailgw.base}/messages/${emailId}`, {
            headers: { 'Authorization': `Bearer ${state.mailgwToken}` }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        state.currentEmailDetail = {
            subject: data.subject,
            headerfrom: data.from.address,
            date: data.createdAt,
            html: data.html?.[0] || '',
            data: data.text || ''
        };
        showEmailDetail();
    } catch (error) {
        console.error('加载邮件详情错误:', error);
        alert(`加载邮件详情失败: ${error.message}`);
    }
}

// ==================== 通用函数 ====================

function showCurrentEmail() {
    elements.currentEmail.classList.remove('hidden');
    elements.emailDisplay.textContent = state.currentEmail;
    elements.inboxSection.classList.remove('hidden');
    
    // 启动自动刷新
    startAutoRefresh();
}

function startAutoRefresh() {
    // 清除现有的定时器
    stopAutoRefresh();
    
    // 设置新的定时器
    state.autoRefreshInterval = setInterval(() => {
        if (!state.isRefreshing && state.currentEmail && !elements.emailDetail.classList.contains('hidden') === false) {
            refreshInbox(true); // true 表示是自动刷新
        }
    }, state.refreshIntervalSeconds * 1000);
    
    console.log(`自动刷新已启动，间隔 ${state.refreshIntervalSeconds} 秒`);
}

function stopAutoRefresh() {
    if (state.autoRefreshInterval) {
        clearInterval(state.autoRefreshInterval);
        state.autoRefreshInterval = null;
        console.log('自动刷新已停止');
    }
}

function copyEmailToClipboard() {
    navigator.clipboard.writeText(state.currentEmail).then(() => {
        const originalText = elements.copyEmail.textContent;
        elements.copyEmail.textContent = '✓ 已复制';
        setTimeout(() => {
            elements.copyEmail.textContent = originalText;
        }, 2000);
    });
}

function renderEmailList() {
    hideLoading();

    if (state.currentEmails.length === 0) {
        elements.emptyState.classList.remove('hidden');
        return;
    }

    elements.emptyState.classList.add('hidden');
    
    const html = state.currentEmails.map(email => {
        let date, from, subject, id;
        
        if (state.currentProvider === 'maildrop') {
            date = formatDate(email.date);
            from = email.headerfrom;
            subject = email.subject || '(无主题)';
            id = email.id;
        } else if (state.currentProvider === 'mailgw') {
            date = formatDate(email.createdAt);
            from = email.from.address;
            subject = email.subject || '(无主题)';
            id = email.id;
        }
        
        return `
            <div class="email-item" data-id="${id}">
                <div class="email-item-subject">${escapeHtml(subject)}</div>
                <div class="email-item-from">来自: ${escapeHtml(from)}</div>
                <div class="email-item-date">${date}</div>
            </div>
        `;
    }).join('');

    elements.emailList.innerHTML = html;

    document.querySelectorAll('.email-item').forEach(item => {
        item.addEventListener('click', () => loadEmailDetail(item.dataset.id));
    });
}

async function loadEmailDetail(emailId) {
    if (state.currentProvider === 'maildrop') {
        await loadMaildropDetail(emailId);
    } else if (state.currentProvider === 'mailgw') {
        await loadMailgwDetail(emailId);
    }
}

function showEmailDetail() {
    const email = state.currentEmailDetail;
    
    elements.detailSubject.textContent = email.subject || '(无主题)';
    elements.detailFrom.textContent = email.headerfrom;
    elements.detailDate.textContent = formatDate(email.date);
    
    updateDetailView();
    
    elements.inboxSection.classList.add('hidden');
    elements.emailDetail.classList.remove('hidden');
}

function updateDetailView() {
    const email = state.currentEmailDetail;
    
    if (state.currentView === 'html' && email.html) {
        elements.detailBody.innerHTML = email.html;
    } else {
        elements.detailBody.textContent = email.data || '(无内容)';
    }
}

function switchView(view) {
    state.currentView = view;
    
    elements.viewBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    updateDetailView();
}

function showInbox() {
    elements.emailDetail.classList.add('hidden');
    elements.inboxSection.classList.remove('hidden');
}

function refreshInbox(isAuto = false) {
    if (!state.currentEmail) return;
    
    // 防止重复刷新
    if (state.isRefreshing) return;
    
    state.isRefreshing = true;
    
    // 更新按钮状态
    if (!isAuto) {
        elements.refreshBtn.disabled = true;
        elements.refreshBtn.innerHTML = '🔄 刷新中...';
        elements.refreshBtn.style.animation = 'spin 1s linear infinite';
    }
    
    if (state.currentProvider === 'maildrop') {
        const mailbox = state.currentEmail.split('@')[0];
        loadMaildropInbox(mailbox, isAuto);
    } else if (state.currentProvider === 'mailgw') {
        loadMailgwInbox(isAuto);
    }
}

function showLoading() {
    elements.loading.classList.remove('hidden');
    elements.emptyState.classList.add('hidden');
    elements.emailList.innerHTML = '';
}

function hideLoading() {
    elements.loading.classList.add('hidden');
}

function resetState() {
    state.currentEmail = null;
    state.currentEmails = [];
    state.currentEmailDetail = null;
    
    // 停止自动刷新
    stopAutoRefresh();
    
    elements.currentEmail.classList.add('hidden');
    elements.inboxSection.classList.add('hidden');
    elements.emailDetail.classList.add('hidden');
    elements.mailboxName.value = '';
}

function showNewEmailNotification(count) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'new-email-notification';
    notification.textContent = `📬 收到 ${count} 封新邮件！`;
    document.body.appendChild(notification);
    
    // 3秒后移除
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 启动应用
init();
