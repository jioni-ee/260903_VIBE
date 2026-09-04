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
        schedules: [],
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
        todoAssigneeGroup: document.getElementById('todoAssigneeGroup'),
        todoAssignee: document.getElementById('todoAssignee'),

        // Controls
        statusTabs: document.getElementById('statusTabs'),
        tabButtons: document.querySelectorAll('.tab-btn'),
        searchInput: document.getElementById('searchInput'),
        clearSearchBtn: document.getElementById('clearSearchBtn'),
        filterCategory: document.getElementById('filterCategory'),
        filterPriority: document.getElementById('filterPriority'),
        sortBy: document.getElementById('sortBy'),
        todoListContainer: document.getElementById('todoListContainer'),

        // Modal (Todo Edit)
        editModalBackdrop: document.getElementById('editModalBackdrop'),
        editTodoForm: document.getElementById('editTodoForm'),
        editTodoId: document.getElementById('editTodoId'),
        editTodoTitle: document.getElementById('editTodoTitle'),
        editTodoDescription: document.getElementById('editTodoDescription'),
        editTodoCategory: document.getElementById('editTodoCategory'),
        editTodoPriority: document.getElementById('editTodoPriority'),
        editTodoDueDate: document.getElementById('editTodoDueDate'),
        editTodoAssigneeGroup: document.getElementById('editTodoAssigneeGroup'),
        editTodoAssignee: document.getElementById('editTodoAssignee'),
        btnCloseModal: document.getElementById('btnCloseModal'),
        btnCancelEdit: document.getElementById('btnCancelEdit'),

        // Schedule Elements & Modal
        btnAddScheduleBtn: document.getElementById('btnAddScheduleBtn'),
        scheduleModalBackdrop: document.getElementById('scheduleModalBackdrop'),
        scheduleModalTitle: document.getElementById('scheduleModalTitle'),
        scheduleForm: document.getElementById('scheduleForm'),
        scheduleId: document.getElementById('scheduleId'),
        scheduleTitle: document.getElementById('scheduleTitle'),
        scheduleStartDate: document.getElementById('scheduleStartDate'),
        scheduleEndDate: document.getElementById('scheduleEndDate'),
        scheduleIsAllDay: document.getElementById('scheduleIsAllDay'),
        scheduleTimeGroup: document.getElementById('scheduleTimeGroup'),
        scheduleStartTime: document.getElementById('scheduleStartTime'),
        scheduleCategory: document.getElementById('scheduleCategory'),
        scheduleColorInputs: document.querySelectorAll('input[name="scheduleColor"]'),
        scheduleLocation: document.getElementById('scheduleLocation'),
        scheduleDescription: document.getElementById('scheduleDescription'),
        btnCloseScheduleModal: document.getElementById('btnCloseScheduleModal'),
        btnCancelSchedule: document.getElementById('btnCancelSchedule'),
        btnDeleteSchedule: document.getElementById('btnDeleteSchedule'),

        // Day Details Popover Elements
        calDayPopover: document.getElementById('calDayPopover'),
        popoverDateTitle: document.getElementById('popoverDateTitle'),
        popoverTotalBadge: document.getElementById('popoverTotalBadge'),
        btnClosePopover: document.getElementById('btnClosePopover'),
        popoverBody: document.getElementById('popoverBody'),
        btnPopoverAddSchedule: document.getElementById('btnPopoverAddSchedule'),

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

        // Status Tabs Filter & Double-click Today Toggle
        elements.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                elements.tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                state.filter = button.dataset.filter;
                fetchTodos();
            });

            button.addEventListener('dblclick', (e) => {
                e.preventDefault();
                const todayStr = getTodayString();
                if (state.selectedDate === todayStr) {
                    clearDateFilter();
                    showToast('오늘 날짜 필터가 해제되었습니다.', 'info');
                } else {
                    state.selectedDate = todayStr;
                    elements.filterDateDisplay.textContent = todayStr;
                    elements.calendarFilterIndicator.style.display = 'flex';
                    renderCalendar();
                    renderFilteredTodoList();
                    showToast(`오늘(${todayStr}) 마감 작업 필터링 적용`, 'info');
                }
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
            hideDayPopover();
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

        // Todo Edit Modal Events
        elements.btnCloseModal.addEventListener('click', closeModal);
        elements.btnCancelEdit.addEventListener('click', closeModal);
        elements.editModalBackdrop.addEventListener('click', (e) => {
            if (e.target === elements.editModalBackdrop) closeModal();
        });
        elements.editTodoForm.addEventListener('submit', handleSaveEdit);

        // Schedule Modal Events
        if (elements.btnAddScheduleBtn) {
            elements.btnAddScheduleBtn.addEventListener('click', () => {
                openScheduleModal(null, state.selectedDate || getTodayString());
            });
        }

        if (elements.scheduleIsAllDay) {
            elements.scheduleIsAllDay.addEventListener('change', () => {
                elements.scheduleTimeGroup.style.display = elements.scheduleIsAllDay.checked ? 'none' : 'block';
            });
        }

        if (elements.btnCloseScheduleModal) elements.btnCloseScheduleModal.addEventListener('click', closeScheduleModal);
        if (elements.btnCancelSchedule) elements.btnCancelSchedule.addEventListener('click', closeScheduleModal);
        if (elements.scheduleModalBackdrop) {
            elements.scheduleModalBackdrop.addEventListener('click', (e) => {
                if (e.target === elements.scheduleModalBackdrop) closeScheduleModal();
            });
        }
        if (elements.scheduleForm) elements.scheduleForm.addEventListener('submit', handleSaveSchedule);
        if (elements.btnDeleteSchedule) elements.btnDeleteSchedule.addEventListener('click', handleDeleteSchedule);

        // Assignee Field Dynamic Display Listeners
        if (elements.todoCategory && elements.todoAssigneeGroup) {
            elements.todoCategory.addEventListener('change', () => {
                updateAssigneeVisibility(elements.todoCategory, elements.todoAssigneeGroup);
            });
            updateAssigneeVisibility(elements.todoCategory, elements.todoAssigneeGroup);
        }

        if (elements.editTodoCategory && elements.editTodoAssigneeGroup) {
            elements.editTodoCategory.addEventListener('change', () => {
                updateAssigneeVisibility(elements.editTodoCategory, elements.editTodoAssigneeGroup);
            });
        }

        // Popover Events
        if (elements.btnClosePopover) {
            elements.btnClosePopover.addEventListener('click', hideDayPopover);
        }
        if (elements.calDayPopover) {
            elements.calDayPopover.addEventListener('mouseenter', () => {
                clearTimeout(popoverHideTimer);
            });
            elements.calDayPopover.addEventListener('mouseleave', () => {
                popoverHideTimer = setTimeout(() => hideDayPopover(), 220);
            });
        }
        document.addEventListener('click', (e) => {
            if (elements.calDayPopover && elements.calDayPopover.style.display !== 'none') {
                if (!elements.calDayPopover.contains(e.target) && !e.target.closest('.cal-day-cell')) {
                    hideDayPopover();
                }
            }
        });

        // Global Keydown (Escape closes open modal or popover)
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (elements.calDayPopover && elements.calDayPopover.style.display !== 'none') {
                    hideDayPopover();
                }
                if (elements.editModalBackdrop && elements.editModalBackdrop.classList.contains('show')) {
                    closeModal();
                }
                if (elements.scheduleModalBackdrop && elements.scheduleModalBackdrop.classList.contains('show')) {
                    closeScheduleModal();
                }
            }
        });
    }

    // Helper: Dynamic Assignee Visibility
    function updateAssigneeVisibility(categorySelect, assigneeGroup) {
        if (!categorySelect || !assigneeGroup) return;
        const cat = categorySelect.value;
        if (cat === '업무' || cat === '개발') {
            assigneeGroup.style.display = 'block';
        } else {
            assigneeGroup.style.display = 'none';
        }
    }

    // API Calls
    async function loadAll() {
        await Promise.all([fetchAllTodosForCalendar(), fetchTodos(), fetchStats(), fetchSchedules()]);
    }

    async function fetchSchedules() {
        try {
            const res = await fetch('/api/schedules');
            const data = await res.json();
            if (data.success) {
                state.schedules = data.schedules;
                renderCalendar();
            }
        } catch (err) {
            console.error('Schedule fetch error:', err);
        }
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

        // 1. 기한별 할 일 맵 생성: { 'YYYY-MM-DD': [todo1, todo2, ...] }
        const todosByDate = {};
        state.allTodos.forEach(todo => {
            if (todo.due_date) {
                if (!todosByDate[todo.due_date]) {
                    todosByDate[todo.due_date] = [];
                }
                todosByDate[todo.due_date].push(todo);
            }
        });

        // 2. 날짜별 일정(Schedule) 맵 생성: { 'YYYY-MM-DD': [sched1, sched2, ...] }
        const schedulesByDate = {};
        state.schedules.forEach(sc => {
            if (sc.start_date) {
                const start = sc.start_date;
                const end = sc.end_date || sc.start_date;
                let cur = new Date(start + 'T00:00:00');
                const endDate = new Date(end + 'T00:00:00');
                let safety = 0;
                while (cur <= endDate && safety < 60) {
                    const dStr = formatDate(cur);
                    if (!schedulesByDate[dStr]) schedulesByDate[dStr] = [];
                    schedulesByDate[dStr].push(sc);
                    cur.setDate(cur.getDate() + 1);
                    safety++;
                }
            }
        });

        const todayStr = getTodayString();
        let daysHtml = '';

        // 1. 이전 달 채우기
        for (let i = firstDayIndex; i > 0; i--) {
            const dayNum = prevLastDate - i + 1;
            const prevMonthDate = new Date(year, month - 1, dayNum);
            const dateStr = formatDate(prevMonthDate);
            daysHtml += createDayCellHtml(dateStr, dayNum, true, false, todosByDate[dateStr] || [], schedulesByDate[dateStr] || []);
        }

        // 2. 이번 달 날짜들
        for (let dayNum = 1; dayNum <= lastDate; dayNum++) {
            const currDate = new Date(year, month, dayNum);
            const dateStr = formatDate(currDate);
            const isToday = (dateStr === todayStr);
            const isSelected = (dateStr === state.selectedDate);
            daysHtml += createDayCellHtml(dateStr, dayNum, false, isToday, todosByDate[dateStr] || [], schedulesByDate[dateStr] || [], isSelected);
        }

        // 3. 다음 달 채우기 (총 35 or 42 셀 유지)
        const totalCellsRendered = firstDayIndex + lastDate;
        const totalGridSlots = totalCellsRendered > 35 ? 42 : 35;
        const remainingSlots = totalGridSlots - totalCellsRendered;

        for (let dayNum = 1; dayNum <= remainingSlots; dayNum++) {
            const nextMonthDate = new Date(year, month + 1, dayNum);
            const dateStr = formatDate(nextMonthDate);
            daysHtml += createDayCellHtml(dateStr, dayNum, true, false, todosByDate[dateStr] || [], schedulesByDate[dateStr] || []);
        }

        elements.calendarDaysGrid.innerHTML = daysHtml;

        // 셀 마우스 호버, 클릭, 더블클릭 이벤트 바인딩
        elements.calendarDaysGrid.querySelectorAll('.cal-day-cell').forEach(cell => {
            const dateStr = cell.dataset.date;

            // 1. 마우스 호버 시 상세 팝오버 오버레이 노출
            cell.addEventListener('mouseenter', () => {
                clearTimeout(popoverHideTimer);
                popoverShowTimer = setTimeout(() => {
                    showDayPopover(cell, dateStr);
                }, 180);
            });

            cell.addEventListener('mouseleave', () => {
                clearTimeout(popoverShowTimer);
                popoverHideTimer = setTimeout(() => {
                    hideDayPopover();
                }, 220);
            });

            // 2. 셀 클릭 시 날짜 필터링 및 팝오버 토글
            cell.addEventListener('click', (e) => {
                if (e.target.closest('.cal-schedule-chip')) return;

                handleDateCellClick(dateStr);

                if (elements.calDayPopover && elements.calDayPopover.style.display !== 'none' && currentPopoverDate === dateStr) {
                    hideDayPopover();
                } else {
                    showDayPopover(cell, dateStr);
                }
            });

            // 3. 셀 더블클릭 시 일정 추가 모달 오픈
            cell.addEventListener('dblclick', (e) => {
                if (e.target.closest('.cal-schedule-chip')) return;
                hideDayPopover();
                openScheduleModal(null, dateStr);
            });
        });

        // 일정 칩 클릭 시 수정 모달 오픈 (상위 날짜 셀 클릭 전파 방지)
        elements.calendarDaysGrid.querySelectorAll('.cal-schedule-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.stopPropagation();
                hideDayPopover();
                const schedId = chip.dataset.scheduleId;
                const schedule = state.schedules.find(s => s.id == schedId);
                if (schedule) {
                    openScheduleModal(schedule);
                }
            });
        });
    }

    function createDayCellHtml(dateStr, dayNum, isOtherMonth, isToday, tasksForDay, schedulesForDay = [], isSelected = false) {
        const d = new Date(dateStr);
        const dayOfWeek = d.getDay();
        let dayClass = 'cal-day-cell';
        if (isOtherMonth) dayClass += ' other-month';
        if (isToday) dayClass += ' today';
        if (isSelected) dayClass += ' selected';
        if (dayOfWeek === 0) dayClass += ' is-sunday';
        if (dayOfWeek === 6) dayClass += ' is-saturday';

        const totalItemsCount = tasksForDay.length + schedulesForDay.length;
        const countBadge = totalItemsCount > 0 ? `<span class="cal-task-count-badge">${totalItemsCount}건</span>` : '';

        // 최대 2개 아이템 표시 (일정 우선, 이후 할 일)
        let chipsHtml = '';
        let displayedCount = 0;
        const maxDisplay = 2;

        // 1. 일정 칩 표시
        for (const sc of schedulesForDay) {
            if (displayedCount >= maxDisplay) break;
            const color = sc.color || '#6366f1';
            const timeStr = (!sc.is_all_day && sc.start_time) ? `<span class="cal-schedule-time">${escapeHtml(sc.start_time)}</span>` : '';
            chipsHtml += `
                <div class="cal-schedule-chip" style="background: ${color};" data-schedule-id="${sc.id}" title="[일정: ${escapeHtml(sc.category || '기본')}] ${escapeHtml(sc.title)}${sc.location ? ' @ ' + escapeHtml(sc.location) : ''}">
                    <i class="fa-solid fa-calendar-day"></i> ${timeStr}${escapeHtml(sc.title)}
                </div>
            `;
            displayedCount++;
        }

        // 2. 할 일 칩 표시
        for (const t of tasksForDay) {
            if (displayedCount >= maxDisplay) break;
            const isCompleted = t.completed === 1;
            const chipClass = isCompleted ? 'chip-completed' : `chip-${t.priority}`;
            chipsHtml += `
                <div class="cal-task-chip ${chipClass}" title="[할일] ${escapeHtml(t.title)} (${t.priority})">
                    ${isCompleted ? '<i class="fa-solid fa-check"></i> ' : ''}${escapeHtml(t.title)}
                </div>
            `;
            displayedCount++;
        }

        if (totalItemsCount > maxDisplay) {
            chipsHtml += `<div class="cal-more-chip">+${totalItemsCount - maxDisplay}건 더보기</div>`;
        }

        return `
            <div class="${dayClass}" data-date="${dateStr}">
                <div class="cal-day-header">
                    <span class="cal-day-num">${dayNum}</span>
                    ${countBadge}
                </div>
                <div class="cal-tasks-wrap">
                    ${chipsHtml}
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

    // =========================================================================
    // Day Details Popover (Full Items Overlay)
    // =========================================================================
    let popoverShowTimer = null;
    let popoverHideTimer = null;
    let currentPopoverDate = null;

    function showDayPopover(cell, dateStr) {
        if (!elements.calDayPopover) return;
        currentPopoverDate = dateStr;

        // 1. 해당 날짜에 해당하는 일정(Schedule) 수집
        const schedules = [];
        state.schedules.forEach(sc => {
            if (sc.start_date) {
                const start = sc.start_date;
                const end = sc.end_date || sc.start_date;
                if (dateStr >= start && dateStr <= end) {
                    schedules.push(sc);
                }
            }
        });

        // 2. 해당 날짜 마감인 할 일(Todo) 수집
        const todos = state.allTodos.filter(t => t.due_date === dateStr);
        const totalCount = schedules.length + todos.length;

        // 날짜 포맷 (예: 2026년 9월 4일 (금))
        const d = new Date(dateStr + 'T00:00:00');
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const dateFormatted = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${dayNames[d.getDay()]})`;

        elements.popoverDateTitle.textContent = dateFormatted;
        elements.popoverTotalBadge.textContent = `${totalCount}건`;

        let bodyHtml = '';

        if (totalCount === 0) {
            bodyHtml = `
                <div class="popover-empty-notice">
                    <i class="fa-regular fa-calendar-plus" style="font-size: 1.6rem; opacity: 0.4; margin-bottom: 0.4rem; display: block;"></i>
                    등록된 일정이나 할 일이 없습니다.
                </div>
            `;
        } else {
            // 1. 일정 섹션
            if (schedules.length > 0) {
                bodyHtml += `
                    <div class="popover-section">
                        <div class="popover-section-title">
                            <i class="fa-solid fa-calendar-days" style="color: #8b5cf6;"></i> 일정 (${schedules.length})
                        </div>
                        <div class="popover-list">
                `;
                schedules.forEach(sc => {
                    const color = sc.color || '#6366f1';
                    const time = (!sc.is_all_day && sc.start_time) ? sc.start_time : '종일';
                    const loc = sc.location ? ` · ${escapeHtml(sc.location)}` : '';
                    bodyHtml += `
                        <div class="popover-item popover-item-schedule" data-schedule-id="${sc.id}" title="클릭하여 일정 수정">
                            <div class="popover-item-left">
                                <span class="popover-item-color-bar" style="background: ${color};"></span>
                                <span class="popover-item-title">${escapeHtml(sc.title)}</span>
                            </div>
                            <div class="popover-item-meta">
                                <span>${time}${loc}</span>
                                <i class="fa-solid fa-angle-right" style="font-size: 0.7rem; opacity: 0.5;"></i>
                            </div>
                        </div>
                    `;
                });
                bodyHtml += `</div></div>`;
            }

            // 2. 할 일 섹션
            if (todos.length > 0) {
                bodyHtml += `
                    <div class="popover-section">
                        <div class="popover-section-title">
                            <i class="fa-solid fa-list-check" style="color: #06b6d4;"></i> 마감 할 일 (${todos.length})
                        </div>
                        <div class="popover-list">
                `;
                todos.forEach(t => {
                    const isCompleted = t.completed === 1;
                    const priorityColor = {
                        high: '#ef4444',
                        medium: '#f59e0b',
                        low: '#10b981'
                    }[t.priority] || '#94a3b8';
                    const assigneeText = t.assignee ? ` [${escapeHtml(t.assignee)}]` : '';

                    bodyHtml += `
                        <div class="popover-item popover-item-todo ${isCompleted ? 'is-completed' : ''}" data-todo-id="${t.id}" title="클릭하여 할 일 수정">
                            <div class="popover-item-left">
                                <span class="popover-item-color-bar" style="background: ${priorityColor};"></span>
                                <span class="popover-item-title">${escapeHtml(t.title)}</span>
                            </div>
                            <div class="popover-item-meta">
                                <span style="font-size: 0.68rem; opacity: 0.85;">${escapeHtml(t.category)}${assigneeText}</span>
                                <i class="${isCompleted ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'}" style="color: ${isCompleted ? 'var(--status-success)' : 'var(--text-muted)'};"></i>
                            </div>
                        </div>
                    `;
                });
                bodyHtml += `</div></div>`;
            }
        }

        elements.popoverBody.innerHTML = bodyHtml;

        // 하단 일정 추가 버튼 연동
        elements.btnPopoverAddSchedule.onclick = () => {
            hideDayPopover();
            openScheduleModal(null, dateStr);
        };

        // 팝오버 내부 아이템 클릭 이벤트
        elements.popoverBody.querySelectorAll('.popover-item-schedule').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = item.dataset.scheduleId;
                const sc = state.schedules.find(s => s.id == id);
                if (sc) {
                    hideDayPopover();
                    openScheduleModal(sc);
                }
            });
        });

        elements.popoverBody.querySelectorAll('.popover-item-todo').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = item.dataset.todoId;
                const todo = state.allTodos.find(t => t.id == id);
                if (todo) {
                    hideDayPopover();
                    openEditModal(todo);
                }
            });
        });

        // 팝오버 위치 계산 (달력 영역 내부, 해당 일자칸 바로 옆 상/하/좌/우 자동 배치)
        if (!elements.calendarSection) return;

        // 실제 렌더링된 크기 측정을 위해 임시 표시
        elements.calDayPopover.style.visibility = 'hidden';
        elements.calDayPopover.style.display = 'flex';

        const calRect = elements.calendarSection.getBoundingClientRect();
        const cellRect = cell.getBoundingClientRect();
        const popRect = elements.calDayPopover.getBoundingClientRect();

        const popWidth = popRect.width || 300;
        const popHeight = popRect.height || 280;

        const pad = 10; // 달력 외곽 안전 여백
        const gap = 8;  // 일자칸과의 간격

        // 달력 내 일자칸의 상대 좌표
        const cLeft = cellRect.left - calRect.left;
        const cRight = cellRect.right - calRect.left;
        const cTop = cellRect.top - calRect.top;
        const cBottom = cellRect.bottom - calRect.top;

        // 달력 헤더 아래부터 배치 가능하도록 최소/최대 Y 계산
        const calHeader = elements.calendarSection.querySelector('.calendar-header');
        const minTop = calHeader ? (calHeader.getBoundingClientRect().bottom - calRect.top + 6) : pad;
        const maxTop = Math.max(minTop, calRect.height - popHeight - pad);

        let left = 0;
        let top = 0;

        // 좌/우 공간 확인
        const spaceRight = calRect.width - cRight - pad;
        const spaceLeft = cLeft - pad;

        if (spaceRight >= popWidth + gap) {
            // 1. 우측 배치: 일자칸 바로 오른쪽
            left = cRight + gap;
            top = cTop;
            // 상하 위치 보정: 달력 하단을 벗어날 경우 위로 이동하여 셀 하단에 맞춤
            if (top + popHeight > calRect.height - pad) {
                top = Math.max(minTop, cBottom - popHeight);
            }
        } else if (spaceLeft >= popWidth + gap) {
            // 2. 좌측 배치: 일자칸 바로 왼쪽
            left = cLeft - popWidth - gap;
            top = cTop;
            // 상하 위치 보정: 달력 하단을 벗어날 경우 위로 이동하여 셀 하단에 맞춤
            if (top + popHeight > calRect.height - pad) {
                top = Math.max(minTop, cBottom - popHeight);
            }
        } else {
            // 3. 좌우 공간 부족 시(화면이 좁은 모바일 등): 상/하 배치로 자동 전환
            left = Math.max(pad, Math.min(calRect.width - popWidth - pad, cLeft + (cellRect.width - popWidth) / 2));

            const spaceBottom = calRect.height - cBottom - pad;
            const spaceTop = cTop - minTop;

            if (spaceBottom >= popHeight + gap) {
                // 하단 배치
                top = cBottom + gap;
            } else if (spaceTop >= popHeight + gap) {
                // 상단 배치
                top = cTop - popHeight - gap;
            } else {
                top = Math.max(minTop, Math.min(maxTop, cTop));
            }
        }

        // 최종 달력 영역 클램프 (달력 경계를 절대 벗어나지 않도록 보장)
        left = Math.max(pad, Math.min(calRect.width - popWidth - pad, left));
        top = Math.max(minTop, Math.min(maxTop, top));

        elements.calDayPopover.style.left = `${Math.round(left)}px`;
        elements.calDayPopover.style.top = `${Math.round(top)}px`;
        elements.calDayPopover.style.visibility = 'visible';
    }

    function hideDayPopover() {
        clearTimeout(popoverShowTimer);
        if (elements.calDayPopover) {
            elements.calDayPopover.style.display = 'none';
        }
        currentPopoverDate = null;
    }

    // Add Todo Handler
    async function handleAddTodo(e) {
        e.preventDefault();
        const title = elements.todoTitle.value.trim();
        if (!title) return;

        const category = elements.todoCategory.value;
        const assignee = (category === '업무' || category === '개발')
            ? elements.todoAssignee.value.trim()
            : '';

        const payload = {
            title: title,
            description: elements.todoDescription.value.trim(),
            category: category,
            priority: elements.todoPriority.value,
            due_date: elements.todoDueDate.value || null,
            assignee: assignee
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
                elements.todoAssignee.value = '';
                updateAssigneeVisibility(elements.todoCategory, elements.todoAssigneeGroup);
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
        elements.editTodoAssignee.value = todo.assignee || '';

        updateAssigneeVisibility(elements.editTodoCategory, elements.editTodoAssigneeGroup);
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

        const category = elements.editTodoCategory.value;
        const assignee = (category === '업무' || category === '개발')
            ? elements.editTodoAssignee.value.trim()
            : '';

        const payload = {
            title: title,
            description: elements.editTodoDescription.value.trim(),
            category: category,
            priority: elements.editTodoPriority.value,
            due_date: elements.editTodoDueDate.value || null,
            assignee: assignee
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

    // Schedule Modal Operations
    function openScheduleModal(schedule = null, defaultDate = null) {
        elements.scheduleForm.reset();
        if (schedule) {
            elements.scheduleModalTitle.innerHTML = '<i class="fa-solid fa-calendar-check"></i> 일정 수정';
            elements.scheduleId.value = schedule.id;
            elements.scheduleTitle.value = schedule.title;
            elements.scheduleStartDate.value = schedule.start_date || '';
            elements.scheduleEndDate.value = schedule.end_date || '';
            elements.scheduleIsAllDay.checked = Boolean(schedule.is_all_day);
            elements.scheduleTimeGroup.style.display = schedule.is_all_day ? 'none' : 'block';
            elements.scheduleStartTime.value = schedule.start_time || '';
            elements.scheduleCategory.value = schedule.category || '회의';
            elements.scheduleLocation.value = schedule.location || '';
            elements.scheduleDescription.value = schedule.description || '';

            elements.scheduleColorInputs.forEach(radio => {
                radio.checked = (radio.value === (schedule.color || '#6366f1'));
            });

            elements.btnDeleteSchedule.style.display = 'inline-flex';
        } else {
            elements.scheduleModalTitle.innerHTML = '<i class="fa-solid fa-calendar-plus"></i> 새 일정 등록';
            elements.scheduleId.value = '';
            elements.scheduleStartDate.value = defaultDate || getTodayString();
            elements.scheduleEndDate.value = '';
            elements.scheduleIsAllDay.checked = true;
            elements.scheduleTimeGroup.style.display = 'none';
            elements.scheduleStartTime.value = '';
            elements.scheduleCategory.value = '회의';
            elements.scheduleLocation.value = '';
            elements.scheduleDescription.value = '';

            elements.scheduleColorInputs.forEach((radio, idx) => {
                radio.checked = (idx === 0);
            });

            elements.btnDeleteSchedule.style.display = 'none';
        }
        elements.scheduleModalBackdrop.classList.add('show');
    }

    function closeScheduleModal() {
        elements.scheduleModalBackdrop.classList.remove('show');
    }

    async function handleSaveSchedule(e) {
        e.preventDefault();
        const id = elements.scheduleId.value;
        const title = elements.scheduleTitle.value.trim();
        const startDate = elements.scheduleStartDate.value;
        if (!title || !startDate) {
            showToast('일정 제목과 시작 날짜를 입력해주세요.', 'error');
            return;
        }

        let selectedColor = '#6366f1';
        elements.scheduleColorInputs.forEach(radio => {
            if (radio.checked) selectedColor = radio.value;
        });

        const isAllDay = elements.scheduleIsAllDay.checked;
        const payload = {
            title: title,
            start_date: startDate,
            end_date: elements.scheduleEndDate.value || null,
            start_time: isAllDay ? null : (elements.scheduleStartTime.value || null),
            is_all_day: isAllDay,
            category: elements.scheduleCategory.value,
            color: selectedColor,
            location: elements.scheduleLocation.value.trim(),
            description: elements.scheduleDescription.value.trim()
        };

        const isEdit = Boolean(id);
        const url = isEdit ? `/api/schedules/${id}` : '/api/schedules';
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                showToast(isEdit ? '일정이 수정되었습니다.' : '새 일정이 등록되었습니다!', 'success');
                closeScheduleModal();
                await fetchSchedules();
            } else {
                showToast(data.message || '일정 저장에 실패했습니다.', 'error');
            }
        } catch (err) {
            console.error('Schedule save error:', err);
            showToast('일정 저장 중 오류가 발생했습니다.', 'error');
        }
    }

    async function handleDeleteSchedule() {
        const id = elements.scheduleId.value;
        const title = elements.scheduleTitle.value.trim();
        if (!id) return;

        if (!confirm(`"${title}" 일정을 삭제하시겠습니까?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/schedules/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                showToast('일정이 삭제되었습니다.', 'info');
                closeScheduleModal();
                await fetchSchedules();
            } else {
                showToast(data.message || '일정 삭제 실패', 'error');
            }
        } catch (err) {
            console.error('Schedule delete error:', err);
            showToast('일정 삭제 중 오류가 발생했습니다.', 'error');
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

            // Assignee Badge
            let assigneeBadgeHtml = '';
            if (todo.assignee && todo.assignee.trim()) {
                assigneeBadgeHtml = `
                    <span class="badge badge-assignee" title="담당자: ${escapeHtml(todo.assignee)}">
                        <i class="fa-solid fa-user-check"></i> ${escapeHtml(todo.assignee)}
                    </span>
                `;
            }

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
                            ${assigneeBadgeHtml}
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
