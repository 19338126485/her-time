import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Library, Search, X } from 'lucide-react';
import {
  KNOWLEDGE_ARTICLES,
  KNOWLEDGE_COLLECTIONS,
  type IKnowledgeArticle,
} from '@/data/knowledge';

const CATEGORIES = [
  {
    key: 'wiki',
    title: '她知·小百科',
    desc: '生理知识科普，懂自己更安心',
    icon: BookOpen,
    border: 'border-pink-100',
    textColor: 'text-pink-400',
    iconBg: 'bg-pink-50',
  },
  {
    key: 'library',
    title: '她识·库',
    desc: '实用方法与工具，收藏随时看',
    icon: Library,
    border: 'border-purple-200',
    textColor: 'text-purple-400',
    iconBg: 'bg-purple-50',
    isComingSoon: false,
  },
];

/** 从正文中提取包含关键词的片段作为摘要 */
function extractSnippet(content: string, keyword: string): string {
  if (!keyword) return '';
  // 去掉 markdown 符号，取纯文本
  const plain = content.replace(/[#>*_`\-\[\]]/g, '').replace(/\n+/g, ' ');
  const idx = plain.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) {
    // 标题匹配但正文没找到，取正文前 60 字
    return plain.slice(0, 60) + (plain.length > 60 ? '…' : '');
  }
  const start = Math.max(0, idx - 15);
  const end = Math.min(plain.length, idx + keyword.length + 30);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < plain.length ? '…' : '';
  return prefix + plain.slice(start, end) + suffix;
}

/** 根据 collectionId 找合集标题 */
function getCollectionTitle(article: IKnowledgeArticle): string {
  if (!article.collectionId) return '';
  const col = KNOWLEDGE_COLLECTIONS.find((c) => c.id === article.collectionId);
  return col?.title ?? '';
}

export default function KnowledgePage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');

  // 搜索结果：搜索 wiki 和 library 下所有文章（标题 + 正文）
  const searchResults = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return [];
    return KNOWLEDGE_ARTICLES.filter(
      (a) =>
        (a.category === 'wiki' || a.category === 'library') &&
        (a.title.toLowerCase().includes(kw) ||
          a.content.toLowerCase().includes(kw))
    );
  }, [keyword]);

  const isSearching = keyword.trim().length > 0;

  const handleArticleClick = (article: IKnowledgeArticle) => {
    // 跳转到对应分类的详情页
    navigate(`/knowledge/${article.category}`, {
      state: { articleId: article.id, collectionId: article.collectionId },
    });
  };

  return (
    <div className="space-y-5 px-4 pt-6 pb-24">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="px-2"
      >
        <h1 className="text-2xl font-bold text-foreground">知识库</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          关于身体的小知识，慢慢了解自己
        </p>
      </motion.div>

      {/* 搜索框 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="relative"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索小百科..."
          className="w-full rounded-xl border border-pink-100 bg-pink-50/50 py-2.5 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-pink-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-200"
        />
        {keyword && (
          <button
            onClick={() => setKeyword('')}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-pink-100"
            aria-label="清除"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </motion.div>

      <AnimatePresence mode="wait">
        {/* 搜索结果 */}
        {isSearching ? (
          <motion.div
            key="search-results"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-2"
          >
            {searchResults.length > 0 ? (
              searchResults.map((article, i) => (
                <motion.button
                  key={article.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 + i * 0.04 }}
                  onClick={() => handleArticleClick(article)}
                  className="flex w-full flex-col gap-1.5 rounded-2xl border border-pink-50 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-pink-50 px-2 py-0.5 text-[10px] font-medium text-pink-400">
                      {getCollectionTitle(article)}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {article.title}
                  </h3>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {extractSnippet(article.content, keyword.trim()) ||
                      article.summary}
                  </p>
                </motion.button>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-50">
                  <Search className="h-7 w-7 text-pink-300" />
                </div>
                <p className="text-sm text-muted-foreground">
                  这里还是一片知识荒地哦~
                </p>
              </motion.div>
            )}
          </motion.div>
        ) : (
          // 合集卡片
          <motion.div
            key="categories"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {CATEGORIES.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/knowledge/${item.key}`)}
                  className={`relative flex h-28 w-full items-center gap-4 overflow-hidden rounded-2xl border ${item.border} bg-white p-5 text-left shadow-sm transition-all hover:shadow-md`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${item.iconBg}`}
                    >
                      <Icon className={`h-7 w-7 ${item.textColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className={`text-lg font-semibold ${item.textColor}`}>
                          {item.title}
                        </h2>
                      {item.isComingSoon && (
                          <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-400">
                            即将上线
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                  {/* 装饰光斑 */}
                  <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-pink-100/40 to-cyan-100/40 blur-2xl" />
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
