

import { storage } from 'wxt/storage';
import { WordEntry, WordCategory, PageWidgetConfig, AutoTranslateConfig, Scenario, TranslationEngine, AnkiConfig, StyleConfig, OriginalTextConfig, WordInteractionConfig, DictionaryEngine } from '../types';
import { DEFAULT_PAGE_WIDGET, DEFAULT_AUTO_TRANSLATE, INITIAL_SCENARIOS, INITIAL_ENGINES, DEFAULT_ANKI_CONFIG, DEFAULT_STYLES, DEFAULT_ORIGINAL_TEXT_CONFIG, DEFAULT_WORD_INTERACTION, INITIAL_DICTIONARIES } from '../constants';

// Define storage keys and default values
export const entriesStorage = storage.defineItem<WordEntry[]>('local:entries', {
  defaultValue: [],
});

export const scenariosStorage = storage.defineItem<Scenario[]>('local:scenarios', {
  defaultValue: INITIAL_SCENARIOS,
});

export const stylesStorage = storage.defineItem<Record<WordCategory, StyleConfig>>('local:styles', {
    defaultValue: DEFAULT_STYLES,
});

export const originalTextConfigStorage = storage.defineItem<OriginalTextConfig>('local:originalTextConfig', {
  defaultValue: DEFAULT_ORIGINAL_TEXT_CONFIG,
});

export const pageWidgetConfigStorage = storage.defineItem<PageWidgetConfig>('local:pageWidgetConfig', {
  defaultValue: DEFAULT_PAGE_WIDGET,
});

export const autoTranslateConfigStorage = storage.defineItem<AutoTranslateConfig>('local:autoTranslateConfig', {
  defaultValue: DEFAULT_AUTO_TRANSLATE,
});

export const enginesStorage = storage.defineItem<TranslationEngine[]>('local:engines', {
  defaultValue: INITIAL_ENGINES,
});

export const dictionariesStorage = storage.defineItem<DictionaryEngine[]>('local:dictionaries', {
  defaultValue: INITIAL_DICTIONARIES,
});

export const ankiConfigStorage = storage.defineItem<AnkiConfig>('local:ankiConfig', {
  defaultValue: DEFAULT_ANKI_CONFIG,
});

export const interactionConfigStorage = storage.defineItem<WordInteractionConfig>('local:interactionConfig', {
  defaultValue: DEFAULT_WORD_INTERACTION,
});

// Helper to seed data if empty
export const seedInitialData = async () => {
  const existing = await entriesStorage.getValue();
  // Only seed if empty
  if (existing.length === 0) {
    const now = Date.now();
    const DAY = 86400000;
    
    const sampleData: WordEntry[] = [
      // --- Polysemy Example: BOOK ---
      {
        id: 'seed-book-1',
        text: 'book',
        translation: '预订',
        category: WordCategory.LearningWord,
        addedAt: now,
        scenarioId: '4', // Travel
        contextSentence: 'I need to book a flight to London.',
        mixedSentence: '我需要 book (预订) 一张去伦敦的机票。',
        dictionaryExample: 'He booked a table at the restaurant.',
        phoneticUs: '/bʊk/',
        phoneticUk: '/bʊk/'
      },
      {
        id: 'seed-book-2',
        text: 'book',
        translation: '书籍',
        category: WordCategory.KnownWord,
        addedAt: now - DAY * 2,
        scenarioId: '1', // General
        contextSentence: 'She is reading a book about history.',
        mixedSentence: '她正在读一本关于历史的 book (书)。',
        dictionaryExample: 'The library contains thousands of books.',
        phoneticUs: '/bʊk/',
        phoneticUk: '/bʊk/'
      },

      // --- Polysemy Example: BANK ---
      {
        id: 'seed-bank-1',
        text: 'bank',
        translation: '银行',
        category: WordCategory.WantToLearnWord,
        addedAt: now - DAY,
        scenarioId: '1',
        contextSentence: 'I went to the bank to deposit money.',
        mixedSentence: '我去 bank (银行) 存钱。',
        dictionaryExample: 'The bank opens at 9 am.',
        phoneticUs: '/bæŋk/'
      },
      {
        id: 'seed-bank-2',
        text: 'bank',
        translation: '河岸',
        category: WordCategory.WantToLearnWord,
        addedAt: now - DAY * 5,
        scenarioId: '4', // Travel
        contextSentence: 'They sat on the river bank and watched the sunset.',
        mixedSentence: '他们坐在河边的 bank (岸) 上看日落。',
        dictionaryExample: 'Willows lined the bank of the stream.',
        phoneticUs: '/bæŋk/'
      },

      // --- Learning Words (10+) ---
      {
        id: 'seed-ephemeral',
        text: 'ephemeral',
        translation: '短暂的',
        category: WordCategory.LearningWord,
        addedAt: now,
        scenarioId: '1',
        contextSentence: 'Fashion is by nature ephemeral.',
        mixedSentence: '时尚本质上是 ephemeral (短暂) 的。',
        dictionaryExample: 'ephemeral pleasures',
        phoneticUs: '/əˈfem(ə)rəl/'
      },
      {
        id: 'seed-serendipity',
        text: 'serendipity',
        translation: '意外发现珍奇事物的本领',
        category: WordCategory.LearningWord,
        addedAt: now - 1000,
        scenarioId: '1',
        contextSentence: 'It was pure serendipity that we met.',
        dictionaryExample: 'A stroke of serendipity.',
        phoneticUs: '/ˌserənˈdɪpəti/'
      },
      {
        id: 'seed-ubiquitous',
        text: 'ubiquitous',
        translation: '无处不在的',
        category: WordCategory.LearningWord,
        addedAt: now - 2000,
        scenarioId: '3', // CS
        contextSentence: 'Smartphones have become ubiquitous.',
        dictionaryExample: 'The ubiquitous bicycle.',
        phoneticUs: '/juːˈbɪkwɪtəs/'
      },
      {
        id: 'seed-algorithm',
        text: 'algorithm',
        translation: '算法',
        category: WordCategory.LearningWord,
        addedAt: now - 3000,
        scenarioId: '3',
        contextSentence: 'This search algorithm is very efficient.',
        dictionaryExample: 'A genetic algorithm.',
        phoneticUs: '/ˈælɡəˌrɪðəm/'
      },
      {
        id: 'seed-paradigm',
        text: 'paradigm',
        translation: '范式',
        category: WordCategory.LearningWord,
        addedAt: now - 4000,
        scenarioId: '3',
        contextSentence: 'A new paradigm in software development.',
        dictionaryExample: 'paradigm shift',
        phoneticUs: '/ˈpærədaɪm/'
      },
      {
        id: 'seed-mitigate',
        text: 'mitigate',
        translation: '减轻',
        category: WordCategory.LearningWord,
        addedAt: now - 5000,
        scenarioId: '1',
        contextSentence: 'We need to mitigate the risks.',
        dictionaryExample: 'mitigate the effects of climate change',
        phoneticUs: '/ˈmɪtɪɡeɪt/'
      },
      {
        id: 'seed-nuance',
        text: 'nuance',
        translation: '细微差别',
        category: WordCategory.LearningWord,
        addedAt: now - 6000,
        scenarioId: '2', // IELTS
        contextSentence: 'He understood the nuances of the language.',
        dictionaryExample: 'subtle nuances of flavor',
        phoneticUs: '/ˈnuːɑːns/'
      },
      {
        id: 'seed-pragmatic',
        text: 'pragmatic',
        translation: '务实的',
        category: WordCategory.LearningWord,
        addedAt: now - 7000,
        scenarioId: '1',
        contextSentence: 'We need a pragmatic approach to the problem.',
        dictionaryExample: 'a pragmatic politician',
        phoneticUs: '/præɡˈmætɪk/'
      },
      {
        id: 'seed-resilient',
        text: 'resilient',
        translation: '有弹性的；适应力强的',
        category: WordCategory.LearningWord,
        addedAt: now - 8000,
        scenarioId: '1',
        contextSentence: 'The economy is resilient.',
        dictionaryExample: 'resilient material',
        phoneticUs: '/rɪˈzɪliənt/'
      },
      {
        id: 'seed-scrutinize',
        text: 'scrutinize',
        translation: '仔细检查',
        category: WordCategory.LearningWord,
        addedAt: now - 9000,
        scenarioId: '2',
        contextSentence: 'The contract was carefully scrutinized.',
        dictionaryExample: 'scrutinize the evidence',
        phoneticUs: '/ˈskruːtənaɪz/'
      },

      // --- Want To Learn (10+) ---
      {
        id: 'seed-aesthetic',
        text: 'aesthetic',
        translation: '审美的',
        category: WordCategory.WantToLearnWord,
        addedAt: now - DAY,
        scenarioId: '1',
        contextSentence: 'The building has little aesthetic value.',
        phoneticUs: '/esˈθetɪk/'
      },
      {
        id: 'seed-benevolent',
        text: 'benevolent',
        translation: '仁慈的',
        category: WordCategory.WantToLearnWord,
        addedAt: now - DAY,
        scenarioId: '2',
        contextSentence: 'A benevolent smile.',
        phoneticUs: '/bəˈnevələnt/'
      },
      {
        id: 'seed-candid',
        text: 'candid',
        translation: '坦率的',
        category: WordCategory.WantToLearnWord,
        addedAt: now - DAY,
        scenarioId: '1',
        contextSentence: 'To be candid with you, I don\'t like it.',
        phoneticUs: '/ˈkændɪd/'
      },
      {
        id: 'seed-diligent',
        text: 'diligent',
        translation: '勤勉的',
        category: WordCategory.WantToLearnWord,
        addedAt: now - DAY,
        scenarioId: '2',
        contextSentence: 'A diligent student.',
        phoneticUs: '/ˈdɪlɪdʒənt/'
      },
      {
        id: 'seed-empathy',
        text: 'empathy',
        translation: '共情',
        category: WordCategory.WantToLearnWord,
        addedAt: now - DAY,
        scenarioId: '1',
        contextSentence: 'He felt empathy for the poor.',
        phoneticUs: '/ˈempəθi/'
      },
      {
        id: 'seed-foster',
        text: 'foster',
        translation: '培养',
        category: WordCategory.WantToLearnWord,
        addedAt: now - DAY,
        scenarioId: '2',
        contextSentence: 'Foster a sense of community.',
        phoneticUs: '/ˈfɔːstər/'
      },
      {
        id: 'seed-genuine',
        text: 'genuine',
        translation: '真正的',
        category: WordCategory.WantToLearnWord,
        addedAt: now - DAY,
        scenarioId: '1',
        contextSentence: 'Genuine leather.',
        phoneticUs: '/ˈdʒenjuɪn/'
      },
      {
        id: 'seed-hypothesis',
        text: 'hypothesis',
        translation: '假设',
        category: WordCategory.WantToLearnWord,
        addedAt: now - DAY,
        scenarioId: '3',
        contextSentence: 'Test a hypothesis.',
        phoneticUs: '/haɪˈpɑːθəsɪs/'
      },
      {
        id: 'seed-inevitable',
        text: 'inevitable',
        translation: '不可避免的',
        category: WordCategory.WantToLearnWord,
        addedAt: now - DAY,
        scenarioId: '1',
        contextSentence: 'War was inevitable.',
        phoneticUs: '/ɪnˈevɪtəbl/'
      },
      {
        id: 'seed-juxtapose',
        text: 'juxtapose',
        translation: '并列',
        category: WordCategory.WantToLearnWord,
        addedAt: now - DAY,
        scenarioId: '2',
        contextSentence: 'Juxtapose two images.',
        phoneticUs: '/ˌdʒʌkstəˈpoʊz/'
      },

      // --- Known Words (10+) ---
      {
        id: 'seed-apple',
        text: 'apple',
        translation: '苹果',
        category: WordCategory.KnownWord,
        addedAt: now - DAY * 10,
        scenarioId: '1',
        contextSentence: 'I ate an apple.',
        phoneticUs: '/ˈæpl/'
      },
      {
        id: 'seed-beautiful',
        text: 'beautiful',
        translation: '美丽的',
        category: WordCategory.KnownWord,
        addedAt: now - DAY * 10,
        scenarioId: '1',
        contextSentence: 'A beautiful flower.',
        phoneticUs: '/ˈbjuːtɪfl/'
      },
      {
        id: 'seed-computer',
        text: 'computer',
        translation: '电脑',
        category: WordCategory.KnownWord,
        addedAt: now - DAY * 10,
        scenarioId: '3',
        contextSentence: 'My computer is fast.',
        phoneticUs: '/kəmˈpjuːtər/'
      },
      {
        id: 'seed-dog',
        text: 'dog',
        translation: '狗',
        category: WordCategory.KnownWord,
        addedAt: now - DAY * 10,
        scenarioId: '1',
        contextSentence: 'The dog barked.',
        phoneticUs: '/dɔːɡ/'
      },
      {
        id: 'seed-elephant',
        text: 'elephant',
        translation: '大象',
        category: WordCategory.KnownWord,
        addedAt: now - DAY * 10,
        scenarioId: '1',
        contextSentence: 'An elephant is big.',
        phoneticUs: '/ˈelɪfənt/'
      },
      {
        id: 'seed-friend',
        text: 'friend',
        translation: '朋友',
        category: WordCategory.KnownWord,
        addedAt: now - DAY * 10,
        scenarioId: '1',
        contextSentence: 'He is my best friend.',
        phoneticUs: '/frend/'
      },
      {
        id: 'seed-go',
        text: 'go',
        translation: '去',
        category: WordCategory.KnownWord,
        addedAt: now - DAY * 10,
        scenarioId: '1',
        contextSentence: 'Let\'s go home.',
        phoneticUs: '/ɡoʊ/'
      },
      {
        id: 'seed-happy',
        text: 'happy',
        translation: '快乐',
        category: WordCategory.KnownWord,
        addedAt: now - DAY * 10,
        scenarioId: '1',
        contextSentence: 'I am happy.',
        phoneticUs: '/ˈhæpi/'
      },
      {
        id: 'seed-internet',
        text: 'internet',
        translation: '互联网',
        category: WordCategory.KnownWord,
        addedAt: now - DAY * 10,
        scenarioId: '3',
        contextSentence: 'Surfing the internet.',
        phoneticUs: '/ˈɪntərnet/'
      },
      {
        id: 'seed-job',
        text: 'job',
        translation: '工作',
        category: WordCategory.KnownWord,
        addedAt: now - DAY * 10,
        scenarioId: '1',
        contextSentence: 'I have a good job.',
        phoneticUs: '/dʒɑːb/'
      }
    ];
    await entriesStorage.setValue(sampleData);
    console.log('ContextLingo: Seeding complete with', sampleData.length, 'entries.');
  }
};