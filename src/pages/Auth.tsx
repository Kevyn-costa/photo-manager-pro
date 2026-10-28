import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Camera, Mail, Lock, ArrowRight, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // Se o usuário foi criado, podemos cadastrar serviços padrão iniciais para facilitar o uso
        if (data.user) {
          await supabase.from('services').insert([
            {
              user_id: data.user.id,
              name: 'Ensaio Fotográfico Externo',
              description: 'Sessão externa com entrega de 30 fotos editadas em alta resolução.',
              default_price: 450,
              default_duration: 90,
            },
            {
              user_id: data.user.id,
              name: 'Cobertura de Casamento',
              description: 'Cobertura completa da cerimônia e recepção.',
              default_price: 3500,
              default_duration: 360,
            },
            {
              user_id: data.user.id,
              name: 'Ensaio em Estúdio / Corporativo',
              description: 'Retratos profissionais em estúdio com iluminação controlada.',
              default_price: 350,
              default_duration: 60,
            },
          ]);
        }

        if (!data.session) {
          setSuccessMsg('Conta criada! Verifique seu e-mail ou faça login.');
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Efeitos de luz de fundo (Azul e Vermelho sutis) */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-blue/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-red/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-dark-900/90 backdrop-blur-xl border border-dark-700 rounded-2xl shadow-2xl p-8 relative z-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-red p-0.5 mb-4 shadow-lg shadow-brand-blue/20">
            <div className="w-full h-full bg-dark-950 rounded-[14px] flex items-center justify-center">
              <Camera className="w-8 h-8 text-brand-blue" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            PhotoStudio <span className="text-brand-blue">PRO</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Sistema Inteligente de Gestão para Fotógrafos
          </p>
        </div>

        {/* Alternador Login / Cadastro */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-dark-950 rounded-xl border border-dark-700 mb-6">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError(null);
            }}
            className={`py-2 text-sm font-medium rounded-lg transition-all ${
              isLogin
                ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError(null);
            }}
            className={`py-2 text-sm font-medium rounded-lg transition-all ${
              !isLogin
                ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-brand-red/10 border border-brand-red/40 text-red-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-brand-red shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-sm flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Seu E-mail Profissional
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="fotografo@estudio.com"
                className="w-full pl-11 pr-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-brand-blue transition-colors text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Senha de Acesso
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                className="w-full pl-11 pr-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-brand-blue transition-colors text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-brand-blue to-blue-700 hover:from-brand-blueHover hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-brand-blue/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span>Processando...</span>
            ) : (
              <>
                <span>{isLogin ? 'Acessar Painel' : 'Cadastrar e Começar'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {!isLogin && (
          <div className="mt-5 pt-4 border-t border-dark-700/70 flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-brand-blue shrink-0" />
            <span>Ao criar sua conta, 3 serviços fotográficos padrão já serão pré-cadastrados para você testar!</span>
          </div>
        )}
      </div>
    </div>
  );
};