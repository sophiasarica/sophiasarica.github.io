(function () {
  "use strict";

  const monthLabel = document.getElementById("monthLabel");
  const grid = document.getElementById("grid");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const todayBtn = document.getElementById("todayBtn");
  const exportBtn = document.getElementById("exportBtn");
  const importInput = document.getElementById("importInput");
  const appTitle = document.getElementById("appTitle");
  const editTitleBtn = document.getElementById("editTitleBtn");

  // To-Do elements
  const todoForm = document.getElementById("todoForm");
  const todoInput = document.getElementById("todoInput");
  const todoList = document.getElementById("todoList");

  const eventDialog = document.getElementById("eventDialog");
  const eventForm = document.getElementById("eventForm");
  const dialogTitle = document.getElementById("dialogTitle");
  const eventDate = document.getElementById("eventDate");
  const eventTitle = document.getElementById("eventTitle");
  const eventDesc = document.getElementById("eventDesc");
  const eventColor = document.getElementById("eventColor");
  const closeDialogBtn = document.getElementById("closeDialogBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const saveBtn = document.getElementById("saveBtn");
  const deleteBtn = document.getElementById("deleteBtn");

  const dayTemplate = document.getElementById("dayTemplate");

  const MONTH_FORMAT = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
  const FULL_DATE_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  let viewYear;
  let viewMonth; // 0-11

  function toDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function parseDateKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function loadEvents() {
    try {
      return JSON.parse(localStorage.getItem("pc_events") || "{}");
    } catch (_) {
      return {};
    }
  }

  function saveEvents(events) {
    localStorage.setItem("pc_events", JSON.stringify(events));
  }

  function loadTodos() {
    try { return JSON.parse(localStorage.getItem("pc_todos") || "[]"); }
    catch (_) { return []; }
  }

  function saveTodos(items) {
    localStorage.setItem("pc_todos", JSON.stringify(items));
  }

  function getMonthMatrix(year, month) {
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay(); // 0=Sun
    const startDate = new Date(year, month, 1 - startOffset);

    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  }

  function render() {
    monthLabel.textContent = MONTH_FORMAT.format(new Date(viewYear, viewMonth, 1));
    if (appTitle) {
      const today = new Date();
      const name = localStorage.getItem("pc_title") || "Personal Calendar";
      appTitle.textContent = `${name} — ${FULL_DATE_FORMAT.format(today)}`;
    }

    const eventsByDate = loadEvents();

    grid.innerHTML = "";
    const days = getMonthMatrix(viewYear, viewMonth);
    for (const date of days) {
      const node = dayTemplate.content.firstElementChild.cloneNode(true);
      const dateNum = node.querySelector(".date-num");
      const addBtn = node.querySelector(".add-btn");
      const eventsEl = node.querySelector(".events");

      const isOutside = date.getMonth() !== viewMonth;
      if (isOutside) node.classList.add("outside");

      dateNum.textContent = String(date.getDate());

      const key = toDateKey(date);
      const items = eventsByDate[key] || [];

      for (const item of items) {
        const ev = document.createElement("div");
        ev.className = "event";
        ev.dataset.id = item.id;
        ev.dataset.dateKey = key;
        ev.innerHTML = `<span class="dot" style="background:${item.color || "var(--primary)"}"></span><span class="title">${escapeHtml(item.title)}</span>`;
        ev.addEventListener("click", () => openEditDialog(key, item.id));
        eventsEl.appendChild(ev);
      }

      addBtn.addEventListener("click", () => openAddDialog(key));

      node.addEventListener("dblclick", () => openAddDialog(key));

      grid.appendChild(node);
    }
  }

  if (editTitleBtn) {
    editTitleBtn.addEventListener("click", () => {
      const current = localStorage.getItem("pc_title") || "Personal Calendar";
      const wrapper = appTitle.parentElement;
      const input = document.createElement("input");
      input.type = "text";
      input.value = current;
      input.className = "apptitle-input";
      // Swap in input temporarily
      wrapper.replaceChild(input, appTitle);
      input.focus();
      input.select();

      function finish(save) {
        const name = save ? (input.value.trim() || "Personal Calendar") : current;
        localStorage.setItem("pc_title", name);
        // Restore title node and re-render to apply date suffix
        wrapper.replaceChild(appTitle, input);
        render();
        cleanup();
      }

      function onKey(e) {
        if (e.key === "Enter") finish(true);
        if (e.key === "Escape") finish(false);
      }
      function onBlur() { finish(true); }
      function cleanup() {
        input.removeEventListener("keydown", onKey);
        input.removeEventListener("blur", onBlur);
      }

      input.addEventListener("keydown", onKey);
      input.addEventListener("blur", onBlur);
    });
  }

  // To-Do rendering and events
  function renderTodos() {
    if (!todoList) return;
    const items = loadTodos();
    todoList.innerHTML = "";
    for (const item of items) {
      const li = document.createElement("li");
      li.className = `todo-item${item.done ? " completed" : ""}`;

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!item.done;
      cb.addEventListener("change", () => {
        item.done = cb.checked;
        saveTodos(items);
        renderTodos();
      });

      const span = document.createElement("span");
      span.className = "todo-text";
      span.textContent = item.text;

      li.appendChild(cb);
      li.appendChild(span);
      todoList.appendChild(li);
    }
  }

  function openAddDialog(dateKey) {
    dialogTitle.textContent = "Add Event";
    eventDate.value = dateKey;
    eventTitle.value = "";
    eventDesc.value = "";
    eventColor.value = "#2563eb";
    deleteBtn.hidden = true;
    eventDialog.showModal();
  }

  function openEditDialog(dateKey, id) {
    const events = loadEvents();
    const items = events[dateKey] || [];
    const item = items.find((x) => x.id === id);
    if (!item) return;

    dialogTitle.textContent = "Edit Event";
    eventDate.value = dateKey;
    eventTitle.value = item.title || "";
    eventDesc.value = item.desc || "";
    eventColor.value = item.color || "#2563eb";
    deleteBtn.hidden = false;
    deleteBtn.dataset.id = id;
    deleteBtn.dataset.dateKey = dateKey;
    eventDialog.showModal();
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[s]));
  }

  function uid() { return Math.random().toString(36).slice(2, 10); }

  prevBtn.addEventListener("click", () => {
    const d = new Date(viewYear, viewMonth - 1, 1);
    viewYear = d.getFullYear();
    viewMonth = d.getMonth();
    render();
  });

  nextBtn.addEventListener("click", () => {
    const d = new Date(viewYear, viewMonth + 1, 1);
    viewYear = d.getFullYear();
    viewMonth = d.getMonth();
    render();
  });

  todayBtn.addEventListener("click", () => {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    render();
  });

  if (todoForm && todoInput) {
    todoForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = todoInput.value.trim();
      if (!text) return;
      const items = loadTodos();
      items.push({ id: uid(), text, done: false });
      saveTodos(items);
      todoInput.value = "";
      renderTodos();
    });
  }

  closeDialogBtn.addEventListener("click", () => eventDialog.close());
  cancelBtn.addEventListener("click", () => eventDialog.close());

  eventForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const dateKey = eventDate.value;
    const title = eventTitle.value.trim();
    const desc = eventDesc.value.trim();
    const color = eventColor.value;

    if (!dateKey || !title) return;

    const events = loadEvents();
    const items = events[dateKey] || [];

    const existingId = deleteBtn.dataset.id;
    if (existingId) {
      const index = items.findIndex((x) => x.id === existingId);
      if (index >= 0) {
        items[index] = { id: existingId, title, desc, color };
      }
      delete deleteBtn.dataset.id;
      delete deleteBtn.dataset.dateKey;
    } else {
      items.push({ id: uid(), title, desc, color });
    }

    events[dateKey] = items;
    saveEvents(events);
    eventDialog.close();

    const d = parseDateKey(dateKey);
    viewYear = d.getFullYear();
    viewMonth = d.getMonth();
    render();
  });

  deleteBtn.addEventListener("click", () => {
    const id = deleteBtn.dataset.id;
    const dateKey = deleteBtn.dataset.dateKey;
    if (!id || !dateKey) return;
    const events = loadEvents();
    const items = events[dateKey] || [];
    const next = items.filter((x) => x.id !== id);
    if (next.length === 0) delete events[dateKey]; else events[dateKey] = next;
    saveEvents(events);
    eventDialog.close();
    const d = parseDateKey(dateKey);
    viewYear = d.getFullYear();
    viewMonth = d.getMonth();
    render();
  });

  exportBtn.addEventListener("click", () => {
    const data = JSON.stringify(loadEvents(), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "calendar-events.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  importInput.addEventListener("change", async () => {
    const file = importInput.files && importInput.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data && typeof data === "object") {
        saveEvents(data);
        const now = new Date();
        viewYear = now.getFullYear();
        viewMonth = now.getMonth();
        render();
      }
    } catch (err) {
      alert("Invalid JSON file.");
    } finally {
      importInput.value = "";
    }
  });

  (function init() {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    render();
    renderTodos();
  })();
})();
