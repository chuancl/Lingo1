

export enum WordCategory {
  KnownWord = '已掌握单词',
  WantToLearnWord = '想学习单词',
  LearningWord = '正在学单词',
}

// Helper type for UI tabs
export type WordTab = WordCategory | 'all';

export interface StyleConfig {
  color: string;
  backgroundColor: string;
  underlineStyle: 'solid' | 'dashed' | 'dotted' | 'double' | 'wavy' | 'none';
  underlineColor: string;
  underlineOffset: string;
  isBold: boolean;
  isItalic: boolean;
  fontSize: string;
  opacity?: number; 
  // Density Settings
  densityMode: 'count' | 'percent';
  densityValue: number;
}

export interface TextWrapperConfig {
  prefix: string;
  suffix: string;
}

export interface LayoutSpecificConfig {
  translationFirst: boolean;
  // For vertical layout: which element sits on the text baseline?
  baselineTarget?: 'translation' | 'original'; 
  wrappers: {
    translation: TextWrapperConfig;
    original: TextWrapperConfig;
  };
}

export interface OriginalTextConfig {
  show: boolean;
  activeMode: 'horizontal' | 'vertical'; 
  bracketsTarget: 'translation' | 'original'; // Deprecated conceptually, kept for backward compat if needed
  
  // Isolated configurations
  horizontal: LayoutSpecificConfig;
  vertical: LayoutSpecificConfig;

  style: StyleConfig;
}

export interface WordEntry {
  id: string;
  text: string;
  phoneticUs?: string;
  phoneticUk?: string;
  translation?: string;
  addedAt: number;
  sourceUrl?: string;
  sourceTimestamp?: number;
  contextSentence?: string; // 单词所在句子
  contextParagraph?: string; // 单词所在段落 (New)
  mixedSentence?: string;
  dictionaryExample?: string;
  scenarioId?: string;
  category: WordCategory; // Added explicitly to ease data management
}

export interface Scenario {
  id: string;
  name: string;
  isActive: boolean;
  isCustom?: boolean;
}

export type EngineType = 'standard' | 'ai';

export interface TranslationEngine {
  id: string;
  name: string;
  type: EngineType;
  isEnabled: boolean;
  apiKey?: string;
  appId?: string; // Used as SecretId for Tencent
  secretKey?: string;
  endpoint?: string;
  model?: string;
  
  // Tencent / Cloud Specifics
  region?: string;
  projectId?: number;

  isTesting?: boolean;
  testResult?: 'success' | 'fail' | null;
  testErrorMessage?: string; // Specific error message from API
  isCustom?: boolean;
}

export interface AnkiTemplateConfig {
  frontTemplate: string;
  backTemplate: string;
}

export interface AnkiConfig {
  enabled: boolean;
  url: string;
  deckName: string;
  syncInterval: number;
  syncScope: {
    wantToLearn: boolean;
    learning: boolean;
  };
  templates: AnkiTemplateConfig;
}

export type ModifierKey = 'None' | 'Alt' | 'Ctrl' | 'Shift' | 'Meta';
export type MouseAction = 'Hover' | 'Click' | 'DoubleClick' | 'RightClick';

export interface InteractionTrigger {
  modifier: ModifierKey;
  action: MouseAction;
  delay: number; // ms
}

export interface WordInteractionConfig {
  mainTrigger: InteractionTrigger;
  quickAddTrigger: InteractionTrigger;
  
  showPhonetic: boolean;
  showOriginalText: boolean; 
  showDictExample: boolean;
  showDictTranslation: boolean;

  autoPronounce: boolean;
  autoPronounceAccent: 'US' | 'UK';
  autoPronounceCount: number;
}

export type PopupCardField = 'context' | 'mixed' | 'dictExample';

export interface PopupCardItem {
  id: PopupCardField;
  label: string;
  enabled: boolean;
}

export interface PageWidgetConfig {
  enabled: boolean; // Master switch
  x: number;
  y: number;
  width: number; // px
  maxHeight: number; // px
  opacity: number;
  backgroundColor: string;
  fontSize: string;
  
  // Modal State
  modalPosition: { x: number; y: number };
  modalSize: { width: number; height: number };

  // Fixed Content Toggles
  showPhonetic: boolean;
  showMeaning: boolean;
  showMultiExamples: boolean; // Toggle for showing all examples vs just latest

  // Content filter
  showSections: {
    known: boolean;
    want: boolean;
    learning: boolean;
  };
  // Sortable Card Body
  cardDisplay: PopupCardItem[];
}

export type MergeStrategy = 'by_word' | 'by_word_and_meaning';
export type ExampleSourceType = 'context' | 'mixed' | 'dictionary';

export interface ExampleSortItem {
  id: ExampleSourceType;
  label: string;
  enabled: boolean;
}

export interface MergeStrategyConfig {
  strategy: MergeStrategy;
  showMultiExamples: boolean; 
  exampleOrder: ExampleSortItem[];
}

export interface AutoTranslateConfig {
  enabled: boolean;
  blacklist: string[];
  whitelist: string[];
}

export type AppView = 'dashboard' | 'words' | 'settings';
export type SettingSectionId = 'general' | 'visual-styles' | 'scenarios' | 'word-bubble' | 'page-widget' | 'engines' | 'anki';

// App Config Wrapper for Export
export interface AppConfiguration {
  version: string;
  timestamp: string;
  autoTranslate: AutoTranslateConfig;
  scenarios: Scenario[];
  styles: Record<WordCategory, StyleConfig>;
  originalText: OriginalTextConfig;
  interaction: WordInteractionConfig;
  pageWidget: PageWidgetConfig;
  engines: TranslationEngine[];
  anki: AnkiConfig;
}