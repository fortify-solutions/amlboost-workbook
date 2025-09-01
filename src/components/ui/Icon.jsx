import React from 'react';
import {
  Play,
  Plus,
  NavArrowDown,
  NavArrowUp,
  MoreHoriz,
  CandlestickChart,
  DatabaseStats,
  Brain,
  FloppyDisk,
  Download,
  Eye,
  EyeClosed,
  MagicWand,
  EditPencil,
  Trash,
  CheckCircle,
  Clock,
  ChatBubble,
  Send,
  Xmark,
  Settings,
  Home,
  Folder,
  WarningTriangle,
  FileNotFound,
  Page,
  InfoCircle,
  Copy,
  WarningCircle
} from 'iconoir-react';

// Icon mapping from old names to Iconoir components
const iconMap = {
  // Playback & Navigation
  'Play': Play,
  'Plus': Plus,
  'ChevronDown': NavArrowDown,
  'ChevronUp': NavArrowUp,
  'MoreVertical': MoreHoriz,
  
  // Data & Charts
  'BarChart3': CandlestickChart,
  'Database': DatabaseStats,
  
  // AI & Intelligence
  'Brain': Brain,
  'Sparkles': MagicWand,
  
  // Actions
  'Save': FloppyDisk,
  'Download': Download,
  'Edit3': EditPencil,
  'Trash2': Trash,
  'Copy': Copy,
  'Send': Send,
  
  // Status & Feedback
  'CheckCircle': CheckCircle,
  'Clock': Clock,
  'Eye': Eye,
  'EyeOff': EyeClosed,
  'AlertCircle': WarningCircle,
  'AlertTriangle': WarningTriangle,
  'Info': InfoCircle,
  
  // Communication
  'MessageCircle': ChatBubble,
  
  // Interface
  'X': Xmark,
  'Settings': Settings,
  'Home': Home,
  'FolderOpen': Folder,
  'FileX': FileNotFound,
  'FileText': Page,
};

// Fallback for missing icons
const getFallbackIcon = (name) => {
  const fallbacks = {
    Play: '▷', Plus: '+', ChevronDown: '⌄', ChevronUp: '⌃', 
    MoreVertical: '⋮', BarChart3: '⧄', Database: '▤', 
    Brain: '◉', Save: '◊', Download: '↓', Eye: '○', EyeOff: '●',
    Sparkles: '✦', Edit3: '✎', Trash2: '🗴', CheckCircle: '✓',
    Clock: '◷', MessageCircle: '○', Send: '→', X: '×', Settings: '⚙'
  };
  return fallbacks[name] || '●';
};

// Icon component with Iconoir icons
export function Icon({ name, className = "w-4 h-4", ...props }) {
  const IconoirIcon = iconMap[name];
  
  if (IconoirIcon) {
    return <IconoirIcon className={className} {...props} />;
  }
  
  // Fallback to text symbol if icon not found
  return <span className={className} {...props}>{getFallbackIcon(name)}</span>;
}