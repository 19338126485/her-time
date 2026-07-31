import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import App from "./app";
import { Toaster } from "@/components/ui/sonner";
import "./index.css";

// 申请持久化存储：防止浏览器在磁盘空间紧张时自动清除 localStorage 中的经期数据
if (navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {});
}

/**
 * 本地化的错误兜底页（替代平台 toolkit 的 ErrorRender/AppContainer——
 * 它们会向平台上报数据并注入"由妙搭搭建"水印，与本地运行目标冲突）
 */
function ErrorFallback({ error }: { error: unknown }) {
  const message =
    error instanceof Error ? error.message : String(error ?? "未知错误");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-cyan-50 via-pink-50 to-white px-6 text-center">
      <p className="text-lg font-medium text-foreground">页面出了点问题</p>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-full bg-pink-400 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-pink-500"
      >
        刷新重试
      </button>
      <p className="text-xs text-muted-foreground/60">
        你的数据保存在本地浏览器中，刷新不会丢失
      </p>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={process.env.CLIENT_BASE_PATH || "/"}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <App />
        <Toaster />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
