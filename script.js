document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const transactionForm = document.getElementById('transaction-form');
    const recurringForm = document.getElementById('recurring-form');
    const transactionList = document.getElementById('transaction-list');
    const recurringList = document.getElementById('recurring-list');
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpenseEl = document.getElementById('total-expense');
    const balanceEl = document.getElementById('balance');
    const notificationEl = document.getElementById('notification');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const csvFileInput = document.getElementById('csv-file');
    
    // NEW: Filter Elements
    const filterType = document.getElementById('filter-type');
    const filterDate = document.getElementById('filter-date');
    const filterYear = document.getElementById('filter-year');
    const datePickerContainer = document.getElementById('date-picker-container');

    // Data from localStorage
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    let recurringItems = JSON.parse(localStorage.getItem('recurringItems')) || [];

    // State for editing
    let editingIndex = null;
    let editingRecurringIndex = null;
    
    // NEW: State for filtering
    let currentFilter = 'all';

    // --- Functions ---
    const saveToLocalStorage = () => {
        localStorage.setItem('transactions', JSON.stringify(transactions));
        localStorage.setItem('recurringItems', JSON.stringify(recurringItems));
    };

    const showNotification = (message, type = 'success') => {
        notificationEl.textContent = message;
        notificationEl.style.backgroundColor = type === 'success' ? 'var(--success-color)' : 'var(--danger-color)';
        notificationEl.classList.add('show');
        setTimeout(() => {
            notificationEl.classList.remove('show');
        }, 4000);
    };

    // NEW: Function to get filtered transactions
    const getFilteredTransactions = () => {
        let filtered = [...transactions];
        const today = new Date();

        switch (currentFilter) {
            case 'daily':
                const selectedDate = filterDate.value;
                if (selectedDate) {
                    filtered = filtered.filter(t => t.date === selectedDate);
                }
                break;
            case 'weekly':
                const weekDate = filterDate.value ? new Date(filterDate.value) : today;
                const startOfWeek = new Date(weekDate);
                startOfWeek.setDate(weekDate.getDate() - weekDate.getDay()); // Sunday as start of week
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                
                filtered = filtered.filter(t => {
                    const transactionDate = new Date(t.date);
                    return transactionDate >= startOfWeek && transactionDate <= endOfWeek;
                });
                break;
            case 'monthly':
                const monthDate = filterDate.value ? new Date(filterDate.value) : today;
                const year = monthDate.getFullYear();
                const month = monthDate.getMonth(); // 0-11
                
                filtered = filtered.filter(t => {
                    const transactionDate = new Date(t.date);
                    return transactionDate.getFullYear() === year && transactionDate.getMonth() === month;
                });
                break;
            case 'yearly':
                const selectedYear = parseInt(filterYear.value);
                if (!isNaN(selectedYear)) {
                    filtered = filtered.filter(t => {
                        const transactionDate = new Date(t.date);
                        return transactionDate.getFullYear() === selectedYear;
                    });
                }
                break;
        }
        return filtered;
    };
    
    // MODIFIED: Update summary to use filtered data
    const updateSummary = () => {
        const transactionsToSummarize = getFilteredTransactions();
        
        const income = transactionsToSummarize.reduce((total, t) => t.type === 'income' ? total + t.amount : total, 0);
        const expense = transactionsToSummarize.reduce((total, t) => t.type === 'expense' ? total + t.amount : total, 0);
        
        const recurringIncome = recurringItems.reduce((total, r) => r.type === 'income' ? total + r.amount : total, 0);
        const recurringExpense = recurringItems.reduce((total, r) => r.type === 'expense' ? total + r.amount : total, 0);

        const totalIncome = income + recurringIncome;
        const totalExpense = expense + recurringExpense;
        const balance = totalIncome - totalExpense;

        totalIncomeEl.textContent = totalIncome.toFixed(2);
        totalExpenseEl.textContent = totalExpense.toFixed(2);
        balanceEl.textContent = balance.toFixed(2);
        
        if (balance < 0) {
            balanceEl.style.color = 'var(--danger-color)';
        } else {
            balanceEl.style.color = 'var(--success-color)';
        }
    };

    const renderTransactions = () => {
        const transactionsToRender = getFilteredTransactions();
        transactionList.innerHTML = '';
        if (transactionsToRender.length === 0) {
            transactionList.innerHTML = `<tr><td colspan="5" style="text-align:center;">ไม่มีรายการ${currentFilter !== 'all' ? 'ในช่วงเวลาที่เลือก' : ''}</td></tr>`;
            return;
        }
        transactionsToRender.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((t, index) => {
            const originalIndex = transactions.findIndex(trans => trans.date === t.date && trans.category === t.category && trans.amount === t.amount);
            const row = document.createElement('tr');

            // --- NEW: Add class based on transaction type ---
            if (t.type === 'income') {
                row.classList.add('income-row');
            } else {
                row.classList.add('expense-row');
            }

            if (editingIndex === originalIndex) {
                row.innerHTML = `
                    <td><input type="date" id="edit-date-${originalIndex}" class="edit-form-input" value="${t.date}"></td>
                    <td>
                        <select id="edit-type-${originalIndex}" class="edit-form-input">
                            <option value="income" ${t.type === 'income' ? 'selected' : ''}>รายรับ</option>
                            <option value="expense" ${t.type === 'expense' ? 'selected' : ''}>รายจ่าย</option>
                        </select>
                    </td>
                    <td><input type="text" id="edit-category-${originalIndex}" class="edit-form-input" value="${t.category}"></td>
                    <td><input type="number" id="edit-amount-${originalIndex}" class="edit-form-input" value="${t.amount}" step="0.01"></td>
                    <td class="actions-cell">
                        <button class="save-btn" onclick="saveTransaction(${originalIndex})" title="บันทึก">💾</button>
                        <button class="cancel-btn" onclick="cancelEditTransaction()" title="ยกเลิก">❌</button>
                    </td>
                `;
            } else {
                row.innerHTML = `
                    <td>${t.date}</td>
                    <td>${t.type === 'income' ? 'รายรับ' : 'รายจ่าย'}</td>
                    <td>${t.category}</td>
                    <td>${t.amount.toFixed(2)}</td>
                    <td class="actions-cell">
                        <button class="edit-btn" onclick="editTransaction(${originalIndex})" title="แก้ไข">✏️</button>
                        <button class="delete-btn" onclick="deleteTransaction(${originalIndex})" title="ลบ">🗑️</button>
                    </td>
                `;
            }
            transactionList.appendChild(row);
        });
    };
    
    const renderRecurring = () => {
        recurringList.innerHTML = '';
        if (recurringItems.length === 0) {
            recurringList.innerHTML = '<li style="text-align:center; padding: 1rem;">ไม่มีรายการคงที่</li>';
            return;
        }
        recurringItems.forEach((r, index) => {
            const li = document.createElement('li');

            // --- NEW: Add class based on recurring item type ---
            if (r.type === 'income') {
                li.classList.add('income-item');
            } else {
                li.classList.add('expense-item');
            }

            if (editingRecurringIndex === index) {
                li.innerHTML = `
                    <form class="recurring-edit-form" onsubmit="saveRecurring(event, ${index})">
                        <input type="text" id="edit-rec-name-${index}" value="${r.name}" required>
                        <select id="edit-rec-type-${index}" required>
                            <option value="income" ${r.type === 'income' ? 'selected' : ''}>รายรับ</option>
                            <option value="expense" ${r.type === 'expense' ? 'selected' : ''}>รายจ่าย</option>
                        </select>
                        <input type="number" id="edit-rec-amount-${index}" value="${r.amount}" step="0.01" required>
                        <button type="submit" class="save-btn" title="บันทึก">💾</button>
                        <button type="button" class="cancel-btn" onclick="cancelEditRecurring()" title="ยกเลิก">❌</button>
                    </form>
                `;
            } else {
                li.innerHTML = `
                    <span>${r.name} (${r.type === 'income' ? 'รายรับ' : 'รายจ่าย'}) - <strong>${r.amount.toFixed(2)}</strong></span>
                    <div>
                        <button class="edit-btn" onclick="editRecurring(${index})" title="แก้ไข">✏️</button>
                        <button class="delete-btn" onclick="deleteRecurring(${index})" title="ลบ">🗑️</button>
                    </div>
                `;
            }
            recurringList.appendChild(li);
        });
    };

    // NEW: Function to update filter UI visibility
    const updateFilterUI = () => {
        filterDate.classList.add('hidden');
        filterYear.classList.add('hidden');

        const today = new Date().toISOString().slice(0, 10);
        const currentYear = new Date().getFullYear();

        switch (currentFilter) {
            case 'daily':
            case 'weekly':
            case 'monthly':
                filterDate.classList.remove('hidden');
                if (!filterDate.value) {
                    filterDate.value = today;
                }
                break;
            case 'yearly':
                filterYear.classList.remove('hidden');
                if (!filterYear.value) {
                    filterYear.value = currentYear;
                }
                break;
        }
    };

    // --- Edit Functions ---
    window.editTransaction = (index) => {
        editingIndex = index;
        renderTransactions();
    };
    window.saveTransaction = (index) => {
        const updatedTransaction = {
            date: document.getElementById(`edit-date-${index}`).value,
            type: document.getElementById(`edit-type-${index}`).value,
            category: document.getElementById(`edit-category-${index}`).value,
            amount: parseFloat(document.getElementById(`edit-amount-${index}`).value)
        };
        transactions[index] = updatedTransaction;
        editingIndex = null;
        saveToLocalStorage();
        renderTransactions();
        updateSummary();
        showNotification('แก้ไขรายการสำเร็จ!');
    };
    window.cancelEditTransaction = () => {
        editingIndex = null;
        renderTransactions();
    };
    window.editRecurring = (index) => {
        editingRecurringIndex = index;
        renderRecurring();
    };
    window.saveRecurring = (event, index) => {
        event.preventDefault();
        const updatedItem = {
            name: document.getElementById(`edit-rec-name-${index}`).value,
            type: document.getElementById(`edit-rec-type-${index}`).value,
            amount: parseFloat(document.getElementById(`edit-rec-amount-${index}`).value)
        };
        recurringItems[index] = updatedItem;
        editingRecurringIndex = null;
        saveToLocalStorage();
        renderRecurring();
        updateSummary();
        showNotification('แก้ไขรายการคงที่สำเร็จ!');
    };
    window.cancelEditRecurring = () => {
        editingRecurringIndex = null;
        renderRecurring();
    };
    
    // --- CSV Export/Import Functions ---
    const exportToCSV = () => {
        const headers = ['RecordType', 'Date', 'Name', 'Category', 'Type', 'Amount'];
        let csvContent = headers.join(',') + '\n';
        recurringItems.forEach(item => {
            const row = ['Recurring', '', `"${item.name.replace(/"/g, '""')}"`, '', item.type, item.amount];
            csvContent += row.join(',') + '\n';
        });
        transactions.forEach(t => {
            const row = ['Transaction', t.date, '', `"${t.category.replace(/"/g, '""')}"`, t.type, t.amount];
            csvContent += row.join(',') + '\n';
        });
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const today = new Date().toISOString().slice(0, 10);
        link.setAttribute('download', `expense_data_${today}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('ส่งออกข้อมูลเป็นไฟล์ CSV สำเร็จ!');
    };
    const importFromCSV = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result.replace(/^\ufeff/, '');
            const lines = text.split('\n').filter(line => line.trim() !== '');
            if (lines.length === 0) { showNotification('ไฟล์ CSV ว่างเปล่า!', 'danger'); return; }
            const parseCSVRow = (row) => { const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/; return row.split(regex).map(val => val.replace(/^"|"$/g, '').trim()); };
            const headers = parseCSVRow(lines[0]);
            if (headers[0] !== 'RecordType') { showNotification('รูปแบบไฟล์ CSV ไม่ถูกต้อง!', 'danger'); return; }
            const importedRecurring = []; const importedTransactions = [];
            for (let i = 1; i < lines.length; i++) {
                const values = parseCSVRow(lines[i]);
                if (values[0] === 'Recurring') {
                    const item = { name: values[2], type: values[4], amount: parseFloat(values[5]) };
                    if (item.name && !isNaN(item.amount)) { importedRecurring.push(item); }
                } else if (values[0] === 'Transaction') {
                    const transaction = { date: values[1], category: values[3], type: values[4], amount: parseFloat(values[5]) };
                    if (transaction.date && transaction.category && !isNaN(transaction.amount)) { importedTransactions.push(transaction); }
                }
            }
            recurringItems = [...recurringItems, ...importedRecurring];
            transactions = [...transactions, ...importedTransactions];
            const uniqueTransactions = [...new Map(transactions.map(t => [`${t.date}-${t.category}-${t.amount}`, t])).values()];
            const uniqueRecurring = [...new Map(recurringItems.map(r => [`${r.name}-${r.amount}`, r])).values()];
            transactions = uniqueTransactions; recurringItems = uniqueRecurring;
            saveToLocalStorage(); renderTransactions(); renderRecurring(); updateSummary();
            const importedCount = importedRecurring.length + importedTransactions.length;
            showNotification(`นำเข้าข้อมูลสำเร็จ ${importedCount} รายการ!`);
        };
        reader.readAsText(file); event.target.value = '';
    };

    // --- Event Listeners ---
    transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newTransaction = {
            date: document.getElementById('date').value,
            type: document.getElementById('type').value,
            category: document.getElementById('category').value,
            amount: parseFloat(document.getElementById('amount').value)
        };
        transactions.push(newTransaction);
        saveToLocalStorage();
        renderTransactions();
        updateSummary();
        transactionForm.reset();
        document.getElementById('date').valueAsDate = new Date();
        showNotification('เพิ่มรายการสำเร็จ!');
    });
    recurringForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newItem = {
            name: document.getElementById('rec-name').value,
            type: document.getElementById('rec-type').value,
            amount: parseFloat(document.getElementById('rec-amount').value)
        };
        recurringItems.push(newItem);
        saveToLocalStorage();
        renderRecurring();
        updateSummary();
        recurringForm.reset();
        showNotification('เพิ่มรายการคงที่สำเร็จ!');
    });

    // NEW: Filter Event Listeners
    filterType.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        updateFilterUI();
        renderTransactions();
        updateSummary();
    });

    filterDate.addEventListener('change', () => {
        renderTransactions();
        updateSummary();
    });

    filterYear.addEventListener('change', () => {
        renderTransactions();
        updateSummary();
    });

    exportBtn.addEventListener('click', exportToCSV);
    importBtn.addEventListener('click', () => csvFileInput.click());
    csvFileInput.addEventListener('change', importFromCSV);

    // --- Global Delete Functions ---
    window.deleteTransaction = (index) => {
        if (confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) {
            transactions.splice(index, 1);
            saveToLocalStorage();
            renderTransactions();
            updateSummary();
            showNotification('ลบรายการสำเร็จ', 'danger');
        }
    };
    window.deleteRecurring = (index) => {
        if (confirm('ต้องการลบรายการคงที่นี้ใช่หรือไม่?')) {
            recurringItems.splice(index, 1);
            saveToLocalStorage();
            renderRecurring();
            updateSummary();
            showNotification('ลบรายการคงที่สำเร็จ', 'danger');
        }
    };

    // --- Initial Render ---
    document.getElementById('date').valueAsDate = new Date();
    updateFilterUI(); // Set initial filter UI state
    renderTransactions();
    renderRecurring();
    updateSummary();
});