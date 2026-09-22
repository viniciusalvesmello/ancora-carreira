# Âncoras de Carreira

Teste stateless do modelo de **Âncoras de Carreira**, de Edgar Schein — ajuda você a descobrir quais dos 8 pilares (competência técnico-funcional, competência administrativa geral, autonomia e independência, segurança e estabilidade, criatividade empreendedora, dedicação a uma causa, desafio puro e estilo de vida) mais orientam suas decisões profissionais.

🔗 **[Acessar o teste](https://viniciusalvesmello.github.io/ancora-carreira/)**

## Sobre

Baseado no instrumento oficial de 40 itens do DCSA/CEFET-MG (uma adaptação do inventário de âncoras de carreira de Edgar Schein, da Sloan School of Management do MIT), reproduzido fielmente a partir do [PDF original](https://www.dcsa.cefetmg.br/wp-content/uploads/sites/35/2018/09/Teste-ancora-de-carreira.pdf).

Como funciona:

1. As 40 afirmações são respondidas numa escala de 1 a 6, em blocos de 4 por vez, com barra de progresso.
2. No final, uma etapa de revisão lista só as afirmações com nota 4 ou mais — da mais alta pra mais baixa — pra você escolher as 3 mais verdadeiras, que ganham 4 pontos extra cada (o mecanismo de bônus do método original).
3. O resultado mostra a média de cada uma das 8 âncoras, a âncora dominante (e a secundária, se houver), e a descrição completa de todas as 8.

## Características

- **100% stateless** — sem backend, sem banco de dados, sem envio de dados a servidor nenhum. Tudo é calculado e exibido no navegador; o progresso do quiz é salvo só em `localStorage` (local, no seu navegador), pra não se perder se a aba fechar sem querer.
- **Sem build step** — HTML, CSS e JavaScript puro, sem framework, sem bundler, sem `package.json`. Abre direto pelo `index.html` ou por qualquer servidor estático.
- **Compartilhável** — resultado exportável via Web Share API nativa, cópia pra área de transferência, ou impressão/PDF.
- Interface construída sobre o design system **Nocturne**.

## Rodando localmente

```bash
git clone https://github.com/viniciusalvesmello/ancora-carreira.git
cd ancora-carreira
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000`. Abrir o `index.html` direto no navegador (`file://`) também funciona, mas um servidor estático é melhor pra testar a persistência de progresso.

## Stack

HTML, CSS e JavaScript puro — sem dependências, sem etapa de build local.

## Estrutura do projeto

| Arquivo | Conteúdo |
| --- | --- |
| `index.html` | Casca da página e cabeçalho |
| `styles.css` | Tokens e componentes do Nocturne + extensões do projeto |
| `data.js` | As 40 afirmações e as 8 descrições de âncoras |
| `app.js` | Toda a lógica: telas, cálculo das médias, persistência, compartilhar |

Convenções de desenvolvimento, a lógica de pontuação em detalhe e o checklist de validação manual estão documentados em [AGENTS.md](AGENTS.md).

## Deploy

Publicado automaticamente no GitHub Pages a cada push na `main`, via GitHub Actions ([`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)), que também cuida do cache-busting dos arquivos estáticos a cada versão.

## Créditos

- Teoria e instrumento original: Edgar Schein (MIT Sloan School of Management).
- Versão do teste usada como fonte: [Departamento de Ciências Sociais Aplicadas (DCSA) do CEFET-MG](https://www.dcsa.cefetmg.br/).
