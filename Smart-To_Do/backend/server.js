const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let tasks = [];
let idCounter = 1;

// History tracking
let history = {
    completed: [],
    edited: [],
    cancelled: [],
    deleted: []
};

// Add task
app.post("/tasks", (req, res) => {
    const task = {
        id: idCounter++,
        title: req.body.title,
        priority: req.body.priority,
        completed: false
    };
    tasks.push(task);
    res.json(task);
});

// Get all tasks
app.get("/tasks", (req, res) => {
    res.json(tasks);
});

// Get history
app.get("/history", (req, res) => {
    // Prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json(history);
});

// Update task (Complete, Title, or Priority)
app.put("/tasks/:id", (req, res) => {
    console.log(`Updating task ${req.params.id}:`, req.body);
    const task = tasks.find(t => t.id == req.params.id);
    if (task) {
        const oldTitle = task.title;
        const oldPriority = task.priority;
        const wasCompleted = task.completed;

        if (req.body.completed !== undefined) task.completed = req.body.completed;
        if (req.body.title !== undefined) task.title = req.body.title;
        if (req.body.priority !== undefined) task.priority = req.body.priority;

        // Track completion
        if (!wasCompleted && task.completed) {
            history.completed.push({
                id: task.id,
                title: task.title,
                priority: task.priority,
                timestamp: new Date().toISOString()
            });
        }

        // Remove from completed history if unchecked
        if (wasCompleted && !task.completed) {
            history.completed = history.completed.filter(h => h.id !== task.id);
        }

        // Track edits (title or priority changed)
        if ((req.body.title && req.body.title !== oldTitle) ||
            (req.body.priority && req.body.priority !== oldPriority)) {
            history.edited.push({
                id: task.id,
                oldTitle: oldTitle,
                newTitle: task.title,
                oldPriority: oldPriority,
                newPriority: task.priority,
                timestamp: new Date().toISOString()
            });
        }

        console.log("Task updated successfully:", task);
    } else {
        console.warn("Task not found:", req.params.id);
    }
    res.json({ message: "Updated" });
});

// Track cancelled edits
app.post("/history/cancel", (req, res) => {
    history.cancelled.push({
        id: req.body.id,
        title: req.body.title,
        priority: req.body.priority,
        timestamp: new Date().toISOString()
    });
    res.json({ message: "Cancelled edit tracked" });
});

// Delete task
app.delete("/tasks/:id", (req, res) => {
    const task = tasks.find(t => t.id == req.params.id);
    if (task) {
        history.deleted.push({
            id: task.id,
            title: task.title,
            priority: task.priority,
            timestamp: new Date().toISOString()
        });
    }
    tasks = tasks.filter(t => t.id != req.params.id);
    res.json({ message: "Deleted" });
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
    console.log("History initialized - all arrays empty");
    console.log("Completed:", history.completed.length);
    console.log("Edited:", history.edited.length);
    console.log("Cancelled:", history.cancelled.length);
    console.log("Deleted:", history.deleted.length);
});
