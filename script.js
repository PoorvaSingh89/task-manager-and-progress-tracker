
        // --- DOM Element References ---
        const newTaskInput = document.getElementById('newTaskInput');
        const addTaskButton = document.getElementById('addTaskButton');
        const messageBox = document.getElementById('messageBox');
        const progressContainer = document.getElementById('progressItemsContainer');
        const suggestionBox = document.getElementById('suggestionBox');
        const suggestedTagSpan = document.getElementById('suggestedTag');
        const suggestedPrioritySpan = document.getElementById('suggestedPriority');
        const difficultyInsightsContainer = document.getElementById('difficultyInsights');
        const tagManager = document.getElementById('tagManager');
        const newTagNameInput = document.getElementById('newTagName');
        const newTagColorInput = document.getElementById('newTagColor');
        const tagListDisplay = document.getElementById('tagListDisplay');
        
        // Modal DOM elements
        const taskModal = document.getElementById('taskModal');
        const modalTaskTitle = document.getElementById('modal-task-title');
        const commentInput = document.getElementById('commentInput');
        const commentList = document.getElementById('commentList');
        const documentList = document.getElementById('documentList');

        // --- Global State ---
        let currentTaskId = null;
        let draggedTaskId = null;
        let currentSuggestion = null;

        // --- Data Management: Dynamic Tags ---
        const DEFAULT_TAGS = [
            { name: 'Copywriting', color: '#e599f7' },
            { name: 'UI Design', color: '#90b8f7' },
            { name: 'Illustration', color: '#99e69f' },
        ];
        
        let taskTags = JSON.parse(localStorage.getItem('taskTags')) || DEFAULT_TAGS;

        function saveTags() {
            localStorage.setItem('taskTags', JSON.stringify(taskTags));
        }
        
        // --- Data Management: Tasks & Activity ---
        const initialTasks = [
            { 
                id: 1, title: 'Konsep hero title yang menarik', status: 'ready', tag: 'Copywriting', date: 'Nov 24', priority: 'M', isCompleted: false, 
                comments: [{text: "Looks good, just need final sign-off.", author: "Karen", date: "2024-08-10T00:00:00.000Z"}], 
                attachments: [{name: "hero_sketch.png", type: "Image"}, {name: "copy_draft.docx", type: "Document"}]
            },
            { 
                id: 2, title: 'Icon di section our services', status: 'ready', tag: 'UI Design', date: 'Nov 24', priority: 'H', isCompleted: false,
                comments: [], 
                attachments: [{name: "service_icons.ai", type: "Design"}]
            },
            { 
                id: 3, title: 'Replace lorem ipsum text in the final designs', status: 'progress', tag: 'UI Design', date: 'Nov 24', priority: 'M', isCompleted: false,
                comments: [{text: "Done on pages 1-3, pending 4-5.", author: "Joe", date: "2024-11-25T00:00:00.000Z"}], 
                attachments: []
            },
            { 
                id: 4, title: 'Create and generate the custom SVG illustrations.', status: 'progress', tag: 'Illustration', date: 'Nov 24', priority: 'L', isCompleted: false,
                comments: [], attachments: []
            },
            { 
                id: 5, title: 'Send Advert illustrations over to production company.', status: 'review', tag: 'Illustration', date: 'Nov 24', priority: 'H', isCompleted: false,
                comments: [], attachments: []
            },
            { 
                id: 6, title: 'Check the company we copied doesn\'t think we copied them.', status: 'done', tag: 'Copywriting', date: 'Nov 24', priority: 'L', isCompleted: true,
                comments: [], attachments: []
            },
            { 
                id: 7, title: 'Design the about page.', status: 'done', tag: 'UI Design', date: 'Nov 24', priority: 'M', isCompleted: true,
                comments: [], attachments: []
            },
        ];
        
        let tasks = JSON.parse(localStorage.getItem('kanbanTasks')) || initialTasks;
        tasks = tasks.map(task => ({ 
            ...task, 
            isCompleted: task.isCompleted !== undefined ? task.isCompleted : (task.status === 'done'),
            comments: task.comments || [],
            attachments: task.attachments || [],
        }));


        let activityLog = JSON.parse(localStorage.getItem('activityLog')) || [
            { type: 'document', text: '<strong>Andrea</strong> uploaded 3 documents', date: '2024-08-10T00:00:00.000Z', icon: 'folder', color: '' },
            { type: 'comment', text: '<strong>Karen</strong> left a comment', date: '2024-08-10T00:00:00.000Z', icon: 'comment', color: 'green' }
        ];

        // Static mapping for ML simulation (keywords -> tag/priority)
        const ML_SUGGESTION_KEYWORDS = {
            'design': { priority: 'H' },
            'icon': { priority: 'M' },
            'copy': { priority: 'L' },
            'title': { priority: 'M' },
            'illustration': { priority: 'H' },
            'svg': { priority: 'M' },
            'review': { priority: 'L' },
        };
        // NOTE: ML suggestions now determine TAG based on taskTags, not hardcoded array

        // --- Helper Functions ---

        /**
         * Saves the current tasks array to Local Storage.
         */
        function saveTasks() {
            localStorage.setItem('kanbanTasks', JSON.stringify(tasks));
        }

        /**
         * Saves the current activity log to Local Storage.
         */
        function saveActivityLog() {
            localStorage.setItem('activityLog', JSON.stringify(activityLog));
        }

        /**
         * Logs an activity and updates the sidebar.
         */
        function logActivity(type, text, icon, color = '', date = new Date()) {
            const newLog = { 
                type, 
                text, 
                date: date.toISOString(), 
                icon, 
                color 
            };
            activityLog.unshift(newLog); // Add to the start
            activityLog = activityLog.slice(0, 10); // Keep only the 10 most recent logs
            saveActivityLog();
            renderRecentActivity();
        }
        
        /**
         * Displays a temporary message.
         */
        function displayMessage(message) {
            messageBox.textContent = message;
            messageBox.style.display = 'block';
            
            setTimeout(() => {
                messageBox.style.display = 'none';
            }, 3000);
        }
        
        /**
         * Finds a task by ID.
         */
        function findTask(id) {
            const taskId = parseInt(id);
            return tasks.find(t => t.id === taskId);
        }

        /**
         * Creates the HTML structure for a single task card.
         */
        function createTaskCardHTML(task) {
            // Use taskTags array to find the correct color
            const tagColor = taskTags.find(t => t.name === task.tag)?.color || '#ccc';
            
            let priorityBg;
            switch(task.priority) {
                case 'H': priorityBg = 'var(--color-high)'; break;
                case 'M': priorityBg = 'var(--color-medium)'; break;
                case 'L': priorityBg = 'var(--color-low)'; break;
                default: priorityBg = 'var(--primary-blue)';
            }
            
            const commentCount = task.comments ? task.comments.length : 0;
            const attachmentCount = task.attachments ? task.attachments.length : 0;

            const deleteButton = `<button class="delete-btn" onclick="event.stopPropagation(); deleteTask(${task.id})"><i class="material-icons" style="font-size: 16px;">close</i></button>`;
            
            const completionIcon = task.isCompleted ? 'check_circle' : 'radio_button_unchecked';
            const completionToggle = `
                <div class="completion-toggle" onclick="event.stopPropagation(); toggleCompletion(${task.id})">
                    <i class="material-icons" style="font-size: 16px;">${completionIcon}</i>
                </div>
            `;

            const completedClass = task.isCompleted ? 'completed' : '';

            return `
                <div class="task-card ${completedClass}" 
                     draggable="true" 
                     data-id="${task.id}" 
                     ondragstart="dragStart(event)" 
                     onclick="openModal(${task.id})">
                    
                    ${deleteButton}
                    <span class="tag" style="background-color: ${tagColor};">${task.tag}</span>
                    
                    <div class="title-container">
                        ${completionToggle}
                        <div class="task-title" data-id="${task.id}" ondblclick="event.stopPropagation(); startEditing(event, ${task.id})">${task.title}</div>
                    </div>
                    
                    <div class="task-metadata">
                        <div style="display: flex;">
                            <span class="metadata-item"><i class="material-icons" style="font-size: 16px;">calendar_today</i> ${task.date}</span>
                            <span class="metadata-item"><i class="material-icons" style="font-size: 16px;">comment</i> ${commentCount}</span>
                            ${attachmentCount > 0 ? `<span class="metadata-item"><i class="material-icons" style="font-size: 16px;">attachment</i> ${attachmentCount}</span>` : ''}
                        </div>
                        <div class="avatar-pill" style="background-color: ${priorityBg};">${task.priority}</div>
                    </div>
                </div>
            `;
        }

        /**
         * Renders all tasks into their respective Kanban columns.
         */
        function renderKanbanBoard() {
            const columnMaps = {
                ready: document.getElementById('taskList-ready'),
                progress: document.getElementById('taskList-progress'),
                review: document.getElementById('taskList-review'),
                done: document.getElementById('taskList-done'),
            };

            // Clear columns before rendering
            Object.values(columnMaps).forEach(col => col.innerHTML = '');
            
            // Counters
            const counts = { ready: 0, progress: 0, review: 0, done: 0 };

            tasks.forEach(task => {
                const columnId = task.status;
                if (columnMaps[columnId]) {
                    const cardHTML = createTaskCardHTML(task);
                    columnMaps[columnId].innerHTML += cardHTML;
                    counts[columnId]++;
                }
            });
            
            // Update column counts
            document.getElementById('count-ready').textContent = counts.ready;
            document.getElementById('count-progress').textContent = counts.progress;
            document.getElementById('count-review').textContent = counts.review;
            document.getElementById('count-done').textContent = counts.done;
            
            updateProgressTracker();
            updateDifficultyInsights();
            renderRecentActivity(); 
            renderTagListDisplay(); // New: Update tag manager display
        }

        // --- Tag Management Functions ---

        window.toggleTagManager = function() {
            if (tagManager.style.display === 'block') {
                tagManager.style.display = 'none';
            } else {
                renderTagListDisplay();
                tagManager.style.display = 'block';
            }
        }
        
        window.renderTagListDisplay = function() {
            tagListDisplay.innerHTML = '';
            
            taskTags.forEach((tag, index) => {
                const tagChip = document.createElement('div');
                tagChip.classList.add('tag-chip');
                tagChip.style.backgroundColor = tag.color;
                
                // Determine text color for contrast (simple logic)
                const isLight = isColorLight(tag.color);
                tagChip.style.color = isLight ? 'var(--text-dark)' : 'white';

                tagChip.innerHTML = `
                    ${tag.name} 
                    <button onclick="deleteTag(${index})" style="color: ${isLight ? '#777' : 'white'};">
                        &times;
                    </button>
                `;
                tagListDisplay.appendChild(tagChip);
            });
        }
        
        // Simple function to check if a color is light or dark (to choose text color)
        function isColorLight(hex) {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            // ITU BT.709 Luma calculation
            const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            return luma > 160; 
        }

        window.addNewTag = function() {
            const name = newTagNameInput.value.trim();
            const color = newTagColorInput.value;

            if (name === '') {
                displayMessage('Tag name cannot be empty.');
                return;
            }
            if (taskTags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
                displayMessage('Tag already exists.');
                return;
            }

            taskTags.push({ name: name, color: color });
            saveTags();
            renderKanbanBoard();
            renderTagListDisplay();
            newTagNameInput.value = '';
            displayMessage(`Category "${name}" added!`);
        }

        window.deleteTag = function(index) {
            const tagName = taskTags[index].name;
            
            // Check if any active tasks use this tag
            if (tasks.some(t => t.tag === tagName)) {
                displayMessage(`Cannot delete "${tagName}". Please reassign all tasks using this tag first.`);
                return;
            }
            
            if (confirm(`Are you sure you want to delete the category: ${tagName}?`)) {
                taskTags.splice(index, 1);
                saveTags();
                renderKanbanBoard();
                renderTagListDisplay();
                displayMessage(`Category "${tagName}" deleted.`);
            }
        }

        // --- Activity Log Functions ---

        /**
         * Renders the recent activity log in the sidebar.
         */
        function renderRecentActivity() {
            const activityList = document.getElementById('activityList');
            if (!activityList) return;

            activityList.innerHTML = '';
            
            activityLog.forEach(log => {
                const date = new Date(log.date);
                const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                
                const activityItem = document.createElement('div');
                activityItem.classList.add('activity-item');
                
                const iconClass = log.color ? `activity-icon ${log.color}` : 'activity-icon';
                
                activityItem.innerHTML = `
                    <div class="${iconClass}"><i class="material-icons">${log.icon}</i></div>
                    <div class="activity-details">
                        <div class="activity-text">${log.text}</div>
                        <div class="activity-time">${dateString}</div>
                    </div>
                `;
                activityList.appendChild(activityItem);
            });
        }
        
        /**
         * Machine Learning Simulation: Suggests Tag and Priority based on task title.
         */
        function suggestTaskAttributes(title) {
            const lowerTitle = title.toLowerCase();
            let bestMatch = null;
            let suggestedTag = taskTags[0]?.name || 'Default'; // Default tag is the first available tag

            for (const keyword in ML_SUGGESTION_KEYWORDS) {
                if (lowerTitle.includes(keyword)) {
                    bestMatch = ML_SUGGESTION_KEYWORDS[keyword];
                    // Instead of a hardcoded tag, we will try to infer a default one based on keyword
                    if (keyword.includes('design') || keyword.includes('icon')) {
                        suggestedTag = taskTags.find(t => t.name.toLowerCase().includes('design'))?.name || suggestedTag;
                    } else if (keyword.includes('copy') || keyword.includes('title') || keyword.includes('review')) {
                        suggestedTag = taskTags.find(t => t.name.toLowerCase().includes('copy'))?.name || suggestedTag;
                    } else if (keyword.includes('illustration') || keyword.includes('svg')) {
                        suggestedTag = taskTags.find(t => t.name.toLowerCase().includes('illustr'))?.name || suggestedTag;
                    }

                    break; 
                }
            }

            // If no keyword match, just use the first tag
            if (!bestMatch) {
                bestMatch = { priority: 'M' }; // Default priority
            }

            currentSuggestion = { tag: suggestedTag, priority: bestMatch.priority };
            suggestedTagSpan.textContent = currentSuggestion.tag;
            suggestedPrioritySpan.textContent = currentSuggestion.priority;
            suggestionBox.style.display = 'block';
        }
        
        /**
         * Applies the ML suggestion to the input field and hides the suggestion box.
         */
        function applySuggestion() {
            if (currentSuggestion) {
                const title = newTaskInput.value.trim();
                
                const newTask = {
                    id: Date.now(), 
                    title: title, 
                    status: 'ready', 
                    tag: currentSuggestion.tag,
                    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
                    comments: [], 
                    attachments: [], 
                    priority: currentSuggestion.priority,
                    isCompleted: false
                };
                
                tasks.push(newTask);
                saveTasks();
                renderKanbanBoard();
                
                newTaskInput.value = '';
                suggestionBox.style.display = 'none';
                currentSuggestion = null;

                logActivity('task_add', `User added new task: <strong>${newTask.title}</strong>`, 'add_circle');
                displayMessage(`Task added with suggested tag (${newTask.tag}) and priority (${newTask.priority}).`);
            } else {
                addTask(); 
            }
        }

        /**
         * Adds a new task to the 'ready' column (standard fallback).
         */
        function addTask() {
            const title = newTaskInput.value.trim();

            if (title === '') {
                displayMessage('Please enter a task title.');
                return;
            }
            
            // Standard defaults to the first available tag
            const defaultTag = taskTags[0]?.name || 'Default';

            const newTask = {
                id: Date.now(), 
                title: title, 
                status: 'ready', 
                tag: defaultTag, 
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
                comments: [], 
                attachments: [], 
                priority: 'M', 
                isCompleted: false
            };

            tasks.push(newTask);
            saveTasks();
            renderKanbanBoard();
            newTaskInput.value = '';
            suggestionBox.style.display = 'none';
            currentSuggestion = null;
            
            logActivity('task_add', `User added new task: <strong>${newTask.title}</strong>`, 'add_circle');
            displayMessage('New task added to Task Ready (Default settings).');
        }
        
        /**
         * Deletes a task by ID.
         */
        window.deleteTask = function(id) {
            const confirmed = prompt(`Type "DELETE" to confirm deletion of Task #${id}:`);
            if (confirmed !== 'DELETE') return;

            const task = findTask(id);
            if (!task) return;

            tasks = tasks.filter(t => t.id !== id);
            saveTasks();
            renderKanbanBoard();
            
            logActivity('task_delete', `User permanently deleted task: <strong>${task.title}</strong>`, 'delete_forever', 'red');
            displayMessage('Task permanently deleted.');
        }

        /**
         * Toggles the completion status of a task and moves it to 'done' if completed.
         */
        window.toggleCompletion = function(id) {
            const taskIndex = tasks.findIndex(t => t.id === id);
            if (taskIndex === -1) return;

            const task = tasks[taskIndex];
            task.isCompleted = !task.isCompleted;
            
            if (task.isCompleted) {
                task.status = 'done';
                logActivity('task_complete', `User marked task: <strong>${task.title}</strong> as complete`, 'done_all', 'green');
                displayMessage(`Task "${task.title}" marked complete and moved to Done!`);
            } else {
                task.status = 'progress'; 
                logActivity('task_incomplete', `User marked task: <strong>${task.title}</strong> as incomplete`, 'undo', '');
                displayMessage(`Task "${task.title}" marked incomplete.`);
            }

            saveTasks();
            renderKanbanBoard();
        }

        /**
         * Starts inline editing for a task title.
         */
        window.startEditing = function(event, id) {
            const taskElement = event.currentTarget;
            const task = findTask(id);
            if (!task || task.isCompleted) return; // Prevent editing completed tasks

            // Replace text content with an input field
            taskElement.innerHTML = `<input type="text" value="${task.title}" data-id="${id}" onblur="stopEditing(event)" onkeydown="handleEditKey(event, ${id})">`;
            
            // Focus and select the text
            const input = taskElement.querySelector('input');
            if (input) {
                input.focus();
                input.select();
            }
        }
        
        /**
         * Stops inline editing and saves the new title.
         */
        window.stopEditing = function(event) {
            const input = event.currentTarget;
            const taskId = parseInt(input.dataset.id);
            const newTitle = input.value.trim();
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            
            if (taskIndex > -1 && newTitle !== '') {
                const oldTitle = tasks[taskIndex].title;
                tasks[taskIndex].title = newTitle;
                saveTasks();
                renderKanbanBoard(); // Re-render the board to update the card
                
                if (oldTitle !== newTitle) {
                    logActivity('task_edit', `User edited task title from "${oldTitle}" to <strong>${newTitle}</strong>`, 'edit');
                }
                displayMessage('Task title updated!');
            } else if (taskIndex > -1 && newTitle === '') {
                displayMessage('Task title cannot be empty.');
                renderKanbanBoard(); // Re-render to restore original title
            }
        }

        /**
         * Handles Enter keypress during inline editing.
         */
        window.handleEditKey = function(event, id) {
            if (event.key === 'Enter') {
                event.preventDefault();
                event.currentTarget.blur(); // Trigger the onblur event (stopEditing)
            }
        }
        
        // --- Modal Functions ---
        
        /**
         * Renders the comments list inside the modal.
         */
        function renderComments(task) {
            commentList.innerHTML = '';
            document.getElementById('modal-comment-count').textContent = task.comments.length;

            if (task.comments.length === 0) {
                commentList.innerHTML = '<p style="font-size: 14px; color: var(--text-muted); padding: 10px;">No comments yet.</p>';
                return;
            }

            task.comments.slice().reverse().forEach(comment => {
                const commentDiv = document.createElement('div');
                commentDiv.classList.add('comment-item');
                commentDiv.innerHTML = `
                    <span class="comment-author">${comment.author}</span>
                    <span class="comment-date">${new Date(comment.date).toLocaleDateString()}</span>
                    <p style="font-size: 13px;">${comment.text}</p>
                `;
                commentList.appendChild(commentDiv);
            });
        }
        
        /**
         * Renders the documents/attachments list inside the modal.
         */
        function renderDocuments(task) {
            documentList.innerHTML = '';
            document.getElementById('modal-document-count').textContent = task.attachments.length;

            if (task.attachments.length === 0) {
                documentList.innerHTML = '<p style="font-size: 14px; color: var(--text-muted); padding: 10px;">No documents attached.</p>';
                return;
            }

            task.attachments.forEach((doc, index) => {
                const docDiv = document.createElement('div');
                docDiv.classList.add('document-item');
                
                // Determine icon based on mock file type
                let icon = 'description'; // Default icon
                if (doc.type.includes('Image') || doc.type.includes('image')) icon = 'image';
                if (doc.type.includes('Design')) icon = 'palette';
                if (doc.type.includes('PDF')) icon = 'picture_as_pdf';
                if (doc.type.includes('Document')) icon = 'insert_drive_file';
                
                docDiv.innerHTML = `
                    <div class="document-info">
                        <i class="material-icons">${icon}</i>
                        <span>${doc.name}</span>
                    </div>
                    <button class="delete-btn" onclick="deleteDocument(${task.id}, ${index})">
                        <i class="material-icons" style="font-size: 16px;">delete</i>
                    </button>
                `;
                documentList.appendChild(docDiv);
            });
        }
        
        /**
         * Opens the modal with the specified task data.
         */
        window.openModal = function(id) {
            currentTaskId = id;
            const task = findTask(id);
            if (!task) return;

            modalTaskTitle.textContent = task.title;
            document.getElementById('modal-status').textContent = task.status;
            document.getElementById('modal-tag').textContent = task.tag;
            document.getElementById('modal-priority').textContent = task.priority;

            renderComments(task);
            renderDocuments(task);
            
            taskModal.style.display = 'block';
        }

        /**
         * Closes the modal.
         */
        window.closeModal = function() {
            taskModal.style.display = 'none';
            currentTaskId = null;
        }

        /**
         * Adds a new comment to the current task.
         */
        window.addComment = function() {
            const commentText = commentInput.value.trim();
            if (!commentText || !currentTaskId) return;

            const task = findTask(currentTaskId);
            if (!task) return;

            const newComment = {
                text: commentText,
                author: "User", // Mock author
                date: new Date().toISOString()
            };

            task.comments.push(newComment);
            commentInput.value = '';
            
            saveTasks();
            renderComments(task);
            renderKanbanBoard(); // Update card count

            logActivity('comment', `User left a comment on task: <strong>${task.title}</strong>`, 'comment', 'green');
        }

        /**
         * Adds a new document (mock upload) to the current task.
         */
        window.handleDocumentUpload = function(files) {
            if (files.length === 0 || !currentTaskId) return;

            const file = files[0];
            const task = findTask(currentTaskId);
            if (!task) return;

            const newDocument = {
                name: file.name,
                type: file.type.split('/')[0] || 'File', // e.g., 'image' or 'application'
                size: file.size 
            };
            
            // If the type is vague, try to infer from extension
            if(newDocument.type === 'application' || newDocument.type === 'File') {
                 if (file.name.toLowerCase().endsWith('.pdf')) newDocument.type = 'PDF';
                 else if (file.name.toLowerCase().endsWith('.ai')) newDocument.type = 'Design';
                 else newDocument.type = 'Document';
            }


            task.attachments.push(newDocument);
            
            saveTasks();
            renderDocuments(task);
            renderKanbanBoard(); // Update card count

            logActivity('document', `User attached document: <strong>${newDocument.name}</strong> to task: <strong>${task.title}</strong>`, 'folder');
            displayMessage(`Document "${newDocument.name}" attached successfully!`);
        }
        
        /**
         * Deletes a document from the current task.
         */
        window.deleteDocument = function(taskId, docIndex) {
            const task = findTask(taskId);
            if (!task) return;
            
            const deletedDocName = task.attachments[docIndex].name;
            task.attachments.splice(docIndex, 1);
            
            saveTasks();
            renderDocuments(task);
            renderKanbanBoard();
            
            logActivity('document_delete', `User deleted document: <strong>${deletedDocName}</strong> from task: <strong>${task.title}</strong>`, 'delete_sweep', 'red');
        }
        
        /**
         * Calculates and updates the sidebar progress tracker.
         */
        function updateProgressTracker() {
            const stats = tasks.reduce((acc, task) => {
                const tag = task.tag;
                if (!acc[tag]) {
                    acc[tag] = { total: 0, done: 0 };
                }
                acc[tag].total++;
                if (task.isCompleted) { 
                    acc[tag].done++;
                }
                return acc;
            }, {});

            progressContainer.innerHTML = ''; 
            
            // Render a progress bar for each tag category
            Object.keys(stats).forEach(tag => {
                const stat = stats[tag];
                const percentage = stat.total > 0 ? Math.round((stat.done / stat.total) * 100) : 0;
                
                // Get dynamic color
                const barColor = taskTags.find(t => t.name === tag)?.color || '#999';

                const html = `
                    <div class="progress-item">
                        <label>${tag} <span>${stat.done}/${stat.total}</span></label>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percentage}%; background-color: ${barColor};"></div>
                        </div>
                    </div>
                `;
                progressContainer.innerHTML += html;
            });
        }
        
        /**
         * ML Productivity Insights: Analyze task completion rates to simulate difficulty scoring.
         */
        function updateDifficultyInsights() {
            const completionData = tasks.reduce((acc, task) => {
                const tag = task.tag;
                // Initialize acc[tag] if it doesn't exist
                if (!acc[tag]) {
                    acc[tag] = { completed: 0, total: 0 };
                }

                // Always increment total for the tag
                acc[tag].total++;

                // Increment completed if applicable
                if (task.isCompleted) {
                    acc[tag].completed++;
                }
                
                return acc;
            }, {});

            difficultyInsightsContainer.innerHTML = '';

            Object.keys(completionData).forEach(tag => {
                const data = completionData[tag];
                // Completion rate simulation
                const completionRate = data.total > 0 ? data.completed / data.total : 0;
                
                let insightText = '';
                if (data.total < 3) {
                    insightText = 'Needs more data';
                } else if (completionRate >= 0.75) {
                    insightText = 'Easy Wins';
                } else if (completionRate >= 0.4) {
                    insightText = 'Moderate Effort';
                } else {
                    insightText = 'High Difficulty';
                }
                
                const html = `
                    <div class="insight-item">${tag}: <span>${insightText}</span></div>
                `;
                difficultyInsightsContainer.innerHTML += html;
            });
            
            if (Object.keys(completionData).length === 0) {
                 difficultyInsightsContainer.innerHTML = `<div class="insight-item" style="color: var(--text-muted);">Complete a few tasks to generate insights!</div>`;
            }
        }
        
        
        // --- Drag and Drop Functions ---
        
        window.dragStart = function(event) {
            draggedTaskId = event.target.dataset.id;
            // Prevent modal from opening when starting drag
            event.target.onclick = null; 
            setTimeout(() => {
                event.target.classList.add('is-dragging');
            }, 0); 
        }
        
        window.dragOver = function(event) {
            event.preventDefault();
            event.currentTarget.classList.add('drag-over');
        }
        
        window.dragLeave = function(event) {
            event.currentTarget.classList.remove('drag-over');
        }

        window.drop = function(event, newStatus) {
            event.preventDefault();
            event.currentTarget.classList.remove('drag-over');

            const taskId = parseInt(draggedTaskId);
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            
            if (taskIndex > -1) {
                const task = tasks[taskIndex];
                const oldStatus = task.status;
                
                task.status = newStatus;
                task.isCompleted = (newStatus === 'done');
                
                saveTasks();
                renderKanbanBoard();
                
                const formattedNewStatus = newStatus.replace('ready', 'Task Ready').replace('progress', 'In Progress').replace('review', 'Needs Review').replace('done', 'Done');
                logActivity('task_move', `User moved task: <strong>${task.title}</strong> from ${oldStatus.toUpperCase()} to ${formattedNewStatus.toUpperCase()}`, 'swap_horiz');
                displayMessage(`Task moved to ${formattedNewStatus}`);
            }
            
            const draggedElement = document.querySelector(`.task-card[data-id="${draggedTaskId}"]`);
            if (draggedElement) {
                draggedElement.classList.remove('is-dragging');
                // Re-enable click listener after drag finishes
                draggedElement.onclick = () => openModal(taskId); 
            }
            draggedTaskId = null;
        }

        // --- Event Listeners ---
        
        // 1. Suggest features on input change
        newTaskInput.addEventListener('input', (event) => {
            const title = event.target.value.trim();
            if (title.length > 2) {
                suggestTaskAttributes(title);
            } else {
                suggestionBox.style.display = 'none';
                currentSuggestion = null;
            }
        });

        // 2. Add task button or Enter key behavior: use suggestion if available, otherwise use standard add
        addTaskButton.addEventListener('click', () => {
             if (currentSuggestion) {
                applySuggestion();
            } else {
                addTask();
            }
        });
        
        newTaskInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                if (currentSuggestion) {
                    applySuggestion();
                } else {
                    addTask();
                }
            }
        });
        
        // 3. Apply suggestion on click
        suggestionBox.addEventListener('click', applySuggestion);
        
        // Close modal when clicking outside
        window.onclick = function(event) {
            if (event.target == taskModal) {
                closeModal();
            }
        }


        // --- Initialization ---
        document.addEventListener('DOMContentLoaded', renderKanbanBoard);
   