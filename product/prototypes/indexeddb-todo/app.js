let db;

// 1. Open (or create) the database
const request = indexedDB.open('todoDB', 1);

request.onupgradeneeded = (event) => {
  db = event.target.result;
  db.createObjectStore('todos', { keyPath: 'id', autoIncrement: true });
  console.log('Database setup complete.');
};

request.onsuccess = (event) => {
  db = event.target.result;
  console.log('Database opened successfully.');
  displayTodos();
};

request.onerror = (event) => {
  console.error('Database failed to open:', event.target.errorCode);
};

// 2. Add new task
document.getElementById('addBtn').addEventListener('click', () => {
  const task = document.getElementById('todoInput').value.trim();
  if (task) {
    const tx = db.transaction('todos', 'readwrite');
    const store = tx.objectStore('todos');
    store.add({ task });
    tx.oncomplete = () => displayTodos();
    document.getElementById('todoInput').value = '';
  }
});

// 3. Display all tasks
function displayTodos() {
  const list = document.getElementById('todoList');
  list.innerHTML = '';

  const tx = db.transaction('todos', 'readonly');
  const store = tx.objectStore('todos');
  store.openCursor().onsuccess = (event) => {
    const cursor = event.target.result;
    if (cursor) {
      const li = document.createElement('li');
      li.textContent = cursor.value.task;
      list.appendChild(li);
      cursor.continue();
    }
  };
}
