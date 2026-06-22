import "./styles.css";
import { $, debounce, escapeHtml, makeId, objectValues, renderMath, toast } from "./utils.js";
import { phases } from "./defaults.js";
import { initFirebase, getStatus, listen, read, write, patch, del, disconnectRemove } from "./firebase-service.js";
import { addSubscription, clearSubscriptions, state } from "./app-state.js";
import { initWhiteboard, loadWhiteboard, subscribeWhiteboard } from "./whiteboard.js";

const app = $("app");

function setConnectionStatus() {
  const s = getStatus();
  document.querySelectorAll("[data-connection-status]").forEach((el) => {
    el.classList.remove("online", "error", "checking");
    el.classList.add(s.ok ? "online" : "error");
    el.innerHTML = `<span class="dot"></span>${s.ok ? "Firebase terkoneksi" : "Firebase belum terkoneksi"}`;
  });
}
function requireFirebase() {
  if (getStatus().ok) return true;
  toast("Firebase belum terkoneksi. Periksa public/firebase-config.js dan Rules Realtime Database.");
  return false;
}
function getGroupList() { return objectValues(state.data.groups).sort((a, b) => Number(a.number || 0) - Number(b.number || 0)); }
function getGroup(groupId = state.groupId) { return state.data.groups?.[groupId] || null; }
function getMember() { return getGroup()?.members?.[state.memberId] || null; }
function getQuestionForGroup(groupId = state.groupId) {
  const settings = state.data.settings || {};
  const questions = state.data.questions || {};
  let questionId = settings.selectedQuestionId;
  if (settings.questionMode === "random") questionId = settings.assignments?.[groupId] || questionId;
  return questions[questionId] || objectValues(questions)[0] || { title: "Belum ada soal", text: "Guru belum menginput soal." };
}
function renderTopbar(title, subtitle, logo = "C", right = "") {
  return `<div class="topbar"><div class="topbar-inner"><div class="brand"><div class="logo">${logo}</div><div><div class="brand-title">${title}</div><div class="brand-sub">${subtitle}</div></div></div><div class="row" style="margin:0"><span class="status-chip checking" data-connection-status><span class="dot"></span>Memeriksa Firebase</span>${right}</div></div></div>`;
}

function renderLogin() {
  state.screen = "login";
  clearSubscriptions();
  app.innerHTML = `
    <section class="splash">
      <div class="login-card">
        <div class="hero">
          <span class="badge">Firebase Realtime Database Ready</span>
          <h1>E-LKPD Collapose</h1>
          <p class="subtitle">Versi ini tidak lagi menyembunyikan kegagalan koneksi sebagai mode lokal. Jika Firebase belum benar, sistem akan memberi peringatan eksplisit.</p>
          <div class="feature-grid">
            <div class="feature"><strong>Whiteboard realtime</strong><span>Coretan anggota dikirim ke ruang kelompok yang sama.</span></div>
            <div class="feature"><strong>Jawaban terkoneksi</strong><span>Textarea jawaban dan revisi tersimpan di database.</span></div>
            <div class="feature"><strong>Dashboard guru</strong><span>Input soal, mahasiswa, dan pembagian kelompok.</span></div>
            <div class="feature"><strong>Siap Vercel</strong><span>Struktur Vite dengan config Firebase eksplisit.</span></div>
          </div>
        </div>
        <div class="panel">
          <h2>Masuk Ruang Kelompok</h2>
          <div id="firebaseAlert"></div>
          <label>Kelompok</label><select id="loginGroup"></select>
          <label>Nama Anggota</label><select id="loginMember"></select>
          <div class="row">
            <button class="btn-primary" id="enterStudent">Masuk Kelompok</button>
            <button class="btn-outline" id="openBankFromLogin">Bank Soal</button>
            <button class="btn-secondary" id="openTeacher">Dashboard Guru</button>
          </div>
          <p class="small">Jika status masih <b>Firebase belum terkoneksi</b>, isi <code>public/firebase-config.js</code> atau Environment Variables Vercel.</p>
        </div>
      </div>
    </section>`;
  renderFirebaseAlert();
  populateLoginSelectors();
  $("loginGroup").onchange = populateMemberSelector;
  $("enterStudent").onclick = enterStudentRoom;
  $("openTeacher").onclick = renderTeacherDashboard;
  $("openBankFromLogin").onclick = renderBank;
  setConnectionStatus();
}
function renderFirebaseAlert() {
  const s = getStatus();
  const holder = $("firebaseAlert");
  if (!holder) return;
  if (s.ok) holder.innerHTML = `<div class="alert alert-ok">Firebase terkoneksi. Tes dengan membuka dua browser dan masuk pada kelompok yang sama.</div>`;
  else holder.innerHTML = `<div class="alert alert-danger"><b>Firebase belum terkoneksi.</b><br>${escapeHtml(s.message)}<br>Pastikan <b>databaseURL</b> dari Realtime Database benar dan Rules sudah dipublish.</div>`;
}
function populateLoginSelectors() {
  const groups = getGroupList();
  const groupSelect = $("loginGroup");
  if (!groupSelect) return;
  if (!groups.length) {
    groupSelect.innerHTML = `<option value="">Belum ada kelompok</option>`;
    $("loginMember").innerHTML = `<option value="">Belum ada anggota</option>`;
    return;
  }
  groupSelect.innerHTML = groups.map((g) => `<option value="${g.id}">${escapeHtml(g.name || `Kelompok ${g.number}`)} — ${escapeHtml(g.type || "")}</option>`).join("");
  populateMemberSelector();
}
function populateMemberSelector() {
  const groupId = $("loginGroup").value;
  const members = objectValues(state.data.groups?.[groupId]?.members);
  $("loginMember").innerHTML = members.map((m) => `<option value="${m.id}">${escapeHtml(m.name)} (${escapeHtml(m.nim || "-")})</option>`).join("");
}

async function enterStudentRoom() {
  if (!requireFirebase()) return;
  state.groupId = $("loginGroup").value;
  state.memberId = $("loginMember").value;
  if (!state.groupId || !state.memberId) return toast("Pilih kelompok dan anggota terlebih dahulu.");
  const roomPhase = await read(`rooms/${state.groupId}/currentPhase`, 1);
  const maxPhase = await read(`rooms/${state.groupId}/maxPhase`, 1);
  await patch(`rooms/${state.groupId}`, { currentPhase: Number(roomPhase || 1), maxPhase: Number(maxPhase || 1) });
  state.currentPhase = Number(roomPhase || 1);
  await write(`rooms/${state.groupId}/presence/${state.memberId}`, { name: getMember()?.name || state.memberId, joinedAt: Date.now() });
  disconnectRemove(`rooms/${state.groupId}/presence/${state.memberId}`);
  renderStudentRoom();
}

function subscribeBaseData() {
  addSubscription(listen("groups", (val) => { state.data.groups = val || {}; if (state.screen === "login") populateLoginSelectors(); if (state.screen === "teacher") renderTeacherContent(); }));
  addSubscription(listen("questions", (val) => { state.data.questions = val || {}; if (state.screen === "teacher") renderTeacherContent(); }));
  addSubscription(listen("settings", (val) => { state.data.settings = val || {}; if (state.screen === "teacher") renderTeacherContent(); }));
  addSubscription(listen("students", (val) => { state.data.students = val || {}; if (state.screen === "teacher") renderTeacherContent(); }));
  addSubscription(listen("bank", (val) => { state.data.bank = val || {}; if (state.screen === "bank") renderBankList(); }));
}

function renderStudentRoom() {
  state.screen = "student";
  clearSubscriptions();
  subscribeBaseData();
  const group = getGroup();
  const member = getMember();
  app.innerHTML = `
    ${renderTopbar("E-LKPD Collapose", "Ruang kerja kelompok realtime", "C", `<span class="user-chip">${escapeHtml(group?.name || state.groupId)} • ${escapeHtml(member?.name || state.memberId)}</span><button class="btn-outline" id="openBank">Bank Soal</button><button class="btn-secondary" id="logout">Keluar</button>`)}
    <main class="container">
      <div id="phaseTabs" class="tabs"></div>
      <div class="layout">
        <section class="card"><div class="head"><div><div class="label" id="phaseLabel"></div><h2 id="phaseTitle"></h2></div><div class="timer" id="timerBox">00:00</div></div><div id="phaseContent"></div></section>
        <aside class="card">
          <h3>Whiteboard Kelompok</h3><p class="small">Coretan disimpan pada ruang ${escapeHtml(group?.name || state.groupId)} dan fase aktif.</p>
          <div class="board-wrap"><div class="tools"><button class="btn-outline" id="toolPen">Pensil</button><button class="btn-outline" id="toolEraser">Penghapus</button><button class="btn-outline" id="clearBoard">Bersihkan</button><input type="color" id="penColor" value="#0f172a"><input type="range" id="penSize" min="2" max="18" value="4"></div><canvas id="whiteboardCanvas" width="720" height="430"></canvas></div>
          <h3 style="margin-top:18px">Persetujuan Anggota</h3><div class="progress"><span id="agreementBar"></span></div><p id="agreementText" class="small"></p><div id="memberAgreement" class="members"></div><div class="row"><button class="btn-success" id="agreeBtn">Saya Setuju</button><button class="btn-warning" id="doubtBtn">Saya Ragu-ragu</button></div>
        </aside>
      </div>
    </main>`;
  $("openBank").onclick = renderBank;
  $("logout").onclick = renderLogin;
  $("agreeBtn").onclick = () => setAgreement("agree");
  $("doubtBtn").onclick = () => setAgreement("doubt");
  setConnectionStatus();
  subscribeRoom();
  renderPhaseTabs();
  renderPhaseContent();
  initWhiteboard();
  loadWhiteboard();
  startTimer();
}
function subscribeRoom() {
  addSubscription(listen(`rooms/${state.groupId}/currentPhase`, (val) => {
    const next = Number(val || 1);
    if (next !== state.currentPhase) {
      state.currentPhase = next;
      clearSubscriptions(); subscribeBaseData(); subscribeRoom(); renderPhaseTabs(); renderPhaseContent(); initWhiteboard(); loadWhiteboard(); startTimer();
    }
  }));
  addSubscription(listen(`rooms/${state.groupId}/maxPhase`, () => renderPhaseTabs()));
  const phaseKey = `phase${state.currentPhase}`;
  addSubscription(listen(`rooms/${state.groupId}/${phaseKey}/answer`, (val) => {
    const el = $("phaseAnswer"), preview = $("answerPreview");
    if (el && document.activeElement !== el) { el.value = val || ""; if (preview) preview.innerHTML = renderMath(val || "Preview jawaban akan muncul di sini."); }
  }));
  addSubscription(listen(`rooms/${state.groupId}/${phaseKey}/revision`, (val) => {
    const el = $("revisionText"), preview = $("revisionPreview");
    if (el && document.activeElement !== el) { el.value = val || ""; if (preview) preview.innerHTML = renderMath(val || "Preview soal final akan muncul di sini."); }
  }));
  addSubscription(listen(`rooms/${state.groupId}/${phaseKey}/agreements`, (val) => renderAgreement(val || {})));
  subscribeWhiteboard();
}
async function renderPhaseTabs() {
  const maxPhase = Number(await read(`rooms/${state.groupId}/maxPhase`, 1));
  $("phaseTabs").innerHTML = phases.map((p) => `<div class="tab ${p.id === state.currentPhase ? "active" : ""} ${p.id > maxPhase ? "locked" : ""}" data-phase="${p.id}"><small>${p.label}</small><b>${p.title}</b><span>${p.id > maxPhase ? "Terkunci sampai fase sebelumnya disetujui." : p.desc}</span></div>`).join("");
  document.querySelectorAll("[data-phase]").forEach((tab) => {
    tab.onclick = async () => {
      const phase = Number(tab.dataset.phase);
      const max = Number(await read(`rooms/${state.groupId}/maxPhase`, 1));
      if (phase > max) return toast("Fase belum terbuka.");
      await write(`rooms/${state.groupId}/currentPhase`, phase);
    };
  });
}
async function renderPhaseContent() {
  const phase = phases.find((p) => p.id === state.currentPhase);
  const question = getQuestionForGroup();
  const phaseKey = `phase${state.currentPhase}`;
  $("phaseLabel").textContent = `${phase.label} • ${getGroup()?.name || state.groupId}`;
  $("phaseTitle").textContent = phase.title;
  if (state.currentPhase === 1) {
    const answer = await read(`rooms/${state.groupId}/phase1/answer`, "");
    $("phaseContent").innerHTML = `<div class="label">Soal cerita dari guru</div><div class="problem">${renderMath(question.text)}</div><label>Area Jawaban Kelompok</label><textarea id="phaseAnswer" placeholder="Tulis jawaban kelompok. Contoh: 1/3 + 1/4 = ...">${escapeHtml(answer || "")}</textarea><div class="label" style="margin-top:12px">Preview Jawaban</div><div id="answerPreview" class="preview">${renderMath(answer || "Preview jawaban akan muncul di sini.")}</div><div class="row"><button class="btn-primary" id="submitPhase">${phase.submit}</button></div>`;
    const debouncedWrite = debounce((value) => write(`rooms/${state.groupId}/phase1/answer`, value), 250);
    $("phaseAnswer").oninput = (event) => { $("answerPreview").innerHTML = renderMath(event.target.value || "Preview jawaban akan muncul di sini."); debouncedWrite(event.target.value); };
  } else {
    const revision = await read(`rooms/${state.groupId}/${phaseKey}/revision`, "");
    const readOnlyText = state.currentPhase === 2 ? question.text : ((await read(`rooms/${state.groupId}/phase2/revision`, "")) || question.text);
    $("phaseContent").innerHTML = `<div class="label">${state.currentPhase === 2 ? "Soal Versi Awal dari Guru (Read Only)" : "Soal dari Fase 2 (Read Only)"}</div><div class="problem">${renderMath(readOnlyText)}</div><label>Area Revisi Soal Kelompok</label><textarea id="revisionText" placeholder="Tulis revisi soal. Contoh: Ibu membeli 1/3 kg gula dan 1/4 kg tepung...">${escapeHtml(revision || "")}</textarea><p class="small">Siswa cukup mengetik 1/3, 1/4, atau 1/2. Preview menampilkan bentuk pecahan rapi.</p><div class="label">Preview Soal Final</div><div id="revisionPreview" class="preview">${renderMath(revision || "Preview soal final akan muncul di sini.")}</div><div class="row"><button class="btn-outline" id="compareBtn">Lihat Perbandingan</button><button class="btn-primary" id="submitPhase">${phase.submit}</button></div>`;
    const debouncedWrite = debounce((value) => write(`rooms/${state.groupId}/${phaseKey}/revision`, value), 250);
    $("revisionText").oninput = (event) => { $("revisionPreview").innerHTML = renderMath(event.target.value || "Preview soal final akan muncul di sini."); debouncedWrite(event.target.value); };
    $("compareBtn").onclick = () => showCompare(question.text, $("revisionText").value);
  }
  $("submitPhase").onclick = submitPhase;
}
async function setAgreement(status) {
  const member = getMember();
  await write(`rooms/${state.groupId}/phase${state.currentPhase}/agreements/${state.memberId}`, { status, memberId: state.memberId, name: member?.name || state.memberId, at: Date.now() });
}
function renderAgreement(agreements = {}) {
  const members = objectValues(getGroup()?.members);
  const agreed = members.filter((m) => agreements[m.id]?.status === "agree").length;
  const total = members.length || 1;
  $("agreementBar").style.width = `${(agreed / total) * 100}%`;
  $("agreementText").textContent = `${agreed}/${members.length} anggota sudah setuju.`;
  $("memberAgreement").innerHTML = members.map((m) => { const status = agreements[m.id]?.status || "waiting"; const label = status === "agree" ? "Setuju" : status === "doubt" ? "Ragu-ragu" : "Menunggu"; const cls = status === "agree" ? "ok" : status === "doubt" ? "warn" : ""; return `<div class="member-card"><b>${escapeHtml(m.name)}</b><small>${escapeHtml(m.nim || "-")} • ${escapeHtml(m.code || m.id)}</small><span class="pill ${cls}">${label}</span></div>`; }).join("");
}
async function allAgreed() {
  const members = objectValues(getGroup()?.members);
  const agreements = await read(`rooms/${state.groupId}/phase${state.currentPhase}/agreements`, {});
  return members.length > 0 && members.every((m) => agreements?.[m.id]?.status === "agree");
}
async function submitPhase() {
  if (!(await allAgreed())) return toast("Semua anggota harus memilih setuju terlebih dahulu.");
  if (state.currentPhase === 1) {
    const answer = await read(`rooms/${state.groupId}/phase1/answer`, "");
    if (!String(answer).trim()) return toast("Jawaban kelompok masih kosong.");
    await patch(`rooms/${state.groupId}`, { currentPhase: 2, maxPhase: 2 });
    return;
  }
  if (state.currentPhase === 2) {
    const revision = await read(`rooms/${state.groupId}/phase2/revision`, "");
    if (!String(revision).trim()) return toast("Revisi soal masih kosong.");
    await patch(`rooms/${state.groupId}`, { currentPhase: 3, maxPhase: 3 });
    return;
  }
  const finalQuestion = (await read(`rooms/${state.groupId}/phase3/revision`, "")) || (await read(`rooms/${state.groupId}/phase2/revision`, ""));
  if (!String(finalQuestion).trim()) return toast("Soal final masih kosong.");
  await write(`bank/${state.groupId}`, { groupId: state.groupId, groupName: getGroup()?.name || state.groupId, finalQuestion, createdAt: new Date().toLocaleString("id-ID") });
  toast("Soal final masuk ke Bank Soal.");
  renderBank();
}
function startTimer() {
  window.clearInterval(state.timerInterval);
  const phase = phases.find((p) => p.id === state.currentPhase);
  const key = `timer_${state.groupId}_${state.currentPhase}`;
  let remaining = Number(sessionStorage.getItem(key) || phase.minutes * 60);
  const draw = () => { const min = String(Math.floor(remaining / 60)).padStart(2, "0"); const sec = String(remaining % 60).padStart(2, "0"); const box = $("timerBox"); if (box) box.textContent = `${min}:${sec}`; };
  draw();
  state.timerInterval = window.setInterval(() => { remaining = Math.max(0, remaining - 1); sessionStorage.setItem(key, String(remaining)); draw(); if (remaining <= 0) window.clearInterval(state.timerInterval); }, 1000);
}
function showCompare(original, revision) {
  app.insertAdjacentHTML("beforeend", `<div class="modal" id="compareModal"><div class="modal-card"><div class="head"><div><div class="label">Perbandingan Soal</div><h2>Soal Guru dan Revisi Kelompok</h2></div><button class="btn-secondary" id="closeCompare">Tutup</button></div><div class="compare"><div><div class="label">Soal Guru</div><div class="problem">${renderMath(original)}</div></div><div><div class="label">Revisi Kelompok</div><div class="problem">${renderMath(revision || "Belum ada revisi.")}</div></div></div></div></div>`);
  $("closeCompare").onclick = () => $("compareModal").remove();
}
function renderTeacherDashboard() {
  if (!requireFirebase()) return;
  state.screen = "teacher";
  clearSubscriptions();
  subscribeBaseData();
  app.innerHTML = `${renderTopbar("Dashboard Guru", "Kelola soal, setting kelas, data mahasiswa, dan kelompok", "G", `<button class="btn-outline" id="resetAll">Reset Data Demo</button><button class="btn-secondary" id="backHome">Kembali</button>`)}<main class="container"><div id="teacherContent" class="grid-2"></div></main>`;
  $("backHome").onclick = renderLogin;
  $("resetAll").onclick = resetData;
  setConnectionStatus();
  renderTeacherContent();
}
function renderTeacherContent() {
  const holder = $("teacherContent");
  if (!holder) return;
  const questions = objectValues(state.data.questions);
  const students = objectValues(state.data.students);
  const groups = getGroupList();
  const settings = state.data.settings || {};
  holder.innerHTML = `
    <section class="card"><div class="label">Bank Soal Guru</div><h2>Input Soal</h2><label>Judul Soal</label><input id="teacherQuestionTitle" placeholder="Contoh: Soal Beras Pecahan"><label>Isi Soal</label><textarea id="teacherQuestionText" placeholder="Contoh: Seorang pedagang beras memiliki kemasan 1/3 kg, 1/4 kg, dan 1/2 kg..."></textarea><div class="label" style="margin-top:12px">Preview</div><div id="teacherQuestionPreview" class="preview">Preview soal akan muncul di sini.</div><div class="row"><button class="btn-primary" id="saveQuestion">Simpan Soal</button></div><h3 style="margin-top:20px">Daftar Soal</h3><div class="data-list">${questions.map((q, i) => `<div class="data-item"><span class="readonly">Soal ${i + 1}</span><h3>${escapeHtml(q.title)}</h3><div class="problem">${renderMath(q.text)}</div><button class="btn-danger" data-delete-question="${q.id}">Hapus</button></div>`).join("") || `<p class="small">Belum ada soal.</p>`}</div></section>
    <section class="card"><div class="label">Setting Kelas</div><h2>Distribusi Soal</h2><div class="radio-row"><label class="radio-card"><input type="radio" name="questionMode" value="random" ${settings.questionMode === "random" ? "checked" : ""}> Random soal per kelompok</label><label class="radio-card"><input type="radio" name="questionMode" value="fixed" ${settings.questionMode === "fixed" ? "checked" : ""}> Satu soal untuk semua kelompok</label></div><label>Pilih soal untuk mode satu soal</label><select id="selectedQuestion">${questions.map((q) => `<option value="${q.id}" ${settings.selectedQuestionId === q.id ? "selected" : ""}>${escapeHtml(q.title)}</option>`).join("")}</select><div class="row"><button class="btn-primary" id="saveClassSetting">Simpan Setting</button></div><h3 style="margin-top:20px">Ringkasan Distribusi</h3><div class="data-list">${groups.map((g) => { const q = getQuestionForGroup(g.id); return `<div class="data-item"><b>${escapeHtml(g.name)}</b><div class="small">${settings.questionMode === "random" ? "Mode random" : "Satu soal untuk semua"}</div><div class="problem">${renderMath(q.text)}</div></div>`; }).join("")}</div></section>
    <section class="card"><div class="label">Data Mahasiswa</div><h2>Input Nama dan NIM</h2><label>Nama</label><input id="studentName" placeholder="Nama mahasiswa"><label>NIM</label><input id="studentNim" placeholder="NIM"><label>Kelompok</label><input id="studentGroup" type="number" min="1" placeholder="1"><div class="row"><button class="btn-primary" id="addStudent">Tambah Mahasiswa</button></div><label>Import Excel/CSV</label><input id="studentFile" type="file" accept=".xlsx,.xls,.csv"><p class="small">Format kolom: Nama, NIM, Kelompok.</p><h3>Daftar Mahasiswa</h3><div>${renderStudentTable(students)}</div></section>
    <section class="card"><div class="label">Pembagian Kelompok</div><h2>Atur Kelompok</h2><label>Jumlah anggota per kelompok</label><input id="groupSize" type="number" min="2" max="6" value="3"><div class="row"><button class="btn-primary" id="autoGroup">Buat Kelompok Otomatis</button><button class="btn-outline" id="manualGroup">Gunakan Kolom Kelompok</button></div><h3 style="margin-top:20px">Kelompok Aktif</h3><div class="data-list">${groups.map(renderGroupItem).join("")}</div></section>`;
  bindTeacherEvents();
}
function renderStudentTable(students) {
  if (!students.length) return `<p class="small">Belum ada data mahasiswa.</p>`;
  return `<table><thead><tr><th>No</th><th>Nama</th><th>NIM</th><th>Kelompok</th><th>Aksi</th></tr></thead><tbody>${students.map((s, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.nim)}</td><td>${escapeHtml(s.groupNumber || "-")}</td><td><button class="btn-danger" data-delete-student="${s.id}">Hapus</button></td></tr>`).join("")}</tbody></table>`;
}
function renderGroupItem(group) {
  const members = objectValues(group.members);
  return `<div class="data-item"><h3>${escapeHtml(group.name)}</h3><table><thead><tr><th>No</th><th>Nama</th><th>NIM</th><th>Kode</th></tr></thead><tbody>${members.map((m, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.nim || "-")}</td><td>${escapeHtml(m.code || m.id)}</td></tr>`).join("")}</tbody></table></div>`;
}
function bindTeacherEvents() {
  const text = $("teacherQuestionText");
  const preview = $("teacherQuestionPreview");
  text.oninput = () => preview.innerHTML = renderMath(text.value || "Preview soal akan muncul di sini.");
  $("saveQuestion").onclick = saveQuestion;
  $("saveClassSetting").onclick = saveClassSetting;
  $("addStudent").onclick = addStudent;
  $("studentFile").onchange = importStudentFile;
  $("autoGroup").onclick = () => createGroups(false);
  $("manualGroup").onclick = () => createGroups(true);
  document.querySelectorAll("[data-delete-question]").forEach((btn) => { btn.onclick = () => del(`questions/${btn.dataset.deleteQuestion}`); });
  document.querySelectorAll("[data-delete-student]").forEach((btn) => { btn.onclick = () => del(`students/${btn.dataset.deleteStudent}`); });
}
async function saveQuestion() {
  const title = $("teacherQuestionTitle").value.trim();
  const text = $("teacherQuestionText").value.trim();
  if (!title || !text) return toast("Judul dan isi soal wajib diisi.");
  const id = makeId("q");
  await write(`questions/${id}`, { id, title, text });
  await rebuildAssignments();
  toast("Soal disimpan.");
}
async function saveClassSetting() {
  const questionMode = document.querySelector("input[name='questionMode']:checked")?.value || "random";
  const selectedQuestionId = $("selectedQuestion").value;
  await patch("settings", { questionMode, selectedQuestionId, assignments: {} });
  await rebuildAssignments();
  toast("Setting kelas disimpan.");
}
async function rebuildAssignments() {
  const settings = await read("settings", {});
  const groups = objectValues(await read("groups", {}));
  const questions = objectValues(await read("questions", {}));
  if (!questions.length) return;
  if (settings.questionMode === "random") {
    const assignments = {};
    groups.forEach((group, index) => { assignments[group.id] = questions[index % questions.length].id; });
    await patch("settings", { assignments });
  }
}
async function addStudent() {
  const name = $("studentName").value.trim();
  const nim = $("studentNim").value.trim();
  const groupNumber = $("studentGroup").value.trim();
  if (!name || !nim) return toast("Nama dan NIM wajib diisi.");
  const id = makeId("s");
  await write(`students/${id}`, { id, name, nim, groupNumber });
  toast("Mahasiswa ditambahkan.");
}
function parseCsv(text) { return text.split(/\r?\n/).filter(Boolean).map((line) => line.split(/[;,]/).map((v) => v.trim())); }
function normalizeRows(rows) {
  if (!rows.length) return [];
  const header = rows[0].map((h) => String(h || "").toLowerCase().trim());
  const hasHeader = header.some((h) => ["nama", "name", "nim", "kelompok", "group"].includes(h));
  const body = hasHeader ? rows.slice(1) : rows;
  const nameIndex = hasHeader ? Math.max(header.indexOf("nama"), header.indexOf("name")) : 0;
  const nimIndex = hasHeader ? header.indexOf("nim") : 1;
  const groupIndex = hasHeader ? Math.max(header.indexOf("kelompok"), header.indexOf("group")) : 2;
  return body.map((row) => ({ id: makeId("s"), name: String(row[nameIndex] || "").trim(), nim: String(row[nimIndex] || "").trim(), groupNumber: String(row[groupIndex] || "").trim() })).filter((s) => s.name && s.nim);
}
function importStudentFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const ext = file.name.split(".").pop().toLowerCase();
  const reader = new FileReader();
  reader.onload = async (e) => {
    let rows = [];
    if (ext === "csv") rows = parseCsv(String(e.target.result));
    else {
      if (!window.XLSX) return toast("Library XLSX belum termuat. Gunakan CSV atau pastikan internet aktif.");
      const workbook = window.XLSX.read(new Uint8Array(e.target.result), { type: "array" });
      rows = window.XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
    }
    const students = normalizeRows(rows);
    for (const student of students) await write(`students/${student.id}`, student);
    toast(`${students.length} mahasiswa diimpor.`);
  };
  if (ext === "csv") reader.readAsText(file); else reader.readAsArrayBuffer(file);
}
async function createGroups(useManualColumn) {
  const students = objectValues(await read("students", {}));
  if (!students.length) return toast("Data mahasiswa masih kosong.");
  const grouped = {};
  if (useManualColumn) {
    for (const student of students) {
      const number = String(student.groupNumber || "").trim();
      if (!number) continue;
      if (!grouped[number]) grouped[number] = [];
      grouped[number].push(student);
    }
  } else {
    const size = Number($("groupSize").value || 3);
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    shuffled.forEach((student, index) => { const number = String(Math.floor(index / size) + 1); if (!grouped[number]) grouped[number] = []; grouped[number].push(student); });
  }
  if (!Object.keys(grouped).length) return toast("Kolom kelompok belum tersedia.");
  const groups = {};
  for (const [number, list] of Object.entries(grouped)) {
    const groupId = `g${number}`;
    const members = {};
    list.forEach((student, index) => { const memberId = `${groupId}_m${index + 1}`; members[memberId] = { id: memberId, name: student.name, nim: student.nim, code: `K${number}-${index + 1}` }; });
    groups[groupId] = { id: groupId, number: Number(number), name: `Kelompok ${number}`, type: `Kelompok ${number}`, members };
    await patch(`rooms/${groupId}`, { currentPhase: 1, maxPhase: 1 });
  }
  await write("groups", groups);
  await rebuildAssignments();
  toast("Kelompok diperbarui.");
}
async function resetData() {
  if (!confirm("Reset semua data kelas, termasuk whiteboard dan progres?")) return;
  await del("");
  window.location.reload();
}
function renderBank() {
  if (!requireFirebase()) return;
  state.screen = "bank";
  clearSubscriptions();
  subscribeBaseData();
  app.innerHTML = `${renderTopbar("Bank Soal Kelas", "Read-only", "B", `<button class="btn-secondary" id="backFromBank">Kembali</button>`)}<main class="container"><section class="card"><div class="head"><div><h2>Daftar Soal Final</h2><p class="small">Halaman ini hanya menampilkan soal final dari kelompok.</p></div><div><label style="margin-top:0">Filter Kelompok</label><select id="bankFilter"></select></div></div><div id="bankList" class="bank-list"></div></section></main>`;
  $("backFromBank").onclick = () => state.groupId ? renderStudentRoom() : renderLogin();
  $("bankFilter").onchange = renderBankList;
  setConnectionStatus();
  renderBankFilter();
  renderBankList();
}
function renderBankFilter() { const groups = getGroupList(); $("bankFilter").innerHTML = `<option value="all">Semua Kelompok</option>${groups.map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join("")}`; }
function renderBankList() {
  const holder = $("bankList");
  if (!holder) return;
  const selected = $("bankFilter")?.value || "all";
  let items = objectValues(state.data.bank);
  if (selected !== "all") items = items.filter((item) => item.groupId === selected);
  holder.innerHTML = items.length ? items.map((item) => `<div class="data-item"><span class="readonly">Read-only</span><h3>${escapeHtml(item.groupName || item.groupId)}</h3><div class="small">${escapeHtml(item.createdAt || "")}</div><div class="problem">${renderMath(item.finalQuestion || "")}</div></div>`).join("") : `<div class="data-item"><b>Belum ada soal final.</b><p class="small">Soal muncul setelah kelompok menyelesaikan fase 3.</p></div>`;
}
function renderBootScreen() { app.innerHTML = `<section class="splash"><div class="card" style="max-width:620px"><h2>Memeriksa Firebase...</h2><p class="small">Aplikasi sedang mengecek konfigurasi dan koneksi Realtime Database.</p></div></section>`; }
async function bootstrap() {
  renderBootScreen();
  const status = await initFirebase();
  if (status.ok) subscribeBaseData();
  renderLogin();
}
bootstrap();

async function generateSoalDenganGemini(materi, apiKeyGuru) {
    const prompt = `Buatkan 5 soal untuk materi ${materi} dengan tingkat kesulitan yang bervariasi. Berikan format JSON dengan key 'soal'.`;
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKeyGuru}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });
        const data = await response.json();
        console.log("Hasil AI:", data.candidates[0].content.parts[0].text);
        // Tampilkan ke layar atau masukkan ke input soal
    } catch (error) {
        console.error("Gagal generate soal:", error);
    }
}
