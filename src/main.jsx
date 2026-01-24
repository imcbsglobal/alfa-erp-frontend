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
      <Toaster 
        position="top-center" 
        reverseOrder={false}
        toastOptions={{
          duration: 5000,
          style: {
            fontSize: "18px",
            padding: "20px 28px",
            maxWidth: "600px",
            minWidth: "400px",
          },
          success: {
            style: {
              background: "#10b981",
              color: "#fff",
            },
          },
          error: {
            style: {
              background: "#ef4444",
              color: "#fff",
            },
          },
        }}
      />
    </AuthProvider>
  </BrowserRouter>
);
