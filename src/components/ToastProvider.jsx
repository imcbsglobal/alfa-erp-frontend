import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 5000,
        style: {
          borderRadius: "12px",
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
          iconTheme: {
            primary: "#fff",
            secondary: "#10b981",
          },
        },
        error: {
          style: {
            background: "#ef4444",
            color: "#fff",
          },
          iconTheme: {
            primary: "#fff",
            secondary: "#ef4444",
          },
        },
      }}
    />
  );
}
