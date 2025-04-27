// components/MCPAgent.tsx
"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react'; // Importar useCallback
import { useMCPAgentContext } from '@/context/MCPAgentContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Send, Loader2, PlusCircle, History, Trash2, X, MoreVertical, Paperclip, Save, Sparkles, UserCheck } from 'lucide-react'; // Ícones necessários
import { cn } from '@/lib/utils';
import { useRouter } from 'next/router';
import Image from 'next/image';
// Importar estilos utilitários - Ajuste o caminho se necessário
import { NEON_COLOR, baseButtonSelectStyle, baseInputInsetStyle, popoverContentStyle, baseCardStyle } from '@/components/flow/utils';

// REMOVIDO: Constantes MIN_WIDTH, MIN_HEIGHT

const MCPAgent: React.FC = () => {
  const {
    isAgentPanelOpen, toggleAgentPanel, messages, sendMessage, isLoading, sessionId,
    startNewConversation, saveConversation, loadConversation, deleteConversation,
  } = useMCPAgentContext();
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { pathname } = useRouter();

  // --- Estado para Arrastar (Apenas Vertical) ---
  // Mantemos right fixo, bottom será o estado dinâmico
  const [position, setPosition] = useState({ bottom: 24, right: 24 }); // Posição inicial
  const [isDragging, setIsDragging] = useState(false);
  // Armazenar a posição Y inicial do mouse e a posição bottom inicial do painel
  const [dragStart, setDragStart] = useState({ y: 0, initialBottom: 0 });


  // Tamanho fixo (Mantido)
  const panelWidth = "360px";
  const panelHeight = "500px";

  const panelRef = useRef<HTMLDivElement>(null); // Ref para o painel principal

  // Scroll para a última mensagem
  useEffect(() => {
    if (isAgentPanelOpen) { // Scroll apenas se o painel estiver aberto
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAgentPanelOpen]); // Adicionado isAgentPanelOpen como dependência

  // --- Lógica de Arrastar (Apenas Vertical) ---
  const handleMouseDownDrag = useCallback((e: React.MouseEvent) => {
    if (!panelRef.current) return;
    setIsDragging(true);
    // Armazenar a posição Y do clique e a posição bottom atual do painel
    const rect = panelRef.current.getBoundingClientRect();
    setDragStart({ y: e.clientY, initialBottom: window.innerHeight - rect.bottom }); // Calcular initialBottom corretamente

    e.preventDefault(); // Prevenir seleção de texto
    e.stopPropagation(); // Impedir que o evento se propague
  }, []); // Não depende de position.bottom, calcula na hora

  const handleMouseMoveDrag = useCallback((e: MouseEvent) => {
    if (!isDragging || !panelRef.current) return;
    const deltaY = e.clientY - dragStart.y;

    // Calcular a nova posição 'bottom' subtraindo a diferença Y da posição bottom inicial
    const newBottom = dragStart.initialBottom - deltaY;

    // Opcional: Adicionar limites para não arrastar para fora da tela
    // Deixar uma pequena margem no topo (ex: 10px)
    const panelHeight = panelRef.current.offsetHeight;
    const windowHeight = window.innerHeight;

    // Limite superior: bottom não pode ser maior que (altura da janela - altura do painel - margem_topo)
    const maxBottom = windowHeight - panelHeight - 10; // Tente ajustar o -10
    // Limite inferior: bottom não pode ser menor que 0 (ou uma pequena margem inferior)
    const minBottom = 0; // Ou 10 para uma margem inferior

    setPosition(prev => ({
      ...prev, // Mantém o 'right' fixo
      bottom: Math.max(minBottom, Math.min(maxBottom, newBottom)) // Aplica limites
    }));
  }, [isDragging, dragStart]); // Depende de isDragging e dragStart

  const handleMouseUpDrag = useCallback(() => {
    setIsDragging(false);
  }, []);

  // --- REMOVIDO: Lógica de Redimensionar ---
  // const handleMouseDownResize = useCallback(...);
  // const handleMouseMoveResize = useCallback(...);
  // const handleMouseUpResize = useCallback(...);

  // --- Efeitos para adicionar/remover listeners globais ---
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMoveDrag);
      window.addEventListener('mouseup', handleMouseUpDrag);
    } else {
      window.removeEventListener('mousemove', handleMouseMoveDrag);
      window.removeEventListener('mouseup', handleMouseUpDrag);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMoveDrag);
      window.removeEventListener('mouseup', handleMouseUpDrag);
    };
  }, [isDragging, handleMouseMoveDrag, handleMouseUpDrag]);

  // REMOVIDO: Efeito para listeners de redimensionar
  // useEffect(() => { ... }, [isResizing, ...]);


  // --- Handlers de Mensagem e Anexo (Mantidos) ---
  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      sendMessage(inputMessage, { path: pathname });
      setInputMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      console.log("Arquivo selecionado:", file.name, file.type, file.size);
      sendMessage(`Arquivo anexado: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`, { path: pathname });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Não renderizar nada se o painel não estiver aberto
  if (!isAgentPanelOpen) {
      return null;
  }

  // Estilos visuais
  const agentTitleStyle = { textShadow: `0 0 6px ${NEON_COLOR}, 0 0 10px ${NEON_COLOR}` };
  const iconNeonFilterStyle = { filter: `drop-shadow(0 0 4px ${NEON_COLOR})` };
  // REMOVIDO: Sombra neon customizada para a janela
  // const windowNeonShadowStyle = { boxShadow: `0 0 15px hsl(var(--primary) / 0.8), 0 0 20px hsl(var(--primary) / 0.6)` };


  return (
    // Painel flutuante com estilos fixos (sem arrastar/redimensionar manual)
    <div
      ref={panelRef} // Atribuir a ref
      className={cn(
        "fixed", // Posição fixa
        "flex flex-col", // Layout interno
        baseCardStyle, // Fundo escuro e sombras escuras (outset)
        "rounded-lg", // Garantir cantos arredondados
        "overflow-hidden", // Recortar conteúdo nos cantos arredondados
        "z-50", // Z-index alto
        "text-sm" // Aplicar fonte menor globalmente no painel
      )}
      style={{
          bottom: `${position.bottom}px`, // Usar estado para bottom (dinâmico)
          right: `${position.right}px`,   // Usar estado para right (fixo)
          width: panelWidth,       // Usar tamanho fixo
          height: panelHeight,     // Usar tamanho fixo
          // REMOVIDO: Aplicar sombra customizada usando variável CSS
          cursor: isDragging ? 'grabbing' : 'default' // Mudar cursor apenas para arrastar
      }}
    >
        {/* Top Bar (Handle para Arrastar Vertical) */}
        <div
            className="flex justify-between items-center border-b border-[#1E90FF]/20 p-3 flex-shrink-0 cursor-grab" // Cursor grab para arrastar
            onMouseDown={handleMouseDownDrag} // Evento para iniciar arrastar
        >
            <h2 className="text-base font-semibold text-white flex items-center" style={agentTitleStyle}>
                <Sparkles className="h-4 w-4 mr-2" style={iconNeonFilterStyle} /> Agente MCP
            </h2>
            <div className="flex space-x-1">
                {/* Menu de Ações */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className={cn(baseButtonSelectStyle, "w-7 h-7 rounded")} aria-label="Menu de Ações"> {/* Usar baseButtonSelectStyle */}
                            <MoreVertical className="h-4 w-4 text-gray-400" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className={cn(popoverContentStyle, "w-48")}> {/* Usar popoverContentStyle */}
                        <DropdownMenuItem onClick={startNewConversation} className="text-xs flex items-center cursor-pointer hover:!bg-[#1E90FF]/20">
                            <PlusCircle className="mr-2 h-3.5 w-3.5 text-gray-400" /> Nova Conversa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => loadConversation(sessionId)} className="text-xs flex items-center cursor-pointer hover:!bg-[#1E90FF]/20">
                             <History className="mr-2 h-3.5 w-3.5 text-gray-400" /> Ver Histórico (Carregar)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => saveConversation("Minha Conversa")} className="text-xs flex items-center cursor-pointer hover:!bg-[#1E90FF]/20">
                            <Save className="mr-2 h-3.5 w-3.5 text-gray-400" /> Salvar Conversa
                        </DropdownMenuItem>
                         <DropdownMenuSeparator className="bg-[#1E90FF]/20"/>
                        <DropdownMenuItem onClick={() => deleteConversation(sessionId)} className="text-xs flex items-center cursor-pointer text-red-400 hover:!bg-red-500/20">
                            <Trash2 className="mr-2 h-3.5 w-3.5 text-red-400" /> Excluir Conversa
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Botão de fechar o painel */}
                <Button variant="ghost" size="icon" onClick={toggleAgentPanel} aria-label="Fechar Painel" className={cn(baseButtonSelectStyle, "w-7 h-7 rounded hover:!bg-red-500/30")}> {/* Usar baseButtonSelectStyle */}
                    <X className="h-4 w-4 text-gray-400" />
                </Button>
            </div>
        </div>

        {/* Área de Chat */}
        <ScrollArea className="flex-1 p-4 custom-scrollbar">
            <div className="space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={cn( "flex items-start space-x-2", msg.role === 'user' ? 'justify-end' : 'justify-start' )}>
                      {/* Usar a imagem character.png para o assistente, tamanho ajustado */}
                      {msg.role === 'assistant' && (
                          <div className="shrink-0 h-8 w-8 relative rounded-full overflow-hidden bg-gray-700 flex items-center justify-center" style={iconNeonFilterStyle}>
                              <Image src="/character.png" alt="MCP Agent" fill style={{ objectFit: 'cover' }} sizes="32px" />
                          </div>
                      )}
                       {/* Usar um ícone para o usuário ou outra imagem se disponível */}
                       {/* Mantido UserCheck, mas você pode substituir por uma imagem de avatar de usuário */}
                      {msg.role === 'user' && (
                           <div className="shrink-0 h-8 w-8 relative rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
                               {/* Ícone UserCheck para usuário */}
                               <UserCheck className="h-5 w-5 text-green-400" />
                           </div>
                      )}
                      <div className={cn(
                          "rounded-lg p-2 max-w-[80%]", // Diminuído o padding (p-2)
                          // A fonte menor (text-sm) foi aplicada no container principal
                          // Aplicar estilos neomorphic aos balões de mensagem - Usar baseCardStyle e ajustar cores
                          baseCardStyle, // Aplica fundo escuro e sombras escuras
                          'text-gray-200', // Cor do texto cinza claro
                          // Remover bg-gray-700/800 se baseCardStyle já definir o fundo
                          // msg.role === 'user' ? 'bg-gray-700' : 'bg-gray-800'
                      )}>
                        {msg.content}
                        {/* Renderizar tool_call_id/name se for mensagem de ferramenta */}
                        {msg.role === 'tool' && msg.tool_call_id && (
                            <div className="mt-1 text-xs text-gray-400">
                                (Tool: {msg.name || 'N/A'}, Call ID: {msg.tool_call_id})
                            </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                      <div className="flex justify-start items-center space-x-2">
                           {/* Usar a imagem character.png para o loader */}
                           <div className="shrink-0 h-8 w-8 relative rounded-full overflow-hidden bg-gray-700 flex items-center justify-center animate-spin" style={iconNeonFilterStyle}>
                                <Image src="/character.png" alt="Loading" fill style={{ objectFit: 'cover' }} sizes="32px" />
                           </div>
                          <span className="text-gray-400 text-sm">Digitando...</span>
                      </div>
                  )}
                <div ref={messagesEndRef} />
            </div>
        </ScrollArea>


        {/* Input Area */}
        <div className="flex items-center p-3 border-t border-[#1E90FF]/20 flex-shrink-0">
          {/* Botão de Anexo */}
          <Button variant="ghost" size="icon" onClick={handleAttachClick} aria-label="Anexar arquivo" className={cn(baseButtonSelectStyle, "w-8 h-8 rounded mr-2")}>
              <Paperclip className="h-4 w-4 text-gray-400" />
          </Button>
          {/* Input de Arquivo (escondido) */}
          <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
          />
          {/* Input de Mensagem */}
          <Input
            type="text"
            placeholder="Sua mensagem..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className={cn(baseInputInsetStyle, "flex-1 mr-2 text-xs rounded bg-gray-800 border-gray-700 focus:border-blue-600 focus:ring-blue-600 placeholder-gray-500 text-gray-200")}
            disabled={isLoading}
          />
          {/* Botão Enviar */}
          <Button onClick={handleSendMessage} disabled={isLoading} size="icon" className={cn(baseButtonSelectStyle, "w-8 h-8 rounded bg-blue-600 hover:bg-blue-700 text-white")}>
            <Send className="h-4 w-4" />
          </Button>
        </div>

    </div>
  );
};

export default MCPAgent;
