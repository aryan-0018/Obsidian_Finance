import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import authReducer from "../features/auth/authSlice";
import storage from "redux-persist/lib/storage";
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import { apiClient } from "./api-client";
import { encryptTransform } from "redux-persist-transform-encrypt";

const rootReducer = combineReducers({
  [apiClient.reducerPath]: apiClient.reducer,
  auth: authReducer,
});

type RootReducerType = ReturnType<typeof rootReducer>;

const persistSecretKey = import.meta.env.VITE_REDUX_PERSIST_SECRET_KEY?.trim();

const persistConfig = {
  key: "root",
  storage,
  blacklist: [apiClient.reducerPath],
  ...(persistSecretKey
    ? {
        transforms: [
          encryptTransform({
            secretKey: persistSecretKey,
            onError: (error) => {
              console.error("Redux persist encryption error:", error);
            },
          }),
        ],
      }
    : {}),
};

const persistedReducer = persistReducer<RootReducerType>(
  persistConfig,
  rootReducer
);

const reduxPersistActions = [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER];

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: reduxPersistActions,
      },
    }).concat(apiClient.middleware),
});

export const persistor = persistStore(store);

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
