import React, { useState, useEffect, useRef } from 'react';
import { useNotebook } from '../../stores/NotebookContext';
import { Icon } from '../ui/Icon';
import { getOpenAIService } from '../../services/openaiService';

export function AICell({ cell }) {
  const { state, dispatch, ActionTypes } = useNotebook();
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [cell.messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isProcessing) return;

    const userMessage = { role: 'user', content: inputMessage.trim(), timestamp: new Date().toISOString() };
    const currentMessages = cell.messages || [];
    
    // Add user message to cell immediately
    dispatch({
      type: ActionTypes.UPDATE_CELL,
      payload: {
        id: cell.id,
        updates: {
          messages: [...currentMessages, userMessage]
        }
      }
    });

    // Clear input and set processing state
    const messageContent = inputMessage.trim();
    setInputMessage('');
    setIsProcessing(true);

    try {
      // Get context from previous cells
      const currentCellIndex = state.cells.findIndex(c => c.id === cell.id);
      const contextCells = state.cells.slice(0, currentCellIndex);
      
      // Check if API key is configured
      const apiKey = state.settings.apiKey || localStorage.getItem('openai_api_key');
      if (!apiKey) {
        throw new Error('OpenAI API key not configured. Please set your API key in Settings.');
      }

      // Get OpenAI service with data context and send message
      const openaiService = getOpenAIService(state.csvData, state.columnTypes);
      
      // Convert messages to OpenAI format (exclude timestamp for API)
      const messagesForAPI = currentMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      messagesForAPI.push({ role: 'user', content: messageContent });

      const aiResponseContent = await openaiService.sendMessage(messagesForAPI, contextCells);
      
      const aiResponse = {
        role: 'assistant',
        content: aiResponseContent,
        timestamp: new Date().toISOString()
      };

      // Update cell with AI response
      dispatch({
        type: ActionTypes.UPDATE_CELL,
        payload: {
          id: cell.id,
          updates: {
            messages: [...currentMessages, userMessage, aiResponse],
            executed: true,
            executionTime: '2.1s'
          }
        }
      });

    } catch (error) {
      console.error('AI conversation error:', error);
      
      const errorResponse = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}\n\nPlease check your API key in Settings if you haven't configured it yet.`,
        timestamp: new Date().toISOString(),
        isError: true
      };

      dispatch({
        type: ActionTypes.UPDATE_CELL,
        payload: {
          id: cell.id,
          updates: {
            messages: [...currentMessages, userMessage, errorResponse],
            executed: false,
            executionTime: null
          }
        }
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const clearChat = () => {
    dispatch({
      type: ActionTypes.UPDATE_CELL,
      payload: {
        id: cell.id,
        updates: { messages: [] }
      }
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <Icon name="Brain" className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-700">AI Assistant</span>
          </div>
          {cell.executed && (
            <div className="flex items-center space-x-1 text-xs text-green-600">
              <Icon name="CheckCircle" className="w-3 h-3" />
              <span>{cell.executionTime}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-orange-600">
            Context: {state.cells.findIndex(c => c.id === cell.id)} previous cells
          </span>
          <button 
            onClick={clearChat}
            className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200"
          >
            Clear Chat
          </button>
        </div>
      </div>
      
      <div className="p-4 border-b border-gray-200 bg-orange-50">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">AI Assistant Chat</h4>
        </div>
      </div>
      
      <div className="h-96 flex flex-col">
        <div className="flex-1 p-4 overflow-y-auto">
          {!cell.messages || cell.messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Icon name="MessageCircle" className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Start a conversation with the AI assistant</p>
              <p className="text-xs mt-1">I have access to all previous cells in this notebook</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cell.messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-3/4 p-3 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : message.isError
                      ? 'bg-red-50 text-red-900 border border-red-200'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    <div className={`text-xs mt-2 ${
                      message.role === 'user' 
                        ? 'text-blue-100' 
                        : message.isError 
                        ? 'text-red-500' 
                        : 'text-gray-500'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="max-w-3/4 p-3 rounded-lg bg-gray-100 text-gray-900">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      <span className="text-sm">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          {!state.settings.apiKey && !localStorage.getItem('openai_api_key') ? (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Icon name="Settings" className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-yellow-700">
                  Configure your OpenAI API key in Settings to start chatting with the AI assistant.
                </span>
                <button 
                  onClick={() => dispatch({ type: ActionTypes.TOGGLE_MODAL, payload: { modal: 'settings', value: true } })}
                  className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
                >
                  Open Settings
                </button>
              </div>
            </div>
          ) : null}
          
          <form onSubmit={handleSendMessage} className="flex space-x-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about your data or request analysis..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              disabled={isProcessing}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isProcessing}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Icon name="Send" className="w-4 h-4" />
                  <span>Send</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}