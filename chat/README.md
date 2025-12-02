# Financial Chat Assistant

AI-powered chat assistant integrated with DeepSeek API to provide financial insights and answer questions about your financial data.

## Features

- 🤖 **AI-Powered**: Uses DeepSeek API for intelligent financial analysis
- 📊 **Data-Aware**: Has full access to your financial data (expenses, income, analytics)
- 💬 **Interactive Chat**: Natural language interface for financial queries
- 📱 **Mobile-Friendly**: Responsive design that works on all devices
- 🖥️ **Desktop Floating**: Floats on the right side on desktop, full-screen on mobile
- 🔄 **Expandable/Collapsible**: Minimize or expand the chat as needed
- 💾 **History**: Saves chat history locally for 24 hours

## Files

- `chat.html` - Chat UI structure (embedded in index.html)
- `chat.css` - Chat styling (responsive, floating, mobile-friendly)
- `chat.js` - Chat logic and DeepSeek API integration
- `data-access.js` - Helper functions to access financial data

## Usage

The chat widget appears as a floating button in the bottom-right corner. Click it to open the chat interface.

### Example Questions

- "What's my total monthly expenses?"
- "Show me my biggest expenses"
- "What's my savings rate?"
- "Compare personal vs business expenses"
- "How much do I spend on subscriptions?"
- "What's my income vs expenses ratio?"

## Integration

The chat is automatically integrated into the main application via `index.html`. It:
1. Loads after the main script.js (to access `window.state`)
2. Uses `FinancialDataAccess` helper to get financial data
3. Sends context to DeepSeek API for intelligent responses

## API Configuration

The DeepSeek API key is configured in `chat.js`. The chat uses the `deepseek-chat` model for responses.

## Styling

The chat uses CSS custom properties from the main application theme, making it compatible with both dark and light modes.

## Mobile Behavior

On mobile devices (< 768px):
- Chat opens in full-screen mode
- Floating button positioned above mobile navigation
- Minimize functionality disabled (full-screen only)

