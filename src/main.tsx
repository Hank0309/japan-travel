import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';
import './styles.css';
class Boundary extends React.Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="fatal">
        <h1>手帖暫時無法開啟</h1>
        <p>請重新整理。本機資料仍保存在瀏覽器；請勿清除網站資料。</p>
        <button onClick={() => location.reload()}>重新載入</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
const Router = import.meta.env.BASE_URL === '/' ? BrowserRouter : HashRouter;
createRoot(document.getElementById('root')!).render(
  <Boundary>
    <Router>
      <App />
    </Router>
  </Boundary>,
);
