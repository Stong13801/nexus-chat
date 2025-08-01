const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Подключаем preload-файл
      nodeIntegration: true,
    }
  });

  // Загружаем простой HTML-файл при запуске
  win.loadURL('http://localhost:3000');
}

// Создаём окно, когда Electron готов
app.whenReady().then(createWindow);

// Закрытие приложения при закрытии всех окон (кроме macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});