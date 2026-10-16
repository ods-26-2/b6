# Guia de Desenvolvimento e Execução - Kit B6 (Módulo MOD-2)

Este repositório contém a implementação dos submódulos de interface **B6.1 (OverlayPlayer)** e **B6.2 (ZoneEditor)**, responsáveis pela renderização gráfica acelerada e edição topológica vetorial do ecossistema ODS.

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

### B6.1 - OverlayPlayer (Visualizador e Sincronização por Intervalos)
1. Certifique-se de que o ficheiro `index_player.html` está configurado para importar o `b6_overlay_player.ts`.
2. Inicie o servidor Vite:
   ```bash
   npx vite
   ```
3. Abra o link fornecido na consola (normalmente `http://localhost:5173/index_player.html`).
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

---

## 🧪 Executar a Suíte de Testes Unitários (TDD)

Os testes automatizados cobrem as regras críticas de domínio, o motor de validação topológica (`PolygonValidator`) e as exceções da arquitetura. 

Para correr os testes de **ambos os módulos simultaneamente**, execute:

```bash
npx vitest
```

### O que cada teste valida:

* **`b6_overlay_player.test.ts` (B6.1):**
  * Valida o lançamento de exceções rigorosas caso o contentor alvo não seja localizado no DOM.
  * Verifica a correta montagem estrutural do player e a ordenação cronológica de segurança das timelines baseadas em **intervalos temporais** (`startTime` e `endTime`).

* **`b6_zone_editor.test.ts` (B6.2):**
  * **Testes de Domínio:** Valida matematicamente que polígonos cruzados (em forma de "gravata") são rejeitados pelo sistema antes da exportação.
  * **Testes de Estado:** Utilizando fakes de DOM em memória (`jsdom`), garante que sequências complexas de cliques criam, movem e excluem dados de forma segura, respeitando sempre o formato de saída normalizado `[0.0, 1.0]`.

### Dica de Desenvolvimento
Para manter os testes a correr continuamente em segundo plano (Watch Mode) enquanto escreve código, basta deixar o comando `npx vitest` em execução no terminal. O sistema irá relatar falhas e sucessos em tempo real a cada ficheiro guardado.


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
