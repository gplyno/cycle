const API_KEY = "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";
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";
const SYSTEM_PROMPT = `Ты - Cycle, персональный AI-ассистент от компании StarleLab. 
Ты дружелюбный, умный и помогаешь пользователю решать задачи. 
Отвечай кратко и по делу, но с душой. Используй эмодзи где уместно.`;

let chats = {};
let currentChatId = null;
let isLoading = false;
let temperature = 0.7;

function getTimestamp() {
    return new Date().toISOString();
}

function formatTime(isoString) {
    if (!isoString) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Текст скопирован');
    }).catch(() => {
        showToast('Не удалось скопировать');
    });
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

function formatMessageText(text) {
    let formatted = escapeHtml(text);
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
}

function createAvatar(isUser, size = 40) {
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    
    const img = document.createElement('img');
    img.src = isUser ? 'icons/user.png' : 'icons/avatar.png';
    img.alt = isUser ? 'User' : 'Cycle';
    img.onerror = function() {
        this.style.display = 'none';
        avatarDiv.classList.add('fallback');
        avatarDiv.style.fontSize = size / 2 + 'px';
        avatarDiv.innerHTML = isUser ? '👤' : '🔄';
    };
    
    avatarDiv.appendChild(img);
    return avatarDiv;
}

function saveData() {
    const dataToStore = {
        chats: chats,
        currentChatId: currentChatId,
        temperature: temperature
    };
    localStorage.setItem('cycle_assistant_data', JSON.stringify(dataToStore));
}

function loadData() {
    const saved = localStorage.getItem('cycle_assistant_data');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            chats = data.chats || {};
            currentChatId = data.currentChatId || null;
            temperature = data.temperature !== undefined ? data.temperature : 0.7;
            document.getElementById('tempSlider').value = temperature * 100;
            document.getElementById('tempValue').innerText = temperature.toFixed(2);
        } catch (e) {
            console.error('Error loading data:', e);
        }
    }
    
    if (Object.keys(chats).length === 0) {
        const welcomeMsg = `Привет! 

Я Cycle - ваш персональный AI-ассистент от StarleLab!

  Я могу помочь вам:
• Ответить на любые вопросы
• Решить сложные задачи
• Обработать длинные тексты
• Дать точные рекомендации

Чем могу быть полезен сегодня? `;
        
        const newId = 'chat_' + Date.now();
        chats[newId] = {
            id: newId,
            name: 'Основной чат',
            messages: [
                { text: welcomeMsg, isUser: false, timestamp: getTimestamp() }
            ],
            conversation_history: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "assistant", content: welcomeMsg }
            ],
            createdAt: getTimestamp()
        };
        currentChatId = newId;
        saveData();
    }
}

function renderChatList() {
    const container = document.getElementById('chatList');
    container.innerHTML = '';
    
    Object.values(chats).forEach(chat => {
        const div = document.createElement('div');
        div.className = `chat-item ${currentChatId === chat.id ? 'active' : ''}`;
        
        const iconSpan = document.createElement('span');
        iconSpan.className = 'chat-icon';
        const img = document.createElement('img');
        img.src = 'icons/chat_icon.png';
        img.alt = '💬';
        img.onerror = function() {
            this.style.display = 'none';
            iconSpan.innerHTML = '💬';
        };
        iconSpan.appendChild(img);
        
        const nameSpan = document.createElement('div');
        nameSpan.className = 'chat-name';
        nameSpan.textContent = chat.name;
        
        div.appendChild(iconSpan);
        div.appendChild(nameSpan);
        div.addEventListener('click', () => switchChat(chat.id));
        container.appendChild(div);
    });
}

function switchChat(chatId) {
    if (!chats[chatId] || isLoading) return;
    currentChatId = chatId;
    renderChatList();
    renderMessages();
    updateChatHeader();
    saveData();
    if (window.innerWidth <= 768) closeSidebar();
}

function updateChatHeader() {
    const chat = chats[currentChatId];
    if (chat) {
        document.getElementById('chatNameHeader').innerText = chat.name;
        const msgCount = chat.messages.length;
        document.getElementById('chatStatus').innerHTML = `📊 ${msgCount} сообщений`;
    }
}

function renderMessages() {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';
    const chat = chats[currentChatId];
    if (!chat) return;
    
    chat.messages.forEach((msg, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${msg.isUser ? 'user-message' : 'ai-message'}`;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        const avatarImg = document.createElement('img');
        avatarImg.src = msg.isUser ? 'icons/user.png' : 'icons/avatar.png';
        avatarImg.alt = msg.isUser ? 'User' : 'Cycle';
        avatarImg.onerror = function() {
            this.style.display = 'none';
            avatarDiv.classList.add('fallback');
            avatarDiv.innerHTML = msg.isUser ? '👤' : '🔄';
        };
        avatarDiv.appendChild(avatarImg);
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.innerHTML = formatMessageText(msg.text);
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.innerText = formatTime(msg.timestamp);
        
        bubbleDiv.appendChild(textDiv);
        bubbleDiv.appendChild(timeDiv);
        
        if (!msg.isUser) {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            const copyIcon = document.createElement('span');
            copyIcon.className = 'icon';
            const copyImg = document.createElement('img');
            copyImg.src = 'icons/copy.png';
            copyImg.alt = '📋';
            copyImg.onerror = function() {
                this.style.display = 'none';
                copyIcon.innerHTML = '📋';
            };
            copyIcon.appendChild(copyImg);
            copyBtn.appendChild(copyIcon);
            copyBtn.appendChild(document.createTextNode(' Копировать'));
            copyBtn.onclick = () => copyToClipboard(msg.text);
            bubbleDiv.appendChild(copyBtn);
        }
        
        wrapper.appendChild(avatarDiv);
        wrapper.appendChild(bubbleDiv);
        container.appendChild(wrapper);
    });
    
    scrollToBottom();
}

function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 100);
}

async function callAI(messages, temp) {
    const cleaned = messages.map(m => ({ role: m.role, content: m.content }));
    
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: MODEL,
            messages: cleaned,
            temperature: temp,
            max_tokens: 1000,
            top_p: 0.95
        })
    });
    
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP ${response.status}`);
    }
    return response.json();
}

async function sendMessage() {
    if (isLoading) return;
    
    const input = document.getElementById('messageInput');
    const userText = input.value.trim();
    if (!userText || !currentChatId) return;
    
    input.value = '';
    input.style.height = 'auto';
    
    const chat = chats[currentChatId];
    
    const userMsgObj = { text: userText, isUser: true, timestamp: getTimestamp() };
    chat.messages.push(userMsgObj);
    chat.conversation_history.push({ role: "user", content: userText });
    
    renderMessages();
    saveData();
    updateChatHeader();
    
    isLoading = true;
    const sendBtn = document.getElementById('sendBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    sendBtn.disabled = true;
    loadingIndicator.style.display = 'flex';
    
    try {
        const response = await callAI(chat.conversation_history, temperature);
        const aiText = response.choices[0].message.content;
        
        const aiMsgObj = { text: aiText, isUser: false, timestamp: getTimestamp() };
        chat.messages.push(aiMsgObj);
        chat.conversation_history.push({ role: "assistant", content: aiText });
        
        renderMessages();
        saveData();
        updateChatHeader();
    } catch (error) {
        console.error(error);
        const errorMsg = { 
            text: `Ошибка: ${error.message || 'Не удалось получить ответ от сервера'}`, 
            isUser: false, 
            timestamp: getTimestamp() 
        };
        chat.messages.push(errorMsg);
        renderMessages();
    } finally {
        isLoading = false;
        sendBtn.disabled = false;
        loadingIndicator.style.display = 'none';
    }
}

function createNewChat() {
    const modal = document.getElementById('newChatModal');
    const input = document.getElementById('newChatName');
    input.value = `Чат ${Object.keys(chats).length + 1}`;
    modal.style.display = 'flex';
    input.focus();
}

function confirmCreateChat() {
    const input = document.getElementById('newChatName');
    let name = input.value.trim();
    if (!name) {
        showToast('Введите название чата');
        return;
    }
    
    const newId = 'chat_' + Date.now();
    chats[newId] = {
        id: newId,
        name: name,
        messages: [],
        conversation_history: [{ role: "system", content: SYSTEM_PROMPT }],
        createdAt: getTimestamp()
    };
    currentChatId = newId;
    saveData();
    renderChatList();
    renderMessages();
    updateChatHeader();
    closeNewChatModal();
    showToast('Чат создан');
}

function deleteCurrentChat() {
    if (!currentChatId || Object.keys(chats).length <= 1) {
        showToast('Нельзя удалить последний чат');
        return;
    }
    
    if (confirm(`Удалить чат "${chats[currentChatId].name}"?`)) {
        delete chats[currentChatId];
        const remainingIds = Object.keys(chats);
        currentChatId = remainingIds[0];
        saveData();
        renderChatList();
        renderMessages();
        updateChatHeader();
        showToast('Чат удалён');
    }
}

function openSettings() {
    document.getElementById('tempSlider').value = temperature * 100;
    document.getElementById('tempValue').innerText = temperature.toFixed(2);
    document.getElementById('settingsModal').style.display = 'flex';
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

function saveSettings() {
    const newTemp = document.getElementById('tempSlider').value / 100;
    temperature = newTemp;
    document.getElementById('tempValue').innerText = temperature.toFixed(2);
    saveData();
    closeSettings();
    showToast('Настройки сохранены');
}

function closeNewChatModal() {
    document.getElementById('newChatModal').style.display = 'none';
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
}

function autoResizeTextarea() {
    const textarea = document.getElementById('messageInput');
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderChatList();
    if (currentChatId) {
        renderMessages();
        updateChatHeader();
    }

    const setupAvatarFallback = (element, isUser = false) => {
        const img = element.querySelector('img');
        if (img) {
            img.onerror = function() {
                this.style.display = 'none';
                element.classList.add('fallback');
            };
        }
    };
    
    setupAvatarFallback(document.getElementById('sidebarAvatar'));
    setupAvatarFallback(document.getElementById('headerAvatar'));
    
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('newChatBtn').addEventListener('click', createNewChat);
    document.getElementById('deleteChatBtn').addEventListener('click', deleteCurrentChat);
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('menuBtn').addEventListener('click', toggleSidebar);
    document.getElementById('cancelSettingsBtn').addEventListener('click', closeSettings);
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('cancelNewChatBtn').addEventListener('click', closeNewChatModal);
    document.getElementById('createNewChatBtn').addEventListener('click', confirmCreateChat);
    
    document.getElementById('messageInput').addEventListener('input', autoResizeTextarea);
    document.getElementById('messageInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    window.addEventListener('click', (e) => {
        const settingsModal = document.getElementById('settingsModal');
        const newChatModal = document.getElementById('newChatModal');
        if (e.target === settingsModal) closeSettings();
        if (e.target === newChatModal) closeNewChatModal();
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) closeSidebar();
    });
    
    document.getElementById('newChatName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') confirmCreateChat();
    });
});