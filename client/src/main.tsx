import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { NuqsAdapter } from "nuqs/adapters/react";
import "./index.css";
import App from "./App.tsx";
import { Toaster } from "@/components/ui/sonner";
import { Provider } from "react-redux";
import { store, persistor } from "./app/store.ts";
import { PersistGate } from "redux-persist/integration/react";
import { GoogleOAuthProvider } from "@react-oauth/google";

const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Service worker registration failed silently; app continues normally
    });
  });
}

const appTree = (
  <NuqsAdapter>
    <App />
  </NuqsAdapter>
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {googleClientId ? (
          <GoogleOAuthProvider clientId={googleClientId}>
            {appTree}
          </GoogleOAuthProvider>
        ) : (
          appTree
        )}
        <Toaster
          position="top-center"
          expand={true}
          duration={5000}
          richColors
          closeButton
        />
      </PersistGate>
    </Provider>
  </StrictMode>
);
