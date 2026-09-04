/**
 * TaskFlow - Interactive Modern Todo Dashboard with Smart Calendar
 */

document.addEventListener('DOMContentLoaded', () => {
    // State
    const state = {
        filter: 'all',
        category: '',
        priority: '',
        search: '',
        sortBy: 'created_desc',
        todos: [],
        allTodos: [],
        calendarDate: new Date(),
        selectedDate: null,
        calendarCollapsed: false
    };

    // DOM Elements
    const elements = {
        headerDateText: document.getElementById('headerDateText'),
        statTotal: document.getElementById('statTotal'),
        statActive: document.getElementById('statActive'),
        statCompleted: document.getElementById('statCompleted'),
        progressRateText: document.getElementById('progressRateText'),
        progressBarFill: document.getElementById('progressBarFill'),
        statTodayMeta: document.getElementById('statTodayMeta'),
        countAll: document.getElementById('countAll'),
        countActive: document.getElementById('countActive'),
        countCompleted: document.getElementById('countCompleted'),

        // Calendar Elements
        calendarSection: document.getElementById('calendarSection'),
        calendarTitleGroup: document.querySelector('.calendar-title-group'),
        calendarMonthTitle: document.getElementById('calendarMonthTitle'),
        calPrevMonthBtn: document.getElementById('calPrevMonthBtn'),
        calNextMonthBtn: document.getElementById('calNextMonthBtn'),
        calTodayBtn: document.getElementById('calTodayBtn'),
        calToggleCollapseBtn: document.getElementById('calToggleCollapseBtn'),
        calToggleText: document.getElementById('calToggleText'),
        calToggleIcon: document.getElementById('calToggleIcon'),
        calendarBody: document.getElementById('calendarBody'),
        calendarDaysGrid: document.getElementById('calendarDaysGrid'),
        calendarFilterIndicator: document.getElementById('calendarFilterIndicator'),
        filterDateDisplay: document.getElementById('filterDateDisplay'),
        btnClearDateFilter: document.getElementById('btnClearDateFilter'),

        // Forms
        addTodoForm: document.getElementById('addTodoForm'),
        todoTitle: document.getElementById('todoTitle'),
        todoDescription: document.getElementById('todoDescription'),
        todoCategory: document.getElementById('todoCategory'),
        todoPriority: document.getElementById('todoPriority'),
        todoDueDate: document.getElementById('todoDueDate'),

        // Controls
        statusTabs: document.getElementById('statusTabs'),
        tabButtons: document.querySelectorAll('.tab-btn'),
        searchInput: document.getElementById('searchInput'),
        clearSearchBtn: document.getElementById('clearSearchBtn'),
        filterCategory: document.getElementById('filterCategory'),
        filterPriority: document.getElementById('filterPriority'),
        sortBy: document.getElementById('sortBy'),
        todoListContainer: document.getElementById('todoListContainer'),

        // Modal
        editModalBackdrop: document.getElementById('editModalBackdrop'),
        editTodoForm: document.getElementById('editTodoForm'),
        editTodoId: document.getElementById('editTodoId'),
        editTodoTitle: document.getElementById('editTodoTitle'),
        editTodoDescription: document.getElementById('editTodoDescription'),
        editTodoCategory: document.getElementById('editTodoCategory'),
        editTodoPriority: document.getElementById('editTodoPriority'),
        editTodoDueDate: document.getElementById('editTodoDueDate'),
        btnCloseModal: document.getElementById('btnCloseModal'),
        btnCancelEdit: document.getElementById('btnCancelEdit'),

        // Toast
        toastContainer: document.getElementById('toastContainer')
    };

    // Initialize
    initApp();

    function initApp() {
        renderCurrentDate();
        setupEventListeners();
        loadAll();
    }

    function renderCurrentDate() {
        const now = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' };
        elements.headerDateText.textContent = now.toLocaleDateString('ko-KR', options);
    }

    function setupEventListeners() {
        // Form Submit (Add Todo)
        elements.addTodoForm.addEventListener('submit', handleAddTodo);

        // Status Tabs Filter
        elements.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                elements.tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                state.filter = button.dataset.filter;
                fetchTodos();
            });
        });

        // Search Input with Debounce
        let debounceTimer;
        elements.searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            elements.clearSearchBtn.style.display = query ? 'block' : 'none';
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                state.search = query;
                fetchTodos();
            }, 250);
        });

        // Clear Search Button
        elements.clearSearchBtn.addEventListener('click', () => {
            elements.searchInput.value = '';
            elements.clearSearchBtn.style.display = 'none';
            state.search = '';
            fetchTodos();
        });

        // Filter Dropdowns
        elements.filterCategory.addEventListener('change', (e) => {
            state.category = e.target.value;
            fetchTodos();
        });

        elements.filterPriority.addEventListener('change', (e) => {
            state.priority = e.target.value;
            fetchTodos();
        });

        elements.sortBy.addEventListener('change', (e) => {
            state.sortBy = e.target.value;
            fetchTodos();
        });

        // Calendar Controls
        elements.calPrevMonthBtn.addEventListener('click', () => {
            state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
            renderCalendar();
        });

        elements.calNextMonthBtn.addEventListener('click', () => {
            state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
            renderCalendar();
        });

        elements.calTodayBtn.addEventListener('click', () => {
            state.calendarDate = new Date();
            renderCalendar();
        });

        // 캘린더 접기/펼치기 토글 함수
        function toggleCalendarCollapse(force) {
            if (typeof force === 'boolean') {
                state.calendarCollapsed = force;
            } else {
                state.calendarCollapsed = !state.calendarCollapsed;
            }
            elements.calendarBody.classList.toggle('collapsed', state.calendarCollapsed);
            if (elements.calendarSection) {
                elements.calendarSection.classList.toggle('is-collapsed', state.calendarCollapsed);
            }
            if (elements.calToggleText) {
                elements.calToggleText.textContent = state.calendarCollapsed ? '달력 펼치기' : '달력 접기';
            }
            if (elements.calToggleIcon) {
                elements.calToggleIcon.className = state.calendarCollapsed ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';
            }
            localStorage.setItem('taskflow_cal_collapsed', state.calendarCollapsed ? 'true' : 'false');
        }

        elements.calToggleCollapseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCalendarCollapse();
        });

        if (elements.calendarTitleGroup) {
            elements.calendarTitleGroup.addEventListener('click', () => {
                toggleCalendarCollapse();
            });
        }

        // 저장된 캘린더 상태 복원
        const savedCollapsed = localStorage.getItem('taskflow_cal_collapsed');
        if (savedCollapsed === 'true') {
            toggleCalendarCollapse(true);
        }

        elements.btnClearDateFilter.addEventListener('click', () => {
            clearDateFilter();
        });

        // Modal Events
        elements.btnCloseModal.addEventListener('click', closeModal);
        elements.btnCancelEdit.addEventListener('click', closeModal);
        elements.editModalBackdrop.addEventListener('click', (e) => {
            if (e.target === elements.editModalBackdrop) closeModal();
        });
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && elements.editModalBackdrop.classList.contains('show')) {
                closeModal();
            }
        });
        elements.editTodoForm.addEventListener('submit', handleSaveEdit);
    }

    // API Calls
    async function loadAll() {
        await Promise.all([fetchAllTodosForCalendar(), fetchTodos(), fetchStats()]);
    }

    async function fetchAllTodosForCalendar() {
        try {
            const res = await fetch('/api/todos?filter=all');
            const data = await res.json();
            if (data.success) {
                state.allTodos = data.todos;
                renderCalendar();
            }
        } catch (err) {
            console.error('Calendar todos error:', err);
        }
    }

    async function fetchTodos() {
        try {
            const params = new URLSearchParams({
                filter: state.filter,
                category: state.category,
                priority: state.priority,
                search: state.search,
                sort: state.sortBy
            });

            const res = await fetch(`/api/todos?${params.toString()}`);
            const data = await res.json();

            if (data.success) {
                state.todos = data.todos;
                renderFilteredTodoList();
            } else {
                showToast('목록을 불러오지 못했습니다.', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('서버와의 통신에 실패했습니다.', 'error');
        }
    }

    async function fetchStats() {
        try {
            const res = await fetch('/api/stats');
            const data = await res.json();
            if (data.success) {
                renderStats(data.stats);
            }
        } catch (err) {
            console.error('Stats fetch error:', err);
        }
    }

    // Calendar Logic
    function renderCalendar() {
        const year = state.calendarDate.getFullYear();
        const month = state.calendarDate.getMonth();

        elements.calendarMonthTitle.textContent = `${year}년 ${month + 1}월`;

        // 1일의 요일 (0: 일요일 ~ 6: 토요일)
        const firstDayIndex = new Date(year, month, 1).getDay();
        // 이번 달 마지막 날짜
        const lastDate = new Date(year, month + 1, 0).getDate();
        // 지난 달 마지막 날짜
        const prevLastDate = new Date(year, month, 0).getDate();

        // 기한별 할 일 맵 생성: { 'YYYY-MM-DD': [todo1, todo2, ...] }
        const todosByDate = {};
        state.allTodos.forEach(todo => {
            if (todo.due_date) {
                if (!todosByDate[todo.due_date]) {
                    todosByDate[todo.due_date] = [];
                }
                todosByDate[todo.due_date].push(todo);
            }
        });

        const todayStr = getTodayString();
        let daysHtml = '';

        // 1. 이전 달 채우기
        for (let i = firstDayIndex; i > 0; i--) {
            const dayNum = prevLastDate - i + 1;
            const prevMonthDate = new Date(year, month - 1, dayNum);
            const dateStr = formatDate(prevMonthDate);
            daysHtml += createDayCellHtml(dateStr, dayNum, true, false, todosByDate[dateStr] || []);
        }

        // 2. 이번 달 날짜들
        for (let dayNum = 1; dayNum <= lastDate; dayNum++) {
            const currDate = new Date(year, month, dayNum);
            const dateStr = formatDate(currDate);
            const isToday = (dateStr === todayStr);
            const isSelected = (dateStr === state.selectedDate);
            daysHtml += createDayCellHtml(dateStr, dayNum, false, isToday, todosByDate[dateStr] || [], isSelected);
        }

        // 3. 다음 달 채우기 (총 35 or 42 셀 유지)
        const totalCellsRendered = firstDayIndex + lastDate;
        const totalGridSlots = totalCellsRendered > 35 ? 42 : 35;
        const remainingSlots = totalGridSlots - totalCellsRendered;

        for (let dayNum = 1; dayNum <= remainingSlots; dayNum++) {
            const nextMonthDate = new Date(year, month + 1, dayNum);
            const dateStr = formatDate(nextMonthDate);
            daysHtml += createDayCellHtml(dateStr, dayNum, true, false, todosByDate[dateStr] || []);
        }

        elements.calendarDaysGrid.innerHTML = daysHtml;

        // 셀 클릭 이벤트 바인딩
        elements.calendarDaysGrid.querySelectorAll('.cal-day-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                const dateStr = cell.dataset.date;
                handleDateCellClick(dateStr);
            });
        });
    }

    function createDayCellHtml(dateStr, dayNum, isOtherMonth, isToday, tasksForDay, isSelected = false) {
        const d = new Date(dateStr);
        const dayOfWeek = d.getDay();
        let dayClass = 'cal-day-cell';
        if (isOtherMonth) dayClass += ' other-month';
        if (isToday) dayClass += ' today';
        if (isSelected) dayClass += ' selected';
        if (dayOfWeek === 0) dayClass += ' is-sunday';
        if (dayOfWeek === 6) dayClass += ' is-saturday';

        const taskCount = tasksForDay.length;
        const countBadge = taskCount > 0 ? `<span class="cal-task-count-badge">${taskCount}건</span>` : '';

        // 최대 2개 칩 렌더링
        let tasksHtml = '';
        if (taskCount > 0) {
            const displayTasks = tasksForDay.slice(0, 2);
            displayTasks.forEach(t => {
                const isCompleted = t.completed === 1;
                const chipClass = isCompleted ? 'chip-completed' : `chip-${t.priority}`;
                tasksHtml += `
                    <div class="cal-task-chip ${chipClass}" title="${escapeHtml(t.title)} (${t.priority})">
                        ${isCompleted ? '<i class="fa-solid fa-check"></i> ' : ''}${escapeHtml(t.title)}
                    </div>
                `;
            });

            if (taskCount > 2) {
                tasksHtml += `<div class="cal-more-chip">+${taskCount - 2}건 더보기</div>`;
            }
        }

        return `
            <div class="${dayClass}" data-date="${dateStr}">
                <div class="cal-day-header">
                    <span class="cal-day-num">${dayNum}</span>
                    ${countBadge}
                </div>
                <div class="cal-tasks-wrap">
                    ${tasksHtml}
                </div>
            </div>
        `;
    }

    function handleDateCellClick(dateStr) {
        if (state.selectedDate === dateStr) {
            // 토글: 동일 날짜 클릭 시 해제
            clearDateFilter();
        } else {
            state.selectedDate = dateStr;
            elements.filterDateDisplay.textContent = dateStr;
            elements.calendarFilterIndicator.style.display = 'flex';
            renderCalendar();
            renderFilteredTodoList();

            const count = state.allTodos.filter(t => t.due_date === dateStr).length;
            showToast(`${dateStr} 마감 작업 (${count}건) 필터링`, 'info');
        }
    }

    function clearDateFilter() {
        state.selectedDate = null;
        elements.calendarFilterIndicator.style.display = 'none';
        renderCalendar();
        renderFilteredTodoList();
        showToast('날짜 필터가 해제되었습니다.', 'info');
    }

    function renderFilteredTodoList() {
        let displayList = state.todos;

        // 특정 날짜가 선택되어 있으면 해당 날짜의 작업만 필터링
        if (state.selectedDate) {
            displayList = displayList.filter(t => t.due_date === state.selectedDate);
        }

        renderTodoList(displayList);
    }

    // Add Todo Handler
    async function handleAddTodo(e) {
        e.preventDefault();
        const title = elements.todoTitle.value.trim();
        if (!title) return;

        const payload = {
            title: title,
            description: elements.todoDescription.value.trim(),
            category: elements.todoCategory.value,
            priority: elements.todoPriority.value,
            due_date: elements.todoDueDate.value || null
        };

        try {
            const res = await fetch('/api/todos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                showToast('할 일이 성공적으로 추가되었습니다!', 'success');
                elements.addTodoForm.reset();
                elements.todoCategory.value = '일반';
                elements.todoPriority.value = 'medium';
                await loadAll();
            } else {
                showToast(data.message || '추가에 실패했습니다.', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('네트워크 오류가 발생했습니다.', 'error');
        }
    }

    // Toggle Completed Handler
    async function toggleTodo(id) {
        try {
            const res = await fetch(`/api/todos/${id}/toggle`, {
                method: 'PATCH'
            });
            const data = await res.json();
            if (data.success) {
                const message = data.completed ? '할 일을 완료했습니다! 🎉' : '할 일이 다시 진행 중으로 변경되었습니다.';
                showToast(message, 'info');
                await loadAll();
            }
        } catch (err) {
            console.error(err);
            showToast('상태 변경 실패', 'error');
        }
    }

    // Delete Todo Handler
    async function deleteTodo(id, title) {
        if (!confirm(`"${title}" 할 일을 삭제하시겠습니까?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/todos/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                showToast('할 일이 삭제되었습니다.', 'info');
                await loadAll();
            }
        } catch (err) {
            console.error(err);
            showToast('삭제 실패', 'error');
        }
    }

    // Edit Modal Open
    function openEditModal(todo) {
        elements.editTodoId.value = todo.id;
        elements.editTodoTitle.value = todo.title;
        elements.editTodoDescription.value = todo.description || '';
        elements.editTodoCategory.value = todo.category || '일반';
        elements.editTodoPriority.value = todo.priority || 'medium';
        elements.editTodoDueDate.value = todo.due_date || '';

        elements.editModalBackdrop.classList.add('show');
    }

    function closeModal() {
        elements.editModalBackdrop.classList.remove('show');
    }

    // Save Edit Handler
    async function handleSaveEdit(e) {
        e.preventDefault();
        const id = elements.editTodoId.value;
        const title = elements.editTodoTitle.value.trim();
        if (!title) return;

        const payload = {
            title: title,
            description: elements.editTodoDescription.value.trim(),
            category: elements.editTodoCategory.value,
            priority: elements.editTodoPriority.value,
            due_date: elements.editTodoDueDate.value || null
        };

        try {
            const res = await fetch(`/api/todos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                showToast('할 일이 수정되었습니다.', 'success');
                closeModal();
                await loadAll();
            } else {
                showToast(data.message || '수정에 실패했습니다.', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('수정 처리 중 오류가 발생했습니다.', 'error');
        }
    }

    // Render Stats
    function renderStats(stats) {
        elements.statTotal.textContent = stats.total;
        elements.statActive.textContent = stats.active;
        elements.statCompleted.textContent = stats.completed;
        elements.progressRateText.textContent = `${stats.completion_rate}%`;
        elements.progressBarFill.style.width = `${stats.completion_rate}%`;

        let metaText = `오늘 마감 ${stats.due_today}건`;
        if (stats.overdue > 0) {
            metaText += ` · 기한 초과 ${stats.overdue}건`;
        }
        elements.statTodayMeta.textContent = metaText;

        elements.countAll.textContent = stats.total;
        elements.countActive.textContent = stats.active;
        elements.countCompleted.textContent = stats.completed;
    }

    // Render List
    function renderTodoList(todos) {
        if (!todos || todos.length === 0) {
            const msg = state.selectedDate 
                ? `선택하신 날짜(${state.selectedDate})에 등록된 할 일이 없습니다.`
                : '등록된 할 일이 없습니다. 새로운 작업을 추가하거나 검색 필터를 초기화해보세요.';
            elements.todoListContainer.innerHTML = `
                <div class="glass-card empty-state">
                    <i class="fa-regular fa-calendar-xmark"></i>
                    <h3>할 일 없음</h3>
                    <p>${msg}</p>
                </div>
            `;
            return;
        }

        const todayStr = getTodayString();

        const html = todos.map(todo => {
            const isCompleted = todo.completed === 1;
            const priorityLabel = {
                high: '긴급',
                medium: '보통',
                low: '낮음'
            }[todo.priority] || '보통';

            // Due Date Badge Logic
            let dueBadgeHtml = '';
            if (todo.due_date) {
                const diffDays = calculateDayDiff(todayStr, todo.due_date);
                let dueClass = 'badge-due';
                let dueText = todo.due_date;

                if (!isCompleted) {
                    if (diffDays < 0) {
                        dueClass += ' overdue';
                        dueText = `기한 초과 (${Math.abs(diffDays)}일 전)`;
                    } else if (diffDays === 0) {
                        dueClass += ' today';
                        dueText = '오늘 마감 (D-Day)';
                    } else {
                        dueText = `D-${diffDays} (${todo.due_date})`;
                    }
                }

                dueBadgeHtml = `
                    <span class="badge ${dueClass}">
                        <i class="fa-regular fa-calendar-check"></i> ${dueText}
                    </span>
                `;
            }

            return `
                <div class="todo-item-card ${isCompleted ? 'completed' : ''} priority-${todo.priority}" data-id="${todo.id}">
                    <div class="checkbox-wrap">
                        <button type="button" class="custom-checkbox btn-toggle" title="${isCompleted ? '진행 중으로 변경' : '완료 처리'}">
                            <i class="fa-solid fa-check"></i>
                        </button>
                    </div>

                    <div class="todo-content">
                        <div class="todo-title-row">
                            <h4 class="todo-title">${escapeHtml(todo.title)}</h4>
                        </div>
                        ${todo.description ? `<p class="todo-desc">${escapeHtml(todo.description)}</p>` : ''}
                        
                        <div class="todo-meta-row">
                            <span class="badge badge-category">
                                <i class="fa-solid fa-tag"></i> ${escapeHtml(todo.category)}
                            </span>
                            <span class="badge badge-priority-${todo.priority}">
                                <i class="fa-solid fa-flag"></i> ${priorityLabel}
                            </span>
                            ${dueBadgeHtml}
                        </div>
                    </div>

                    <div class="todo-actions">
                        <button type="button" class="btn-icon btn-edit" title="수정">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button type="button" class="btn-icon btn-delete" title="삭제">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        elements.todoListContainer.innerHTML = html;

        // Attach item events
        elements.todoListContainer.querySelectorAll('.todo-item-card').forEach(card => {
            const id = card.dataset.id;
            const todo = todos.find(t => t.id == id);

            card.querySelector('.btn-toggle').addEventListener('click', () => {
                toggleTodo(id);
            });

            card.querySelector('.btn-edit').addEventListener('click', () => {
                openEditModal(todo);
            });

            card.querySelector('.btn-delete').addEventListener('click', () => {
                deleteTodo(id, todo.title);
            });
        });
    }

    // Utilities
    function getTodayString() {
        const d = new Date();
        return formatDate(d);
    }

    function formatDate(d) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function calculateDayDiff(todayStr, targetDateStr) {
        const d1 = new Date(todayStr);
        const d2 = new Date(targetDateStr);
        const diffTime = d2 - d1;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'fa-circle-info';
        if (type === 'success') icon = 'fa-circle-check';
        if (type === 'error') icon = 'fa-triangle-exclamation';

        toast.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span>${escapeHtml(message)}</span>
        `;

        elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});
