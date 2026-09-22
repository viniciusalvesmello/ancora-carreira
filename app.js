// Lógica do app Âncoras de Carreira: navegação entre telas, estado do quiz,
// cálculo das médias por âncora e renderização do resultado. Depende dos
// dados globais definidos em data.js (QUESTIONS, CAREER_ANCHORS,
// ANCHOR_LETTERS). Ver AGENTS.md para as convenções do projeto.

const STORAGE_KEY = 'ancora-carreira-progress-v1';
const TOTAL_QUESTIONS = QUESTIONS.length;
const BLOCK_SIZE = 4;
const TOTAL_BLOCKS = Math.ceil(TOTAL_QUESTIONS / BLOCK_SIZE);
const BONUS_LIMIT = 3;
const BONUS_POINTS = 4;
const ANCHOR_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const FADE_MS = 220;
const AUTO_ADVANCE_MS = 260;

const app = document.getElementById('app');

const state = {
  blockIndex: 0,
  ratings: {}, // { [questionNumber]: 1..6 }
  bonus: [], // números de pergunta marcados como bônus (precisa ter exatamente BONUS_LIMIT pra liberar o resultado)
};

// ---------- Transição entre telas (fade) ----------

function paint(buildScreen) {
  if (app.childElementCount === 0) {
    buildScreen();
    requestAnimationFrame(() => app.classList.add('is-visible'));
    return;
  }
  app.classList.remove('is-visible');
  window.setTimeout(() => {
    buildScreen();
    void app.offsetWidth; // força reflow pra reiniciar a transição
    app.classList.add('is-visible');
  }, FADE_MS);
}

// ---------- Armazenamento seguro (localStorage pode estar bloqueado) ----------

const safeStorage = {
  get() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  },
  set(data) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      // Storage bloqueado (modo privado, cookies desabilitados etc.) — o
      // quiz continua funcionando normalmente em memória.
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      // Sem problema — não havia nada persistido de qualquer forma.
    }
  },
};

function saveProgress() {
  safeStorage.set({ blockIndex: state.blockIndex, ratings: state.ratings, bonus: state.bonus });
}

function isValidProgress(saved) {
  return (
    saved &&
    typeof saved.ratings === 'object' &&
    saved.ratings !== null &&
    Array.isArray(saved.bonus) &&
    Object.keys(saved.ratings).length > 0 &&
    Object.keys(saved.ratings).length <= TOTAL_QUESTIONS &&
    saved.bonus.length <= BONUS_LIMIT
  );
}

function answeredCount() {
  return Object.keys(state.ratings).length;
}

function clampBlockIndex(value) {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  // TOTAL_BLOCKS (um além do último bloco de perguntas) é a etapa de revisão do bônus.
  return Math.min(Math.max(n, 0), TOTAL_BLOCKS);
}

// Afirmações elegíveis pro bônus: nota 4 ou mais, da mais alta pra mais baixa.
function bonusCandidates() {
  return QUESTIONS.filter((q) => (state.ratings[q.number] || 0) >= 4).sort((a, b) => {
    const diff = (state.ratings[b.number] || 0) - (state.ratings[a.number] || 0);
    if (diff !== 0) return diff;
    return a.number - b.number;
  });
}

// ---------- Cálculo de score ----------

function computeAverages(ratings, bonus) {
  const sums = {};
  ANCHOR_ORDER.forEach((letter) => {
    sums[letter] = 0;
  });
  QUESTIONS.forEach((q) => {
    const base = ratings[q.number] || 0;
    const extra = bonus.includes(q.number) ? BONUS_POINTS : 0;
    sums[q.anchor] += base + extra;
  });
  const averages = {};
  ANCHOR_ORDER.forEach((letter) => {
    averages[letter] = sums[letter] / 5;
  });
  return averages;
}

function normalizeForBars(averages) {
  const values = Object.values(averages);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const percentages = {};
  ANCHOR_ORDER.forEach((letter) => {
    percentages[letter] = range === 0 ? 50 : ((averages[letter] - min) / range) * 100;
  });
  return percentages;
}

function getDominantAndSecondary(averages) {
  const sorted = sortAnchorsByScore(averages);
  return [sorted[0], sorted[1]];
}

function sortAnchorsByScore(averages) {
  return ANCHOR_ORDER.slice().sort((a, b) => {
    if (averages[b] !== averages[a]) return averages[b] - averages[a];
    return ANCHOR_ORDER.indexOf(a) - ANCHOR_ORDER.indexOf(b);
  });
}

// ---------- Compartilhar resultado ----------

function buildShareText(dominant, secondary, averages) {
  const lines = [`Meu resultado no Teste Âncoras de Carreira: ${CAREER_ANCHORS[dominant].name}`];
  if (secondary && averages[secondary] !== averages[dominant]) {
    lines.push(`Âncora secundária: ${CAREER_ANCHORS[secondary].name}`);
  }
  lines.push(ANCHOR_ORDER.map((letter) => `${letter}: ${averages[letter].toFixed(1)}`).join(' · '));
  return lines.join('\n');
}

async function shareResult(text, button) {
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Meu resultado no Teste Âncoras de Carreira', text });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      // Se o compartilhamento nativo falhar por outro motivo, cai nos
      // fallbacks abaixo em vez de deixar o clique sem efeito.
    }
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      const original = button.textContent;
      button.textContent = 'Copiado!';
      setTimeout(() => {
        button.textContent = original;
      }, 2000);
      return;
    } catch (err) {
      // Segue pro fallback final.
    }
  }

  window.prompt('Copie seu resultado:', text);
}

// ---------- Diálogo de confirmação (componente .dialog do design system) ----------

function openDialog({ title, body, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', onConfirm }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'dialog-backdrop no-print';
  backdrop.innerHTML = `
    <div class="dialog elev-lg" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title">
      <div class="dialog-title" id="dialog-title">${title}</div>
      <div class="dialog-body">${body}</div>
      <div class="dialog-actions">
        <button type="button" class="btn btn-secondary" id="dialog-cancel">${cancelLabel}</button>
        <button type="button" class="btn btn-primary" id="dialog-confirm">${confirmLabel}</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  function close() {
    backdrop.remove();
    document.removeEventListener('keydown', onKeydown);
  }
  function onKeydown(event) {
    if (event.key === 'Escape') close();
  }

  document.addEventListener('keydown', onKeydown);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });
  backdrop.querySelector('#dialog-cancel').addEventListener('click', close);
  backdrop.querySelector('#dialog-confirm').addEventListener('click', () => {
    close();
    onConfirm();
  });
}

function confirmReset(onConfirm) {
  openDialog({
    title: 'Reiniciar o teste?',
    body: 'Todas as respostas marcadas serão apagadas. Essa ação não pode ser desfeita.',
    confirmLabel: 'Reiniciar',
    onConfirm,
  });
}

// ---------- Telas ----------

function renderHome() {
  paint(() => {
    const saved = safeStorage.get();
    const hasProgress = isValidProgress(saved);
    const answered = hasProgress ? Object.keys(saved.ratings).length : 0;

    app.innerHTML = `
      <section class="hero">
        <p class="eyebrow">Autoconhecimento profissional</p>
        <h1>Âncoras de Carreira</h1>
        <p>Na década de 1970, Edgar Schein, professor da Sloan School of Management (MIT), desenvolveu a teoria das âncoras de carreira: oito pilares que orientam as decisões profissionais de cada pessoa. Este teste ajuda você a descobrir quais delas mais pesam nas suas escolhas.</p>
      </section>

      ${
        hasProgress
          ? `
      <div class="card resume-banner elev-sm no-print">
        <div>
          <div class="card-title">Continuar de onde parou?</div>
          <div class="resume-banner-sub">Você já respondeu ${answered} de ${TOTAL_QUESTIONS} perguntas.</div>
        </div>
        <div class="resume-banner-actions">
          <button class="btn btn-ghost" id="discard-btn" type="button">Recomeçar</button>
          <button class="btn btn-primary" id="resume-btn" type="button">Continuar</button>
        </div>
      </div>`
          : `<button class="btn btn-primary" id="start-btn" type="button">Iniciar teste</button>`
      }

      <div class="anchor-grid">
        ${ANCHOR_ORDER.map(
          (letter) => `
        <div class="card elev-sm">
          <span class="card-kicker">Âncora ${letter}</span>
          <span class="card-title">${CAREER_ANCHORS[letter].name}</span>
          <p class="card-body">${CAREER_ANCHORS[letter].summary}</p>
        </div>`
        ).join('')}
      </div>

      <h2>Como funciona</h2>
      <ol class="steps">
        <li>Responda em blocos de 4 afirmações por vez (${TOTAL_BLOCKS} blocos ao todo), dando uma nota de 1 a 6 pra cada uma conforme o quanto ela é verdadeira pra você.</li>
        <li>No final, revise só as afirmações que você pontuou 4 ou mais, da mais alta pra mais baixa, e marque as 3 mais verdadeiras — elas ganham 4 pontos extra cada.</li>
        <li>Veja o resultado: a média de cada uma das 8 âncoras e qual delas mais te representa.</li>
      </ol>
    `;

    if (hasProgress) {
      document.getElementById('resume-btn').addEventListener('click', () => {
        state.ratings = { ...saved.ratings };
        state.bonus = [...saved.bonus];
        state.blockIndex = clampBlockIndex(saved.blockIndex);
        renderQuiz();
      });
      document.getElementById('discard-btn').addEventListener('click', () => {
        confirmReset(() => {
          safeStorage.clear();
          renderHome();
        });
      });
    } else {
      document.getElementById('start-btn').addEventListener('click', () => {
        state.blockIndex = 0;
        state.ratings = {};
        state.bonus = [];
        renderQuiz();
      });
    }
  });
}

function questionCardHTML(q) {
  const rating = state.ratings[q.number];
  return `
    <li class="card quiz-card elev-sm" data-question="${q.number}">
      <span class="card-kicker quiz-card-number">Pergunta ${q.number}</span>
      <p class="card-body quiz-card-text">${q.text}</p>
      <div class="seg" role="radiogroup" aria-label="Nota da pergunta ${q.number}, de 1 a 6">
        ${[1, 2, 3, 4, 5, 6]
          .map(
            (value) => `
          <label class="seg-opt">
            <input type="radio" name="q${q.number}" value="${value}" ${rating === value ? 'checked' : ''} />${value}
          </label>`
          )
          .join('')}
      </div>
    </li>
  `;
}

function bonusCandidateHTML(q, requiredBonus) {
  const rating = state.ratings[q.number];
  const isBonus = state.bonus.includes(q.number);
  const disabled = !isBonus && state.bonus.length >= requiredBonus;
  return `
    <li class="card quiz-card elev-sm" data-question="${q.number}">
      <span class="card-kicker quiz-card-number">Pergunta ${q.number} · nota ${rating}</span>
      <p class="card-body quiz-card-text">${q.text}</p>
      <div class="quiz-card-row">
        <button type="button" class="tag bonus-toggle ${isBonus ? 'tag-accent' : 'tag-outline'}" data-bonus="${q.number}" ${disabled ? 'disabled' : ''}>
          ${isBonus ? '★ +4 pontos' : '☆ Marcar como mais verdadeira'}
        </button>
      </div>
    </li>
  `;
}

function currentBlockQuestions() {
  const start = state.blockIndex * BLOCK_SIZE;
  return QUESTIONS.slice(start, start + BLOCK_SIZE);
}

function isBlockComplete(blockQuestions) {
  return blockQuestions.every((q) => state.ratings[q.number] != null);
}

function renderQuiz() {
  if (state.blockIndex >= TOTAL_BLOCKS) {
    renderBonusStep();
  } else {
    renderQuestionBlock();
  }
}

function renderQuestionBlock() {
  paint(() => {
    const blockQuestions = currentBlockQuestions();
    const isFirstBlock = state.blockIndex === 0;
    const isLastBlock = state.blockIndex + 1 >= TOTAL_BLOCKS;
    const percentDone = Math.round((state.blockIndex / TOTAL_BLOCKS) * 100);
    let autoAdvanceTimer = null;

    app.innerHTML = `
      <div class="quiz-topline">
        <span class="section-label" style="margin: 0">Bloco ${state.blockIndex + 1} de ${TOTAL_BLOCKS}</span>
        <span class="quiz-percent">${percentDone}% concluído</span>
      </div>
      <div class="progress-track"><span class="progress-fill" style="width: ${percentDone}%"></span></div>

      <p class="quiz-hint">Dê uma nota de 1 a 6 pra cada afirmação — 1 nunca é verdadeira pra você, 6 é sempre verdadeira.</p>

      <ul class="quiz-list">
        ${blockQuestions.map((q) => questionCardHTML(q)).join('')}
      </ul>

      <div class="quiz-nav no-print">
        <button type="button" class="btn btn-ghost" id="back-btn" ${isFirstBlock ? 'disabled' : ''}>Voltar</button>
        <div class="quiz-nav-secondary">
          <button type="button" class="btn btn-ghost" id="restart-btn">Reiniciar</button>
          <button type="button" class="btn btn-primary" id="next-btn">${isLastBlock ? 'Continuar' : 'Próximo'}</button>
        </div>
      </div>
    `;

    const list = app.querySelector('.quiz-list');
    const nextBtn = document.getElementById('next-btn');
    const backBtn = document.getElementById('back-btn');
    const restartBtn = document.getElementById('restart-btn');

    function refreshNav() {
      nextBtn.disabled = !isBlockComplete(blockQuestions);
    }
    refreshNav();

    function scheduleAutoAdvance() {
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = null;
      }
      if (isBlockComplete(blockQuestions)) {
        autoAdvanceTimer = setTimeout(goNext, AUTO_ADVANCE_MS);
      }
    }

    list.addEventListener('change', (event) => {
      const input = event.target;
      if (!input.matches('input[type="radio"]')) return;
      const li = input.closest('[data-question]');
      state.ratings[Number(li.dataset.question)] = Number(input.value);
      saveProgress();
      refreshNav();
      scheduleAutoAdvance();
    });

    function goNext() {
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = null;
      }
      if (!isBlockComplete(blockQuestions)) return;
      state.blockIndex += 1; // no último bloco isso chega em TOTAL_BLOCKS: a etapa do bônus
      saveProgress();
      renderQuiz();
    }
    nextBtn.addEventListener('click', goNext);

    backBtn.addEventListener('click', () => {
      if (state.blockIndex === 0) return;
      if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
      state.blockIndex -= 1;
      saveProgress();
      renderQuiz();
    });

    restartBtn.addEventListener('click', () => {
      if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
      confirmReset(() => {
        state.blockIndex = 0;
        state.ratings = {};
        state.bonus = [];
        safeStorage.clear();
        renderHome();
      });
    });
  });
}

function renderBonusStep() {
  paint(() => {
    const candidates = bonusCandidates();
    const requiredBonus = Math.min(BONUS_LIMIT, candidates.length);
    // Se o usuário voltou e mudou uma nota, um bônus marcado pode não ser mais elegível (nota < 4).
    state.bonus = state.bonus.filter((n) => candidates.some((q) => q.number === n));

    app.innerHTML = `
      <div class="quiz-topline">
        <span class="section-label" style="margin: 0">Revisão final</span>
        <span class="quiz-percent">100% concluído</span>
      </div>
      <div class="progress-track"><span class="progress-fill" style="width: 100%"></span></div>

      <h2>Escolha as ${requiredBonus || 3} mais verdadeiras</h2>
      <p class="quiz-hint">
        ${
          candidates.length === 0
            ? 'Nenhuma afirmação recebeu nota 4 ou mais, então não há bônus pra marcar — pode seguir direto pro resultado.'
            : `Aqui estão só as afirmações que você pontuou 4 ou mais, da nota mais alta pra mais baixa. Marque as ${requiredBonus} que são as mais verdadeiras pra você — cada uma ganha 4 pontos extra na conta final.`
        }
      </p>

      <ul class="quiz-list">
        ${candidates.map((q) => bonusCandidateHTML(q, requiredBonus)).join('')}
      </ul>

      ${candidates.length > 0 ? `<p class="text-muted quiz-bonus-note">Bônus marcados: ${state.bonus.length}/${requiredBonus}</p>` : ''}

      <div class="quiz-nav no-print">
        <button type="button" class="btn btn-ghost" id="back-btn">Voltar</button>
        <div class="quiz-nav-secondary">
          <button type="button" class="btn btn-ghost" id="restart-btn">Reiniciar</button>
          <button type="button" class="btn btn-primary" id="next-btn" ${state.bonus.length === requiredBonus ? '' : 'disabled'}>Ver resultado</button>
        </div>
      </div>
    `;

    const list = app.querySelector('.quiz-list');
    const nextBtn = document.getElementById('next-btn');
    const backBtn = document.getElementById('back-btn');
    const restartBtn = document.getElementById('restart-btn');

    function refreshBonusUI() {
      list.querySelectorAll('[data-bonus]').forEach((btn) => {
        const number = Number(btn.dataset.bonus);
        const isBonus = state.bonus.includes(number);
        const disabled = !isBonus && state.bonus.length >= requiredBonus;
        btn.classList.toggle('tag-accent', isBonus);
        btn.classList.toggle('tag-outline', !isBonus);
        btn.disabled = disabled;
        btn.textContent = isBonus ? '★ +4 pontos' : '☆ Marcar como mais verdadeira';
      });
      const note = document.querySelector('.quiz-bonus-note');
      if (note) note.textContent = `Bônus marcados: ${state.bonus.length}/${requiredBonus}`;
      nextBtn.disabled = state.bonus.length !== requiredBonus;
    }

    list.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-bonus]');
      if (!btn || btn.disabled) return;
      const number = Number(btn.dataset.bonus);
      const idx = state.bonus.indexOf(number);
      if (idx >= 0) {
        state.bonus.splice(idx, 1);
      } else if (state.bonus.length < requiredBonus) {
        state.bonus.push(number);
      } else {
        return;
      }
      saveProgress();
      refreshBonusUI();
    });

    nextBtn.addEventListener('click', () => {
      if (state.bonus.length !== requiredBonus) return;
      safeStorage.clear();
      renderResult();
    });

    backBtn.addEventListener('click', () => {
      state.blockIndex = TOTAL_BLOCKS - 1;
      saveProgress();
      renderQuiz();
    });

    restartBtn.addEventListener('click', () => {
      confirmReset(() => {
        state.blockIndex = 0;
        state.ratings = {};
        state.bonus = [];
        safeStorage.clear();
        renderHome();
      });
    });
  });
}

function renderResult() {
  paint(() => {
    const averages = computeAverages(state.ratings, state.bonus);
    const percentages = normalizeForBars(averages);
    const [dominant, secondary] = getDominantAndSecondary(averages);
    const sortedLetters = sortAnchorsByScore(averages);
    const hasSecondary = secondary && averages[secondary] !== averages[dominant];

    app.innerHTML = `
      <p class="eyebrow">Seu relatório de âncoras</p>
      <h1>Seu resultado</h1>
      <p class="text-muted">Sua âncora dominante é <strong>${CAREER_ANCHORS[dominant].name}</strong>${
        hasSecondary ? `, com <strong>${CAREER_ANCHORS[secondary].name}</strong> logo atrás` : ''
      }.</p>

      <div class="result-bars card elev-sm">
        ${sortedLetters
          .map(
            (letter) => `
          <div class="bar-row">
            <span class="bar-letter">${letter}</span>
            <span class="bar-track"><span class="bar-fill" style="width: ${Math.max(percentages[letter], 4)}%"></span></span>
            <span class="bar-value">${averages[letter].toFixed(1)}</span>
          </div>`
          )
          .join('')}
      </div>

      <table class="table">
        <thead><tr><th>Âncora</th><th>Nome</th><th>Média</th></tr></thead>
        <tbody>
          ${sortedLetters
            .map(
              (letter) => `
          <tr><td>${letter}</td><td>${CAREER_ANCHORS[letter].name}</td><td>${averages[letter].toFixed(1)}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>

      <div class="anchor-detail card elev-sm">
        <span class="card-kicker">Âncora dominante — ${dominant}</span>
        <span class="card-title">${CAREER_ANCHORS[dominant].name}</span>
        <p class="card-body">${CAREER_ANCHORS[dominant].description}</p>
      </div>
      ${
        hasSecondary
          ? `
      <div class="anchor-detail card elev-sm">
        <span class="card-kicker">Âncora secundária — ${secondary}</span>
        <span class="card-title">${CAREER_ANCHORS[secondary].name}</span>
        <p class="card-body">${CAREER_ANCHORS[secondary].description}</p>
      </div>`
          : ''
      }

      <h2>Descrição das 8 âncoras</h2>
      <div class="anchor-list">
        ${sortedLetters.map(
          (letter) => `
        <div class="card elev-sm">
          <span class="card-kicker">${letter} · ${averages[letter].toFixed(1)}</span>
          <span class="card-title">${CAREER_ANCHORS[letter].name}</span>
          <p class="card-body">${CAREER_ANCHORS[letter].description}</p>
        </div>`
        ).join('')}
      </div>

      <div class="result-actions no-print">
        <button class="btn btn-ghost" id="restart-btn" type="button">Recomeçar</button>
        <button class="btn btn-secondary" id="share-btn" type="button">Compartilhar</button>
        <button class="btn btn-primary" id="print-btn" type="button">Imprimir / Salvar em PDF</button>
      </div>
    `;

    document.getElementById('restart-btn').addEventListener('click', () => {
      confirmReset(() => {
        state.blockIndex = 0;
        state.ratings = {};
        state.bonus = [];
        safeStorage.clear();
        renderHome();
      });
    });

    document.getElementById('share-btn').addEventListener('click', (event) => {
      shareResult(buildShareText(dominant, secondary, averages), event.currentTarget);
    });

    document.getElementById('print-btn').addEventListener('click', () => window.print());
  });
}

// ---------- Inicialização ----------

function init() {
  renderHome();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
