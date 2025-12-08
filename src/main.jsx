import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AppRouter from "./app/router";
import { AuthProvider } from "./features/auth/AuthContext";
import "./index.css";
import { Toaster } from "react-hot-toast";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <AppRouter />
      <Toaster position="top-right" reverseOrder={false} />
    </AuthProvider>
  </BrowserRouter>
);
