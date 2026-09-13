(function () {
  'use strict';

  var STORAGE_KEY = 'personal-tasks';
  var DECO_COUNT = 5;

  var state = {
    tasks: [],
    editingId: null,
    doneOpen: false,
  };

  function uid() {
    return Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function loadTasks() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      // タイトルと完了状態だけを使うシンプル版
      state.tasks = parsed.map(function (t) {
        return { id: t.id || uid(), title: t.title || '', done: !!t.done, createdAt: t.createdAt || Date.now() };
      });
    } catch (e) {
      state.tasks = [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
    } catch (e) {
      console.error('保存に失敗しました', e);
    }
  }

  function addTask(title) {
    state.tasks.unshift({ id: uid(), title: title, done: false, createdAt: Date.now() });
    saveTasks();
    render();
  }

  function toggleDone(id) {
    var t = state.tasks.find(function (t) { return t.id === id; });
    if (t) t.done = !t.done;
    saveTasks();
    render();
  }

  function deleteTask(id) {
    state.tasks = state.tasks.filter(function (t) { return t.id !== id; });
    saveTasks();
    render();
  }

  function setTitle(id, title) {
    var t = state.tasks.find(function (t) { return t.id === id; });
    if (t && title.trim()) t.title = title.trim();
    state.editingId = null;
    saveTasks();
    render();
  }

  function checkIconSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M4 12l5 5L20 7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function closeIconSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/></svg>';
  }

  function renderRow(task) {
    var isEditing = state.editingId === task.id;
    var titleHtml = isEditing
      ? '<input class="tm-title-input" data-role="title-input" data-id="' + task.id + '" value="' + escapeHtml(task.title) + '" />'
      : '<span class="tm-title-text ' + (task.done ? 'done' : '') + '" data-role="title-text" data-id="' + task.id + '">' + escapeHtml(task.title) + '</span>';

    return (
      '<div class="tm-row">' +
        '<button class="tm-check ' + (task.done ? 'checked' : '') + '" data-role="toggle" data-id="' + task.id + '" type="button" aria-label="完了にする">' +
          (task.done ? checkIconSvg() : '') +
        '</button>' +
        titleHtml +
        '<button class="tm-delete-btn" data-role="delete" data-id="' + task.id + '" type="button" aria-label="削除">' + closeIconSvg() + '</button>' +
      '</div>'
    );
  }

  function renderDeco(el) {
    var html = '';
    for (var i = 0; i < DECO_COUNT; i++) {
      html += '<img src="bread-deco.png" alt="" />';
    }
    el.innerHTML = html;
  }

  function render() {
    var active = state.tasks.filter(function (t) { return !t.done; });
    var done = state.tasks.filter(function (t) { return t.done; }).sort(function (a, b) { return b.createdAt - a.createdAt; });

    document.getElementById('subtitle').textContent =
      active.length > 0 ? '未完了のタスクが' + active.length + '件あります' : 'すべてのタスクが完了しています';

    var activeList = document.getElementById('active-list');
    activeList.innerHTML = active.length > 0
      ? active.map(renderRow).join('')
      : '<div class="tm-empty">まだタスクがありません。上のフォームから追加してください。</div>';

    document.getElementById('done-label').textContent = '完了（' + done.length + '）';
    var doneToggle = document.getElementById('done-toggle');
    var doneCard = document.getElementById('done-card');
    doneToggle.classList.toggle('open', state.doneOpen);
    doneCard.hidden = !state.doneOpen;
    if (state.doneOpen) {
      document.getElementById('done-list').innerHTML = done.length > 0
        ? done.map(renderRow).join('')
        : '<div class="tm-empty">完了したタスクはありません。</div>';
    }

    if (state.editingId) {
      var input = document.querySelector('[data-role="title-input"][data-id="' + state.editingId + '"]');
      if (input) { input.focus(); input.select(); }
    }
  }

  function initForm() {
    var form = document.getElementById('add-form');
    var titleInput = document.getElementById('new-title');
    var addBtn = document.getElementById('add-btn');

    titleInput.addEventListener('input', function () {
      addBtn.disabled = !titleInput.value.trim();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var title = titleInput.value.trim();
      if (!title) return;
      addTask(title);
      titleInput.value = '';
      addBtn.disabled = true;
      titleInput.focus();
    });
  }

  function initDoneToggle() {
    document.getElementById('done-toggle').addEventListener('click', function () {
      state.doneOpen = !state.doneOpen;
      render();
    });
  }

  function initLists() {
    document.body.addEventListener('click', function (e) {
      var toggle = e.target.closest('[data-role="toggle"]');
      if (toggle) { toggleDone(toggle.getAttribute('data-id')); return; }

      var del = e.target.closest('[data-role="delete"]');
      if (del) { deleteTask(del.getAttribute('data-id')); return; }

      var titleText = e.target.closest('[data-role="title-text"]');
      if (titleText) {
        state.editingId = titleText.getAttribute('data-id');
        render();
        return;
      }
    });

    document.body.addEventListener('blur', function (e) {
      var titleInput = e.target.closest('[data-role="title-input"]');
      if (titleInput) { setTitle(titleInput.getAttribute('data-id'), titleInput.value); }
    }, true);

    document.body.addEventListener('keydown', function (e) {
      var titleInput = e.target.closest('[data-role="title-input"]');
      if (titleInput) {
        if (e.key === 'Enter') { setTitle(titleInput.getAttribute('data-id'), titleInput.value); }
        if (e.key === 'Escape') { state.editingId = null; render(); }
      }
    });
  }

  function initServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('service-worker.js').catch(function (err) {
          console.error('Service worker registration failed', err);
        });
      });
    }
  }

  function init() {
    loadTasks();
    renderDeco(document.getElementById('deco-top'));
    renderDeco(document.getElementById('deco-bottom'));
    initForm();
    initDoneToggle();
    initLists();
    initServiceWorker();
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
