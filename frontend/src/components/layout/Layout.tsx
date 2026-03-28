import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg-base)' }}>
      <Sidebar />
      <main
        className="flex-1 overflow-auto transition-colors duration-200"
        style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
