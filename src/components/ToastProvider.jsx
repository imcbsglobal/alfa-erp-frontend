import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          borderRadius: "10px",
          background: "#000",
          color: "#fff",
        },
        success: {
          iconTheme: {
            primary: "#10b981",   // teal-green
            secondary: "#000",
          },
        },
        error: {
          iconTheme: {
            primary: "#ef4444",   // red
            secondary: "#000",
          },
        },
      }}
    />
  );
}
