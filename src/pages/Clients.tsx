import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Client, Appointment } from '../types/database';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  Pencil,
  Trash2,
  History,
  X,
  Calendar,
  FileText,
  MessageCircle,
} from 'lucide-react';

export const Clients: React.FC = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal de Cadastro/Edição
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);

  // Campos do Formulário
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Modal de Histórico do Cliente
  const [selectedClientHistory, setSelectedClientHistory] = useState<Client | null>(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [clientsRes, appsRes] = await Promise.all([
      supabase.from('clients').select('*').order('name', { ascending: true }),
      supabase.from('appointments').select('*').order('appointment_date', { ascending: false }),
    ]);

    if (clientsRes.data) setClients(clientsRes.data);
    if (appsRes.data) setAppointments(appsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Gera o link oficial do WhatsApp (wa.me) limpando caracteres especiais
  const getWhatsAppUrl = (phoneStr: string, clientName: string) => {
    const digits = phoneStr.replace(/\D/g, '');
    const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
    const message = encodeURIComponent(
      `Olá ${clientName}! Tudo bem? Aqui é do estúdio fotográfico.`
    );
    return `https://wa.me/${withCountry}?text=${message}`;
  };

  const getClientAppointments = (client: Client) => {
    return appointments.filter(
      (app) =>
        app.client_id === client.id ||
        app.client_name.toLowerCase() === client.name.toLowerCase()
    );
  };

  const getClientTotalSpent = (client: Client) => {
    const clientApps = getClientAppointments(client);
    return clientApps
      .filter((app) => app.status !== 'cancelled')
      .reduce((acc, app) => {
        const valorConsiderado =
          app.payment_status === 'paid'
            ? Number(app.price)
            : Number(app.paid_amount || 0);
        return acc + valorConsiderado;
      }, 0);
  };

  const getClientTotalContracted = (client: Client) => {
    const clientApps = getClientAppointments(client);
    return clientApps
      .filter((app) => app.status !== 'cancelled')
      .reduce((acc, app) => acc + Number(app.price), 0);
  };

  const openNewModal = () => {
    setEditingClient(null);
    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setIsFormOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setPhone(client.phone);
    setEmail(client.email || '');
    setNotes(client.notes || '');
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const payload = {
      user_id: user.id,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      notes: notes.trim(),
    };

    if (editingClient) {
      await supabase.from('clients').update(payload).eq('id', editingClient.id);
    } else {
      await supabase.from('clients').insert([payload]);
    }

    setSaving(false);
    setIsFormOpen(false);
    fetchData();
  };

  const handleDelete = async (client: Client) => {
    if (!window.confirm(`Deseja realmente excluir o cliente "${client.name}"?`)) {
      return;
    }
    await supabase.from('clients').delete().eq('id', client.id);
    fetchData();
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-brand-blue" />
            Gestão de Clientes
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Base de contatos com WhatsApp rápido, histórico de ensaios e total investido
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="px-4 py-2.5 bg-brand-blue hover:bg-brand-blueHover text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-brand-blue/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Cliente</span>
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Pesquisar por nome, telefone ou e-mail..."
          className="w-full pl-10 pr-4 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-48 bg-dark-900/60 border border-dark-700 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">Nenhum cliente encontrado</h3>
          <p className="text-slate-400 text-sm mt-1">
            Adicione seus clientes para acompanhar o histórico de serviços e pagamentos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map((client) => {
            const clientApps = getClientAppointments(client);
            const totalPaid = getClientTotalSpent(client);
            const totalContracted = getClientTotalContracted(client);

            return (
              <div
                key={client.id}
                className="bg-dark-900 border border-dark-700 hover:border-brand-blue/50 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-blue/15 border border-brand-blue/30 text-brand-blue font-bold flex items-center justify-center text-sm shrink-0">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base leading-tight">
                          {client.name}
                        </h3>
                        <span className="text-xs text-slate-400">
                          {clientApps.length}{' '}
                          {clientApps.length === 1 ? 'serviço no histórico' : 'serviços no histórico'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(client)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
                        title="Editar cliente"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(client)}
                        className="p-1.5 text-slate-400 hover:text-brand-red hover:bg-brand-red/10 rounded-lg transition-colors"
                        title="Excluir cliente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-300">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                        <span>{client.phone}</span>
                      </div>

                      <a
                        href={getWhatsAppUrl(client.phone, client.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center gap-1 shadow-sm transition-all"
                        title="Conversar no WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    </div>

                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.notes && (
                      <div className="flex items-start gap-2 text-slate-400 pt-1">
                        <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{client.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-dark-700/80 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                      Total Pago / Contratado
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-bold text-emerald-400">
                        {formatCurrency(totalPaid)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        / {formatCurrency(totalContracted)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedClientHistory(client)}
                    className="px-3 py-1.5 bg-dark-800 hover:bg-brand-blue text-slate-200 hover:text-white border border-dark-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Histórico</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criar / Editar Cliente */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-dark-700">
              <h2 className="text-lg font-bold text-white">
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-dark-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Mariana Oliveira"
                  className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-blue"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(98) 99999-9999"
                    className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Observações e Preferências
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Preferências de estilo, melhor horário de contato, detalhes importantes..."
                  className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-blue resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-700">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-dark-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-brand-blue hover:bg-brand-blueHover text-white rounded-xl text-sm font-semibold shadow-lg shadow-brand-blue/25 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Histórico de Serviços do Cliente */}
      {selectedClientHistory && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-dark-700">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Histórico de {selectedClientHistory.name}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Total investido (pago):{' '}
                  <strong className="text-emerald-400">
                    {formatCurrency(getClientTotalSpent(selectedClientHistory))}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedClientHistory(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-dark-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {getClientAppointments(selectedClientHistory).length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">
                  Este cliente ainda não possui agendamentos registrados.
                </p>
              ) : (
                getClientAppointments(selectedClientHistory).map((app) => (
                  <div
                    key={app.id}
                    className="p-4 rounded-xl bg-dark-950 border border-dark-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">
                          {app.service_name}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                            app.status === 'completed'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : app.status === 'cancelled'
                              ? 'bg-brand-red/15 text-red-400'
                              : 'bg-brand-blue/15 text-blue-400'
                          }`}
                        >
                          {app.status === 'completed'
                            ? 'Concluído'
                            : app.status === 'cancelled'
                            ? 'Cancelado'
                            : 'Agendado'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-brand-blue" />
                          {formatDate(app.appointment_date)} ({app.start_time.slice(0, 5)} -{' '}
                          {app.end_time.slice(0, 5)})
                        </span>
                        {app.location && <span>• {app.location}</span>}
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-sm font-bold text-white block">
                        {formatCurrency(Number(app.price))}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Pago: {formatCurrency(Number(app.paid_amount))}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};