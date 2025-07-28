# Fluxos de Utilizador - Sistema de Gestão de Stock

## Visão Geral

Este documento descreve os principais fluxos de utilizador do Sistema de Gestão de Stock, detalhando as interações esperadas para cada tipo de utilizador e funcionalidade.

## Roles de Utilizador

### 1. Administrador
- Acesso total ao sistema
- Gestão de utilizadores e configurações
- Todos os relatórios e analytics

### 2. Gestor de Stock
- Gestão de produtos e fornecedores
- Movimentos de stock
- Relatórios operacionais

### 3. Operador
- Registo de movimentos de stock
- Consulta de produtos
- Relatórios básicos

## Fluxos Principais

### 1. Autenticação e Onboarding

#### 1.1. Login do Utilizador
```
[Página de Login]
├── Inserir email/password
├── Opção "Lembrar-me"
├── Autenticação 2FA (opcional)
├── Redirecionamento para Dashboard
└── [Erro] → Mensagem de erro + tentar novamente
```

**Passos Detalhados:**
1. Utilizador acede à página de login
2. Insere credenciais (email + password)
3. Sistema valida credenciais via Firebase Auth
4. Se 2FA ativo, solicita código
5. Login bem-sucedido → Dashboard
6. Login falhado → Mensagem de erro

#### 1.2. Primeiro Acesso (Setup)
```
[Primeira Vez]
├── Welcome Screen
├── Configuração do Perfil
├── Tour das Funcionalidades
└── Dashboard
```

### 2. Gestão de Produtos

#### 2.1. Criar Novo Produto
```
[Dashboard] → [Produtos] → [+ Novo Produto]
├── Informações Básicas
│   ├── Nome, Descrição
│   ├── SKU (auto-gerado ou manual)
│   ├── Código de Barras
│   └── Categoria
├── Fornecedor
│   ├── Selecionar existente
│   └── Criar novo (modal)
├── Preços e Custos
│   ├── Preço de Custo
│   ├── Preço de Venda
│   ├── Margem de Lucro (calc. automático)
│   └── IVA
├── Inventário
│   ├── Stock Mínimo
│   ├── Stock Máximo
│   ├── Ponto de Reposição
│   └── Unidade de Medida
├── Especificações (opcional)
│   ├── Dimensões
│   ├── Peso
│   └── Material
├── Media
│   ├── Upload de Imagens
│   └── Documentos
├── [Guardar] → Validação → Produto Criado
└── [Cancelar] → Voltar à lista
```

**Validações:**
- SKU único no sistema
- Código de barras único (se fornecido)
- Preços > 0
- Campos obrigatórios preenchidos

#### 2.2. Pesquisar e Filtrar Produtos
```
[Produtos]
├── Barra de Pesquisa
│   ├── Nome do produto
│   ├── SKU
│   ├── Código de barras
│   └── Descrição
├── Filtros Avançados
│   ├── Categoria
│   ├── Fornecedor
│   ├── Faixa de Preço
│   ├── Nível de Stock
│   ├── Estado (Ativo/Inativo)
│   └── Tags
├── Ordenação
│   ├── Nome (A-Z/Z-A)
│   ├── Stock (Maior/Menor)
│   ├── Preço (Maior/Menor)
│   └── Data Criação
└── Resultados
    ├── Lista com paginação
    ├── Vista em grelha/lista
    └── Exportar resultados
```

#### 2.3. Digitalizar Código de Barras (Mobile)
```
[App Mobile] → [Scanner]
├── Ativar câmara
├── Focar código de barras
├── Reconhecimento automático
├── [Produto Encontrado]
│   ├── Ver detalhes
│   ├── Editar stock
│   └── Ver movimentos
└── [Produto Não Encontrado]
    ├── Criar novo produto
    └── Pesquisar manualmente
```

### 3. Gestão de Stock

#### 3.1. Registar Entrada de Stock
```
[Stock] → [+ Nova Entrada]
├── Selecionar Produto
│   ├── Pesquisa por nome/SKU
│   ├── Scanner (mobile)
│   └── Lista de produtos
├── Detalhes da Entrada
│   ├── Quantidade
│   ├── Preço unitário
│   ├── Fornecedor
│   ├── Número da fatura
│   ├── Data da compra
│   └── Localização no armazém
├── Informações do Lote (opcional)
│   ├── Número do lote
│   ├── Data de fabrico
│   ├── Data de validade
│   └── Condições de armazenamento
├── Observações
├── [Confirmar] → Stock atualizado + Movimento registado
└── [Cancelar] → Voltar
```

**Efeitos:**
- Stock atual incrementado
- Movimento registado no histórico
- Custo médio recalculado
- Alertas verificados

#### 3.2. Registar Saída de Stock
```
[Stock] → [+ Nova Saída]
├── Selecionar Produto
├── Verificar Stock Disponível
├── Detalhes da Saída
│   ├── Quantidade (≤ stock disponível)
│   ├── Motivo (Venda/Transferência/Perda)
│   ├── Cliente (se venda)
│   ├── Preço de venda
│   └── Número do documento
├── Seleção de Lote (FIFO automático)
├── [Confirmar] → Stock reduzido
└── [Cancelar]
```

#### 3.3. Inventário Físico
```
[Stock] → [Inventário]
├── Criar Nova Contagem
│   ├── Selecionar produtos/categorias
│   ├── Definir responsável
│   └── Agendar data
├── Processo de Contagem
│   ├── Lista de produtos
│   ├── Stock teórico vs Real
│   ├── Inserir contagem real
│   ├── Scanner para rapidez
│   └── Marcar como contado
├── Revisão
│   ├── Diferenças encontradas
│   ├── Aprovar ajustes
│   └── Gerar relatório
└── Finalização
    ├── Ajustes aplicados
    ├── Movimentos criados
    └── Auditoria registada
```

### 4. Alertas e Notificações

#### 4.1. Alertas de Stock Baixo
```
[Sistema detecta stock ≤ mínimo]
├── Criar alerta automático
├── Notificação push (mobile)
├── Email para responsáveis
├── Aparecer no dashboard
└── [Resolver alerta]
    ├── Fazer encomenda
    ├── Ajustar nível mínimo
    └── Marcar como resolvido
```

#### 4.2. Gestão de Alertas
```
[Dashboard] → [Alertas]
├── Lista de alertas ativos
│   ├── Stock baixo
│   ├── Stock esgotado
│   ├── Produtos expirados
│   └── Discrepâncias
├── Filtros
│   ├── Por tipo
│   ├── Por prioridade
│   └── Por responsável
├── Ações em massa
│   ├── Marcar como resolvido
│   ├── Atribuir responsável
│   └── Snooze
└── Configurações
    ├── Níveis de alerta
    ├── Notificações
    └── Responsáveis
```

### 5. Relatórios e Analytics

#### 5.1. Dashboard Principal
```
[Login] → [Dashboard]
├── Métricas Principais
│   ├── Total de produtos
│   ├── Valor do stock
│   ├── Produtos em falta
│   └── Movimentos hoje
├── Gráficos
│   ├── Tendência de stock
│   ├── Top produtos
│   ├── Movimento por categoria
│   └── Fornecedores ativos
├── Alertas Recentes
├── Ações Rápidas
│   ├── Novo produto
│   ├── Entrada de stock
│   ├── Saída de stock
│   └── Ver relatórios
└── Atividade Recente
```

#### 5.2. Relatório de Stock
```
[Relatórios] → [Stock]
├── Filtros
│   ├── Período
│   ├── Categorias
│   ├── Fornecedores
│   └── Estado do stock
├── Visualização
│   ├── Tabela detalhada
│   ├── Gráficos
│   ├── Resumo executivo
│   └── Comparativo períodos
├── Opções de Exportação
│   ├── PDF
│   ├── Excel
│   ├── CSV
│   └── Email automático
└── Agendamento
    ├── Relatório automático
    ├── Frequência
    └── Destinatários
```

### 6. Gestão de Utilizadores (Admin)

#### 6.1. Criar Novo Utilizador
```
[Admin] → [Utilizadores] → [+ Novo]
├── Informações Básicas
│   ├── Nome completo
│   ├── Email
│   ├── Telefone
│   └── Departamento
├── Credenciais
│   ├── Password temporária
│   └── Forçar alteração no primeiro login
├── Permissões
│   ├── Role (Admin/Gestor/Operador)
│   ├── Permissões customizadas
│   └── Acesso a módulos
├── Configurações
│   ├── 2FA obrigatório
│   ├── Expiração da conta
│   └── Notificações
├── [Criar] → Email de boas-vindas
└── [Cancelar]
```

### 7. Funcionalidades Mobile Específicas

#### 7.1. Acesso Rápido (Widget)
```
[Home Screen Widget]
├── Stock crítico (número)
├── Último movimento
├── Scanner rápido
└── Atalhos
    ├── Nova entrada
    ├── Nova saída
    └── Pesquisar produto
```

#### 7.2. Modo Offline
```
[Sem Internet]
├── Cache local de dados
├── Sincronização pendente
├── Funcionalidades limitadas
│   ├── Consultar produtos (cache)
│   ├── Registar movimentos (local)
│   └── Ver histórico (cache)
└── [Internet restaurada]
    ├── Sincronização automática
    ├── Conflitos resolvidos
    └── Notificação de sucesso
```

#### 7.3. Notificações Push
```
[Eventos do Sistema]
├── Stock baixo
├── Novo produto atribuído
├── Inventário agendado
├── Aprovação pendente
└── [Tap na notificação]
    ├── Abrir app
    ├── Navegar para contexto
    └── Ação direta (quando possível)
```

## Fluxos de Erro e Recuperação

### 1. Erro de Conectividade
```
[Perda de Conexão]
├── Detectar estado offline
├── Mostrar banner de aviso
├── Modo offline ativado
├── Dados em cache disponíveis
└── [Conexão restaurada]
    ├── Sincronizar dados
    ├── Resolver conflitos
    └── Remover banner
```

### 2. Validação de Dados
```
[Dados Inválidos]
├── Validação client-side
├── Destacar campos com erro
├── Mensagens explicativas
├── Prevenir submissão
└── [Correção] → Re-validar
```

### 3. Conflitos de Concorrência
```
[Edição Simultânea]
├── Detectar conflito
├── Mostrar versões diferentes
├── Opções de resolução
│   ├── Manter alterações
│   ├── Descartar alterações
│   └── Merge manual
└── [Resolver] → Salvar versão final
```

## Considerações de UX

### 1. Performance
- Loading states para operações lentas
- Skeleton screens para carregamento inicial
- Lazy loading para listas grandes
- Cache inteligente de dados frequentes

### 2. Acessibilidade
- Navegação por teclado
- Screen reader compatibility
- Alto contraste disponível
- Textos escaláveis

### 3. Feedback do Utilizador
- Confirmações para ações críticas
- Progress indicators para uploads
- Success/error messages claras
- Undo para ações reversíveis

### 4. Consistência
- Design system uniforme
- Padrões de interação consistentes
- Terminologia padronizada
- Fluxos similares para operações semelhantes