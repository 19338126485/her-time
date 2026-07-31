import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Shuffle, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { scopedStorage } from '@lark-apaas/client-toolkit-lite';

const STORAGE_KEY_NICKNAME = 'user-nickname';
const DEFAULT_NICKNAME = '小仙女';

// 前缀（状态/动作/地点/心情）
const PREFIXES = [
  '摆烂', '躺平', '发呆', '摸鱼', '犯困', '熬夜', '赖床', '不想上班',
  '不想起床', '不会游泳', '爱喝奶茶', '吃西瓜', '吹风', '淋雨', '散步', '街角',
  '路边', '冰箱里', '沙发上', '窗台上', '屋顶', '海边', '公园', '便利店',
  '深夜', '凌晨', '傍晚', '冬天', '夏天', '没人的', '安静的', '迷路的',
  '迟到的', '忘带钥匙的', '喝可乐的', '吃泡面的', '追剧的', '打游戏的', '睡懒觉的',
  '骑单车的', '听收音机的', '逛书店的', '等公交的', '晒太阳的', '躲雨的', '吃面包的',
  '喝咖啡的', '抱枕头的', '裹被子的', '在阳台的', '蹲猫窝的', '看云的', '数星星的',
  '温柔', '可爱', '软乎乎', '懒洋洋', '慢吞吞', '轻飘飘', '亮晶晶', '暖融融',
];

// 后缀（名词：日常事物/动物/自然/场景）
const SUFFIXES = [
  '月亮', '猫', '鱼', '西瓜', '房间', '沙发', '路灯', '晚风',
  '可乐', '泡面', '奶茶', '耳机', '雨伞', '书店', '便利店', '公交站',
  '公园长椅', '云', '雨', '雪', '星星', '树叶', '自行车', '收音机',
  '旧唱片', '咖啡', '面包', '枕头', '被子', '阳台', '猫窝', '狗',
  '企鹅', '熊猫', '草莓', '桃子', '云朵', '苹果', '海浪', '樱花',
  '露珠', '泡泡', '棉花糖', '小兔子', '小熊', '蝴蝶', '萤火虫', '蒲公英',
  '彩虹', '泡芙', '马卡龙', '布丁', '蛋糕', '月牙', '星尘', '雨滴',
  '小太阳', '小月亮', '小星星', '小云朵', '小草莓', '小桃子', '奶糖', '软糖',
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateNickname(): string {
  const prefix = getRandomItem(PREFIXES);
  const suffix = getRandomItem(SUFFIXES);
  return `${prefix}的${suffix}`;
}

function getStoredNickname(): string {
  try {
    return scopedStorage.getItem(STORAGE_KEY_NICKNAME) || DEFAULT_NICKNAME;
  } catch {
    return DEFAULT_NICKNAME;
  }
}

export default function NicknamePage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(() => getStoredNickname());
  const [inputValue, setInputValue] = useState(() => getStoredNickname());

  const handleRandom = useCallback(() => {
    const newName = generateNickname();
    setNickname(newName);
    setInputValue(newName);
  }, []);

  const handleSave = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      toast.error('昵称不能为空哦~');
      return;
    }
    if (trimmed.length > 20) {
      toast.error('昵称不能超过20个字');
      return;
    }
    try {
      scopedStorage.setItem(STORAGE_KEY_NICKNAME, trimmed);
    } catch {
      // 忽略
    }
    setNickname(trimmed);
    toast.success('昵称已保存');
  }, [inputValue]);

  const suggestions = useMemo(() => {
    return Array.from({ length: 6 }, () => generateNickname());
  }, [nickname]);

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
        <h1 className="text-base font-medium text-foreground">修改昵称</h1>
      </div>

      {/* 内容区 */}
      <div className="space-y-6 px-4 py-8">
        {/* 当前昵称展示 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center"
        >
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-pink-300" />
            <span className="text-sm text-muted-foreground">你的昵称</span>
            <Sparkles className="h-5 w-5 text-cyan-300" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">{nickname}</h2>
        </motion.div>

        {/* 输入框 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="space-y-3"
        >
          <label className="text-sm font-medium text-foreground">自定义昵称</label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="输入你的昵称"
                maxLength={20}
                className="w-full rounded-xl border border-pink-100 bg-white/80 px-4 py-3 pr-14 text-sm text-foreground placeholder:text-muted-foreground focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/60">
                {inputValue.length}/20
              </span>
            </div>
            <button
              onClick={handleSave}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-300 to-pink-400 text-white shadow-sm transition-all hover:shadow-md active:scale-95"
              aria-label="保存"
            >
              <Check className="h-5 w-5" />
            </button>
          </div>
        </motion.div>

        {/* 随机生成 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">
              随机生成
            </label>
            <button
              onClick={handleRandom}
              className="flex items-center gap-1.5 rounded-full bg-pink-50 px-3 py-1.5 text-xs font-medium text-pink-400 transition-colors hover:bg-pink-100 active:scale-95"
            >
              <Shuffle className="h-3.5 w-3.5" />
              换一批
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {suggestions.map((name, i) => (
              <motion.button
                key={`${name}-${i}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.15 + i * 0.05 }}
                onClick={() => {
                  setNickname(name);
                  setInputValue(name);
                  try {
                    scopedStorage.setItem(STORAGE_KEY_NICKNAME, name);
                  } catch {
                    // 忽略
                  }
                  toast.success('昵称已更换');
                }}
                className="rounded-xl border border-pink-50 bg-white/70 px-4 py-3 text-left text-sm text-foreground shadow-sm transition-all hover:border-pink-200 hover:shadow-md active:scale-[0.97]"
              >
                <span className="block truncate">{name}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        <p className="pt-2 text-center text-xs text-muted-foreground/60">
          昵称保存在本地，不会上传到服务器
        </p>
      </div>
    </div>
  );
}
