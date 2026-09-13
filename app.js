// Lógica do app Âncoras de Carreira: navegação entre telas, estado do quiz,
// cálculo das médias por âncora e renderização do resultado. Depende dos
// dados globais definidos em data.js (QUESTIONS, CAREER_ANCHORS,
// ANCHOR_LETTERS). Ver AGENTS.md para as convenções do projeto.

const STORAGE_KEY = 'ancora-carreira-progress-v1';
const TOTAL_QUESTIONS = QUESTIONS.length;
const BONUS_LIMIT = 3;
const BONUS_POINTS = 4;
const ANCHOR_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const FADE_MS = 220;

const app = document.getElementById('app');

const state = {
  ratings: {}, // { [questionNumber]: 1..6 }
  bonus: [], // até 3 números de pergunta
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
  safeStorage.set({ ratings: state.ratings, bonus: state.bonus });
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
        <li>Leia as 40 afirmações e dê uma nota de 1 a 6 pra cada uma, conforme o quanto ela é verdadeira pra você.</li>
        <li>No final, marque até 3 afirmações — as mais verdadeiras entre as que você pontuou mais alto — para ganharem 4 pontos extra cada.</li>
        <li>Veja o resultado: a média de cada uma das 8 âncoras e qual delas mais te representa.</li>
      </ol>
    `;

    if (hasProgress) {
      document.getElementById('resume-btn').addEventListener('click', () => {
        state.ratings = { ...saved.ratings };
        state.bonus = [...saved.bonus];
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
        state.ratings = {};
        state.bonus = [];
        renderQuiz();
      });
    }
  });
}

function questionCardHTML(q) {
  const rating = state.ratings[q.number];
  const isBonus = state.bonus.includes(q.number);
  const bonusDisabled = !isBonus && state.bonus.length >= BONUS_LIMIT;
  return `
    <li class="card quiz-card elev-sm" data-question="${q.number}">
      <span class="card-kicker quiz-card-number">Pergunta ${q.number}</span>
      <p class="card-body quiz-card-text">${q.text}</p>
      <div class="quiz-card-row">
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
        <button type="button" class="tag bonus-toggle ${isBonus ? 'tag-accent' : 'tag-outline'}" data-bonus="${q.number}" ${bonusDisabled ? 'disabled' : ''}>
          ${isBonus ? '★ +4 pontos' : '☆ Uma das 3 mais verdadeiras'}
        </button>
      </div>
    </li>
  `;
}

function renderQuiz() {
  paint(() => {
    app.innerHTML = `
      <div class="quiz-head">
        <div class="quiz-head-row">
          <span class="quiz-head-count">${answeredCount()} de ${TOTAL_QUESTIONS} respondidas</span>
          <span class="quiz-head-bonus">Bônus: ${state.bonus.length}/${BONUS_LIMIT}</span>
        </div>
        <span class="progress-track"><span class="progress-fill" style="width: ${(answeredCount() / TOTAL_QUESTIONS) * 100}%"></span></span>
      </div>
      <p class="text-muted">Dê uma nota de 1 a 6 pra cada afirmação — 1 nunca é verdadeira pra você, 6 é sempre verdadeira. No final, marque até 3 que são as mais verdadeiras pra ganhar pontos extra.</p>
      <ul class="quiz-list">
        ${QUESTIONS.map((q) => questionCardHTML(q)).join('')}
      </ul>
      <div class="quiz-actions no-print">
        <button class="btn btn-ghost" id="restart-btn" type="button">Reiniciar</button>
        <button class="btn btn-primary" id="result-btn" type="button" ${answeredCount() < TOTAL_QUESTIONS ? 'disabled' : ''}>Ver resultado</button>
      </div>
    `;
    wireQuizEvents();
  });
}

function updateQuizHeader() {
  document.querySelector('.quiz-head-count').textContent = `${answeredCount()} de ${TOTAL_QUESTIONS} respondidas`;
  document.querySelector('.quiz-head-bonus').textContent = `Bônus: ${state.bonus.length}/${BONUS_LIMIT}`;
  document.querySelector('.progress-fill').style.width = `${(answeredCount() / TOTAL_QUESTIONS) * 100}%`;
}

function updateResultButton() {
  const btn = document.getElementById('result-btn');
  if (btn) btn.disabled = answeredCount() < TOTAL_QUESTIONS;
}

function updateBonusButtons() {
  document.querySelectorAll('[data-bonus]').forEach((btn) => {
    const number = Number(btn.dataset.bonus);
    const isBonus = state.bonus.includes(number);
    const disabled = !isBonus && state.bonus.length >= BONUS_LIMIT;
    btn.classList.toggle('tag-accent', isBonus);
    btn.classList.toggle('tag-outline', !isBonus);
    btn.disabled = disabled;
    btn.textContent = isBonus ? '★ +4 pontos' : '☆ Uma das 3 mais verdadeiras';
  });
  document.querySelector('.quiz-head-bonus').textContent = `Bônus: ${state.bonus.length}/${BONUS_LIMIT}`;
}

function toggleBonus(number) {
  const idx = state.bonus.indexOf(number);
  if (idx >= 0) {
    state.bonus.splice(idx, 1);
  } else if (state.bonus.length < BONUS_LIMIT) {
    state.bonus.push(number);
  } else {
    return;
  }
  saveProgress();
  updateBonusButtons();
}

function wireQuizEvents() {
  const list = document.querySelector('.quiz-list');

  list.addEventListener('change', (event) => {
    const input = event.target;
    if (!input.matches('input[type="radio"]')) return;
    const li = input.closest('[data-question]');
    state.ratings[Number(li.dataset.question)] = Number(input.value);
    saveProgress();
    updateQuizHeader();
    updateResultButton();
  });

  list.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-bonus]');
    if (!btn || btn.disabled) return;
    toggleBonus(Number(btn.dataset.bonus));
  });

  document.getElementById('restart-btn').addEventListener('click', () => {
    confirmReset(() => {
      state.ratings = {};
      state.bonus = [];
      safeStorage.clear();
      renderHome();
    });
  });

  document.getElementById('result-btn').addEventListener('click', () => {
    if (answeredCount() < TOTAL_QUESTIONS) return;
    safeStorage.clear();
    renderResult();
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
        ${ANCHOR_ORDER.map(
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
