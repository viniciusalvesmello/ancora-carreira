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
- **Bônus**: depois do último bloco de perguntas, uma tela de revisão
  (`renderBonusStep` em `app.js`) lista só as afirmações com nota 4 ou mais
  (`bonusCandidates()`), ordenadas da nota mais alta pra mais baixa — igual
  à instrução do PDF ("localize os itens em que você deu pontos mais altos
  ... selecione as três que sejam as mais verdadeiras"). O usuário marca
  exatamente `Math.min(BONUS_LIMIT, candidatos.length)` itens (normalmente
  3, mas menos se houver poucas notas altas); cada um marcado ganha +4
  pontos extra (`BONUS_POINTS`). "Ver resultado" só libera com esse número
  exato marcado.
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
- `app.js` — toda a lógica: as telas (home, quiz, revisão do bônus,
  resultado), cálculo das médias, persistência em `localStorage`, diálogo de
  confirmação, compartilhar. O quiz é paginado em blocos de `BLOCK_SIZE = 4`
  perguntas (`TOTAL_BLOCKS = 10`), com barra de progresso e navegação
  Voltar/Próximo — avança sozinho ao terminar um bloco, inclusive o último,
  que leva pra etapa de revisão do bônus (`state.blockIndex === TOTAL_BLOCKS`
  é o sinal de que a pessoa está nessa etapa, não mais num bloco de perguntas).

Não há `package.json` nem etapa de build local. O app abre direto pelo
`index.html` ou por qualquer servidor estático.

## Deploy e cache-busting

O `index.html` referencia `styles.css`, `data.js` e `app.js` com
`?v=__ASSET_VERSION__` em vez de um número fixo. Esse placeholder só existe
pro deploy: `.github/workflows/deploy-pages.yml` roda a cada push na `main`,
troca `__ASSET_VERSION__` pelo SHA curto do commit (`sed`, sem bundler nem
dependência nenhuma) e publica no GitHub Pages via
`actions/upload-pages-artifact` + `actions/deploy-pages`. Isso faz o
navegador buscar os arquivos de novo a cada deploy, em vez de segurar uma
versão antiga em cache — sem isso, quem já tinha aberto o site antes só via
a mudança depois de um hard refresh.

Por causa disso, a fonte do GitHub Pages no repositório **precisa** estar
configurada como "GitHub Actions" (não "Deploy from a branch") — já foi
trocado via API (`build_type: workflow`), mas se algum dia voltar pro modo
antigo, o workflow para de ter efeito e o cache-busting some.

Rodando localmente (`file://` ou servidor estático), o placeholder
`__ASSET_VERSION__` nunca é substituído — os navegadores ignoram a query
string ao resolver o arquivo, então tudo funciona normalmente, só sem
cache-busting (não é necessário em dev).

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
  nativo (sem JS de estado visual); o marcador de bônus (só na etapa de
  revisão final) é um `<button>` com classes `.tag`/`.tag-outline`/
  `.tag-accent`, não um novo componente.
- Confirmações destrutivas (reiniciar o teste) usam `openDialog(...)`
  (`.dialog-backdrop`/`.dialog` do design system), não `window.confirm()`.

## Como validar uma mudança antes de considerar pronta

Não há suíte de testes automatizados persistida no repositório. Ao mexer no
código, valide manualmente — ou com o MCP do Playwright/Browser, se
disponível — percorrendo:

1. Fluxo completo: home → 10 blocos de 4 perguntas → revisão do bônus →
   resultado. "Próximo" só habilita com as 4 notas do bloco atual
   preenchidas, e avança sozinho pouco depois de a última ficar completa
   (inclusive do último bloco pra revisão do bônus); "Voltar" funciona em
   qualquer bloco que não seja o primeiro e preserva as respostas já dadas.
2. Na revisão do bônus: só aparecem afirmações com nota 4 ou mais, ordenadas
   da nota mais alta pra mais baixa; "Ver resultado" só habilita com
   exatamente 3 marcadas (ou o total de candidatas, se houver menos de 3);
   um item a mais não pode ser marcado além do limite; desmarcar um (ficando
   abaixo do número exigido) desabilita "Ver resultado" de novo; "Voltar"
   leva de volta ao último bloco de perguntas, preservando os bônus já
   marcados. Testar também o caso raro de nenhuma nota ≥ 4 (mensagem
   avisando que não há bônus, sem exigir nenhuma marcação).
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
- Trocar `?v=__ASSET_VERSION__` por um número fixo em `index.html`, ou
  apagar `.github/workflows/deploy-pages.yml` — isso desativa o
  cache-busting automático do deploy (ver "Deploy e cache-busting" acima).
