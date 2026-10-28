import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  Users,
  DollarSign,
  Camera,
  LogOut,
  Briefcase,
  X,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  christmasMode: boolean;
  onToggleChristmas: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  christmasMode,
  onToggleChristmas,
}) => {
  const { user, signOut } = useAuth();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/agendamentos', icon: CalendarCheck, label: 'Agendamentos' },
    { to: '/calendario', icon: CalendarDays, label: 'Calendário Inteligente' },
    { to: '/clientes', icon: Users, label: 'Clientes' },
    { to: '/servicos', icon: Briefcase, label: 'Serviços' },
    { to: '/financeiro', icon: DollarSign, label: 'Financeiro' },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-dark-900 border-r border-dark-700 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Cabeçalho da Sidebar */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-dark-700 relative">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-blue to-brand-red flex items-center justify-center shadow-md shadow-brand-blue/20 relative">
              <Camera className="w-5 h-5 text-white" />
              {christmasMode && (
                <span
                  className="absolute -top-2 -right-2 text-sm select-none"
                  title="Temporada de Natal Ativa"
                >
                  🎅
                </span>
              )}
            </div>
            <div>
              <span className="font-bold text-white tracking-tight text-base block leading-none">
                PhotoStudio
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-blue">
                {christmasMode ? '🎄 EDIÇÃO NATAL' : 'PRO SYSTEM'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-dark-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/25'
                      : 'text-slate-400 hover:text-white hover:bg-dark-800'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Controles de Aparência: Modo Claro/Escuro e Clima de Natal */}
        <div className="px-4 py-3 border-t border-dark-700 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-1">
            Personalização Visual
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold bg-dark-950 hover:bg-dark-800 text-slate-300 border border-dark-700 transition-all"
              title="Alternar entre Modo Escuro e Modo Claro"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-brand-blue" />
                  <span>Modo Escuro</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleChristmas}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                christmasMode
                  ? 'bg-brand-red text-white border-brand-red shadow-md shadow-brand-red/20'
                  : 'bg-dark-950 text-slate-400 border-dark-700 hover:bg-dark-800'
              }`}
              title="Ativar ou Desativar o toque natalino no sistema"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{christmasMode ? 'Natal: ON' : 'Natal: OFF'}</span>
            </button>
          </div>
        </div>

        {/* Rodapé com Usuário Logado e Botão Sair */}
        <div className="p-4 border-t border-dark-700 bg-dark-950/50">
          <div className="mb-3 px-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Fotógrafo Conectado
            </p>
            <p className="text-xs font-medium text-slate-300 truncate mt-0.5">
              {user?.email}
            </p>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-400 bg-brand-red/10 hover:bg-brand-red hover:text-white border border-brand-red/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </aside>
    </>
  );
};