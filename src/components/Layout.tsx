import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Menu, Camera, Sun, Moon } from 'lucide-react';

const CHRISTMAS_PARTICLES = [
  { id: 1, left: '6%', duration: '14s', delay: '0s', char: '❄️', size: '13px' },
  { id: 2, left: '16%', duration: '18s', delay: '3s', char: '✨', size: '11px' },
  { id: 3, left: '28%', duration: '15s', delay: '1.5s', char: '❄️', size: '14px' },
  { id: 4, left: '42%', duration: '20s', delay: '4s', char: '⭐', size: '11px' },
  { id: 5, left: '55%', duration: '16s', delay: '2s', char: '❄️', size: '12px' },
  { id: 6, left: '68%', duration: '19s', delay: '5s', char: '✨', size: '12px' },
  { id: 7, left: '80%', duration: '15s', delay: '0.5s', char: '❄️', size: '15px' },
  { id: 8, left: '92%', duration: '17s', delay: '3.5s', char: '⭐', size: '11px' },
];

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Estado do Tema (Escuro ou Claro) salvo no navegador
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('photostudio_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  // Estado do Modo Natalino salvo no navegador (Ativado por padrão)
  const [christmasMode, setChristmasMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('photostudio_christmas');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('photostudio_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('photostudio_christmas', String(christmasMode));
  }, [christmasMode]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleChristmas = () => {
    setChristmasMode((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex relative overflow-x-hidden">
      {/* Toque Sutil de Natal: Flocos de Neve e Estrelas caindo suavemente + Enfeite no topo */}
      {christmasMode && (
        <>
          <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-red via-amber-400 to-emerald-500 z-50 opacity-85 pointer-events-none" />
          {CHRISTMAS_PARTICLES.map((p) => (
            <span
              key={p.id}
              className="christmas-particle select-none"
              style={{
                left: p.left,
                animationDuration: p.duration,
                animationDelay: p.delay,
                fontSize: p.size,
              }}
            >
              {p.char}
            </span>
          ))}
        </>
      )}

      {/* Menu Lateral */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
        christmasMode={christmasMode}
        onToggleChristmas={toggleChristmas}
      />

      {/* Área de Conteúdo Principal */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0 relative z-10">
        {/* Barra Superior Mobile */}
        <header className="h-16 bg-dark-900/80 backdrop-blur-md border-b border-dark-700 px-4 flex items-center justify-between lg:hidden sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue to-brand-red flex items-center justify-center">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm">
              PhotoStudio <span className="text-brand-blue">PRO</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-300 hover:text-white bg-dark-800 rounded-lg border border-dark-700"
              title="Alternar Tema"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-brand-blue" />
              )}
            </button>
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-slate-300 hover:text-white bg-dark-800 rounded-lg border border-dark-700"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Conteúdo Dinâmico de cada Página */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}; 