/**
 * Financial Chat Assistant
 * Integrates with DeepSeek API to provide AI-powered financial insights
 */

class FinancialChat {
  constructor() {
    // Use API config if available, otherwise use DeepSeek directly
    this.messages = [];
    this.isOpen = false;
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
    const CHAT_ENABLED = true;
    
    // Disable chat on mobile devices
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      console.log('Chat is disabled on mobile devices');
      // Hide chat elements on mobile
      const widget = document.getElementById('chatWidget');
      const toggleBtn = document.getElementById('chatToggleBtn');
      if (widget) {
        widget.style.display = 'none';
        widget.classList.add('hidden');
      }
      if (toggleBtn) {
        toggleBtn.style.display = 'none';
        toggleBtn.classList.add('hidden');
      }
      return;
    }
    
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

    // Clear button
    const clearBtn = document.getElementById('chatClearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.showClearChatConfirm();
      });
    }

    // Close button
    const closeBtn = document.getElementById('chatCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeChat());
    }

    // Send button
    const sendBtn = document.getElementById('chatSendBtn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendMessage());
    }

    // Input field - NEVER lock this input, even if main tool is locked
    const input = document.getElementById('chatInput');
    if (input) {
      // Ensure input is never locked
      input.disabled = false;
      input.readOnly = false;
      
      // Remove any lock-related attributes
      input.removeAttribute('disabled');
      input.removeAttribute('readonly');
      
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
        // Ensure it stays unlocked
        input.disabled = false;
        input.readOnly = false;
      });

      // Monitor and prevent any lock attempts
      const observer = new MutationObserver(() => {
        if (input.disabled || input.readOnly) {
          input.disabled = false;
          input.readOnly = false;
        }
      });
      
      observer.observe(input, {
        attributes: true,
        attributeFilter: ['disabled', 'readonly']
      });
    }

    // Drag functionality disabled - chat is fixed

    // Suggestion clicks
    document.addEventListener('click', (e) => {
      if (e.target.closest('.chat-suggestions li')) {
        const suggestion = e.target.closest('.chat-suggestions li').textContent.trim();
        input.value = suggestion.replace(/^["']|["']$/g, '');
        this.sendMessage();
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
      
      this.isOpen = true;
      
      // After animation completes, remove opening class
      setTimeout(() => {
        widget.classList.remove('opening');
      }, 400);
      
      // Focus input after a short delay - ensure it's unlocked
      const input = document.getElementById('chatInput');
      if (input) {
        input.disabled = false;
        input.readOnly = false;
        setTimeout(() => {
          input.disabled = false;
          input.readOnly = false;
          input.focus();
        }, 450);
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


  async sendMessage() {
    const input = document.getElementById('chatInput');
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    // Clear input and keep it focused
    input.value = '';
    input.style.height = 'auto';
    input.disabled = false;
    input.readOnly = false;
    // Immediately focus input to allow continuous typing
    input.focus();

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
          content: `You are a concise financial assistant. Be DIRECT and BRIEF.

=== COMPLETE DATA ACCESS ===
You have access to EVERYTHING. Never say "I don't have information" or "I cannot" - you have complete access.

=== DATA STRUCTURE EXPLAINED ===

EXPENSE ENTRIES (in rawState.personal, rawState.biz, expenses.personal.all, expenses.business.all):
Each expense has these fields:
- name: Expense name (e.g., "Netflix", "Office Rent")
- cost: Original cost in USD
- monthlyUSD: Monthly cost in USD (use this for monthly comparisons)
- monthlyEGP: Monthly cost in EGP
- yearlyUSD: Yearly cost in USD
- yearlyEGP: Yearly cost in EGP
- billing: "Monthly" or "Annually" or "Yearly"
- status: "Active" or "inactive"
- next: Next payment date (for business expenses)
- icon: Icon identifier

TO FIND BIGGEST EXPENSES:
1. Look at rawState.personal and rawState.biz arrays
2. Sort by monthlyUSD field (highest first)
3. Or use topExpenses array which is already sorted
4. Compare monthlyUSD values to find biggest

INCOME ENTRIES - MULTIPLE WAYS TO ACCESS:
1. rawState.income - Object with year keys: income["2020"], income["2021"], income["2022"], etc.
   Each year contains an array of income entries.
2. incomeData.allEntries - ALL income entries from ALL years as a flat array (easiest to search)
3. incomeData.totalsByYear - Summary totals for each year
4. incomeData.bestYear - The year with highest income (already calculated)
5. incomeData.yearsWithData - List of years that have income entries
6. incomeData.allYears - List of all years (including empty ones)
7. topProjects - Top 10 projects sorted by paidUsd (highest first)

Each income entry has these fields:
- name: Project/client name (e.g., "Website Redesign", "Mobile App")
- paidUsd: Amount paid in USD (use this to compare projects and years)
- paidEgp: Amount paid in EGP
- allPayment: Total project payment amount
- tags: Project categories/tags (array or string)
- date: Payment date
- method: Payment method
- progress: Completion percentage (0-100)
- note: Additional notes
- year: Year of income (included in allEntries and topProjects)

TO FIND BEST PROJECT:
1. Use topProjects array (first item is the best, already sorted by paidUsd)
2. Or search incomeData.allEntries and sort by paidUsd (highest first)
3. Compare paidUsd or allPayment values (highest = best financially)
4. Include project name, amount, tags, and year in your answer

TO FIND BEST INCOME YEAR:
1. Use incomeData.bestYear (already calculated - has year, totalPaidUsd, entryCount)
2. Or use incomeData.totalsByYear and find year with highest totalPaidUsd
3. Compare totalPaidUsd values across years

=== HOW TO ANSWER COMMON QUESTIONS ===

"Show me my biggest expenses":
- Sort expenses.personal.all and expenses.business.all by monthlyUSD (descending)
- Or use topExpenses array
- List top 5-10 with amounts

"What is the best project?" or "best project":
- Use topProjects array (first item is the best, already sorted)
- Or search incomeData.allEntries and find highest paidUsd
- Include: project name, paidUsd amount, tags, year

"What is the best income year?" or "best income year":
- Use incomeData.bestYear (already calculated)
- Or check incomeData.totalsByYear and find highest totalPaidUsd
- Include: year, total amount, number of projects

=== RULES ===
1. Be CONCISE - minimal text, maximum value
2. Lead with answer, skip explanations
3. Use bullet points
4. Format: $1,234.56 or 1,234.56 EGP
5. NEVER say "I cannot" or "I don't have information"
6. Use the data provided - it's all there

Complete financial data:
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
          `You are a concise financial assistant. Be DIRECT and BRIEF.

=== COMPLETE DATA ACCESS ===
You have access to EVERYTHING. Never say "I don't have information" or "I cannot" - you have complete access.

=== DATA STRUCTURE EXPLAINED ===

EXPENSE ENTRIES (in rawState.personal, rawState.biz, expenses.personal.all, expenses.business.all):
Each expense has these fields:
- name: Expense name (e.g., "Netflix", "Office Rent")
- cost: Original cost in USD
- monthlyUSD: Monthly cost in USD (use this for monthly comparisons)
- monthlyEGP: Monthly cost in EGP
- yearlyUSD: Yearly cost in USD
- yearlyEGP: Yearly cost in EGP
- billing: "Monthly" or "Annually" or "Yearly"
- status: "Active" or "inactive"
- next: Next payment date (for business expenses)
- icon: Icon identifier

TO FIND BIGGEST EXPENSES:
1. Look at rawState.personal and rawState.biz arrays
2. Sort by monthlyUSD field (highest first)
3. Or use topExpenses array which is already sorted
4. Compare monthlyUSD values to find biggest

INCOME ENTRIES - MULTIPLE WAYS TO ACCESS:
1. rawState.income - Object with year keys: income["2020"], income["2021"], income["2022"], etc.
   Each year contains an array of income entries.
2. incomeData.allEntries - ALL income entries from ALL years as a flat array (easiest to search)
3. incomeData.totalsByYear - Summary totals for each year
4. incomeData.bestYear - The year with highest income (already calculated)
5. incomeData.yearsWithData - List of years that have income entries
6. incomeData.allYears - List of all years (including empty ones)
7. topProjects - Top 10 projects sorted by paidUsd (highest first)

Each income entry has these fields:
- name: Project/client name (e.g., "Website Redesign", "Mobile App")
- paidUsd: Amount paid in USD (use this to compare projects and years)
- paidEgp: Amount paid in EGP
- allPayment: Total project payment amount
- tags: Project categories/tags (array or string)
- date: Payment date
- method: Payment method
- progress: Completion percentage (0-100)
- note: Additional notes
- year: Year of income (included in allEntries and topProjects)

TO FIND BEST PROJECT:
1. Use topProjects array (first item is the best, already sorted by paidUsd)
2. Or search incomeData.allEntries and sort by paidUsd (highest first)
3. Compare paidUsd or allPayment values (highest = best financially)
4. Include project name, amount, tags, and year in your answer

TO FIND BEST INCOME YEAR:
1. Use incomeData.bestYear (already calculated - has year, totalPaidUsd, entryCount)
2. Or use incomeData.totalsByYear and find year with highest totalPaidUsd
3. Compare totalPaidUsd values across years

=== HOW TO ANSWER COMMON QUESTIONS ===

"Show me my biggest expenses":
- Sort expenses.personal.all and expenses.business.all by monthlyUSD (descending)
- Or use topExpenses array
- List top 5-10 with amounts

"What is the best project?" or "best project":
- Use topProjects array (first item is the best, already sorted)
- Or search incomeData.allEntries and find highest paidUsd
- Include: project name, paidUsd amount, tags, year

"What is the best income year?" or "best income year":
- Use incomeData.bestYear (already calculated)
- Or check incomeData.totalsByYear and find highest totalPaidUsd
- Include: year, total amount, number of projects

=== RULES ===
1. Be CONCISE - minimal text, maximum value
2. Lead with answer, skip explanations
3. Use bullet points
4. Format: $1,234.56 or 1,234.56 EGP
5. NEVER say "I cannot" or "I don't have information"
6. Use the data provided - it's all there

Complete financial data:
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

      console.log('Request URL:', apiRequest.url);
      console.log('Request headers:', apiRequest.headers);
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
          // Handle OpenAI/DeepSeek format
          if (errorData.error && errorData.error.message) {
            errorDetail = errorData.error.message;
          }
          // Handle Gemini error format
          else if (errorData.error) {
            if (typeof errorData.error === 'string') {
              errorDetail = errorData.error;
            } else if (errorData.error.message) {
              errorDetail = errorData.error.message;
            } else if (errorData.error.status) {
              errorDetail = errorData.error.status;
            }
          }
          // Handle direct error message
          else if (errorData.message) {
            errorDetail = errorData.message;
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

      // Re-focus input to allow continuous conversation - NEVER lock it
      const input = document.getElementById('chatInput');
      if (input) {
        // Force unlock - chat input should NEVER be locked
        input.disabled = false;
        input.readOnly = false;
        input.removeAttribute('disabled');
        input.removeAttribute('readonly');
        setTimeout(() => {
          input.disabled = false;
          input.readOnly = false;
          input.focus();
        }, 100);
      }

    } catch (error) {
      console.error('Chat error:', error);
      this.removeLoadingMessage(loadingId);
      
      // Re-enable input on error - NEVER lock it
      const input = document.getElementById('chatInput');
      if (input) {
        // Force unlock - chat input should NEVER be locked
        input.disabled = false;
        input.readOnly = false;
        input.removeAttribute('disabled');
        input.removeAttribute('readonly');
        setTimeout(() => {
          input.disabled = false;
          input.readOnly = false;
          input.focus();
        }, 100);
      }
      
      let errorMessage = 'Sorry, I encountered an error. ';
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage += 'Network error: Please check your internet connection.';
      } else if (error.message.includes('401') || error.message.includes('403')) {
        errorMessage = '🔐 **Authentication Error**\n\nYour Gemini API key authentication failed. Please:\n\n1. Verify your API key is correct: `AIzaSyDSCsCSg_kAJnkVmkFtAC0MUWhp6fawLf4`\n2. Check that the Gemini API is enabled in Google Cloud Console\n3. Ensure your API key has no IP or referrer restrictions\n4. Verify the API key has permission to use the Gemini API\n\nYou can manage your API key at: https://console.cloud.google.com/apis/credentials';
      } else if (error.message.includes('402') || error.message.includes('Insufficient Balance')) {
        const provider = window.getActiveProvider ? window.getActiveProvider().name : 'API';
        errorMessage = `💳 **Account Balance Issue**\n\nYour ${provider} API account has insufficient balance. Please:\n\n1. Log in to your ${provider} account\n2. Add credits to your API account\n3. Check your account balance\n4. Try again after adding credits`;
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

  getAllKPIsFromDOM() {
    // Extract all KPI values from DOM elements
    const kpis = {};
    
    // Helper to get element text or value
    const getElementValue = (id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const text = el.textContent || el.innerText || '';
      return text.trim() || null;
    };
    
    // Helper to get numeric value
    const getNumericValue = (id) => {
      const text = getElementValue(id);
      if (!text) return null;
      const match = text.match(/[\d,]+\.?\d*/);
      return match ? parseFloat(match[0].replace(/,/g, '')) : null;
    };
    
    // Expense KPIs
    kpis.expenses = {
      all: {
        monthlyUSD: getNumericValue('kpiAllMonthlyUSD'),
        monthlyEGP: getNumericValue('kpiAllMonthlyEGP'),
        yearlyUSD: getNumericValue('kpiAllYearlyUSD'),
        yearlyEGP: getNumericValue('kpiAllYearlyEGP'),
        monthlyUSDText: getElementValue('kpiAllMonthlyUSD'),
        monthlyEGPText: getElementValue('kpiAllMonthlyEGP'),
        yearlyUSDText: getElementValue('kpiAllYearlyUSD'),
        yearlyEGPText: getElementValue('kpiAllYearlyEGP')
      },
      personal: {
        monthlyUSD: getNumericValue('kpiPersonalMonthly'),
        monthlyEGP: getNumericValue('kpiPersonalMonthlyEGP'),
        yearlyUSD: getNumericValue('kpiPersonalYearly'),
        yearlyEGP: getNumericValue('kpiPersonalYearlyEGP'),
        monthlyUSDText: getElementValue('kpiPersonalMonthly'),
        monthlyEGPText: getElementValue('kpiPersonalMonthlyEGP'),
        yearlyUSDText: getElementValue('kpiPersonalYearly'),
        yearlyEGPText: getElementValue('kpiPersonalYearlyEGP')
      },
      business: {
        monthlyUSD: getNumericValue('kpiBizMonthly'),
        monthlyEGP: getNumericValue('kpiBizMonthlyEGP'),
        yearlyUSD: getNumericValue('kpiBizYearly'),
        yearlyEGP: getNumericValue('kpiBizYearlyEGP'),
        monthlyUSDText: getElementValue('kpiBizMonthly'),
        monthlyEGPText: getElementValue('kpiBizMonthlyEGP'),
        yearlyUSDText: getElementValue('kpiBizYearly'),
        yearlyEGPText: getElementValue('kpiBizYearlyEGP')
      },
      shares: {
        personal: getElementValue('sharePersonalVal'),
        business: getElementValue('shareBizVal'),
        personalNumeric: getNumericValue('sharePersonalVal'),
        businessNumeric: getNumericValue('shareBizVal')
      },
      fx: {
        label: getElementValue('kpiFxLabel'),
        small: getElementValue('kpiFxSmall')
      }
    };
    
    // Income KPIs
    kpis.income = {
      all: {
        monthlyUSD: getNumericValue('kpiIncomeAllMonthlyUSD'),
        monthlyEGP: getNumericValue('kpiIncomeAllMonthlyEGP'),
        yearlyUSD: getNumericValue('kpiIncomeAllYearlyUSD'),
        yearlyEGP: getNumericValue('kpiIncomeAllYearlyEGP'),
        monthlyUSDText: getElementValue('kpiIncomeAllMonthlyUSD'),
        monthlyEGPText: getElementValue('kpiIncomeAllMonthlyEGP'),
        yearlyUSDText: getElementValue('kpiIncomeAllYearlyUSD'),
        yearlyEGPText: getElementValue('kpiIncomeAllYearlyEGP')
      },
      monthly: {
        currentUSD: getNumericValue('kpiIncomeMonthlyCurrent'),
        currentEGP: getNumericValue('kpiIncomeMonthlyCurrentEGP'),
        avgUSD: getNumericValue('kpiIncomeMonthlyAvg'),
        avgEGP: getNumericValue('kpiIncomeMonthlyAvgEGP'),
        currentUSDText: getElementValue('kpiIncomeMonthlyCurrent'),
        currentEGPText: getElementValue('kpiIncomeMonthlyCurrentEGP'),
        avgUSDText: getElementValue('kpiIncomeMonthlyAvg'),
        avgEGPText: getElementValue('kpiIncomeMonthlyAvgEGP')
      },
      yearly: {
        currentUSD: getNumericValue('kpiIncomeYearlyCurrent'),
        currentEGP: getNumericValue('kpiIncomeYearlyCurrentEGP'),
        avgUSD: getNumericValue('kpiIncomeYearlyAvg'),
        avgEGP: getNumericValue('kpiIncomeYearlyAvgEGP'),
        targetUSD: getNumericValue('kpiIncomeYearlyTarget'),
        targetEGP: getNumericValue('kpiIncomeYearlyTargetEGP'),
        currentUSDText: getElementValue('kpiIncomeYearlyCurrent'),
        currentEGPText: getElementValue('kpiIncomeYearlyCurrentEGP'),
        avgUSDText: getElementValue('kpiIncomeYearlyAvg'),
        avgEGPText: getElementValue('kpiIncomeYearlyAvgEGP'),
        targetUSDText: getElementValue('kpiIncomeYearlyTarget'),
        targetEGPText: getElementValue('kpiIncomeYearlyTargetEGP')
      },
      fx: {
        label: getElementValue('kpiIncomeFxLabel'),
        small: getElementValue('kpiIncomeFxSmall')
      },
      completed: {
        value: getElementValue('shareIncomeCompletedVal'),
        currency: getElementValue('shareIncomeCompletedValCurrency')
      }
    };
    
    // Analytics KPIs
    kpis.analytics = {
      cashFlow: {
        monthlyUSD: getNumericValue('analyticsCashFlowMonthlyUSD'),
        monthlyEGP: getNumericValue('analyticsCashFlowMonthlyEGP'),
        yearlyUSD: getNumericValue('analyticsCashFlowYearlyUSD'),
        yearlyEGP: getNumericValue('analyticsCashFlowYearlyEGP'),
        monthlyUSDText: getElementValue('analyticsCashFlowMonthlyUSD'),
        monthlyEGPText: getElementValue('analyticsCashFlowMonthlyEGP'),
        yearlyUSDText: getElementValue('analyticsCashFlowYearlyUSD'),
        yearlyEGPText: getElementValue('analyticsCashFlowYearlyEGP'),
        status: getElementValue('analyticsCashFlowStatus'),
        incomeVal: getElementValue('analyticsIncomeVal'),
        expensesVal: getElementValue('analyticsExpensesVal')
      },
      savings: {
        monthlyRate: getElementValue('analyticsSavingsRateMonthly'),
        yearlyRate: getElementValue('analyticsSavingsRateYearly'),
        monthlyStatus: getElementValue('analyticsSavingsRateMonthlyStatus'),
        yearlyStatus: getElementValue('analyticsSavingsRateYearlyStatus'),
        target: getElementValue('analyticsSavingsTarget'),
        monthlyRateNumeric: getNumericValue('analyticsSavingsRateMonthly'),
        yearlyRateNumeric: getNumericValue('analyticsSavingsRateYearly'),
        targetNumeric: getNumericValue('analyticsSavingsTarget')
      },
      efficiency: {
        personal: getElementValue('analyticsPersonalEfficiency'),
        business: getElementValue('analyticsBusinessEfficiency'),
        total: getElementValue('analyticsTotalEfficiency'),
        personalStatus: getElementValue('analyticsPersonalEfficiencyStatus'),
        businessStatus: getElementValue('analyticsBusinessEfficiencyStatus'),
        personalNumeric: getNumericValue('analyticsPersonalEfficiency'),
        businessNumeric: getNumericValue('analyticsBusinessEfficiency'),
        totalNumeric: getNumericValue('analyticsTotalEfficiency')
      },
      health: {
        score: getNumericValue('analyticsHealthScore'),
        scoreText: getElementValue('analyticsHealthScore'),
        grade: getElementValue('analyticsHealthGrade'),
        gradeStatus: getElementValue('analyticsHealthGradeStatus'),
        progress: getElementValue('analyticsHealthProgress'),
        progressNumeric: getNumericValue('analyticsHealthProgress')
      }
    };
    
    return kpis;
  }

  getFinancialContext() {
    // Get all KPI values from DOM (calculated and displayed values)
    const allKPIs = this.getAllKPIsFromDOM();
    
    // Get complete financial context from FinancialDataAccess (single source of truth)
    let financialContext = {};
    if (window.FinancialDataAccess && typeof window.FinancialDataAccess.getCompleteFinancialContext === 'function') {
      financialContext = window.FinancialDataAccess.getCompleteFinancialContext();
    } else {
      // Fallback if FinancialDataAccess is not available
      const state = window.state || {};
      financialContext = {
        rawState: {
          personal: state.personal || [],
          biz: state.biz || [],
          income: state.income || {}
        },
        expenses: {
          personal: { all: state.personal || [] },
          business: { all: state.biz || [] }
        },
        income: state.income || {},
        incomeData: {
          allEntries: [],
          totalsByYear: {},
          bestYear: null,
          yearsWithData: [],
          allYears: []
        }
      };
    }
    
    // Add KPI values from DOM (these are calculated/displayed values that may differ from raw state)
    financialContext.kpis = allKPIs;
    
    // Add metadata
    financialContext.timestamp = new Date().toISOString();
    financialContext.dataSource = 'complete';
    
    return financialContext;
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

  showClearChatConfirm() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '10001';
    
    const dialog = document.createElement('div');
    dialog.className = 'modal-content';
    dialog.style.maxWidth = '360px';
    dialog.innerHTML = `
      <h3 style="color: var(--fg); margin-bottom: 0.75rem; font-size: 1rem; font-weight: 600;">Clear Chat History</h3>
      <p style="color: var(--muted); margin-bottom: 1.5rem; font-size: 0.85rem; line-height: 1.5;">
        Are you sure you want to clear all chat messages? This action cannot be undone.
      </p>
      <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
        <button id="chatCancelClear" class="btn btn-ghost" style="padding: 0.5rem 1rem; font-size: 0.85rem; border: 1px solid var(--stroke); background: transparent; color: var(--muted);">Cancel</button>
        <button id="chatConfirmClear" class="btn" style="padding: 0.5rem 1rem; font-size: 0.85rem; background: var(--primary, #6366f1); color: white; border: none;">Clear Chat</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
    
    // Cancel button
    document.getElementById('chatCancelClear').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
    
    // Confirm button
    document.getElementById('chatConfirmClear').addEventListener('click', () => {
      document.body.removeChild(overlay);
      this.clearChatHistory();
    });
  }

  clearChatHistory() {
    this.messages = [];
    const messagesContainer = document.getElementById('chatMessages');
    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <div class="chat-message chat-message-assistant">
          <div class="chat-message-content">
            <div class="chat-message-text">
              <p>👋 Hello! I'm your financial assistant. I can help you understand your expenses, income, savings, and answer questions about your financial data.</p>
              <p class="mt-2">Try asking me:</p>
              <ul class="chat-suggestions">
                <li>"What's my total monthly expenses?"</li>
                <li>"Show me my biggest expenses"</li>
                <li>"What's my savings rate?"</li>
                <li>"Compare personal vs business expenses"</li>
              </ul>
            </div>
          </div>
        </div>
      `;
    }
    localStorage.removeItem('financialChatHistory');
    
    // Scroll to top after clearing
    this.scrollToBottom();
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

