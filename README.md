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

### B6.1 - OverlayPlayer (Visualizador)
1. Certifique-se de que o ficheiro `index.html` na raiz está configurado para importar o `b6_overlay_player.ts`.
2. Inicie o servidor Vite:
   ```bash
   npx vite
   ```
3. Abra o link fornecido na consola (normalmente `http://localhost:5173/`).
4. **O que testar:** O vídeo deve ser reproduzido fluidamente em segundo plano, com os polígonos e caixas de deteção (Mock DTOs) renderizados perfeitamente alinhados por cima.

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
  * Valida o lançamento de exceções rigorosas (ex: `RenderInitializationError`) caso o hardware não suporte a API de aceleração gráfica escolhida (Canvas2D/WebGL).
  * Verifica se o ciclo de renderização limpa a memória gráfica do ecrã em cada *frame* antes de pintar os novos metadados.

* **`b6_zone_editor.test.ts` (B6.2):**
  * **Testes de Domínio:** Valida matematicamente que polígonos cruzados (em forma de "gravata") são rejeitados pelo sistema antes da exportação.
  * **Testes de Estado:** Utilizando fakes de DOM em memória (`jsdom`), garante que sequências complexas de cliques criam, movem e excluem dados de forma segura, respeitando sempre o formato de saída normalizado `[0.0, 1.0]`.

### Dica de Desenvolvimento
Para manter os testes a correr continuamente em segundo plano (Watch Mode) enquanto escreve código, basta deixar o comando `npx vitest` em execução no terminal. O sistema irá relatar falhas e sucessos em tempo real a cada ficheiro guardado.
