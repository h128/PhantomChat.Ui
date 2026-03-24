import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import { store } from "./app/store";
import "./index.css";
import { Tolgee, DevTools, TolgeeProvider, FormatSimple } from "@tolgee/react";

const tolgee = Tolgee()
  .use(DevTools())
  .use(FormatSimple())
  .init({
    language: "en", //fa-IR
    fallbackLanguage: "en", //fa-IR
    apiUrl: import.meta.env.VITE_APP_TOLGEE_API_URL,
    apiKey: import.meta.env.VITE_APP_TOLGEE_API_KEY,
  });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <TolgeeProvider
        tolgee={tolgee}
        fallback={
          <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
            Loading...
          </div>
        }
      >
        <App />
      </TolgeeProvider>
    </Provider>
  </StrictMode>,
);
