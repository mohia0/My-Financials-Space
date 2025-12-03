/**
 * AI API Configuration
 * Easy switching between different AI providers
 */

const AI_PROVIDERS = {
  DEEPSEEK: {
    name: 'DeepSeek',
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    apiKey: 'sk-c68fbc1c7a8b43a59153729fbf4ced7c',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer {API_KEY}',
      'Accept': 'application/json'
    }
  },
  
  GEMINI: {
    name: 'Google Gemini',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    model: 'gemini-2.0-flash',
    apiKey: 'AIzaSyDSCsCSg_kAJnkVmkFtAC0MUWhp6fawLf4',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': '{API_KEY}'
    },
    formatRequest: (messages, systemPrompt) => {
      // Convert OpenAI format to Gemini format
      let contents = messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }));
      
      // Build request body
      const requestBody = {
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000
        }
      };
      
      // Gemini 1.5 supports system instructions
      if (systemPrompt) {
        requestBody.systemInstruction = {
          parts: [{ text: systemPrompt }]
        };
      }
      
      return requestBody;
    },
    formatResponse: (data) => {
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
        return data.candidates[0].content.parts[0].text;
      }
      throw new Error('Unexpected response format from Gemini API');
    }
  },
  
  GROQ: {
    name: 'Groq',
    apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.1-8b-instant', // or 'mixtral-8x7b-32768'
    apiKey: '', // Add your Groq API key here
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer {API_KEY}'
    }
  },
  
  HUGGINGFACE: {
    name: 'Hugging Face',
    apiUrl: 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1',
    model: 'mistralai/Mistral-7B-Instruct-v0.1',
    apiKey: '', // Add your HF API key here
    headers: {
      'Authorization': 'Bearer {API_KEY}',
      'Content-Type': 'application/json'
    },
    formatRequest: (messages, systemPrompt) => {
      // Convert to Hugging Face format
      let prompt = systemPrompt ? `${systemPrompt}\n\n` : '';
      messages.forEach(msg => {
        if (msg.role === 'user') {
          prompt += `User: ${msg.content}\n`;
        } else if (msg.role === 'assistant') {
          prompt += `Assistant: ${msg.content}\n`;
        }
      });
      prompt += 'Assistant:';
      
      return {
        inputs: prompt,
        parameters: {
          max_new_tokens: 2000,
          temperature: 0.7
        }
      };
    },
    formatResponse: (data) => {
      return Array.isArray(data) ? data[0].generated_text : data.generated_text;
    }
  }
};

// Current active provider
let activeProvider = 'GEMINI'; // Change this to switch providers

/**
 * Get the active provider configuration
 */
function getActiveProvider() {
  return AI_PROVIDERS[activeProvider];
}

/**
 * Set the active provider
 */
function setActiveProvider(providerName) {
  if (AI_PROVIDERS[providerName]) {
    activeProvider = providerName;
    console.log(`Switched to ${AI_PROVIDERS[providerName].name}`);
    return true;
  }
  return false;
}

/**
 * Get API request configuration for the active provider
 */
function getAPIRequest(messages, systemPrompt) {
  const provider = getActiveProvider();
  
  if (!provider.apiKey) {
    throw new Error(`${provider.name} API key is not configured`);
  }
  
  // Prepare headers
  const headers = {};
  Object.keys(provider.headers).forEach(key => {
    let headerValue = provider.headers[key];
    // Replace API_KEY placeholder in headers
    if (headerValue.includes('{API_KEY}')) {
      headerValue = headerValue.replace('{API_KEY}', provider.apiKey);
    }
    headers[key] = headerValue;
  });
  
  // Prepare request body
  let body;
  if (provider.formatRequest) {
    body = provider.formatRequest(messages, systemPrompt);
  } else {
    // Default OpenAI-compatible format
    body = {
      model: provider.model,
      messages: systemPrompt ? [{ role: 'system', content: systemPrompt }, ...messages] : messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: false
    };
  }
  
  // Build URL - Gemini uses header for API key, not query parameter
  let url = provider.apiUrl;
  
  return {
    url: url,
    headers: headers,
    body: body,
    formatResponse: provider.formatResponse || ((data) => data.choices[0].message.content)
  };
}

// Export for use in chat.js
if (typeof window !== 'undefined') {
  window.AI_PROVIDERS = AI_PROVIDERS;
  window.getActiveProvider = getActiveProvider;
  window.setActiveProvider = setActiveProvider;
  window.getAPIRequest = getAPIRequest;
}


