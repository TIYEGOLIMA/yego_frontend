import React, { useState, useEffect } from 'react';
import { Card } from './components/Card';
import { Button } from './components/Button';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

const AgentPanelSimple: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      // Llamar a tu endpoint de tickets
      const response = await fetch(`${API_BASE}/tickets`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      } else {
        console.error('Error cargando tickets:', response.statusText);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await loadTickets(); // Recargar tickets
      }
    } catch (error) {
      console.error('Error actualizando ticket:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando tickets...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Panel de Agente</h1>
        <p className="text-gray-600 mt-2">Gestiona tus tickets asignados</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Tickets */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Tickets Asignados ({tickets.length})</h2>
          
          {tickets.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-gray-500">No tienes tickets asignados</p>
            </Card>
          ) : (
            tickets.map((ticket) => (
              <Card 
                key={ticket.id} 
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedTicket?.id === ticket.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{ticket.title}</h3>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {ticket.description}
                </p>
                
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>ID: {ticket.id}</span>
                  <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Detalles del Ticket Seleccionado */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Detalles del Ticket</h2>
          
          {selectedTicket ? (
            <Card className="p-6">
              <div className="mb-4">
                <h3 className="text-2xl font-bold mb-2">{selectedTicket.title}</h3>
                <div className="flex gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                    Prioridad: {selectedTicket.priority}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedTicket.status)}`}>
                    Estado: {selectedTicket.status}
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold mb-2">Descripción:</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold mb-2">Información:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>ID:</strong> {selectedTicket.id}</p>
                  <p><strong>Creado:</strong> {new Date(selectedTicket.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Acciones:</h4>
                
                {selectedTicket.status === 'pending' && (
                  <Button 
                    onClick={() => updateTicketStatus(selectedTicket.id, 'in_progress')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Tomar Ticket
                  </Button>
                )}
                
                {selectedTicket.status === 'in_progress' && (
                  <div className="space-y-2">
                    <Button 
                      onClick={() => updateTicketStatus(selectedTicket.id, 'completed')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      Completar Ticket
                    </Button>
                    <Button 
                      onClick={() => updateTicketStatus(selectedTicket.id, 'pending')}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                    >
                      Devolver a Pendiente
                    </Button>
                  </div>
                )}
                
                {selectedTicket.status === 'completed' && (
                  <div className="text-center py-4">
                    <span className="text-green-600 font-semibold">✅ Ticket Completado</span>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-6 text-center">
              <p className="text-gray-500">Selecciona un ticket para ver los detalles</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentPanelSimple;
