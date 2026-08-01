package app.hertime.period;

import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Android 15+ 强制边到边显示，WebView 会被系统导航栏（三键/手势条）覆盖，
    // 而 WebView 内 CSS env(safe-area-inset-bottom) 在安卓上恒为 0，
    // @capacitor-community/safe-area 插件注入的变量实测也不生效。
    // 最可靠的办法：在原生层给内容区底部加系统导航栏高度的 padding，
    // 把 Web 视口整体抬上去（padding 区域显示窗口背景，与白色导航栏融为一体）。
    View content = findViewById(android.R.id.content);
    ViewCompat.setOnApplyWindowInsetsListener(content, (v, windowInsets) -> {
      Insets navBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars());
      v.setPadding(0, 0, 0, navBars.bottom);
      return windowInsets;
    });
  }
}
