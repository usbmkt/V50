// context/MCPAgentContext.tsx
import React, { createContext, useState, useContext, ReactNode, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { useRouter } from 'next/router'; // Importar useRouter para navegação

// Definir tipos para as mensagens (simplificado)
interface Message { id: string; role: 'user' | 'assistant' | 'tool' | 'function'; content: string | null; tool_call_id?: string | null; name?: string | null; }

interface MCPAgentContextType {
  isAgentPanelOpen: boolean; // Estado para controlar se o painel está aberto
  toggleAgentPanel: () => void; // Função para abrir/fechar o painel
  messages: Message[]; // Histórico de mensagens da sessão atual
  sendMessage: (message: string, context: { path: string }) => Promise<void>; // Função para enviar mensagem
  isLoading: boolean; // Estado de carregamento
  sessionId: string; // ID da sessão atual
  startNewConversation: () => void; // Função para iniciar nova conversa
  saveConversation: (name: string) => void; // Função para salvar conversa (opcional, se implementar)
  loadConversation: (sessionId: string) => void; // Função para carregar conversa (opcional, se implementar)
  deleteConversation: (sessionId: string) => void; // Função para excluir conversa (opcional, se implementar)
  // Adicionar outros estados/funções conforme necessário (ex: lista de conversas salvas)
}

const MCPAgentContext = createContext<MCPAgentContextType | undefined>(undefined);

export const useMCPAgentContext = () => {
  const context = useContext(MCPAgentContext);
  if (context === undefined) {
    throw new Error('useMCPAgentContext must be used within a MCPAgentProvider');
  }
  return context;
};

export const MCPAgentProvider = ({ children }: { children: ReactNode }) => {
  const [isAgentPanelOpen, setIsAgentPanelOpen] = useState(false); // Começa fechado
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter(); // Hook para navegação
  const [sessionId, setSessionId] = useState<string>(() => {
      // Tenta carregar o ID da sessão do localStorage ou gera um novo
      if (typeof window !== 'undefined') {
          const savedSessionId = localStorage.getItem('currentMcpSessionId');
          console.log("[MCP Context] Carregando Session ID do localStorage:", savedSessionId);
          if (savedSessionId) return savedSessionId;
      }
      const newSessionId = uuidv4();
      console.log("[MCP Context] Gerando novo Session ID:", newSessionId);
      if (typeof window !== 'undefined') {
          localStorage.setItem('currentMcpSessionId', newSessionId);
      }
      return newSessionId;
  });

  // Carregar histórico ao montar ou quando o sessionId mudar
  React.useEffect(() => {
      const fetchHistory = async () => {
          console.log(`[MCP Context] Tentando carregar histórico para Session ID: ${sessionId}`);
          setIsLoading(true);
          try {
              const response = await axios.get(`/api/mcp-history?sessionId=${sessionId}`);
              console.log(`[MCP Context] Histórico carregado para ${sessionId}:`, response.data);
              // Mapear o histórico do DB para o formato de mensagens do frontend
              const historyMessages: Message[] = response.data.map((msg: any) => ({
                  id: uuidv4(), // Gerar um ID local para cada mensagem
                  role: msg.role,
                  content: msg.content,
                  tool_call_id: msg.tool_call_id,
                  name: msg.name,
              }));
              setMessages(historyMessages);
          } catch (error) {
              console.error(`[MCP Context] Erro ao carregar histórico para ${sessionId}:`, error);
              setMessages([{ id: uuidv4(), role: 'assistant', content: "Erro ao carregar histórico da conversa." }]);
          } finally {
              setIsLoading(false);
          }
      };
      fetchHistory();
  }, [sessionId]); // Dependência do sessionId

  const toggleAgentPanel = () => {
    setIsAgentPanelOpen(prev => !prev);
  };

  const sendMessage = async (message: string, context: { path: string }) => {
      if (!message.trim() || isLoading) return;

      const userMessage: Message = { id: uuidv4(), role: 'user', content: message };
      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);

      try {
          const response = await axios.post('/api/mcp-agent', { message, context }, {
              headers: { 'X-Session-ID': sessionId } // Enviar o ID da sessão no header
          });

          const agentResponse: { response: string; action?: any } = response.data;

          const assistantMessage: Message = { id: uuidv4(), role: 'assistant', content: agentResponse.response };
          setMessages(prev => [...prev, assistantMessage]);

          // Processar ação se houver (ex: navegação)
          if (agentResponse.action?.type === 'navigate' && agentResponse.action.payload?.path) {
              console.log("[MCP Context] Ação de navegação solicitada:", agentResponse.action.payload.path);
              // Executar navegação
              router.push(agentResponse.action.payload.path);
              // Opcional: fechar o painel após navegação
              // setIsAgentPanelOpen(false);
          }

      } catch (error) {
          console.error("[MCP Context] Erro ao enviar mensagem para o agente:", error);
          setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant', content: "Desculpe, houve um erro ao processar sua solicitação." }]);
      } finally {
          setIsLoading(false);
      }
  };

  const startNewConversation = () => {
      console.log("[MCP Context] Iniciando nova conversa...");
      const newSessionId = uuidv4();
      setSessionId(newSessionId);
      setMessages([]); // Limpa as mensagens
      if (typeof window !== 'undefined') {
          localStorage.setItem('currentMcpSessionId', newSessionId); // Salva o novo ID
      }
      // O useEffect acima irá carregar o histórico, que estará vazio para a nova sessão
  };

  // Implementar save/load/delete conversation se necessário, interagindo com /api/mcp-history
  const saveConversation = (name: string) => { console.warn("Funcionalidade 'Salvar Conversa' não implementada."); };
  const loadConversation = (sessionId: string) => { console.warn("Funcionalidade 'Carregar Conversa' não implementada."); };
  const deleteConversation = (sessionId: string) => { console.warn("Funcionalidade 'Excluir Conversa' não implementada."); };


  const value = useMemo(() => ({
    isAgentPanelOpen, toggleAgentPanel, messages, sendMessage, isLoading, sessionId,
    startNewConversation, saveConversation, loadConversation, deleteConversation
  }), [isAgentPanelOpen, messages, isLoading, sessionId]);

  return (
    <MCPAgentContext.Provider value={value}>
      {children}
    </MCPAgentContext.Provider>
  );
};
