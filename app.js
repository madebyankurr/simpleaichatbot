// ==========================================================================
// DOM Elements
// ==========================================================================
const form = document.getElementById("chat-form");
const input = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const chatContainer = document.querySelector(".chat-wrapper");
const chatMessages = document.getElementById("chat");
const welcomeView = document.getElementById("welcome-view");
const clearBtn = document.getElementById("clear-btn");
const statusIndicator = document.getElementById("status-indicator");
const charCounter = document.getElementById("char-counter");
const scrollBottomBtn = document.getElementById("scroll-bottom-btn");
const toast = document.getElementById("toast");
const suggestionCards = document.querySelectorAll(".suggestion-card");

const MAX_CHARS = 4000;

// ==========================================================================
// Initial Setup & Health Check
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    checkBackendHealth();
    setupInputHandling();
    setupEventListeners();
    updateUIState();
});

// Check API status
async function checkBackendHealth() {
    const statusText = statusIndicator.querySelector(".status-text");
    try {
        const response = await fetch("/api");
        if (response.ok) {
            statusIndicator.classList.remove("offline");
            statusIndicator.classList.add("online");
            statusText.textContent = "Online";
        } else {
            setOfflineState();
        }
    } catch {
        setOfflineState();
    }
}

function setOfflineState() {
    statusIndicator.classList.remove("online");
    statusIndicator.classList.add("offline");
    statusIndicator.querySelector(".status-text").textContent = "Offline";
}

// ==========================================================================
// Input Handling & Textarea Auto-Resize
// ==========================================================================
function setupInputHandling() {
    input.addEventListener("input", () => {
        // Dynamic textarea height
        input.style.height = "auto";
        input.style.height = `${Math.min(input.scrollHeight, 160)}px`;

        const count = input.value.length;
        charCounter.textContent = `${count} / ${MAX_CHARS}`;
        
        // Enable or disable send button
        sendBtn.disabled = !input.value.trim();

        if (count >= MAX_CHARS) {
            charCounter.style.color = "var(--danger)";
        } else {
            charCounter.style.color = "var(--text-muted)";
        }
    });

    // Enter to submit (Shift+Enter for newline)
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (input.value.trim()) {
                form.requestSubmit();
            }
        }
    });
}

// ==========================================================================
// Event Listeners
// ==========================================================================
function setupEventListeners() {
    // Form Submit
    form.addEventListener("submit", handleSubmit);

    // Clear Chat Button
    clearBtn.addEventListener("click", () => {
        chatMessages.innerHTML = "";
        updateUIState();
        showToast("Chat history cleared");
    });

    // Scroll to Bottom Button
    chatContainer.addEventListener("scroll", () => {
        const isScrolledUp = chatContainer.scrollTop + chatContainer.clientHeight < chatContainer.scrollHeight - 100;
        if (isScrolledUp) {
            scrollBottomBtn.classList.remove("hidden");
        } else {
            scrollBottomBtn.classList.add("hidden");
        }
    });

    scrollBottomBtn.addEventListener("click", scrollToBottom);

    // Prompt Suggestion Cards
    suggestionCards.forEach(card => {
        card.addEventListener("click", () => {
            const prompt = card.getAttribute("data-prompt");
            if (prompt) {
                input.value = prompt;
                input.dispatchEvent(new Event("input"));
                form.requestSubmit();
            }
        });
    });
}

// Toggle between Welcome Screen and Chat Messages
function updateUIState() {
    const messageCount = chatMessages.children.length;
    if (messageCount === 0) {
        welcomeView.style.display = "block";
        chatMessages.style.display = "none";
    } else {
        welcomeView.style.display = "none";
        chatMessages.style.display = "flex";
    }
}

// Auto scroll to bottom
function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Show temporary toast message
function showToast(text) {
    toast.textContent = text;
    toast.classList.remove("hidden");
    setTimeout(() => {
        toast.classList.add("hidden");
    }, 2200);
}

// Get formatted current time
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ==========================================================================
// Message Rendering
// ==========================================================================
function appendUserMessage(text) {
    updateUIState();

    const row = document.createElement("div");
    row.className = "message-row user";

    row.innerHTML = `
        <div class="avatar user">You</div>
        <div class="message-content">
            <div class="bubble">${escapeHtml(text)}</div>
            <div class="message-meta">${getCurrentTime()}</div>
        </div>
    `;

    chatMessages.appendChild(row);
    scrollToBottom();
}

function appendAIMessage(text) {
    updateUIState();

    const row = document.createElement("div");
    row.className = "message-row ai";

    const formattedContent = parseMarkdown(text);

    row.innerHTML = `
        <div class="avatar ai">AI</div>
        <div class="message-content">
            <div class="bubble">${formattedContent}</div>
            <div class="message-meta">
                <span>${getCurrentTime()}</span>
                <button class="copy-btn" title="Copy response">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copy
                </button>
            </div>
        </div>
    `;

    // Copy event handler
    const copyBtn = row.querySelector(".copy-btn");
    copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(text).then(() => {
            showToast("Response copied to clipboard");
        });
    });

    // Code block copy buttons
    row.querySelectorAll(".code-copy-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const codeText = btn.parentElement.nextElementSibling?.textContent || "";
            navigator.clipboard.writeText(codeText).then(() => {
                showToast("Code copied to clipboard");
            });
        });
    });

    chatMessages.appendChild(row);
    scrollToBottom();
}

// Typing Indicator Bubble
function showTypingIndicator() {
    updateUIState();

    const row = document.createElement("div");
    row.className = "message-row ai";
    row.id = "typing-indicator-row";

    row.innerHTML = `
        <div class="avatar ai">AI</div>
        <div class="message-content">
            <div class="bubble typing-bubble">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;

    chatMessages.appendChild(row);
    scrollToBottom();
    return row;
}

// ==========================================================================
// Form Submission & API Request
// ==========================================================================
async function handleSubmit(event) {
    event.preventDefault();

    const userMessage = input.value.trim();
    if (!userMessage) return;

    // 1. Add User Message
    appendUserMessage(userMessage);

    // Reset input
    input.value = "";
    input.style.height = "auto";
    charCounter.textContent = `0 / ${MAX_CHARS}`;
    sendBtn.disabled = true;

    // 2. Show Typing Indicator
    const typingRow = showTypingIndicator();

    try {
        // 3. Request Backend API
        const response = await fetch("/api", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: userMessage
            })
        });

        const data = await response.json();

        // Remove Typing Indicator
        typingRow.remove();

        if (!response.ok) {
            appendAIMessage(data.error || "Something went wrong. Please try again.");
            return;
        }

        // 4. Add AI Response
        appendAIMessage(data.response || "No response received.");

    } catch (error) {
        console.error("API Error:", error);
        typingRow.remove();
        appendAIMessage("Could not connect to the server. Please verify your connection.");
    }
}

// ==========================================================================
// Helpers: Text Escaping & Markdown Parser
// ==========================================================================
function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function parseMarkdown(text) {
    if (!text) return "";

    let html = escapeHtml(text);

    // Code blocks ```lang ... ```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang || "code";
        return `
            <pre><div class="code-header"><span>${language}</span><button class="code-copy-btn">Copy</button></div><code>${code.trim()}</code></pre>
        `;
    });

    // Inline code `code`
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Bold **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    // Italic *text*
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    // Paragraph breaks
    const paragraphs = html.split(/\n\n+/);
    return paragraphs.map(p => {
        if (p.startsWith("<pre>")) return p;
        return `<p>${p.replace(/\n/g, "<br>")}</p>`;
    }).join("");
}
