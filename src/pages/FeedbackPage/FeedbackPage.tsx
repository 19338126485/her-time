import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Lightbulb, Bug, Send, X } from 'lucide-react';
import { toast } from 'sonner';

type FeedbackType = 'suggestion' | 'feedback' | null;

export default function FeedbackPage() {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState<FeedbackType>(null);
  const [content, setContent] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleTypeSelect = (type: FeedbackType) => {
    setActiveType(type);
    setShowInput(true);
    setContent('');
  };

  const handleSubmit = () => {
    if (!content.trim()) {
      toast.error('请填写内容后再提交');
      return;
    }

    const prefix = activeType === 'suggestion' ? '我有建议！' : '我要反馈！';
    const subject = encodeURIComponent(prefix);
    const body = encodeURIComponent(`${prefix}\n\n${content}`);
    const mailtoLink = `mailto:3961793751@qq.com?subject=${subject}&body=${body}`;

    window.open(mailtoLink, '_self');
    toast.success('已打开邮件客户端');
  };

  const handleCloseInput = () => {
    setShowInput(false);
    setActiveType(null);
    setContent('');
  };

  return (
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
        <h1 className="text-base font-medium text-foreground">建议与反馈</h1>
      </div>

      {/* 内容区 */}
      <div className="space-y-5 px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-lg font-semibold text-foreground">
            告诉我们你的想法
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            你的每一条建议都很重要
          </p>
        </motion.div>

        {/* 两个按钮 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-4"
        >
          <button
            onClick={() => handleTypeSelect('suggestion')}
            className="group flex w-full items-center gap-4 rounded-2xl bg-white/70 p-5 text-left shadow-sm backdrop-blur-sm transition-all hover:shadow-md active:scale-[0.98]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-100 to-pink-100 transition-transform group-hover:scale-110">
              <Lightbulb className="h-6 w-6 text-yellow-500" />
            </div>
            <div className="flex-1">
              <p className="text-base font-medium text-foreground">
                我有建议！
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                产品功能、体验优化都可以告诉我
              </p>
            </div>
          </button>

          <button
            onClick={() => handleTypeSelect('feedback')}
            className="group flex w-full items-center gap-4 rounded-2xl bg-white/70 p-5 text-left shadow-sm backdrop-blur-sm transition-all hover:shadow-md active:scale-[0.98]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-100 to-pink-100 transition-transform group-hover:scale-110">
              <Bug className="h-6 w-6 text-cyan-500" />
            </div>
            <div className="flex-1">
              <p className="text-base font-medium text-foreground">
                我要反馈！
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                遇到 bug 或使用问题，帮我们改进
              </p>
            </div>
          </button>
        </motion.div>
      </div>

      {/* 输入框弹窗 */}
      <AnimatePresence>
        {showInput && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/30"
              onClick={handleCloseInput}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white pb-6 shadow-xl"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />

              <div className="flex items-center justify-between px-5 pb-3">
                <h3 className="text-sm font-medium text-foreground">
                  {activeType === 'suggestion' ? '我有建议！' : '我要反馈！'}
                </h3>
                <button
                  onClick={handleCloseInput}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-pink-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-5">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    activeType === 'suggestion'
                      ? '说说你的建议吧...'
                      : '描述一下你遇到的问题...'
                  }
                  className="h-32 w-full resize-none rounded-xl border border-pink-100 bg-pink-50/30 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
                  maxLength={500}
                />
                <div className="mt-1 text-right text-xs text-muted-foreground">
                  {content.length}/500
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!content.trim()}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-400 to-pink-300 py-3.5 text-base font-medium text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  提交
                </button>

                <p className="mt-3 text-center text-xs text-muted-foreground/60">
                  提交后将通过邮件发送至 3961793751@qq.com
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
