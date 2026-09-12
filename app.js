(function () {
  'use strict';

  var STORAGE_KEY = 'personal-tasks';
  var PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
  var PRIORITY_LABEL = { high: '高', medium: '中', low: '低' };
  var PRIORITY_CYCLE = { high: 'medium', medium: 'low', low: 'high' };
  var TABS = [
    ['active', '未完了'],
    ['all', 'すべて'],
    ['overdue', '期限超過'],
    ['today', '今日'],
    ['done', '完了'],
  ];

  var state = {
    tasks: [],
    filter: 'active',
    editingId: null,
    editingDueId: null,
  };

  function todayStr() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function formatDue(dateStr) {
    if (!dateStr) return '';
    var parts = dateStr.split('-').map(Number);
    return parts[1] + '/' + parts[2];
  }

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
      state.tasks = raw ? JSON.parse(raw) : [];
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

  function addTask(title, due, priority) {
    state.tasks.unshift({
      id: uid(),
      title: title,
      due: due || '',
      priority: priority,
      done: false,
      createdAt: Date.now(),
    });
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

  function cyclePriority(id) {
    var t = state.tasks.find(function (t) { return t.id === id; });
    if (t) t.priority = PRIORITY_CYCLE[t.priority];
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

  function setDue(id, due) {
    var t = state.tasks.find(function (t) { return t.id === id; });
    if (t) t.due = due;
    state.editingDueId = null;
    saveTasks();
    render();
  }

  function sortFn(a, b) {
    if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
    if (a.due && !b.due) return -1;
    if (!a.due && b.due) return 1;
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  }

  function buildGroups() {
    var today = todayStr();
    var active = state.tasks.filter(function (t) { return !t.done; });
    var done = state.tasks.filter(function (t) { return t.done; });

    var overdue = active.filter(function (t) { return t.due && t.due < today; }).sort(sortFn);
    var todayList = active.filter(function (t) { return t.due === today; }).sort(sortFn);
    var upcoming = active.filter(function (t) { return t.due && t.due > today; }).sort(sortFn);
    var noDate = active.filter(function (t) { return !t.due; }).sort(function (a, b) {
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    });
    done.sort(function (a, b) { return b.createdAt - a.createdAt; });

    var all = [
      { key: 'overdue', label: '期限超過', tasks: overdue, tone: 'rust' },
      { key: 'today', label: '今日', tasks: todayList, tone: 'pine' },
      { key: 'upcoming', label: '今後', tasks: upcoming, tone: 'ink' },
      { key: 'nodate', label: '期限なし', tasks: noDate, tone: 'ink' },
      { key: 'done', label: '完了', tasks: done, tone: 'done' },
    ];

    return all.filter(function (g) {
      if (state.filter === 'all') return true;
      if (state.filter === 'active') return g.key !== 'done';
      if (state.filter === 'overdue') return g.key === 'overdue';
      if (state.filter === 'today') return g.key === 'today';
      if (state.filter === 'done') return g.key === 'done';
      return true;
    }).filter(function (g) { return g.tasks.length > 0; });
  }

  function checkIconSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M4 12l5 5L20 7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function closeIconSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/></svg>';
  }

  function renderRow(task, today) {
    var isEditingTitle = state.editingId === task.id;
    var isEditingDue = state.editingDueId === task.id;
    var overdue = task.due && task.due < today && !task.done;

    var titleHtml = isEditingTitle
      ? '<input class="tm-title-input" data-role="title-input" data-id="' + task.id + '" value="' + escapeHtml(task.title) + '" />'
      : '<span class="tm-title-text ' + (task.done ? 'done' : '') + '" data-role="title-text" data-id="' + task.id + '">' + escapeHtml(task.title) + '</span>';

    var dueHtml = isEditingDue
      ? '<input class="tm-due-input" type="date" data-role="due-input" data-id="' + task.id + '" value="' + task.due + '" />'
      : '<button class="tm-due-btn ' + (overdue ? 'overdue' : '') + '" data-role="due-btn" data-id="' + task.id + '" type="button">' + (task.due ? formatDue(task.due) : '期限を設定') + '</button>';

    return (
      '<div class="tm-row">' +
        '<button class="tm-check ' + (task.done ? 'checked' : '') + '" data-role="toggle" data-id="' + task.id + '" type="button" aria-label="完了にする">' +
          (task.done ? checkIconSvg() : '') +
        '</button>' +
        '<button class="tm-priority-dot ' + task.priority + '" data-role="priority" data-id="' + task.id + '" type="button" title="優先度: ' + PRIORITY_LABEL[task.priority] + '（クリックで変更）"></button>' +
        titleHtml +
        dueHtml +
        '<button class="tm-delete-btn" data-role="delete" data-id="' + task.id + '" type="button" aria-label="削除">' + closeIconSvg() + '</button>' +
      '</div>'
    );
  }

  function render() {
    var today = todayStr();
    var activeCount = state.tasks.filter(function (t) { return !t.done; }).length;

    document.getElementById('subtitle').textContent =
      activeCount > 0 ? '未完了のタスクが' + activeCount + '件あります' : 'すべてのタスクが完了しています';

    var tabsEl = document.getElementById('tabs');
    tabsEl.innerHTML = TABS.map(function (pair) {
      var key = pair[0], label = pair[1];
      return '<button class="tm-tab ' + (state.filter === key ? 'active' : '') + '" data-role="tab" data-filter="' + key + '" type="button">' + label + '</button>';
    }).join('');

    var groups = buildGroups();
    var listEl = document.getElementById('list-area');

    if (groups.length === 0) {
      listEl.innerHTML = '<div class="tm-empty">' +
        (state.tasks.length === 0 ? 'まだタスクがありません。上のフォームから追加してください。' : '該当するタスクはありません。') +
        '</div>';
      return;
    }

    listEl.innerHTML = groups.map(function (g) {
      return (
        '<div class="tm-group">' +
          '<div class="tm-group-label"><span class="tm-group-dot ' + g.tone + '"></span>' + g.label + '（' + g.tasks.length + '）</div>' +
          g.tasks.map(function (t) { return renderRow(t, today); }).join('') +
        '</div>'
      );
    }).join('');

    // フォーカスが必要な編集中の入力にフォーカスを当てる
    if (state.editingId) {
      var input = listEl.querySelector('[data-role="title-input"][data-id="' + state.editingId + '"]');
      if (input) { input.focus(); input.select(); }
    }
    if (state.editingDueId) {
      var dueInput = listEl.querySelector('[data-role="due-input"][data-id="' + state.editingDueId + '"]');
      if (dueInput) { dueInput.focus(); }
    }
  }

  // --- イベント設定 ---

  function initForm() {
    var form = document.getElementById('add-form');
    var titleInput = document.getElementById('new-title');
    var dueInput = document.getElementById('new-due');
    var prioritySelect = document.getElementById('new-priority');
    var addBtn = document.getElementById('add-btn');

    titleInput.addEventListener('input', function () {
      addBtn.disabled = !titleInput.value.trim();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var title = titleInput.value.trim();
      if (!title) return;
      addTask(title, dueInput.value, prioritySelect.value);
      titleInput.value = '';
      dueInput.value = '';
      prioritySelect.value = 'medium';
      addBtn.disabled = true;
      titleInput.focus();
    });
  }

  function initTabs() {
    document.getElementById('tabs').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-role="tab"]');
      if (!btn) return;
      state.filter = btn.getAttribute('data-filter');
      render();
    });
  }

  function initList() {
    var listEl = document.getElementById('list-area');

    listEl.addEventListener('click', function (e) {
      var toggle = e.target.closest('[data-role="toggle"]');
      if (toggle) { toggleDone(toggle.getAttribute('data-id')); return; }

      var priority = e.target.closest('[data-role="priority"]');
      if (priority) { cyclePriority(priority.getAttribute('data-id')); return; }

      var del = e.target.closest('[data-role="delete"]');
      if (del) { deleteTask(del.getAttribute('data-id')); return; }

      var titleText = e.target.closest('[data-role="title-text"]');
      if (titleText) {
        state.editingId = titleText.getAttribute('data-id');
        render();
        return;
      }

      var dueBtn = e.target.closest('[data-role="due-btn"]');
      if (dueBtn) {
        state.editingDueId = dueBtn.getAttribute('data-id');
        render();
        return;
      }
    });

    listEl.addEventListener('blur', function (e) {
      var titleInput = e.target.closest('[data-role="title-input"]');
      if (titleInput) { setTitle(titleInput.getAttribute('data-id'), titleInput.value); return; }

      var dueInput = e.target.closest('[data-role="due-input"]');
      if (dueInput) { setDue(dueInput.getAttribute('data-id'), dueInput.value); return; }
    }, true);

    listEl.addEventListener('keydown', function (e) {
      var titleInput = e.target.closest('[data-role="title-input"]');
      if (titleInput) {
        if (e.key === 'Enter') { setTitle(titleInput.getAttribute('data-id'), titleInput.value); }
        if (e.key === 'Escape') { state.editingId = null; render(); }
      }
    });

    listEl.addEventListener('change', function (e) {
      var dueInput = e.target.closest('[data-role="due-input"]');
      if (dueInput) { setDue(dueInput.getAttribute('data-id'), dueInput.value); }
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
    initForm();
    initTabs();
    initList();
    initServiceWorker();
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
