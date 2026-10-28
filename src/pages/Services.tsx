import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Service } from '../types/database';
import {
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  Clock,
  DollarSign,
  X,
  Camera,
  Sparkles,
  Search,
} from 'lucide-react';

export const Services: React.FC = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Controle do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);

  // Campos do Formulário
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('');
  const [defaultDuration, setDefaultDuration] = useState('60');

  const fetchServices = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) {
      setServices(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, [user]);

  const openNewModal = () => {
    setEditingService(null);
    setName('');
    setDescription('');
    setDefaultPrice('');
    setDefaultDuration('60');
    setIsModalOpen(true);
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setName(service.name);
    setDescription(service.description || '');
    setDefaultPrice(String(service.default_price));
    setDefaultDuration(String(service.default_duration));
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const payload = {
      user_id: user.id,
      name: name.trim(),
      description: description.trim(),
      default_price: Number(defaultPrice) || 0,
      default_duration: Number(defaultDuration) || 60,
    };

    if (editingService) {
      await supabase
        .from('services')
        .update(payload)
        .eq('id', editingService.id);
    } else {
      await supabase.from('services').insert([payload]);
    }

    setSaving(false);
    setIsModalOpen(false);
    fetchServices();
  };

  const handleDelete = async (id: string, serviceName: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o serviço "${serviceName}"?`)) {
      return;
    }
    await supabase.from('services').delete().eq('id', id);
    fetchServices();
  };

  const handleLoadTemplates = async () => {
    if (!user) return;
    setLoading(true);
    const templates = [
      {
        user_id: user.id,
        name: 'Ensaio Fotográfico Externo',
        description: 'Sessão ao ar livre .',
        default_price: 450,
        default_duration: 90,
      },
      {
        user_id: user.id,
        name: 'Ensaio fotografico no estúdio',
        description: 'Sessão em estúdio com fundo infinito e iluminação profissional.',
        default_price: 1500,
        default_duration: 360,
      },
      {
        user_id: user.id,
        name: 'Aniversário / Eventos',
        description: 'Cobertura fotográfica de festa de aniversário .',
        default_price: 850,
        default_duration: 240,
      },
      {
        user_id: user.id,
        name: 'Formatura',
        description: 'Cobertura de colação de grau e baile de formatura.',
        default_price: 1500,
        default_duration: 240,
      },
      
      
    ];

    await supabase.from('services').insert(templates);
    fetchServices();
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}min`;
    if (h > 0) return `${h}h`;
    return `${m} min`;
  };

  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Briefcase className="w-7 h-7 text-brand-blue" />
            Catálogo de Serviços
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure seus pacotes fotográficos, preços e tempos padrão de execução
          </p>
        </div>

        <div className="flex items-center gap-3">
          {services.length === 0 && !loading && (
            <button
              onClick={handleLoadTemplates}
              className="px-4 py-2.5 bg-dark-800 hover:bg-dark-700 text-slate-200 border border-dark-700 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4 text-brand-blue" />
              <span>Carregar Exemplos</span>
            </button>
          )}
          <button
            onClick={openNewModal}
            className="px-4 py-2.5 bg-brand-blue hover:bg-brand-blueHover text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-brand-blue/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Serviço</span>
          </button>
        </div>
      </div>

      {/* Barra de Pesquisa */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar serviço por nome ou descrição..."
          className="w-full pl-10 pr-4 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue"
        />
      </div>

      {/* Lista de Serviços */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-44 bg-dark-900/60 border border-dark-700 rounded-2xl animate-pulse p-5"
            />
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-12 text-center">
          <Camera className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">Nenhum serviço encontrado</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
            Cadastre seus serviços fotográficos (Ensaios, Casamentos, Estúdio) para agilizar seus agendamentos.
          </p>
          <button
            onClick={openNewModal}
            className="mt-5 px-5 py-2.5 bg-brand-blue hover:bg-brand-blueHover text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Criar Primeiro Serviço
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="bg-dark-900 border border-dark-700 hover:border-brand-blue/50 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-bold text-white group-hover:text-brand-blue transition-colors">
                    {service.name}
                  </h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditModal(service)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
                      title="Editar serviço"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(service.id, service.name)}
                      className="p-1.5 text-slate-400 hover:text-brand-red hover:bg-brand-red/10 rounded-lg transition-colors"
                      title="Excluir serviço"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-slate-400 text-xs mt-2 line-clamp-3 min-h-[36px]">
                  {service.description || 'Sem descrição detalhada.'}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-dark-700/80 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-dark-950 px-3 py-1.5 rounded-lg border border-dark-700">
                  <Clock className="w-3.5 h-3.5 text-brand-blue" />
                  <span>{formatDuration(service.default_duration)}</span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                    Valor Padrão
                  </span>
                  <span className="text-base font-bold text-emerald-400">
                    {formatCurrency(Number(service.default_price))}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar / Editar Serviço */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-dark-700">
              <h2 className="text-lg font-bold text-white">
                {editingService ? 'Editar Serviço Fotográfico' : 'Novo Serviço Fotográfico'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-dark-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Ensaio Externo, Casamento, Formatura..."
                  className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Descrição do Pacote
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o que está incluso (quantidade de fotos, entrega, locação)..."
                  className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-blue resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Valor Padrão (R$) *
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={defaultPrice}
                      onChange={(e) => setDefaultPrice(e.target.value)}
                      placeholder="450.00"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Duração Padrão (Minutos) *
                  </label>
                  <select
                    value={defaultDuration}
                    onChange={(e) => setDefaultDuration(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-blue"
                  >
                    <option value="30">30 minutos</option>
                    <option value="60">1 hora (60 min)</option>
                    <option value="90">1h 30min (90 min)</option>
                    <option value="120">2 horas (120 min)</option>
                    <option value="180">3 horas (180 min)</option>
                    <option value="240">4 horas (240 min)</option>
                    <option value="360">6 horas (360 min)</option>
                    <option value="480">8 horas (Diária)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-dark-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-brand-blue hover:bg-brand-blueHover text-white rounded-xl text-sm font-semibold shadow-lg shadow-brand-blue/25 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : editingService ? 'Salvar Alterações' : 'Cadastrar Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};