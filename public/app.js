// --- State ---
let isRegisterMode = false;
let questions = []; 

// --- Helpers ---
function getCurrentUserId() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.userId || payload.id;
  } catch {
    return null;
  }
}

function getToken() {
  return localStorage.getItem(CONFIG.STORAGE_KEY);
}

function setToken(token) {
  localStorage.setItem(CONFIG.STORAGE_KEY, token);
}

function removeToken() {
  localStorage.removeItem(CONFIG.STORAGE_KEY);
}

async function apiFetch(route, options = {}) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const headers = { ...options.headers };
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${CONFIG.API_URL}${route}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.msg || "Request failed");
  return data;
}

// --- Auth ---
function showAuth() {
  document.getElementById("auth-section").style.display = "block";
  document.getElementById("app-section").style.display = "none";
  document.getElementById("logout-btn").style.display = "none";
  renderAuthForm();
}

function renderAuthForm() {
  const fields = isRegisterMode ? CONFIG.FIELDS.REGISTER : CONFIG.FIELDS.LOGIN;
  const title = isRegisterMode ? "Sign Up" : "Log In";
  const switchText = isRegisterMode
    ? 'Already have an account? <a href="#" id="switch-mode">Log in</a>'
    : 'Don\'t have an account? <a href="#" id="switch-mode">Sign up</a>';

  const formHTML = `
    <h2>${title}</h2>
    <form id="auth-form">
      ${fields
        .map((f) => {
          const type = f === "password" ? "password" : f === "email" ? "email" : "text";
          const label = f.charAt(0).toUpperCase() + f.slice(1);
          return `
          <div class="form-group">
            <label for="${f}">${label}</label>
            <input type="${type}" id="${f}" name="${f}" required />
          </div>`;
        })
        .join("")}
      <button type="submit" class="btn btn-primary" style="width:100%">${title}</button>
    </form>
    <p class="switch-text">${switchText}</p>
    <p id="auth-error" class="error"></p>
  `;

  document.getElementById("auth-section").innerHTML = formHTML;
  document.getElementById("auth-form").addEventListener("submit", handleAuth);
  document.getElementById("switch-mode").addEventListener("click", (e) => {
    e.preventDefault();
    isRegisterMode = !isRegisterMode;
    renderAuthForm();
  });
}

async function handleAuth(e) {
  e.preventDefault();
  const errorEl = document.getElementById("auth-error");
  errorEl.textContent = "";
  const fields = isRegisterMode ? CONFIG.FIELDS.REGISTER : CONFIG.FIELDS.LOGIN;
  const route = isRegisterMode ? CONFIG.ROUTES.REGISTER : CONFIG.ROUTES.LOGIN;
  const body = {};
  fields.forEach((f) => { body[f] = document.getElementById(f).value; });

  try {
    const data = await apiFetch(route, { method: "POST", body: JSON.stringify(body) });
    setToken(data.token);
    showApp();
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

// --- App ---
function showApp() {
  document.getElementById("auth-section").style.display = "none";
  document.getElementById("app-section").style.display = "block";
  document.getElementById("logout-btn").style.display = "block";
  loadQuestions();
}

function updateScoreBar() {
  const scoreValues = document.querySelectorAll(".score-value");
  if (scoreValues.length >= 2) {
    const solvedCount = questions.filter(q => q.solved).length;
    scoreValues[1].textContent = `${solvedCount}/${questions.length}`;
  }
}

async function loadQuestions(keyword = "", page = 1) {
  const container = document.getElementById("questions-container");
  container.innerHTML = '<p class="loading">Loading questions...</p>';

  try {
    const params = new URLSearchParams({ page, limit: CONFIG.QUESTIONS_PER_PAGE });
    if (keyword) params.set("keyword", keyword);
    const result = await apiFetch(`${CONFIG.ROUTES.QUESTIONS}?${params}`);
    
    questions = result.data; 
    const total = result.total;
    const totalPages = result.totalPages;
    const currentUserId = getCurrentUserId();
    const solvedCount = questions.filter((q) => q.solved).length;

    container.innerHTML = `
      <div class="score-bar">
        <div class="score-item">
          <div class="score-value">${total}</div>
          <div class="score-label">Questions</div>
        </div>
        <div class="score-item">
          <div class="score-value">${solvedCount}/${questions.length}</div>
          <div class="score-label">Solved (this page)</div>
        </div>
      </div>
      <div class="toolbar">
        <button class="btn btn-primary" id="new-question-btn">+ New Question</button>
        <div class="search-bar">
          <input type="text" id="keyword-input" placeholder="Search by keyword..." value="${keyword}" />
          <button class="btn btn-search" id="search-btn">Search</button>
          ${keyword ? `<button class="btn btn-clear" id="clear-btn">Clear</button>` : ""}
        </div>
      </div>
      <div id="questions-list" class="questions-grid"></div>
      <div class="pagination" id="pagination-container"></div>`;

    const listContainer = document.getElementById("questions-list");
    questions.forEach((q) => {
      const isOwner = q.userId === currentUserId;
      const card = document.createElement("div");
      card.className = `question-card ${q.solved ? "solved" : ""}`;
      
      let kwHTML = "";
      if (q.keywords && q.keywords.length > 0) {
        kwHTML = `<div class="card-keywords" style="display:flex; gap:5px; margin-bottom:10px; flex-wrap: wrap;">
                    ${q.keywords.map(k => {
                      const kwText = typeof k === 'object' ? k.name : k;
                      return kwText ? `<span class="keyword" style="background:#e2e8f0; color:#0f172a; font-weight:bold; padding:2px 8px; border-radius:4px; font-size:0.8rem; border:1px solid #94a3b8;">${kwText}</span>` : '';                    }).join('')}
                  </div>`;
      }

      card.innerHTML = `
        <div class="question-content">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
            <h3 style="margin:0;">${q.question || "Untitled Question"}</h3>
            ${q.solved ? '<span class="solved-indicator" title="Solved">✅</span>' : ''}
          </div>
          <p style="font-size: 0.85rem; color: #666; margin-bottom: 8px;">Created by: <strong>${q.userName || 'Anonymous'}</strong></p>
          ${kwHTML}
        </div>
        <div class="question-actions" style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
          <button class="btn btn-play" id="play-${q.id}">Play</button>
          ${isOwner ? `
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-delete" id="delete-${q.id}">Delete</button>
              <button class="btn btn-edit" id="edit-${q.id}">Edit</button>
            </div>
          ` : ""}
        </div>`;
      
      listContainer.appendChild(card);
      document.getElementById(`play-${q.id}`).onclick = () => playQuestion(q.id);
      if (isOwner) {
        document.getElementById(`edit-${q.id}`).onclick = () => showEditForm(q.id);
        document.getElementById(`delete-${q.id}`).onclick = () => deleteQuestion(q.id);
      }
    });

    const pagContainer = document.getElementById("pagination-container");
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.className = `btn btn-page ${i === page ? "active" : ""}`;
      btn.onclick = () => loadQuestions(keyword, i);
      pagContainer.appendChild(btn);
    }

    document.getElementById("new-question-btn").onclick = showCreateForm;
    document.getElementById("search-btn").onclick = () => loadQuestions(document.getElementById("keyword-input").value);
    if (keyword) document.getElementById("clear-btn").onclick = () => loadQuestions();
  } catch (err) {
    container.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

async function playQuestion(qId) {
  const container = document.getElementById("questions-container");
  container.innerHTML = '<p class="loading">Loading...</p>';
  try {
    const q = await apiFetch(`${CONFIG.ROUTES.QUESTIONS}/${qId}`);

    let kwHTML = "";
    if (q.keywords && q.keywords.length > 0) {
      kwHTML = `<div class="question-keywords" style="display:flex; justify-content:center; gap:5px; margin-bottom:1.5rem; flex-wrap: wrap;">
                  ${q.keywords.map(k => {
                    const kwText = typeof k === 'object' ? k.name : k;
                    return kwText ? `<span class="keyword" style="background:#e2e8f0; color:#0f172a; font-weight:bold; padding:2px 8px; border-radius:4px; font-size:0.8rem; border:1px solid #94a3b8;">${kwText}</span>` : '';                  }).join('')}
                </div>`;
    }

    container.innerHTML = `
      <a href="#" id="back-btn" class="back-link">&larr; Back to questions</a>
      <div class="question-form-wrapper" style="text-align:center">
        <div class="play-question-text">${q.question}</div>
        <p style="font-size: 0.9rem; color: #777; margin-top: -10px; margin-bottom: 15px;">By ${q.userName || 'Anonymous'}</p>
        
        ${q.imageUrl ? `<img class="question-image" src="${q.imageUrl}" alt="" style="margin:0 auto 1rem; display:block; max-width:100%;">` : ""}
        ${kwHTML}

        <form id="play-form" style="text-align:left">
          <div class="form-group">
            <label for="play-answer">Your answer</label>
            <textarea id="play-answer" rows="3" required></textarea>
          </div>
          <div style="text-align:center">
            <button type="submit" class="btn btn-play" style="padding:0.7rem 2.5rem;font-size:1rem">Submit</button>
          </div>
        </form>
        <div id="play-result"></div>
        <p id="play-error" class="error"></p>
      </div>`;

    document.getElementById("back-btn").onclick = (e) => { e.preventDefault(); loadQuestions(); };
    document.getElementById("play-form").onsubmit = async (e) => {
      e.preventDefault();
      const resultEl = document.getElementById("play-result");
      const answer = document.getElementById("play-answer").value;
      try {
        const result = await apiFetch(`${CONFIG.ROUTES.QUESTIONS}/${qId}/play`, {
          method: "POST",
          body: JSON.stringify({ answer }),
        });
        if (result.correct) {
          resultEl.innerHTML = `<div class="play-result correct">Correct!</div>`;
          const qObj = questions.find(item => item.id === qId);
          if (qObj) qObj.solved = true;
          updateScoreBar();
        } else {
          resultEl.innerHTML = `<div class="play-result incorrect">Incorrect! Answer: <strong>${result.answer}</strong></div>`;
        }
      } catch (err) { document.getElementById("play-error").textContent = err.message; }
    };
  } catch (err) { container.innerHTML = `<p class="error">${err.message}</p>`; }
}

function showCreateForm() {
  const container = document.getElementById("questions-container");
  container.innerHTML = `
    <button class="btn btn-back" onclick="loadQuestions()">← Back</button>
    <h2>New Question</h2>
    <form id="create-form">
      <div class="form-group">
        <label>Question</label>
        <input type="text" name="question" required />
      </div>
      <div class="form-group">
        <label>Answer</label>
        <input type="text" name="answer" required />
      </div>
      <div class="form-group">
        <label>Keywords (comma separated)</label>
        <input type="text" name="keywords" placeholder="e.g., web, sql, general" />
      </div>
      <div class="form-group">
        <label>Optional Image</label>
        <input type="file" name="image" accept="image/*" />
      </div>
      <button type="submit" class="btn btn-primary">Create</button>
    </form>
    <p id="create-error" class="error"></p>`;

  document.getElementById("create-form").onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await apiFetch(CONFIG.ROUTES.QUESTIONS, { method: "POST", body: formData });
      loadQuestions();
    } catch (err) { document.getElementById("create-error").textContent = err.message; }
  };
}

async function showEditForm(qId) {
  const container = document.getElementById("questions-container");
  container.innerHTML = '<p class="loading">Loading question...</p>';
  try {
    const q = await apiFetch(`${CONFIG.ROUTES.QUESTIONS}/${qId}`);
    
    // Convert keywords to a comma string for the input box safely
    let kwString = "";
    if (q.keywords && q.keywords.length > 0) {
      kwString = q.keywords.map(k => typeof k === 'object' ? k.name : k).join(', ');
    }

    container.innerHTML = `
      <button class="btn btn-back" onclick="loadQuestions()">← Back</button>
      <h2>Edit Question</h2>
      <form id="edit-form">
        <div class="form-group">
          <label>Question</label>
          <input type="text" name="question" value="${q.question}" required />
        </div>
        <div class="form-group">
          <label>Answer</label>
          <input type="text" name="answer" value="${q.answer}" required />
        </div>
        <div class="form-group">
          <label>Keywords (comma separated)</label>
          <input type="text" name="keywords" value="${kwString}" />
        </div>
        <div class="form-group">
          <label>Update Image (optional)</label>
          <input type="file" name="image" accept="image/*" />
        </div>
        <button type="submit" class="btn btn-primary">Save Changes</button>
      </form>
      <p id="edit-error" class="error"></p>`;

    document.getElementById("edit-form").onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      try {
        await apiFetch(`${CONFIG.ROUTES.QUESTIONS}/${qId}`, { method: "PUT", body: formData });
        loadQuestions();
      } catch (err) { document.getElementById("edit-error").textContent = err.message; }
    };
  } catch (err) { container.innerHTML = `<p class="error">${err.message}</p>`; }
}

async function deleteQuestion(qId) {
  if (!confirm("Are you sure?")) return;
  try {
    await apiFetch(`${CONFIG.ROUTES.QUESTIONS}/${qId}`, { method: "DELETE" });
    loadQuestions();
  } catch (err) { alert(err.message); }
}

document.getElementById("logout-btn").addEventListener("click", () => {
  removeToken();
  showAuth();
});

document.addEventListener("DOMContentLoaded", () => {
  if (getToken()) showApp();
  else showAuth();
});