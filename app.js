// ============ CONFIGURATION ============
// ⚠️ REPLACE THIS WITH YOUR APPS SCRIPT WEB APP URL
const API_URL = "https://script.google.com/macros/s/AKfycbxLHmDj_QHp3NiTesLb8AuQ4Ulm_3PLkppTJQRiCTYOs00cWol44bXBsVdHNyH3L8c/exec";

// ============ STATE ============
let currentUser = null;

// ============ INITIALIZATION ============
document.addEventListener("DOMContentLoaded", function() {
  // Check if user is logged in
  const savedUser = localStorage.getItem("teamcollab_user");

  if (savedUser) {
    currentUser = JSON.parse(savedUser);

    // If on login page, redirect to dashboard
    if (window.location.pathname.includes("index.html") || window.location.pathname === "/") {
      window.location.href = "dashboard.html";
    } else {
      initDashboard();
    }
  } else {
    // If on dashboard without login, redirect to login
    if (window.location.pathname.includes("dashboard.html")) {
      window.location.href = "index.html";
    } else {
      initLogin();
    }
  }
});

// ============ LOGIN FUNCTIONS ============
function initLogin() {
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }
}

async function handleLogin(e) {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const errorMsg = document.getElementById("errorMsg");
  const loginBtn = document.getElementById("loginBtn");

  loginBtn.textContent = "Logging in...";
  loginBtn.disabled = true;
  errorMsg.textContent = "";

  try {
    const response = await fetch(`${API_URL}?action=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);
    const data = await response.json();

    if (data.success) {
      localStorage.setItem("teamcollab_user", JSON.stringify(data.user));
      window.location.href = "dashboard.html";
    } else {
      errorMsg.textContent = data.error || "Login failed";
      loginBtn.textContent = "Login";
      loginBtn.disabled = false;
    }
  } catch (error) {
    errorMsg.textContent = "Connection error. Please try again.";
    loginBtn.textContent = "Login";
    loginBtn.disabled = false;
  }
}

// ============ DASHBOARD FUNCTIONS ============
function initDashboard() {
  // Set user name
  document.getElementById("userName").textContent = `Welcome, ${currentUser.fullName}`;

  // Setup logout
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);

  // Setup tabs
  setupTabs();

  // Setup message functions
  document.getElementById("sendMessage").addEventListener("click", sendMessage);
  document.getElementById("refreshMessages").addEventListener("click", loadMessages);

  // Setup code functions
  document.getElementById("addCode").addEventListener("click", addCodeSnippet);
  document.getElementById("refreshCode").addEventListener("click", loadCodeSnippets);

  // Setup file functions
  document.getElementById("uploadFile").addEventListener("click", uploadFile);
  document.getElementById("refreshFiles").addEventListener("click", loadFiles);

  // Load initial data
  loadMessages();
}

function handleLogout() {
  localStorage.removeItem("teamcollab_user");
  window.location.href = "index.html";
}

function setupTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;

      // Update buttons
      tabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Update content
      tabContents.forEach(c => c.classList.remove("active"));
      document.getElementById(tabId).classList.add("active");

      // Load data for tab
      if (tabId === "messages") loadMessages();
      if (tabId === "code") loadCodeSnippets();
      if (tabId === "files") loadFiles();
    });
  });
}

// ============ MESSAGE FUNCTIONS ============
async function loadMessages() {
  showLoading();

  try {
    const response = await fetch(`${API_URL}?action=getMessages`);
    const data = await response.json();

    if (data.success) {
      displayMessages(data.messages);
    }
  } catch (error) {
    console.error("Error loading messages:", error);
  }

  hideLoading();
}

function displayMessages(messages) {
  const container = document.getElementById("messagesList");

  if (messages.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #888;">No messages yet. Start the conversation!</p>';
    return;
  }

  container.innerHTML = messages.map((msg, index) => `
    <div class="message-item" style="animation: fadeInUp 0.5s ease forwards; animation-delay: ${index * 0.1}s;">
      <div class="message-header">
        <span class="message-sender">${msg.senderName}</span>
        <span class="message-time">${formatDate(msg.timestamp)}</span>
      </div>
      <div class="message-text">${escapeHtml(msg.message)}</div>
    </div>
  `).join("");

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  const messageText = document.getElementById("messageText").value.trim();

  if (!messageText) {
    alert("Please enter a message");
    return;
  }

  showLoading();

  try {
    const params = new URLSearchParams({
      action: "sendMessage",
      userId: currentUser.userId,
      senderName: currentUser.fullName,
      message: messageText
    });

    const response = await fetch(`${API_URL}?${params}`);
    const data = await response.json();

    if (data.success) {
      document.getElementById("messageText").value = "";
      loadMessages();
    }
  } catch (error) {
    console.error("Error sending message:", error);
  }

  hideLoading();
}

// ============ CODE SNIPPET FUNCTIONS ============
async function loadCodeSnippets() {
  showLoading();

  try {
    const response = await fetch(`${API_URL}?action=getCodeSnippets`);
    const data = await response.json();

    if (data.success) {
      displayCodeSnippets(data.snippets);
    }
  } catch (error) {
    console.error("Error loading code snippets:", error);
  }

  hideLoading();
}

function displayCodeSnippets(snippets) {
  const container = document.getElementById("codeList");

  if (snippets.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #888;">No code snippets shared yet.</p>';
    return;
  }

  container.innerHTML = snippets.map((snippet, index) => `
    <div class="code-item" style="animation: fadeInUp 0.5s ease forwards; animation-delay: ${index * 0.1}s;">
      <div class="code-header">
        <span class="code-title">${escapeHtml(snippet.title)}</span>
        <div class="code-meta">
          <span class="code-language">${snippet.language}</span>
        </div>
      </div>
      <div class="code-body">
        <pre><code class="language-${snippet.language}">${escapeHtml(snippet.code)}</code></pre>
      </div>
      <div class="code-footer">
        <span>By ${snippet.userName} • ${formatDate(snippet.timestamp)}</span>
        <div>
          <button class="btn-copy" onclick="copyCode('${escapeHtml(snippet.code).replace(/'/g, "\\'")}')">📋 Copy</button>
          <button class="btn-delete" onclick="deleteCodeSnippet('${snippet.snippetId}')">🗑️ Delete</button>
        </div>
      </div>
    </div>
  `).join("");

  // Apply syntax highlighting
  document.querySelectorAll("pre code").forEach(block => {
    hljs.highlightElement(block);
  });
}

async function addCodeSnippet() {
  const title = document.getElementById("codeTitle").value.trim();
  const language = document.getElementById("codeLanguage").value;
  const code = document.getElementById("codeContent").value;

  if (!title || !code) {
    alert("Please enter title and code");
    return;
  }

  showLoading();

  try {
    const params = new URLSearchParams({
      action: "addCodeSnippet",
      userId: currentUser.userId,
      userName: currentUser.fullName,
      title: title,
      code: code,
      language: language
    });

    const response = await fetch(`${API_URL}?${params}`);
    const data = await response.json();

    if (data.success) {
      document.getElementById("codeTitle").value = "";
      document.getElementById("codeContent").value = "";
      loadCodeSnippets();
    }
  } catch (error) {
    console.error("Error adding code snippet:", error);
  }

  hideLoading();
}

async function deleteCodeSnippet(snippetId) {
  if (!confirm("Are you sure you want to delete this snippet?")) return;

  showLoading();

  try {
    const response = await fetch(`${API_URL}?action=deleteCodeSnippet&snippetId=${snippetId}`);
    const data = await response.json();

    if (data.success) {
      loadCodeSnippets();
    }
  } catch (error) {
    console.error("Error deleting snippet:", error);
  }

  hideLoading();
}

function copyCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    alert("Code copied to clipboard!");
  });
}

// ============ FILE FUNCTIONS ============
async function loadFiles() {
  showLoading();

  try {
    const response = await fetch(`${API_URL}?action=getFiles`);
    const data = await response.json();

    if (data.success) {
      displayFiles(data.files);
    }
  } catch (error) {
    console.error("Error loading files:", error);
  }

  hideLoading();
}

function displayFiles(files) {
  const container = document.getElementById("filesList");

  if (files.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #888;">No files uploaded yet.</p>';
    return;
  }

  container.innerHTML = files.map((file, index) => `
    <div class="file-item" style="animation: fadeInUp 0.5s ease forwards; animation-delay: ${index * 0.1}s;">
      <div class="file-icon">${getFileIcon(file.fileType)}</div>
      <div class="file-name">${escapeHtml(file.fileName)}</div>
      <div class="file-info">
        Uploaded by ${file.uploaderName}<br>
        ${formatDate(file.timestamp)}
      </div>
      <div class="file-actions">
        <a href="${file.downloadUrl}" target="_blank" class="btn-download">⬇️ Download</a>
        <button class="btn-delete" onclick="deleteFile('${file.fileId}', '${file.driveFileId}')">🗑️</button>
      </div>
    </div>
  `).join("");
}

async function uploadFile() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select a file");
    return;
  }

  // Check file size (max 10MB for Apps Script)
  if (file.size > 10 * 1024 * 1024) {
    alert("File size must be less than 10MB");
    return;
  }

  showLoading();

  try {
    const base64 = await fileToBase64(file);

    const params = new URLSearchParams({
      action: "uploadFile",
      fileName: file.name,
      fileData: base64,
      fileType: file.type,
      userId: currentUser.userId,
      userName: currentUser.fullName
    });

    const response = await fetch(`${API_URL}?${params}`);
    const data = await response.json();

    if (data.success) {
      fileInput.value = "";
      loadFiles();
      alert("File uploaded successfully!");
    } else {
      alert("Upload failed: " + data.error);
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    alert("Upload failed. Please try again.");
  }

  hideLoading();
}

async function deleteFile(fileId, driveFileId) {
  if (!confirm("Are you sure you want to delete this file?")) return;

  showLoading();

  try {
    const response = await fetch(`${API_URL}?action=deleteFile&fileId=${fileId}&driveFileId=${driveFileId}`);
    const data = await response.json();

    if (data.success) {
      loadFiles();
    }
  } catch (error) {
    console.error("Error deleting file:", error);
  }

  hideLoading();
}

// ============ UTILITY FUNCTIONS ============
function showLoading() {
  document.getElementById("loading").classList.add("active");
}

function hideLoading() {
  document.getElementById("loading").classList.remove("active");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString();
}

function getFileIcon(fileType) {
  if (fileType.includes("image")) return "🖼️";
  if (fileType.includes("pdf")) return "📄";
  if (fileType.includes("word") || fileType.includes("document")) return "📝";
  if (fileType.includes("excel") || fileType.includes("spreadsheet")) return "📊";
  if (fileType.includes("zip") || fileType.includes("rar")) return "📦";
  if (fileType.includes("video")) return "🎬";
  if (fileType.includes("audio")) return "🎵";
  return "📁";
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}
