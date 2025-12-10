import AppRouter from "./app/router";
import ToastProvider from "./components/ToastProvider";

export default function App() {
  return (
    <>
      <ToastProvider />
      <AppRouter />
    </>
  );
}
