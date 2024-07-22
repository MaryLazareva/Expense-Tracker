// Функция получения CSRF токена
function getCSRFToken() {
    return document.querySelector('meta[name="csrf-token"]').getAttribute('content');
}


// Обработчик события DOMContentLoaded
document.addEventListener('DOMContentLoaded', function () {
    checkLoginStatus();  // Проверяет, авторизован ли текущий пользователь


    setInterval(updateCSRFToken, 600000);  // Обновление каждые 10 минут

    document.getElementById('registerForm').addEventListener('submit', function (event) {
        event.preventDefault();
        register();
    });

    document.getElementById('loginForm').addEventListener('submit', function (event) {
        event.preventDefault();  // Предотвращает стандартное поведение отправки формы (браузер не будет перезагружать страницу)
        login();
    });

    document.getElementById('logoutButton').addEventListener('click', function (event) {
        logout();
    });

    
    document.getElementById('addExpenseForm').addEventListener('submit', function (event) {
        event.preventDefault();
        addExpense(); // Добавление расходов
    });

    // Обработчик события submit для формы фильтрации по дате
    document.getElementById('dateRangeForm').addEventListener('submit', function (event) {
        event.preventDefault();
        loadExpenses();
    });

    document.getElementById('showCategoryFormButton').addEventListener('click', function () {
        document.getElementById('addCategoryForm').style.display = 'block';
    });

    document.getElementById('addCategoryForm').addEventListener('submit', function (event) {
        event.preventDefault();
        addCategory();
    });

    document.getElementById('showDeleteCategoryFormButton').addEventListener('click', function () {
        document.getElementById('deleteCategoryForm').style.display = 'block';
        loadDeleteCategories(); 
    });

    document.getElementById('deleteCategoryForm').addEventListener('submit', function (event) {
        event.preventDefault();
        const categoryId = document.getElementById('deleteCategoryId').value;
        deleteCategory(categoryId);
    });


});

// Обновление токена
function updateCSRFToken() {
    fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        document.querySelector('meta[name="csrf-token"]').setAttribute('content', data.csrf_token); // Нахождение и обновление csrf токена
    })
    .catch(error => {
        console.error('Error updating CSRF token:', error);
    });
}


// Проверяет, авторизован ли пользователь
function checkLoginStatus() {
    fetch('/api/login_status', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include'
    })
        .then(response => response.json())
        .then(data => {
            if (data.logged_in) {
                document.getElementById('authForms').style.display = 'none';  // style.display -  позволяет динамически изменять видимость 
                document.getElementById('loggedInContent').style.display = 'block'; 
                loadExpenses();
                loadCategories();  // Загрузка списка категорий после загрузки документа
                loadDeleteCategories(); // Загрузка категорий для удаления
            } else {
                document.getElementById('authForms').style.display = 'block'; // block - делает элемент блочным
                document.getElementById('loggedInContent').style.display = 'none'; // none - скрывает элемент с веб-страницы
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

// Функция регистрации register
function register() {
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    fetch('/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ username, email, password }), // Преобразование данных в JSON-строку
        credentials: 'include'
    })
        .then(response => response.json()) // Преобразование строки JSON в объект
        .then(data => {
            if (data.message === 'User registered successfully') {
                alert('Registration successful! Please log in.');
            } else {
                alert(data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

//Функция входа login
function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
    })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Login successful') {
                document.getElementById('authForms').style.display = 'none';
                document.getElementById('loggedInContent').style.display = 'block';
                loadExpenses();
            } else {
                alert(data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

// Функция выхода logout
function logout() {
    fetch('/api/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        credentials: 'include'
    })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Logout successful') {
                document.getElementById('authForms').style.display = 'block';
                document.getElementById('loggedInContent').style.display = 'none';
            } else {
                alert(data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

// Функция загрузки категорий loadCategories (загружает список категорий с сервера и заполняет ими выпадающий список)
function loadCategories() {
    fetch('/api/categories', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        credentials: 'include'
    })
        .then(response => response.json())
        .then(data => {
            const categorySelect = document.getElementById('categoryId');
            categorySelect.innerHTML = '';  // Очищаем выпадающий список перед добавлением новых категорийпол
            data.forEach(category => {
                const option = document.createElement('option');  // Создает новый элемент <option> для каждого объекта категории
                option.value = category.id;
                option.text = category.category;
                categorySelect.appendChild(option); // Добавляет элемент <option> в выпадающий список <select>
            });
        });
}

// Функция добавления новой категории addCategory
function addCategory() {
    const newCategoryName = document.getElementById('newCategoryName').value;

    fetch('/api/add_category', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ category: newCategoryName }),
        credentials: 'include'
    })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Category added successfully') {                
                document.getElementById('addCategoryForm').reset();  // Сброс формы добавления категории, очищая все введенные пользователем данные
                document.getElementById('addCategoryForm').style.display = 'none';
                loadCategories();
                alert('Category added successfully');
            } else {
                alert(data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}


// Функция загрузки категорий для удаления
function loadDeleteCategories() {
    fetch('/api/categories', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        credentials: 'include'
    })
        .then(response => response.json())
        .then(data => {
            const deleteCategorySelect = document.getElementById('deleteCategoryId');
            deleteCategorySelect.innerHTML = '';  // Очищаем выпадающий список перед добавлением новых категорий
            data.forEach(category => {
                const option = document.createElement('option');  // Создает новый элемент <option> для каждого объекта категории
                option.value = category.id;
                option.text = category.category;
                deleteCategorySelect.appendChild(option); // Добавляет элемент <option> в выпадающий список <select>
            });
        });
}
// Функция удаления категории deleteCategory
function deleteCategory(categoryId) {
    if (confirm('Are you sure you want to delete this category?')) {
        fetch('/api/delete_category', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({ categoryId: categoryId }),
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => {
                console.log('Delete response:', data);
                if (data.message === 'Category deleted') {
                    loadCategories();
                    loadExpenses();
                    document.getElementById('deleteCategoryForm').style.display = 'none';                    
                } else {
                    alert('Failed to delete category: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error deleting category:', error);
            });
    }
}



// Функция добавления расхода addExpense (отправляет POST-запрос на сервер для добавления нового расхода)
function addExpense() {
    const title = document.getElementById('title').value;
    const price = parseFloat(document.getElementById('price').value);
    const date = document.getElementById('date').value;
    const categoryId = parseInt(document.getElementById('categoryId').value);

    if (!title || !price) {   // Проверка обязательных полей
        alert('Title and Price fields cannot be empty.');
        return;
    }

    fetch('/api/expenses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ title, price, date, category_id: categoryId }),
        credentials: 'include'
    })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Invalid date format') {
                alert('Invalid date format. Please use YYYY-MM-DD.');
            } else if (data.message === 'Expense created') {
                loadExpenses();
            } else {
                console.error('Error:', data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

// Функция загрузки расходов loadExpenses (отправляет GET-запрос на сервер для получения списка расходов в указанном диапазоне дат)
function loadExpenses() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const url = new URL('/api/filtered_expenses', window.location.origin); // window.location.origin - базовый URL текущего сайта (в данном случае http://localhost:5000/api/filtered_expenses)
    if (startDate) url.searchParams.append('start_date', startDate); // Если указаны начальная дата, она добавляется как параметр запроса
    if (endDate) url.searchParams.append('end_date', endDate); // Если указаны конечная дата, она добавляется как параметр запроса

    fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        credentials: 'include'  // Позволяет передавать учетные данные (такие как куки) вместе с запросом
    })
        .then(response => response.json())
        .then(data => {
            console.log('Filtered data:', data);
            renderPieChart(data); // Отображаем данные в виде графика
            renderTable(data); // Отображаем данные в виде таблицы
        })
        .catch(error => {
            console.error('Error loading expenses:', error);
        });
}

// Рендеринг круговой диаграммы с использованием библиотеки Plotly
function renderPieChart(data) {
    const container = document.getElementById('chartsContainer');
    container.innerHTML = '';

    const categoryNames = [];  // Названия категорий
    const categoryTotals = []; // Общая сумма расходов по каждой категории

    for (const [category, expenses] of Object.entries(data)) {
        const total = expenses.reduce((sum, expense) => sum + expense.price, 0); // Вычисление общей суммы расходов для каждой категории
        if (total === 0) continue;
        categoryNames.push(category); // Добавляем название категории в массив categoryNames
        categoryTotals.push(total); // Добавляем общую сумму расходов для категории в массив categoryTotals
    }

    // Массив данных для диаграммы
    const trace = {
        labels: categoryNames,
        values: categoryTotals,
        type: 'pie'
    };

    // Макет диаграммы
    const layout = {
        title: 'Expenses',
    };

    Plotly.newPlot(container, [trace], layout); // Рендеринг диаграммы
}


function renderTable(data) {
    const tableContainer = document.getElementById('tableContainer');
    tableContainer.innerHTML = '';  // Очищаем контейнер, чтобы удалить любые предыдущие таблицы

    for (const [category, expenses] of Object.entries(data)) {
        if (expenses.length === 0) continue;

        // Сортировка расходов по дате (метод sort использует функцию сравнения)
        expenses.sort((a, b) => new Date(a.date) - new Date(b.date));

        const table = document.createElement('table'); // Создание нового элемента таблицы, который еще не добавлен в документ
        table.classList.add('table-auto', 'w-full', 'mb-4', 'border-collapse', 'border', 'border-gray-200');

        const thead = document.createElement('thead'); // Создание нового элемента заголовка таблицы, который еще не добавлен в документ
        thead.classList.add('bg-gray-200');

        const headerRow = document.createElement('tr'); // Создаем строку заголовков
        // Для каждого текста заголовка создаем ячейку и добавляем ее в строку заголовков
        ['Title', 'Price', 'Date', 'Actions'].forEach(text => {
            const th = document.createElement('th');  //  Создаем ячейку заголовка таблицы 
            th.classList.add('border', 'border-gray-300', 'px-4', 'py-2');
            th.textContent = text;  // Устанавливаем текст заголовка
            headerRow.appendChild(th); // Добавляем ячейку в строку заголовков
        });

        thead.appendChild(headerRow);  // Добавляет строку заголовка в элемент заголовка таблицы
        table.appendChild(thead); // Добавляет элемент заголовка таблицы в таблицу

        const tbody = document.createElement('tbody'); // Создается элемент <tbody>, который будет содержать строки данных таблицы
        expenses.forEach(expense => {
            const row = document.createElement('tr');  // Создание строки таблицы
            ['title', 'price', 'date'].forEach(key => {
                const td = document.createElement('td');  // Создается элемент <td>, который будет содержать данные для каждого поля
                td.classList.add('border', 'border-gray-300', 'px-4', 'py-2');
                td.textContent = expense[key];  // Устанавливается текстовое содержимое ячейки таблицы
                row.appendChild(td);
            });

            // Создается элемент <td>, который будет использоваться для хранения кнопок действий edit и delete
            const actionsTd = document.createElement('td');
            actionsTd.classList.add('border', 'border-gray-300', 'px-4', 'py-2', 'text-center');

            // Создание кнопки редактирования Edit 
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.classList.add('bg-yellow-500', 'text-white', 'py-1', 'px-3', 'rounded', 'mr-2');
            editButton.onclick = () => editExpense(expense.id, expense.title, expense.price, expense.date, category);
            actionsTd.appendChild(editButton);  // Добавляет созданную кнопку в ячейку таблицы actionsTd

             // Создание кнопки удаления Delete
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.classList.add('bg-red-500', 'text-white', 'py-1', 'px-3', 'rounded');
            deleteButton.onclick = () => deleteExpense(expense.id);
            actionsTd.appendChild(deleteButton);

            row.appendChild(actionsTd);
            tbody.appendChild(row);  // Добавление строки в тело таблицы
        });

        table.appendChild(tbody); // Добавляет  контент таблицы в саму таблицу

        const caption = document.createElement('caption');
        caption.classList.add('text-xl', 'font-bold', 'mb-2');
        caption.textContent = category;
        table.prepend(caption); // Добавляет элемент <caption> в начало элемента <table>

        tableContainer.appendChild(table); 
    }
}

function deleteExpense(expenseId) {
    if (confirm('Are you sure you want to delete this expense?')) {
        fetch('/api/delete_expense', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({ expenseId: expenseId }),
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => {
                console.log('Delete response:', data);
                if (data.message === 'Expense deleted') {
                    loadExpenses();
                } else {
                    alert('Failed to delete expense: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error deleting expense:', error);
            });
    }
}

function editExpense(expenseId, currentTitle, currentPrice, currentDate, currentCategory) {
    console.log(`Editing expense with ID: ${expenseId}`);
    const newTitle = prompt('Enter new title:', currentTitle);
    const newPrice = prompt('Enter new price:', currentPrice);
    const newDate = prompt('Enter new date (YYYY-MM-DD):', currentDate);
    const newCategory = prompt('Enter new category:', currentCategory);

    if (newTitle && newPrice && newDate) {
        fetch('/api/edit_expense', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({ expenseId: expenseId, title: newTitle, price: parseFloat(newPrice), date: newDate, category: newCategory }),
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => {
                console.log('Edit response:', data);
                if (data.message === 'Expense updated') {
                    loadExpenses();
                } else {
                    alert('Failed to update expense: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error updating expense:', error);
            });
    }
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}
