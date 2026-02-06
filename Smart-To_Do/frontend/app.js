let allTasks = [];
let editingTaskId = null;

// Theme Management
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    body.setAttribute('data-theme', savedTheme);
    updateToggleIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateToggleIcon(newTheme);
}

function updateToggleIcon(theme) {
    themeToggle.innerText = theme === 'light' ? '🌙' : '☀️';
}

themeToggle.addEventListener('click', toggleTheme);

// Task Management
function loadTasks() {
    fetch("http://localhost:5000/tasks")
        .then(res => res.json())
        .then(data => {
            allTasks = data;
            renderTasks(data);
            loadHistory();
        })
        .catch(err => console.error("Error loading tasks:", err));
}

function addTask() {
    const titleInput = document.getElementById("title");
    const prioritySelect = document.getElementById("priority");
    const title = titleInput.value.trim();
    const priority = prioritySelect.value;

    if (!title) {
        titleInput.classList.add('error');
        setTimeout(() => titleInput.classList.remove('error'), 1000);
        return;
    }

    fetch("http://localhost:5000/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, priority })
    }).then(loadTasks);

    titleInput.value = "";
}

function toggleComplete(id, completed) {
    fetch(`http://localhost:5000/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed })
    }).then(loadTasks);
}

function startEdit(id) {
    console.log("Edit clicked for task:", id);
    editingTaskId = id;
    renderTasks(allTasks);
}

function cancelEdit() {
    console.log("Cancel edit");

    // Track the cancelled edit
    if (editingTaskId) {
        const task = allTasks.find(t => t.id == editingTaskId);
        if (task) {
            fetch("http://localhost:5000/history/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: task.id,
                    title: task.title,
                    priority: task.priority
                })
            }).then(() => loadHistory());
        }
    }

    editingTaskId = null;
    renderTasks(allTasks);
}

function loadHistory() {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    fetch(`http://localhost:5000/history?t=${timestamp}`)
        .then(res => res.json())
        .then(data => renderHistory(data))
        .catch(err => console.error("Error loading history:", err));
}

function renderHistory(history) {
    // Completed tasks
    const completedList = document.getElementById("completedList");
    completedList.innerHTML = "";
    history.completed.slice(-5).reverse().forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <span class="history-badge priority-${item.priority.toLowerCase()}">${item.priority}</span>
            <span class="history-text">${item.title}</span>
            <span class="history-time">${formatTime(item.timestamp)}</span>
        `;
        completedList.appendChild(li);
    });
    if (history.completed.length === 0) {
        completedList.innerHTML = '<li class="history-empty">No completed tasks yet</li>';
    }

    // Edited tasks
    const editedList = document.getElementById("editedList");
    editedList.innerHTML = "";
    history.edited.slice(-5).reverse().forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <span class="history-text">${item.oldTitle} → ${item.newTitle}</span>
            <span class="history-time">${formatTime(item.timestamp)}</span>
        `;
        editedList.appendChild(li);
    });
    if (history.edited.length === 0) {
        editedList.innerHTML = '<li class="history-empty">No edits yet</li>';
    }

    // Cancelled edits
    const cancelledList = document.getElementById("cancelledList");
    cancelledList.innerHTML = "";
    history.cancelled.slice(-5).reverse().forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <span class="history-badge priority-${item.priority.toLowerCase()}">${item.priority}</span>
            <span class="history-text">${item.title}</span>
            <span class="history-time">${formatTime(item.timestamp)}</span>
        `;
        cancelledList.appendChild(li);
    });
    if (history.cancelled.length === 0) {
        cancelledList.innerHTML = '<li class="history-empty">No cancelled edits</li>';
    }

    // Deleted tasks
    const deletedList = document.getElementById("deletedList");
    deletedList.innerHTML = "";
    history.deleted.slice(-5).reverse().forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <span class="history-badge priority-${item.priority.toLowerCase()}">${item.priority}</span>
            <span class="history-text">${item.title}</span>
            <span class="history-time">${formatTime(item.timestamp)}</span>
        `;
        deletedList.appendChild(li);
    });
    if (history.deleted.length === 0) {
        deletedList.innerHTML = '<li class="history-empty">No deleted tasks</li>';
    }
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function saveEdit(id) {
    console.log("Saving task:", id);
    const item = document.querySelector(`[data-id="${id}"]`);
    if (!item) {
        console.error("Could not find task item");
        return;
    }

    const titleInput = item.querySelector(".edit-title");
    const prioritySelect = item.querySelector(".edit-priority");

    if (!titleInput || !prioritySelect) {
        console.error("Could not find edit inputs");
        return;
    }

    const newTitle = titleInput.value.trim();
    const newPriority = prioritySelect.value;

    if (!newTitle) {
        alert("Task title cannot be empty!");
        return;
    }

    console.log("Updating with:", { title: newTitle, priority: newPriority });

    fetch(`http://localhost:5000/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, priority: newPriority })
    })
        .then(res => {
            if (!res.ok) throw new Error("Server error");
            return res.json();
        })
        .then(data => {
            console.log("Save successful:", data);
            editingTaskId = null;
            loadTasks();
        })
        .catch(err => {
            console.error("Error saving:", err);
            alert("Failed to save. Check console for details.");
        });
}

function deleteTask(id) {
    const item = document.querySelector(`[data-id="${id}"]`);
    if (item) {
        item.style.opacity = "0";
        item.style.transform = "translateY(10px)";
    }

    setTimeout(() => {
        fetch(`http://localhost:5000/tasks/${id}`, { method: "DELETE" })
            .then(loadTasks);
    }, 200);
}

function filterTasks(priority) {
    if (priority === "All") renderTasks(allTasks);
    else renderTasks(allTasks.filter(t => t.priority === priority));
}

function renderTasks(tasks) {
    console.log("Rendering tasks. Editing ID:", editingTaskId);
    const taskList = document.getElementById("taskList");
    taskList.innerHTML = "";
    let pending = 0;

    tasks.forEach(t => {
        if (!t.completed) pending++;

        const isEditing = (t.id == editingTaskId);
        console.log(`Task ${t.id}: editing=${isEditing}`);
        const priorityClass = `priority-${t.priority.toLowerCase()}`;

        const li = document.createElement('li');
        li.className = isEditing ? 'task-item editing' : 'task-item';
        li.setAttribute('data-id', t.id);

        if (isEditing) {
            // Edit mode
            li.innerHTML = `
                <div class="task-content">
                    <select class="edit-priority">
                        <option value="High" ${t.priority === 'High' ? 'selected' : ''}>High</option>
                        <option value="Medium" ${t.priority === 'Medium' ? 'selected' : ''}>Medium</option>
                        <option value="Low" ${t.priority === 'Low' ? 'selected' : ''}>Low</option>
                    </select>
                    <input type="text" class="edit-title" value="${t.title}">
                </div>
                <div class="task-actions">
                    <button class="btn-save" data-id="${t.id}" title="Save">💾</button>
                    <button class="btn-cancel" title="Cancel">❌</button>
                </div>
            `;

            // Add event listeners
            li.querySelector('.btn-save').addEventListener('click', () => saveEdit(t.id));
            li.querySelector('.btn-cancel').addEventListener('click', cancelEdit);
        } else {
            // Normal mode
            li.innerHTML = `
                <div class="task-content">
                    <span class="priority-badge ${priorityClass}">${t.priority}</span>
                    <span class="task-title ${t.completed ? 'completed' : ''}">${t.title}</span>
                </div>
                <div class="task-actions">
                    <input type="checkbox" class="checkbox-custom" ${t.completed ? "checked" : ""}>
                    <button class="btn-edit" data-id="${t.id}" title="Edit Task">✏️</button>
                    <button class="btn-delete" data-id="${t.id}" title="Delete Task">🗑️</button>
                </div>
            `;

            // Add event listeners
            const checkbox = li.querySelector('.checkbox-custom');
            checkbox.addEventListener('change', (e) => toggleComplete(t.id, e.target.checked));

            li.querySelector('.btn-edit').addEventListener('click', () => startEdit(t.id));
            li.querySelector('.btn-delete').addEventListener('click', () => deleteTask(t.id));
        }

        taskList.appendChild(li);
    });

    document.getElementById("count").innerText = pending;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log("App initialized");
    initTheme();
    loadTasks();
});
