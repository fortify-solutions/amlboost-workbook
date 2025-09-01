import React from 'react';

export function parseMarkdown(content) {
  if (!content) return [];
  
  const lines = content.split('\n');
  const elements = [];
  let listItems = [];
  let listType = null;
  
  const processInlineFormatting = (text) => {
    if (!text) return text;
    
    const parts = [];
    let currentIndex = 0;
    let keyCounter = 0;
    
    // Process bold (**text**)
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;
    let lastIndex = 0;
    
    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before bold
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index);
        parts.push(processItalicAndEmoji(beforeText, keyCounter++));
      }
      
      // Add bold text
      parts.push(
        <strong key={keyCounter++} className="font-semibold text-gray-900">
          {processItalicAndEmoji(match[1], keyCounter++)}
        </strong>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(processItalicAndEmoji(text.slice(lastIndex), keyCounter++));
    }
    
    return parts.length > 0 ? parts : processItalicAndEmoji(text, 0);
  };
  
  const processItalicAndEmoji = (text, key) => {
    if (!text) return text;
    
    // Process italic (*text*)
    const italicRegex = /\*([^*]+?)\*/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let keyCounter = key * 1000;
    
    while ((match = italicRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      
      parts.push(
        <em key={keyCounter++} className="italic">
          {match[1]}
        </em>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    
    return parts.length > 0 ? parts : text;
  };
  
  const flushList = () => {
    if (listItems.length > 0) {
      const ListComponent = listType === 'ordered' ? 'ol' : 'ul';
      const listClassName = listType === 'ordered' 
        ? 'list-decimal list-inside space-y-1 mb-4 ml-4'
        : 'list-disc list-inside space-y-1 mb-4 ml-4';
      
      elements.push(
        <ListComponent key={elements.length} className={listClassName}>
          {listItems.map((item, index) => (
            <li key={index} className="text-gray-700">
              {processInlineFormatting(item)}
            </li>
          ))}
        </ListComponent>
      );
      
      listItems = [];
      listType = null;
    }
  };
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Handle headers
    if (trimmedLine.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={index} className="text-3xl fortify-heading font-bold mb-6 mt-8">
          {processInlineFormatting(trimmedLine.substring(2))}
        </h1>
      );
    } else if (trimmedLine.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={index} className="text-2xl fortify-heading font-bold mb-4 mt-6">
          {processInlineFormatting(trimmedLine.substring(3))}
        </h2>
      );
    } else if (trimmedLine.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={index} className="text-xl fortify-subheading font-semibold mb-3 mt-4">
          {processInlineFormatting(trimmedLine.substring(4))}
        </h3>
      );
    } else if (trimmedLine.startsWith('#### ')) {
      flushList();
      elements.push(
        <h4 key={index} className="text-lg fortify-subheading font-medium mb-2 mt-3">
          {processInlineFormatting(trimmedLine.substring(5))}
        </h4>
      );
    }
    // Handle horizontal rule
    else if (trimmedLine === '---') {
      flushList();
      elements.push(
        <hr key={index} className="border-gray-300 my-6" />
      );
    }
    // Handle unordered lists
    else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      if (listType !== 'unordered') {
        flushList();
        listType = 'unordered';
      }
      listItems.push(trimmedLine.substring(2));
    }
    // Handle ordered lists
    else if (/^\d+\.\s/.test(trimmedLine)) {
      if (listType !== 'ordered') {
        flushList();
        listType = 'ordered';
      }
      listItems.push(trimmedLine.replace(/^\d+\.\s/, ''));
    }
    // Handle blockquotes (optional enhancement)
    else if (trimmedLine.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote key={index} className="border-l-4 border-purple-400 pl-4 italic text-gray-600 my-4">
          {processInlineFormatting(trimmedLine.substring(2))}
        </blockquote>
      );
    }
    // Handle empty lines
    else if (trimmedLine === '') {
      flushList();
      elements.push(<div key={index} className="h-2" />);
    }
    // Handle regular paragraphs
    else {
      flushList();
      elements.push(
        <p key={index} className="fortify-body leading-relaxed mb-3">
          {processInlineFormatting(trimmedLine)}
        </p>
      );
    }
  });
  
  // Flush any remaining list items
  flushList();
  
  return elements;
}