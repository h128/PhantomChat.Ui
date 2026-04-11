import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import { store } from "./app/store";
import { TolgeeFallback } from "./components/TolgeeFallback";
import { ThemeController } from "./features/theme/ThemeController";
import { applyThemeToDocument } from "./features/theme/themeDom";
import { selectResolvedTheme } from "./features/theme/themeSlice";
import "./index.css";
import "./utils/datetime";
import { Tolgee, DevTools, TolgeeProvider, FormatSimple } from "@tolgee/react";
import { registerChatNotificationServiceWorker } from "./services/browserNotifications";

const tolgee = Tolgee()
  .use(DevTools())
  .use(FormatSimple())
  .init({
    language: "en", //fa-IR
    fallbackLanguage: "en", //fa-IR
    apiUrl: import.meta.env.VITE_APP_TOLGEE_API_URL,
    apiKey: import.meta.env.VITE_APP_TOLGEE_API_KEY,
  });

applyThemeToDocument(selectResolvedTheme(store.getState()));

void registerChatNotificationServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeController />
      <TolgeeProvider tolgee={tolgee} fallback={<TolgeeFallback />}>
        <App />
      </TolgeeProvider>
    </Provider>
  </StrictMode>,
);
