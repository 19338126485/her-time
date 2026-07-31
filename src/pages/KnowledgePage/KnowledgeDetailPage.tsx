import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  MessageCircleHeart,
  Library,
  ChevronRight,
  Search,
  X,
  Sparkles,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  KNOWLEDGE_ARTICLES,
  KNOWLEDGE_COLLECTIONS,
  type IKnowledgeArticle,
  type IKnowledgeCollection,
} from '@/data/knowledge';

const CATEGORY_INFO: Record<
  string,
  { title: string; icon: React.ElementType; color: string; iconBg: string }
> = {
  wiki: {
    title: '她知·小百科',
    icon: BookOpen,
    color: 'text-pink-500',
    iconBg: 'bg-pink-50',
  },
  stories: {
    title: '她言·故事集',
    icon: MessageCircleHeart,
    color: 'text-cyan-500',
    iconBg: 'bg-cyan-50',
  },
  library: {
    title: '她识·库',
    icon: Library,
    color: 'text-pink-500',
    iconBg: 'bg-gradient-to-br from-pink-50 to-cyan-50',
  },
};

type WikiView = 'collections' | 'chapters' | 'article';

export default function KnowledgeDetailPage() {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const location = useLocation();
  const [keyword, setKeyword] = useState('');

  // wiki 三级导航状态
  const [wikiView, setWikiView] = useState<WikiView>('collections');
  const [selectedCollection, setSelectedCollection] =
    useState<IKnowledgeCollection | null>(null);
  const [selectedArticle, setSelectedArticle] =
    useState<IKnowledgeArticle | null>(null);

  // 从首页搜索结果点击进入时，通过 state 携带文章 id，自动定位并打开
  useEffect(() => {
    if (category !== 'wiki') return;
    const state = location.state as
      | { articleId?: string; collectionId?: string }
      | null;
    if (!state?.articleId) return;
    const article = KNOWLEDGE_ARTICLES.find((a) => a.id === state.articleId);
    if (!article) return;
    const col = KNOWLEDGE_COLLECTIONS.find(
      (c) => c.id === (state.collectionId ?? article.collectionId)
    );
    if (col) setSelectedCollection(col);
    setSelectedArticle(article);
    setWikiView('article');
    // 清除 state，避免返回后再进来又自动打开
    window.history.replaceState({}, document.title);
  }, [category, location.state]);

  const categoryInfo = category
    ? CATEGORY_INFO[category] ?? CATEGORY_INFO.wiki
    : CATEGORY_INFO.wiki;

  const Icon = categoryInfo.icon;

  // 非 wiki 分类的文章列表
  const articles = useMemo(() => {
    if (!category || category === 'wiki') return [];
    const filtered = KNOWLEDGE_ARTICLES.filter((a) => a.category === category);
    if (!keyword.trim()) return filtered;
    const kw = keyword.toLowerCase();
    return filtered.filter(
      (a) =>
        a.title.toLowerCase().includes(kw) ||
        a.summary.toLowerCase().includes(kw)
    );
  }, [category, keyword]);

  // wiki 合集列表（带搜索过滤）
  const collections = useMemo(() => {
    if (!keyword.trim()) return KNOWLEDGE_COLLECTIONS;
    const kw = keyword.toLowerCase();
    return KNOWLEDGE_COLLECTIONS.filter(
      (c) =>
        c.title.toLowerCase().includes(kw) ||
        c.summary.toLowerCase().includes(kw)
    );
  }, [keyword]);

  // 当前合集下的章节列表
  const chapterArticles = useMemo(() => {
    if (!selectedCollection) return [];
    return selectedCollection.articleIds
      .map((id) => KNOWLEDGE_ARTICLES.find((a) => a.id === id))
      .filter((a): a is IKnowledgeArticle => !!a)
      .sort((a, b) => (a.chapterIndex ?? 0) - (b.chapterIndex ?? 0));
  }, [selectedCollection]);

  // 拆分正文和参考文献部分
  const [mainContent, referencesContent] = useMemo(() => {
    if (!selectedArticle) return ['', ''];
    const parts = selectedArticle.content.split(/^---\s*$/m);
    if (parts.length >= 2) {
      return [parts[0].trim(), parts.slice(1).join('\n---\n').trim()];
    }
    return [selectedArticle.content, ''];
  }, [selectedArticle]);

  // ===== wiki 合集列表视图 =====
  const renderWikiCollections = () => (
    <div className="min-h-screen">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-pink-50 bg-white/80 px-4 backdrop-blur-md">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-pink-50"
          aria-label="返回"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-medium text-foreground">
          {categoryInfo.title}
        </h1>
      </div>

      {/* 内容区 */}
      <div className="space-y-4 px-4 py-5">
        {/* 分类图标 + 简介 */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-pink-50/80 to-cyan-50/80 p-4"
        >
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${categoryInfo.iconBg}`}
          >
            <Icon className={`h-6 w-6 ${categoryInfo.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {categoryInfo.title}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              共 {collections.length} 个合集
            </p>
          </div>
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
            placeholder="搜索合集..."
            className="w-full rounded-xl border border-pink-100 bg-white/80 py-2.5 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
          {keyword && (
            <button
              onClick={() => setKeyword('')}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-pink-50"
              aria-label="清除"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </motion.div>

        {/* 合集卡片列表 */}
        <AnimatePresence mode="wait">
          {collections.length > 0 ? (
            <motion.div
              key="collections"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              {collections.map((col, i) => (
                <motion.button
                  key={col.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.1 + i * 0.05 }}
                  onClick={() => {
                    setSelectedCollection(col);
                    setWikiView('chapters');
                  }}
                  className="flex h-28 w-full items-center gap-4 overflow-hidden rounded-2xl border border-pink-50 bg-white/80 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
                >
                  <div
                    className={`flex h-20 w-20 shrink-0 items-center justify-center ${col.coverBg}`}
                  >
                    <BookOpen className={`h-8 w-8 ${col.coverAccent}`} />
                  </div>
                  <div className="min-w-0 flex-1 py-3 pr-4">
                    <h3 className="truncate text-sm font-semibold text-foreground">
                      {col.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {col.summary}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${col.coverBg} ${col.coverAccent}`}
                      >
                        {col.isPlaceholder
                          ? '即将上线'
                          : `共 ${col.articleIds.length} 章`}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="mr-3 h-4 w-4 shrink-0 text-muted-foreground/40" />
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-pink-50">
                <Search className="h-9 w-9 text-pink-300" />
              </div>
              <p className="text-sm text-muted-foreground">没有找到相关合集</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                换个关键词试试吧~
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        {/* 底部免责声明 */}
        <div className="px-4 pb-8 pt-2 text-center text-[11px] text-muted-foreground/60">
          内容仅供参考，如有不适请前往医院咨询专业人士。
        </div>
      </div>
    </div>
  );

  // ===== wiki 章节列表视图 =====
  const renderWikiChapters = () => {
    if (!selectedCollection) return null;
    const isPlaceholder = selectedCollection.isPlaceholder;

    return (
      <div className="min-h-screen">
        {/* 顶部导航 */}
        <div className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-pink-50 bg-white/80 px-4 backdrop-blur-md">
          <button
            onClick={() => {
              setWikiView('collections');
              setSelectedCollection(null);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-pink-50"
            aria-label="返回"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 truncate text-base font-medium text-foreground">
            {selectedCollection.title}
          </h1>
        </div>

        {/* 内容区 */}
        <div className="space-y-4 px-4 py-5">
          {/* 合集封面 */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`rounded-2xl p-6 ${selectedCollection.coverBg}`}
          >
            <div
              className={`mb-3 inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-medium ${selectedCollection.coverAccent}`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              {isPlaceholder
                ? '即将上线'
                : `共 ${selectedCollection.articleIds.length} 章`}
            </div>
            <h2 className="text-lg font-bold text-foreground">
              {selectedCollection.title}
            </h2>
            <p className="mt-2 text-sm text-foreground/70">
              {selectedCollection.summary}
            </p>
          </motion.div>

          {/* 占位提示 */}
          {isPlaceholder && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-purple-100 bg-white/50 py-16 text-center"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-50">
                <Sparkles className="h-7 w-7 text-purple-300" />
              </div>
              <p className="text-sm font-medium text-foreground/70">
                {selectedCollection.placeholderText ?? '内容正在更新中'}
              </p>
            </motion.div>
          )}

          {/* 章节列表 */}
          {!isPlaceholder && (
            <AnimatePresence mode="wait">
              <motion.div
                key="chapters"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-2"
              >
                {chapterArticles.map((article, i) => (
                  <motion.button
                    key={article.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.1 + i * 0.05 }}
                    onClick={() => {
                      setSelectedArticle(article);
                      setWikiView('article');
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-pink-50 bg-white/80 p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selectedCollection.coverBg} ${selectedCollection.coverAccent} text-sm font-bold`}
                    >
                      {article.chapterIndex ?? i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-medium text-foreground">
                        {article.chapterTitle || article.title}
                      </h3>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {article.summary}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  </motion.button>
                ))}
              </motion.div>
            </AnimatePresence>
          )}
          {/* 底部免责声明 */}
          <div className="pt-2 pb-8 text-center text-[11px] text-muted-foreground/60">
            内容仅供参考，如有不适请前往医院咨询专业人士。
          </div>
        </div>
      </div>
    );
  };

  // ===== 文章详情视图（wiki 和非 wiki 共用） =====
  const renderArticle = () => {
    if (!selectedArticle) return null;

    return (
      <div className="min-h-screen">
        {/* 顶部导航 */}
        <div className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-pink-50 bg-white/80 px-4 backdrop-blur-md">
          <button
            onClick={() => {
              if (category === 'wiki') {
                setWikiView('chapters');
                setSelectedArticle(null);
              } else {
                setSelectedArticle(null);
              }
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-pink-50"
            aria-label="返回"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 truncate text-base font-medium text-foreground">
            {selectedArticle.chapterTitle || selectedArticle.title}
          </h1>
        </div>

        {/* 文章内容 */}
        <motion.article
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="px-5 py-6"
        >
          {selectedArticle.tag && (
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${categoryInfo.iconBg} ${categoryInfo.color}`}
            >
              {selectedArticle.tag}
            </span>
          )}
          <h1 className="mt-3 text-xl font-bold text-foreground">
            {selectedArticle.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {selectedArticle.summary}
          </p>
          <div className="mt-6" />
          <div className="prose prose-sm max-w-none text-foreground leading-relaxed prose-headings:text-foreground prose-headings:font-semibold prose-p:text-foreground/90 prose-p:leading-relaxed prose-strong:text-pink-500 prose-strong:font-semibold prose-blockquote:border-pink-300 prose-blockquote:bg-pink-50/50 prose-blockquote:rounded-xl prose-blockquote:py-2 prose-blockquote:pr-4 prose-blockquote:text-foreground/80 prose-blockquote:not-italic prose-hr:border-pink-200 prose-hr:my-6">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {mainContent}
            </ReactMarkdown>
          </div>

          {referencesContent && (
            <div className="mt-8 border-t border-pink-100 pt-5">
              <div className="text-xs leading-relaxed text-muted-foreground/70 prose prose-sm max-w-none prose-p:text-xs prose-p:text-muted-foreground/70 prose-strong:text-muted-foreground/80">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {referencesContent}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* 底部免责声明 */}
          <div className="mt-10 text-center text-[11px] text-muted-foreground/60">
            内容仅供参考，如有不适请前往医院咨询专业人士。
          </div>
        </motion.article>
      </div>
    );
  };

  // ===== 非 wiki 分类的文章列表视图 =====
  const renderArticleList = () => (
    <div className="min-h-screen">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-pink-50 bg-white/80 px-4 backdrop-blur-md">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-pink-50"
          aria-label="返回"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-medium text-foreground">
          {categoryInfo.title}
        </h1>
      </div>

      {/* 内容区 */}
      <div className="space-y-4 px-4 py-5">
        {/* 分类图标 + 简介 */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-pink-50/80 to-cyan-50/80 p-4"
        >
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${categoryInfo.iconBg}`}
          >
            <Icon className={`h-6 w-6 ${categoryInfo.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {categoryInfo.title}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              共 {articles.length} 篇内容
            </p>
          </div>
        </motion.div>

        {/* 搜索框（故事集分类无内容时不显示） */}
        {category !== 'stories' && (
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
              placeholder="搜索文章..."
              className="w-full rounded-xl border border-pink-100 bg-white/80 py-2.5 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
            />
            {keyword && (
              <button
                onClick={() => setKeyword('')}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-pink-50"
                aria-label="清除"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        )}

        {/* 文章列表 */}
        <AnimatePresence mode="wait">
          {articles.length > 0 ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-2"
            >
              {articles.map((article, i) => (
                <motion.button
                  key={article.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.1 + i * 0.05 }}
                  onClick={() => setSelectedArticle(article)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-pink-50 bg-white/80 p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${categoryInfo.iconBg}`}
                  >
                    <Icon className={`h-5 w-5 ${categoryInfo.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-medium text-foreground">
                        {article.title}
                      </h3>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {article.summary}
                    </p>
                    {article.tag && (
                      <span className="mt-1.5 inline-block rounded-full bg-pink-50 px-2 py-0.5 text-[10px] text-pink-400">
                        {article.tag}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-cyan-50">
                <MessageCircleHeart className="h-9 w-9 text-cyan-300" />
              </div>
              <p className="text-sm text-muted-foreground">
                {category === 'stories'
                  ? '这里还是知识荒地哦~去别处看看吧。'
                  : '没有找到相关内容'}
              </p>
              {category !== 'stories' && (
                <p className="mt-1 text-xs text-muted-foreground/60">
                  换个关键词试试吧~
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  // ===== 路由分发 =====
  if (category === 'wiki') {
    if (wikiView === 'article' && selectedArticle) return renderArticle();
    if (wikiView === 'chapters' && selectedCollection)
      return renderWikiChapters();
    return renderWikiCollections();
  }

  // 非 wiki 分类
  if (selectedArticle) return renderArticle();
  return renderArticleList();
}
