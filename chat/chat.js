/**
 * Financial Chat Assistant
 * Integrates with DeepSeek API to provide AI-powered financial insights
 */

class FinancialChat {
  constructor() {
    // Use API config if available, otherwise use DeepSeek directly
    this.messages = [];
    this.isOpen = false;
    this.isMinimized = false;
    this.init();
    
    // Test API connection on initialization
    if (window.getAPIRequest) {
      // Using multi-provider system
      this.testAPIConnection();
    } else {
      // Fallback to direct DeepSeek (legacy)
      this.apiKey = 'sk-c68fbc1c7a8b43a59153729fbf4ced7c';
      this.apiUrl = 'https://api.deepseek.com/v1/chat/completions';
      this.model = 'deepseek-chat';
      this.testAPIConnection();
    }
  }

  async testAPIConnection() {
    // Simple connection test (runs silently in background)
    try {
      let testRequest;
      
      if (window.getAPIRequest) {
        const provider = window.getActiveProvider();
        if (!provider.apiKey) {
          console.warn(`⚠️ ${provider.name} API key not configured`);
          return;
        }
        testRequest = window.getAPIRequest(
          [{ role: 'user', content: 'test' }],
          'You are a test assistant.'
        );
      } else {
        // Fallback to DeepSeek
        testRequest = {
          url: this.apiUrl,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json'
          },
          body: {
            model: this.model,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 10
          }
        };
      }
      
      const testResponse = await fetch(testRequest.url, {
        method: 'POST',
        mode: 'cors',
        headers: testRequest.headers,
        body: JSON.stringify(testRequest.body)
      });
      
      if (testResponse.ok) {
        const provider = window.getActiveProvider ? window.getActiveProvider().name : 'DeepSeek';
        console.log(`✅ ${provider} API connection test: SUCCESS`);
      } else {
        const provider = window.getActiveProvider ? window.getActiveProvider().name : 'DeepSeek';
        console.warn(`⚠️ ${provider} API connection test: Failed with status`, testResponse.status);
      }
    } catch (error) {
      console.error('❌ API connection test failed:', error.message);
      console.warn('This might be a CORS issue. The API may require requests from a backend server.');
    }
  }

  init() {
    // CHAT DISABLED - Set to false to enable
    const CHAT_ENABLED = false;
    
    if (!CHAT_ENABLED) {
      console.log('Chat is currently disabled');
      // Hide chat elements
      const widget = document.getElementById('chatWidget');
      const toggleBtn = document.getElementById('chatToggleBtn');
      if (widget) widget.style.display = 'none';
      if (toggleBtn) toggleBtn.style.display = 'none';
      return;
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupUI());
    } else {
      this.setupUI();
    }
  }

  setupUI() {
    // Chat HTML should already be in the DOM (embedded in index.html)
    // Just verify it exists
    const widget = document.getElementById('chatWidget');
    const toggleBtn = document.getElementById('chatToggleBtn');
    
    if (!widget) {
      console.warn('Chat widget not found in DOM. Make sure chat HTML is included in index.html');
      return;
    }
    
    if (!toggleBtn) {
      console.warn('Chat toggle button not found in DOM!');
      return;
    }

    console.log('✅ Chat UI setup complete');
    
    // Ensure initial state
    widget.classList.add('hidden');
    toggleBtn.classList.remove('hidden');

    // Setup event listeners
    this.setupEventListeners();
    
    // Load chat history from localStorage
    this.loadChatHistory();
  }

  setupEventListeners() {
    // Toggle button
    const toggleBtn = document.getElementById('chatToggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Chat toggle button clicked, isOpen:', this.isOpen);
        this.toggleChat();
      });
    } else {
      console.warn('Chat toggle button not found!');
    }

    // Close button
    const closeBtn = document.getElementById('chatCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeChat());
    }

    // Minimize button
    const minimizeBtn = document.getElementById('chatMinimizeBtn');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => this.minimizeChat());
    }

    // Send button
    const sendBtn = document.getElementById('chatSendBtn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendMessage());
    }

    // Input field
    const input = document.getElementById('chatInput');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      // Auto-resize textarea
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      });
    }

    // Header drag functionality (optional)
    const header = document.getElementById('chatHeader');
    if (header) {
      this.setupDrag(header);
    }

    // Suggestion clicks
    document.addEventListener('click', (e) => {
      if (e.target.closest('.chat-suggestions li')) {
        const suggestion = e.target.closest('.chat-suggestions li').textContent.trim();
        input.value = suggestion.replace(/^["']|["']$/g, '');
        this.sendMessage();
      }
    });
  }

  setupDrag(header) {
    let isDragging = false;
    let currentX, currentY, initialX, initialY;
    const chatWidget = document.getElementById('chatWidget');

    header.addEventListener('mousedown', (e) => {
      if (window.innerWidth <= 768) return; // Disable drag on mobile
      
      isDragging = true;
      initialX = e.clientX - chatWidget.offsetLeft;
      initialY = e.clientY - chatWidget.offsetTop;
      chatWidget.style.transition = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      // Constrain to viewport
      const maxX = window.innerWidth - chatWidget.offsetWidth;
      const maxY = window.innerHeight - chatWidget.offsetHeight;

      currentX = Math.max(0, Math.min(currentX, maxX));
      currentY = Math.max(0, Math.min(currentY, maxY));

      chatWidget.style.left = currentX + 'px';
      chatWidget.style.top = currentY + 'px';
      chatWidget.style.right = 'auto';
      chatWidget.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        chatWidget.style.transition = '';
      }
    });
  }

  toggleChat() {
    if (this.isOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }

  openChat() {
    const widget = document.getElementById('chatWidget');
    const toggleBtn = document.getElementById('chatToggleBtn');
    
    if (widget) {
      // Remove hidden class first
      widget.classList.remove('hidden');
      
      // Force reflow to ensure the hidden state is applied before opening
      void widget.offsetWidth;
      
      // Add opening class for smooth animation
      widget.classList.add('opening');
      
      // Remove minimized state if it exists
      widget.classList.remove('minimized');
      
      this.isOpen = true;
      this.isMinimized = false;
      
      // After animation completes, remove opening class
      setTimeout(() => {
        widget.classList.remove('opening');
      }, 400);
      
      // Focus input after a short delay
      const input = document.getElementById('chatInput');
      if (input) {
        setTimeout(() => input.focus(), 450);
      }
    }

    if (toggleBtn) {
      toggleBtn.classList.add('hidden');
    }

    // Scroll to bottom after animation
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);
  }

  closeChat() {
    const widget = document.getElementById('chatWidget');
    const toggleBtn = document.getElementById('chatToggleBtn');
    
    if (widget) {
      // Remove opening class if present
      widget.classList.remove('opening');
      
      // Add hidden class for smooth close animation
      widget.classList.add('hidden');
      
      this.isOpen = false;
    }

    if (toggleBtn) {
      // Small delay before showing toggle button for smooth transition
      setTimeout(() => {
        toggleBtn.classList.remove('hidden');
      }, 150);
    }
  }

  minimizeChat() {
    const widget = document.getElementById('chatWidget');
    
    if (widget) {
      if (this.isMinimized) {
        // Expand with animation
        widget.classList.remove('minimized');
        this.isMinimized = false;
        
        // Focus input after expansion
        const input = document.getElementById('chatInput');
        if (input) {
          setTimeout(() => input.focus(), 350);
        }
      } else {
        // Minimize with animation
        widget.classList.add('minimized');
        this.isMinimized = true;
      }
    }
  }

  async sendMessage() {
    const input = document.getElementById('chatInput');
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    // Clear input
    input.value = '';
    input.style.height = 'auto';

    // Add user message to UI
    this.addMessage('user', message);

    // Add to messages array
    this.messages.push({ role: 'user', content: message });

    // Show loading indicator
    const loadingId = this.addLoadingMessage();

    try {
      // Get financial data context
      const financialContext = this.getFinancialContext();

      // Prepare messages for API
      const apiMessages = [
        {
          role: 'system',
          content: `You are a helpful financial assistant for a personal finance management tool. 
You have access to the user's complete financial data including:
- Personal expenses (monthly and yearly)
- Business expenses (monthly and yearly)
- Income data by year (2022, 2023, 2024, 2025)
- Currency conversion rates
- Financial calculations and analytics

Use this data to provide accurate, helpful answers about their finances. Be concise but thorough.
Format numbers clearly (e.g., $1,234.56 or 1,234.56 EGP).
When discussing percentages, include the calculation basis.

Current financial data:
${JSON.stringify(financialContext, null, 2)}`
        },
        ...this.messages
      ];

      // Call AI API (supports multiple providers)
      let apiRequest;
      
      if (window.getAPIRequest) {
        // Use multi-provider system
        const provider = window.getActiveProvider();
        console.log(`Sending request to ${provider.name} API...`);
        
        apiRequest = window.getAPIRequest(
          this.messages,
          `You are a helpful financial assistant for a personal finance management tool. 
You have access to the user's complete financial data including:
- Personal expenses (monthly and yearly)
- Business expenses (monthly and yearly)
- Income data by year (2022, 2023, 2024, 2025)
- Currency conversion rates
- Financial calculations and analytics

Use this data to provide accurate, helpful answers about their finances. Be concise but thorough.
Format numbers clearly (e.g., $1,234.56 or 1,234.56 EGP).
When discussing percentages, include the calculation basis.

Current financial data:
${JSON.stringify(financialContext, null, 2)}`
        );
      } else {
        // Fallback to direct DeepSeek API (legacy)
        const requestPayload = {
          model: this.model,
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 2000,
          stream: false
        };
        
        apiRequest = {
          url: this.apiUrl,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json'
          },
          body: requestPayload,
          formatResponse: (data) => data.choices[0].message.content
        };
      }

      console.log('Request payload:', JSON.stringify(apiRequest.body, null, 2));

      const response = await fetch(apiRequest.url, {
        method: 'POST',
        mode: 'cors',
        headers: apiRequest.headers,
        body: JSON.stringify(apiRequest.body)
      });

      console.log('API Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        
        // Parse error response for better messaging
        let errorDetail = errorText;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error && errorData.error.message) {
            errorDetail = errorData.error.message;
          }
        } catch (e) {
          // Use raw error text if parsing fails
        }
        
        throw new Error(`API error: ${response.status} - ${errorDetail}`);
      }

      const data = await response.json();
      console.log('API Response data:', data);
      
      // Use formatResponse function to extract message
      const assistantMessage = apiRequest.formatResponse(data);
      
      if (!assistantMessage) {
        console.error('Unexpected API response format:', data);
        throw new Error('Invalid response format from API');
      }

      // Remove loading indicator
      this.removeLoadingMessage(loadingId);

      // Add assistant message
      this.addMessage('assistant', assistantMessage);
      this.messages.push({ role: 'assistant', content: assistantMessage });

      // Save chat history
      this.saveChatHistory();

      // Scroll to bottom
      this.scrollToBottom();

    } catch (error) {
      console.error('Chat error:', error);
      this.removeLoadingMessage(loadingId);
      
      let errorMessage = 'Sorry, I encountered an error. ';
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage += 'Network error: Please check your internet connection.';
      } else if (error.message.includes('401') || error.message.includes('403')) {
        errorMessage += 'Authentication error: Please check the API key.';
      } else if (error.message.includes('402') || error.message.includes('Insufficient Balance')) {
        errorMessage = '💳 **Account Balance Issue**\n\nYour DeepSeek API account has insufficient balance. Please:\n\n1. Log in to your DeepSeek account\n2. Add credits to your API account\n3. Check your account balance\n4. Try again after adding credits\n\nYou can manage your account at: https://platform.deepseek.com';
      } else if (error.message.includes('429')) {
        errorMessage += 'Rate limit exceeded: Please try again later.';
      } else if (error.message.includes('500')) {
        errorMessage += 'Server error: Please try again later.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      this.addMessage('assistant', errorMessage);
    }
  }

  getFinancialContext() {
    // Use the data access helper if available, otherwise fallback to direct access
    if (window.FinancialDataAccess) {
      const allData = window.FinancialDataAccess.getAllData();
      const summary = window.FinancialDataAccess.getSummary();
      const topExpenses = window.FinancialDataAccess.getTopExpenses('all', 10);
      const breakdown = window.FinancialDataAccess.getExpenseBreakdown();
      
      return {
        ...allData,
        summary,
        topExpenses,
        breakdown,
        timestamp: new Date().toISOString()
      };
    }
    
    // Fallback to direct access
    const state = window.state || {};
    
    const context = {
      currency: {
        selected: state.selectedCurrency || 'EGP',
        symbol: state.currencySymbol || 'EGP',
        rate: state.currencyRate || null
      },
      personal: {
        expenses: state.personal || [],
        monthlyTotal: this.getKPIValue('kpiPersonalMonthly'),
        yearlyTotal: this.getKPIValue('kpiPersonalYearly'),
        monthlyEGP: this.getKPIValue('kpiPersonalMonthlyEGP'),
        yearlyEGP: this.getKPIValue('kpiPersonalYearlyEGP')
      },
      business: {
        expenses: state.biz || [],
        monthlyTotal: this.getKPIValue('kpiBizMonthly'),
        yearlyTotal: this.getKPIValue('kpiBizYearly'),
        monthlyEGP: this.getKPIValue('kpiBizMonthlyEGP'),
        yearlyEGP: this.getKPIValue('kpiBizYearlyEGP')
      },
      all: {
        monthlyTotal: this.getKPIValue('kpiAllMonthlyUSD'),
        yearlyTotal: this.getKPIValue('kpiAllYearlyUSD'),
        monthlyEGP: this.getKPIValue('kpiAllMonthlyEGP'),
        yearlyEGP: this.getKPIValue('kpiAllYearlyEGP'),
        personalShare: this.getKPIValue('sharePersonalVal'),
        businessShare: this.getKPIValue('shareBizVal')
      },
      income: state.income || {},
      settings: {
        theme: state.theme || 'dark',
        autosave: state.autosave || 'on',
        inputsLocked: state.inputsLocked || false
      }
    };

    // Calculate active expenses only
    if (context.personal.expenses) {
      context.personal.activeExpenses = context.personal.expenses.filter(e => e.status === 'active' || !e.status);
      context.personal.inactiveExpenses = context.personal.expenses.filter(e => e.status === 'inactive');
    }

    if (context.business.expenses) {
      context.business.activeExpenses = context.business.expenses.filter(e => e.status === 'active' || !e.status);
      context.business.inactiveExpenses = context.business.expenses.filter(e => e.status === 'inactive');
    }

    return context;
  }

  getKPIValue(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return null;
    
    const text = element.textContent || element.innerText;
    // Extract number from text (removes $, commas, etc.)
    const match = text.match(/[\d,]+\.?\d*/);
    return match ? parseFloat(match[0].replace(/,/g, '')) : null;
  }

  addMessage(role, content) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message chat-message-${role}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'chat-message-content';

    const textDiv = document.createElement('div');
    textDiv.className = 'chat-message-text';
    
    // Parse markdown-like formatting (basic)
    const formattedContent = this.formatMessage(content);
    textDiv.innerHTML = formattedContent;

    contentDiv.appendChild(textDiv);
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);

    this.scrollToBottom();
  }

  formatMessage(content) {
    // Basic markdown formatting
    let formatted = content
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code
      .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;font-family:monospace;">$1</code>')
      // Line breaks
      .replace(/\n/g, '<br>')
      // Links (basic)
      .replace(/https?:\/\/[^\s]+/g, '<a href="$&" target="_blank" style="color:var(--primary);text-decoration:underline;">$&</a>');

    return formatted;
  }

  addLoadingMessage() {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return null;

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-message chat-message-assistant';
    loadingDiv.id = 'chatLoadingMessage';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'chat-message-content';

    const loadingContent = document.createElement('div');
    loadingContent.className = 'chat-loading';
    loadingContent.innerHTML = `
      <span>Thinking</span>
      <div class="chat-loading-dots">
        <div class="chat-loading-dot"></div>
        <div class="chat-loading-dot"></div>
        <div class="chat-loading-dot"></div>
      </div>
    `;

    contentDiv.appendChild(loadingContent);
    loadingDiv.appendChild(contentDiv);
    messagesContainer.appendChild(loadingDiv);

    this.scrollToBottom();
    return 'chatLoadingMessage';
  }

  removeLoadingMessage(loadingId) {
    if (!loadingId) return;
    const loadingMsg = document.getElementById(loadingId);
    if (loadingMsg) {
      loadingMsg.remove();
    }
  }

  scrollToBottom() {
    const chatBody = document.getElementById('chatBody');
    if (chatBody) {
      setTimeout(() => {
        chatBody.scrollTop = chatBody.scrollHeight;
      }, 100);
    }
  }

  saveChatHistory() {
    try {
      const history = {
        messages: this.messages,
        timestamp: Date.now()
      };
      localStorage.setItem('financialChatHistory', JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  }

  loadChatHistory() {
    try {
      const saved = localStorage.getItem('financialChatHistory');
      if (saved) {
        const history = JSON.parse(saved);
        
        // Only load if less than 24 hours old
        const oneDay = 24 * 60 * 60 * 1000;
        if (Date.now() - history.timestamp < oneDay) {
          this.messages = history.messages || [];
          
          // Render messages (skip welcome message if we have history)
          if (this.messages.length > 0) {
            const messagesContainer = document.getElementById('chatMessages');
            if (messagesContainer) {
              // Clear welcome message
              messagesContainer.innerHTML = '';
              
              // Render saved messages
              this.messages.forEach(msg => {
                this.addMessage(msg.role, msg.content);
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }

  clearChatHistory() {
    this.messages = [];
    const messagesContainer = document.getElementById('chatMessages');
    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <div class="chat-message chat-message-assistant">
          <div class="chat-message-content">
            <div class="chat-message-text">
              <p>👋 Hello! I'm your financial assistant. How can I help you today?</p>
            </div>
          </div>
        </div>
      `;
    }
    localStorage.removeItem('financialChatHistory');
  }
}

// Initialize chat when script loads
let financialChat;
if (typeof window !== 'undefined') {
  // Wait for DOM and necessary dependencies
  const initChat = () => {
    // Check if DOM elements exist
    const widget = document.getElementById('chatWidget');
    const toggleBtn = document.getElementById('chatToggleBtn');
    
    if (!widget || !toggleBtn) {
      console.log('Waiting for chat DOM elements...');
      setTimeout(initChat, 100);
      return;
    }
    
    // Optional: Wait for state (but don't block if it's not available)
    // The chat will still work, just with limited data access
    if (window.state === undefined || window.FinancialDataAccess === undefined) {
      console.log('Waiting for financial data access... (chat will still work)');
      // Continue anyway after a short delay
      setTimeout(() => {
        if (!financialChat) {
          financialChat = new FinancialChat();
          window.financialChat = financialChat; // Expose globally
          console.log('✅ Financial Chat Assistant initialized');
        }
      }, 500);
    } else {
      financialChat = new FinancialChat();
      window.financialChat = financialChat; // Expose globally
      console.log('✅ Financial Chat Assistant initialized with full data access');
    }
  };
  
  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initChat, 100);
    });
  } else {
    // DOM already loaded
    setTimeout(initChat, 100);
  }
}

