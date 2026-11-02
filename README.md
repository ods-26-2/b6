# Guia de Desenvolvimento e Execução - Kit B6 (Módulo MOD-2)

Este repositório contém a implementação dos submódulos de interface **B6.1 (OverlayPlayer)**, **B6.2 (ZoneEditor)**, **B6.3 (AlertConsole)** e **B6.4 (AppShell)**, responsáveis pela renderização gráfica acelerada, edição topológica vetorial, feed reativo e estruturação de layout do ecossistema ODS.

## 🛠️ Pré-requisitos e Configuração Inicial

Para garantir que o ambiente local executa corretamente tanto o servidor de testes visuais (HTML) quanto a suíte de testes automatizados (TDD), é necessário preparar o ecossistema Node.js.

Na raiz do seu diretório (`~/MOD2_ODS/mod2`), execute os seguintes comandos:

1. **Inicializar o pacote NPM** (caso não exista um `package.json`):
   ```bash
   npm init -y
   ```

2. **Instalar as dependências de desenvolvimento**:
   ```bash
   npm install -D vite vitest jsdom
   ```
   * **vite:** Servidor de desenvolvimento rápido para processar o TypeScript e servir os ficheiros `index.html`.
   * **vitest & jsdom:** Framework de testes unitários e simulador de navegador para garantir a validação de regras de domínio (Zero I/O) sem depender da interface gráfica real.

---

## 🖥️ Executar os Testes Visuais (HTML)

Os ficheiros HTML permitem testar a interação física (cliques do rato, renderização a 60 FPS e sobreposição de vídeo) no navegador.

### Exemplo integrado - Componentes B6 em abas

O ficheiro `example/index.html` reúne os módulos B6.1, B6.2 e B6.3 numa única interface, com a navegação, o tema e o estado da Jetson fornecidos pela AppShell (B6.4). Cada módulo é apresentado numa aba própria.

1. Na raiz do repositório, inicie o servidor Vite:
   ```bash
   npx vite
   ```
2. Abra `http://localhost:5173/example/` no navegador.
3. Use as abas ou a navegação lateral para alternar entre:
   * **Player (B6.1):** vídeo com caixas de deteção sincronizadas com a timeline.
   * **Editor de zonas (B6.2):** desenhe, edite, exporte ou limpe zonas.
   * **Alertas (B6.3):** simule alertas e teste os filtros e as ações.
   * **Visão geral:** resumo da integração.

### B6.1 - OverlayPlayer (Visualizador e Sincronização por Intervalos)
1. Certifique-se de que o ficheiro `index.html` está configurado para importar o `b6_overlay_player.ts`.
2. Inicie o servidor Vite:
   ```bash
   npx vite
   ```
3. Abra o link fornecido na consola (normalmente `http://localhost:5173`).
4. **O que testar:** O player reproduz o clipe utilizando controlos customizados encapsulados (Play/Pause, barra de progresso temporal, volume e ecrã inteiro). As caixas de deteção e rótulos acompanham de forma fluida os **intervalos temporais** (`startTime` e `endTime`) injetados via DTO através do método `loadMetadataTimeline()`.

### B6.2 - ZoneEditor (Editor Interativo)
1. Certifique-se de que o ficheiro `index.html` está configurado com as importações do `b6_zone_editor.ts`.
2. Inicie o servidor Vite:
   ```bash
   npx vite
   ```
3. Abra a interface no navegador.
4. **O que testar (UX/UI):**
   * **Criar:** Clique esquerdo para desenhar pontos e clique direito (numa área vazia) para fechar o polígono.
   * **Mover:** Clique esquerdo e arraste para mover um ponto ou a zona inteira.
   * **Adicionar:** Passe o rato na linha da aresta (ficará branca), clique esquerdo e puxe para criar um novo vértice.
   * **Apagar:** Clique direito sobre um ponto ou sobre o corpo da zona para excluí-los (com validação anti-cruzamento).

### B6.3 - Console de Alertas (Painel de Eventos)
1. Certifique-se de que o ficheiro `index.html` está configurado com as importações do `b6_alert_console.ts`.
2. Inicie o servidor Vite:
   ```bash
   npx vite
   ```
3. Abra a interface no navegador (`http://localhost:5173/`).
4. **O que testar:** Simule a receção de alertas através do botão correspondente. Teste os fluxos de "Reconhecer", "Silenciar" e "Encerrar", validando na consola do navegador que os eventos estão a ser delegados corretamente sem o painel alterar o seu estado de forma autónoma.

### B6.4 - AppShell (Casca de Aplicação)
1. Certifique-se de que o ficheiro `index.html` está configurado com as importações do `b6_app_shell.ts`.
2. Inicie o servidor Vite:
   ```bash
   npx vite
   ```
3. Abra a interface no navegador.
4. **O que testar:** Valide a injeção do Design System, transição de temas (Dark/Light Mode), menu de navegação e atualização dinâmica das métricas da Jetson Orin Nano.

---

## 🧪 B4 - Testes, Cenários e Integração (Frente Transversal)

Em conformidade com a frente transversal **B4 (Testes e cenários)** do ecossistema ODS, este repositório implementa a verificação estrutural e de contrato da Camada 4 (Interface), garantindo o princípio de *Zero Regras de Negócio*.

Os testes automatizados cobrem as regras críticas de domínio visual, renderização, delegação de eventos via callbacks e exceções da arquitetura.

Para correr a suíte de validação de **todos os submódulos B6 simultaneamente**, execute:

```bash
npx vitest
```

### O que cada teste valida (Garantia de Contrato B4):

* **`b6_overlay_player.test.ts` (B6.1):**
  * Valida o lançamento de exceções rigorosas caso o contentor alvo não seja localizado no DOM.
  * Verifica a correta montagem estrutural do player e a ordenação cronológica de segurança das timelines baseadas em **intervalos temporais** (`startTime` e `endTime`).

* **`b6_zone_editor.test.ts` (B6.2):**
  * **Testes de Domínio Visual:** Valida matematicamente que polígonos cruzados (em forma de "gravata") são rejeitados pelo sistema antes da exportação.
  * **Testes de Estado:** Utilizando fakes de DOM em memória (`jsdom`), garante que sequências complexas de cliques criam, movem e excluem dados de forma segura, respeitando sempre o formato de saída normalizado `[0.0, 1.0]`.

* **`b6_alert_console.test.ts` (B6.3):**
  * **Testes de UI e Delegação:** Valida a renderização dinâmica de cartões de alerta baseados na severidade e garante que as interações disparam estritamente as funções de *callback* (obedecendo ao princípio Zero Regras de Negócio).

* **`b6_app_shell.test.ts` (B6.4):**
  * **Testes de Estrutura e Temas:** Valida a injeção do Design System, a montagem estrutural, a alternância de temas (Dark/Light Mode) e as atualizações do painel de hardware da Jetson.

### Integração Contínua e Watch Mode
Para manter a integração contínua local em andamento enquanto escreve código — uma prática exigida pela frente B4 —, deixe o comando `npx vitest` em execução no terminal. O sistema irá relatar falhas de contrato em tempo real a cada modificação nos ficheiros.

---

## 📖 Referência da API (Como utilizar as funções)

Abaixo encontra-se a documentação das principais funções exportadas por cada módulo para integração com a sua aplicação Frontend principal (ex: React, Next.js, ou Vanilla JS).

### 🎬 B6.1 - OverlayPlayer (`b6_overlay_player.ts`)
A classe `OverlayPlayer` encapsula a lógica de reprodução de vídeo sincronizada com metadados temporais.

* **`new OverlayPlayer(options)`**
  * **Recebe:** `options: PlayerOptions` - Objeto contendo:
    * `containerId` (string): O ID da div vazia onde o player será montado.
    * `videoUrl` (string, opcional): URL do clipe de vídeo a carregar imediatamente.
    * `autoPlay` (boolean, opcional): Se `true`, tenta iniciar o vídeo em *mute* automaticamente.
  * **Retorna:** Instância da classe `OverlayPlayer`.

* **`loadMetadataTimeline(data)`**
  * **Recebe:** `data: FrameIntervalMetadata[]` - Array onde cada objeto define:
    * `startTime` (number): Segundo inicial de visibilidade.
    * `endTime` (number): Segundo final de visibilidade.
    * `boxes` (BoundingBox[]): Array de caixas de deteção (com coordenadas normalizadas `x, y, width, height` entre `0.0` e `1.0`).
  * **Retorna:** `void` (Não retorna nada, apenas atualiza a tela instantaneamente).

* **`loadVideo(url)`**
  * **Recebe:** `url: string` - O link URL para o novo fluxo de vídeo a ser carregado.
  * **Retorna:** `void`. Permite trocar o vídeo em reprodução dinamicamente sem recriar todo o DOM do player.

---

### ✍️ B6.2 - ZoneEditor (`b6_zone_editor.ts`)
A classe `ZoneEditor` gere a tela de desenho vetorial (Canvas) para definir áreas de interesse ou perigo.

* **`new ZoneEditor(containerId)`**
  * **Recebe:** `containerId: string` - O ID da div onde o Canvas interativo será injetado.
  * **Retorna:** Instância da classe `ZoneEditor`.

* **`startDrawingMode()`**
  * **Recebe:** Nenhum parâmetro (`void`).
  * **Retorna:** `void`. Ativa o modo de criação, permitindo ao utilizador clicar na tela para gerar novos pontos e formar polígonos.

* **`stopDrawingMode()`**
  * **Recebe:** Nenhum parâmetro (`void`).
  * **Retorna:** `void`. Desativa a criação de novos pontos. O utilizador poderá apenas mover ou apagar vértices/zonas já existentes.

* **`exportAllZones(name, type)`**
  * **Recebe:** 
    * `name` (string, opcional): Nome padrão a ser atribuído às zonas exportadas (Ex: 'Setor_Risco').
    * `type` (string, opcional): Classificação padrão da zona (Ex: 'DANGER').
  * **Retorna:** `ZonePayload[]` - Um Array de objetos contendo todas as zonas desenhadas. As coordenadas vêm convertidas do formato físico de píxeis para o formato **normalizado `[0.0, 1.0]`** (seguro para ser guardado no Backend e aplicado a qualquer resolução de câmara).

* **`clearAll()`**
  * **Recebe:** Nenhum parâmetro (`void`).
  * **Retorna:** `void`. Limpa imediatamente todas as zonas da memória e apaga a tela, devolvendo um estado virgem ao editor.

---

### 🚨 B6.3 - AlertConsole (`b6_alert_console.ts`)
A classe `AlertConsole` atua como um painel visual passivo para exibição de eventos de segurança. Ela não retém lógica de negócio, comunicando ações do utilizador de volta ao Backend/Serviço através de *callbacks*. **Inclui Filtros Rápidos e Ações em Massa (Bulk).**

* **`new AlertConsole(options)`**
  * **Recebe:** `options: AlertConsoleOptions` - Objeto contendo:
    * `containerId` (string): O ID da div de destino.
    * `onAcknowledge` (função, opcional): Callback chamado ao clicar em "Reconhecer". Recebe o `alertId`.
    * `onMute` (função, opcional): Callback chamado ao clicar em "Silenciar". Recebe o `alertId`.
    * `onClose` (função, opcional): Callback chamado ao clicar em "Encerrar". Recebe o `alertId`.
    * `onFocusTimeline` (função, opcional): Callback chamado ao clicar em "⏱️ Ver no Vídeo". Retorna ao Backend o `alertId` e o `timestamp` para interligação com o player B6.1.
    * `onAcknowledgeAll` (função, opcional): Callback disparado pelo botão global "Reconhecer Todos".
  * **Retorna:** Instância `AlertConsole`.

* **`loadAlerts(alerts)`**, **`addAlert(alert)`**, **`removeAlert(alertId)`**, **`updateAlertStatus(alertId, status)`**
  * *Mantêm a assinatura original para gestão CRUD de renderização.*

* **`acknowledgeAllActiveLocally()`**
  * **Recebe:** Nenhum parâmetro (`void`).
  * **Retorna:** `void`. Método utilitário para o frontend marcar visualmente todos os alertas 'ACTIVE' como 'ACKNOWLEDGED' instantaneamente após receber sucesso da API, evitando chamadas de atualização um a um.

---

### 🖥️ B6.4 - AppShell (`b6_app_shell.ts`)
A classe `AppShell` é o pacote de layout principal que engloba a estrutura de uma aplicação ODS, gerindo o "Design System", "Dark Mode", navegação lateral e um painel reativo do estado do hardware da NVIDIA Jetson.

* **`new AppShell(options)`**
  * **Recebe:** `options: AppShellOptions` - Objeto contendo:
    * `containerId` (string): ID da div raiz, geralmente que ocupe todo o ecrã (`body`).
    * `appName` (string): Título da aplicação a apresentar no cabeçalho.
    * `initialTheme` (string, opcional): `'DARK' | 'LIGHT'`.
    * `onThemeToggle` (função, opcional): Notifica a aplicação se o utilizador mudou de tema.
    * `onNavClick` (função, opcional): Callback acionado com o `routeId` quando o utilizador clica numa opção da barra lateral.
  * **Retorna:** Instância `AppShell`.

* **`setNavItems(items)`**
  * **Recebe:** `items: NavItem[]` - Lista de itens da barra lateral (ex: `{ id: 'cameras', label: 'Câmaras', icon: '📹' }`).
  * **Retorna:** `void`.

* **`updateJetsonStatus(status)`**
  * **Recebe:** `status: JetsonStatus` - Métricas recolhidas pelo backend (`cpuLoad`, `gpuLoad`, `ramUsage`, `temperature`, `isOnline`).
  * **Retorna:** `void`. Atualiza o painel inferior instantaneamente.

* **`getMainContainer()`**
  * **Recebe:** Nenhum parâmetro (`void`).
  * **Retorna:** `HTMLDivElement`. Devolve a referência nativa da `div` da área principal, para que a aplicação possa injetar nela (fazer renderização de rota) instâncias dos módulos **B6.1, B6.2 ou B6.3**.