# AGENTS.md — Âncoras de Carreira

Guia para quem (humano ou agente de IA) for evoluir este projeto.

## Visão geral

Frontend **stateless** do Teste Âncoras de Carreira, de Edgar Schein. Não
existe backend, banco de dados, nem envio de dados a servidor algum — tudo é
calculado e exibido no navegador. A única persistência é o progresso do quiz
em `localStorage`, só pra o usuário não perder respostas se fechar a aba sem
querer (ver `app.js`).

**Stack:** HTML/CSS/JS puro, sem framework de aplicação e sem build step.

## De onde vêm o visual e o conteúdo

- **`styles.css` é uma cópia literal do design system "Nocturne"**, publicado
  em `https://claude.ai/design/p/49a63934-a72e-415e-8b7f-e14e4646c035` (org
  default do usuário no Claude Design). Os tokens (`--color-*`, `--font-*`,
  `--space-*`, `--radius-*`, `--shadow-*`) e as classes de componente (`.btn`,
  `.tag`, `.card`, `.seg`/`.seg-opt`, `.radio`, `.nav`, `.table`, `.dialog*`,
  `.hr`, `.lighten`) vieram de lá — **não redefinir esses tokens nem inventar
  classes paralelas às já existentes**. Extensões específicas deste projeto
  (barra de progresso do quiz, layout das perguntas, barras do gráfico de
  resultado) ficam só no bloco marcado no final do arquivo, e usam só os
  tokens já existentes. Se o design system publicado mudar, reabra o link
  acima, extraia o `styles.css` atualizado (pelo chat do Claude Design, pedindo
  o conteúdo literal do arquivo) e substitua só o bloco de cima.
- **O gráfico de resultado é mono-acento de propósito**: o Nocturne é
  documentado como um "mono scheme" (uma cor de destaque só) e pede pra não
  espalhar cor saturada em área grande — por isso as 8 barras usam a mesma
  `--color-accent`, diferenciadas por comprimento e rótulo, não por 8 matizes
  diferentes.
- **`data.js` reproduz fielmente o instrumento oficial** (as 40 afirmações e
  as 8 descrições de âncoras), extraído do PDF do CEFET-MG/DCSA:
  `https://www.dcsa.cefetmg.br/wp-content/uploads/sites/35/2018/09/Teste-ancora-de-carreira.pdf`.
  Essa é uma decisão explícita deste projeto — **ao contrário de outros
  projetos de teste da mesma família, aqui o texto não deve ser parafraseado**
  nem reescrito; qualquer correção de digitação deve ser conferida contra o
  PDF original antes de ser aplicada.

## A lógica de pontuação (Schein)

- 40 itens, nota de 1 a 6 cada (`1` nunca verdadeira … `6` sempre verdadeira).
- 8 âncoras (`A` a `H`, ver `CAREER_ANCHORS` em `data.js`). O item `n`
  pertence à âncora no índice `(n - 1) % 8` da lista
  `['A','B','C','D','E','F','G','H']` — cada âncora acaba com exatamente 5
  itens (ex.: `A` = itens 1, 9, 17, 25, 33; `H` = itens 8, 16, 24, 32, 40).
- **Bônus**: ao final, o usuário marca exatamente 3 itens (normalmente os que
  deu nota mais alta) como "as mais verdadeiras pra ele"; cada um ganha +4
  pontos extra (`BONUS_POINTS` em `app.js`). `BONUS_LIMIT = 3` é tanto o
  máximo quanto o mínimo exigido — `canShowResult()` só libera "Ver
  resultado" com as 40 notas preenchidas **e** os 3 itens de bônus marcados.
- **Média por âncora**: soma dos 5 itens daquela âncora (nota + bônus quando
  marcado) dividida por 5 (`computeAverages` em `app.js`). A âncora com maior
  média é a dominante; em caso de empate, desempata pela ordem `ANCHOR_ORDER`
  (`A` antes de `B`, etc.).

Essa lógica foi conferida item a item contra uma planilha de exemplo do
próprio usuário (fórmulas `SOMA`/`÷5` batendo com o que está implementado em
`computeAverages`).

## Estrutura dos arquivos

- `index.html` — casca da página: `.nav` (cabeçalho) + `<main id="app">`,
  onde o conteúdo de cada tela é montado via JS.
- `styles.css` — Nocturne (tokens + componentes) + extensões do projeto.
- `data.js` — todo o conteúdo textual: `CAREER_ANCHORS` (as 8 âncoras) e
  `QUESTIONS` (as 40 afirmações, já com a âncora resolvida).
- `app.js` — toda a lógica: as 3 telas (home, quiz, resultado), cálculo das
  médias, persistência em `localStorage`, diálogo de confirmação, compartilhar.

Não há `package.json` nem etapa de build. O app abre direto pelo
`index.html` ou por qualquer servidor estático.

## Como rodar localmente

```bash
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000`. Abrir o `index.html` direto no
navegador (`file://`) também funciona, mas prefira um servidor estático ao
testar a persistência de progresso (`localStorage` é restrito em `file://`
em alguns navegadores).

## Convenções a seguir

- **Não introduzir framework ou bundler.**
- **Manter todo o texto em português (pt-BR).**
- **Nunca redefinir os tokens do Nocturne nem duplicar uma classe que já
  existe** (`.btn*`, `.tag*`, `.card*`, `.seg*`, `.radio`, `.nav*`, `.table`,
  `.dialog*`) — extensões novas só no bloco final de `styles.css`.
- **Toda leitura/escrita em `localStorage` deve ficar dentro de `safeStorage`**
  (em `app.js`), que já envolve as chamadas em `try/catch`. Nunca chamar
  `localStorage` diretamente em outro lugar do código.
- **Preservar o suporte à impressão** (`@media print` em `styles.css`) ao
  alterar a tela de resultado — botões de ação e navegação devem ter a
  classe `no-print`.
- A escala 1–6 de cada pergunta é um `.seg` com `<input type="radio">`
  nativo (sem JS de estado visual); o marcador de bônus é um `<button>` com
  classes `.tag`/`.tag-outline`/`.tag-accent`, não um novo componente.
- Confirmações destrutivas (reiniciar o teste) usam `openDialog(...)`
  (`.dialog-backdrop`/`.dialog` do design system), não `window.confirm()`.

## Como validar uma mudança antes de considerar pronta

Não há suíte de testes automatizados persistida no repositório. Ao mexer no
código, valide manualmente — ou com o MCP do Playwright/Browser, se
disponível — percorrendo:

1. Fluxo completo: home → 40 perguntas → resultado.
2. "Ver resultado" só habilita com as 40 notas preenchidas **e** exatamente
   3 itens de bônus marcados; um 4º item de bônus não pode ser marcado
   enquanto 3 já estiverem marcados; desmarcar um bônus (ficando com menos
   de 3) desabilita "Ver resultado" de novo.
3. Na tela de resultado, os cards de "Descrição das 8 âncoras" aparecem na
   mesma ordem das barras/tabela — da maior média pra menor, não na ordem
   fixa A→H.
4. Persistência: responder parte das perguntas, recarregar a página,
   confirmar que aparece o banner de retomada com a contagem certa; concluir
   o teste e confirmar que o `localStorage` foi limpo.
5. Diálogo de reiniciar (home e quiz): abre o `.dialog`, cancelar não apaga
   nada, confirmar limpa o progresso e volta pra home.
6. Compartilhar: os 3 caminhos (Web Share API, clipboard com "Copiado!",
   `prompt` de último recurso).
7. Impressão: preview de impressão na tela de resultado, controles com
   `.no-print` somem.
8. Responsividade em viewport mobile.

## O que evitar

- Adicionar chamadas de rede ou qualquer backend — quebraria o caráter
  stateless que é o requisito central do projeto.
- Remover o fallback de `try/catch` em torno do `localStorage`.
- Parafrasear ou "melhorar" o texto das afirmações/descrições — é o
  instrumento oficial, precisa continuar fiel ao PDF fonte.
- Redefinir tokens do Nocturne ou criar uma segunda cor de destaque (o
  sistema é mono-acento de propósito).
- Adicionar build tooling (bundler, transpiler, framework de app) sem uma
  razão explícita.
