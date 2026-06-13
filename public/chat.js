/**
 * Universal Chat Logic
 * Works with both Standard UI (index.html) and Neon UI (chat.html)
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM Elements Selection (IDs must match in HTML) ---
    const chatMessages = document.getElementById("chat-messages");
    const userInput = document.getElementById("user-input");
    const sendButton = document.getElementById("send-button");
    const typingIndicator = document.getElementById("typing-indicator");

    // Chat State - ปรับ Prompt ให้การพูดคุยเป็นธรรมชาติและเป็นกันเองมากขึ้น
    let chatHistory = [
        { 
            role: "system", 
            content: "คุณคือเพื่อนสนิทชื่อ 'ฟรายเดย์' เป็นผู้หญิงนิสัยน่ารัก เป็นกันเอง ร่าเริงและเอาใจใส่ ให้ตอบคำถามหรือพูดคุยด้วยข้อความที่สั้น กระชับ เป็นธรรมชาติเหมือนเพื่อนแชทคุยกัน ไม่ใช้ภาษาทางการเด็ดขาด ไม่ต้องอธิบายยาวๆ และมักจะมีหางเสียง (เช่น ค่ะ, จ้า, นะคะ) หรือใส่อีโมจิน่ารักๆ บ้างตามความเหมาะสม" 
        }
    ];
    let isProcessing = false;

    // --- 2. Input Handling ---

    if (userInput) {
        // Handle Auto-resize (Works for textarea, ignored for input text)
        userInput.addEventListener("input", function () {
            if (this.tagName.toLowerCase() === 'textarea') {
                this.style.height = "auto";
                this.style.height = (this.scrollHeight < 44 ? 44 : Math.min(this.scrollHeight, 120)) + "px";
            }
            // Toggle typing class for Neon animations
            const inputWrapper = document.getElementById('inputWrapper');
            if (inputWrapper) {
                if (this.value.trim().length > 0) inputWrapper.classList.add('typing');
                else inputWrapper.classList.remove('typing');
            }
        });

        // Handle Enter Key
        userInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    if (sendButton) {
        sendButton.addEventListener("click", (e) => {
            e.preventDefault();
            sendMessage();
        });
    }

    // --- 3. Core Messaging Function ---

    async function sendMessage() {
        if (!userInput) return;
        const message = userInput.value.trim();

        if (message === "" || isProcessing) return;

        isProcessing = true;
        
        // UI Updates: Clear input but keep focus
        userInput.value = "";
        if (userInput.tagName.toLowerCase() === 'textarea') userInput.style.height = "auto";
        userInput.focus();
        
        // Remove 'typing' state from wrapper if exists
        const inputWrapper = document.getElementById('inputWrapper');
        if (inputWrapper) inputWrapper.classList.remove('typing');

        // Add User Message to Chat
        addMessageToChat("user", message);
        chatHistory.push({ role: "user", content: message });

        // --- ส่วนที่เพิ่มเข้ามา: จัดการ History ให้จำแค่ 3-4 แชทล่าสุด (ประมาณ 8 ข้อความ) ---
        const MAX_HISTORY_LENGTH = 8; 
        if (chatHistory.length > MAX_HISTORY_LENGTH + 1) { // +1 สำหรับเก็บ system prompt เริ่มต้นเอาไว้
            // เก็บ system prompt (index 0) ไว้เสมอ และตัดเอาแค่แชทล่าสุดมาต่อ
            chatHistory = [chatHistory[0], ...chatHistory.slice(-MAX_HISTORY_LENGTH)];
        }

        // Show Typing Indicator
        if (typingIndicator) {
            typingIndicator.style.display = 'flex'; // Force display flex
            typingIndicator.classList.add("visible");
        }
        scrollToBottom();

        try {
            // Prepare Bot Message Container (Stream Target)
            const botMessageEl = createMessageElement("assistant", "");
            chatMessages.appendChild(botMessageEl);
            const botContentEl = botMessageEl.querySelector(".message-bubble");
            scrollToBottom();

            // API Call
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: chatHistory }),
            });

            if (!response.ok) throw new Error("API Connection Failed");
            if (!response.body) throw new Error("Response body is null");

            // Streaming Logic
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let responseText = "";
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    processBuffer(buffer + "\n\n");
                    break;
                }
                buffer += decoder.decode(value, { stream: true });
                const parsed = consumeSseEvents(buffer);
                buffer = parsed.buffer;
                
                for (const data of parsed.events) {
                    processEventData(data);
                }
            }

            // Helper: Process individual data chunks
            function processEventData(data) {
                if (data === "[DONE]") return;
                try {
                    const jsonData = JSON.parse(data);
                    let content = "";
                    
                    // Support different API response formats
                    if (jsonData.response) content = jsonData.response;
                    else if (jsonData.choices?.[0]?.delta?.content) content = jsonData.choices[0].delta.content;
                    
                    if (content) {
                        responseText += content;
                        // Update UI with formatted text
                        botContentEl.innerHTML = formatText(responseText);
                        scrollToBottom();
                    }
                } catch (e) {
                    // Ignore parse errors for partial chunks
                }
            }

            // Helper: Process remaining buffer
            function processBuffer(buf) {
                const parsed = consumeSseEvents(buf);
                parsed.events.forEach(processEventData);
            }

            // Save to history
            if (responseText) {
                chatHistory.push({ role: "assistant", content: responseText });
            }

        } catch (error) {
            console.error("Chat Error:", error);
            // Remove empty loading message if failed immediately
            const lastMsg = chatMessages.lastElementChild;
            if (lastMsg && !lastMsg.textContent.trim()) lastMsg.remove();
            
            addMessageToChat("assistant", "⚠️ ขออภัย ระบบเกิดข้อผิดพลาดในการเชื่อมต่อ");
        } finally {
            isProcessing = false;
            if (typingIndicator) {
                typingIndicator.style.display = 'none';
                typingIndicator.classList.remove("visible");
            }
            if (sendButton) sendButton.disabled = false;
            userInput.focus();
        }
    }

    // --- 4. Helper Functions ---

    function createMessageElement(role, content) {
        const div = document.createElement("div");
        const isUser = role === "user";
        
        // Add multiple classes to support both themes (bot-message vs assistant-message)
        div.className = `message ${isUser ? 'user-message' : 'bot-message assistant-message'}`;
        
        // HTML Structure
        const avatarHTML = isUser ? '' : `<div class="avatar"><i class="fas fa-robot"></i></div>`;
        
        div.innerHTML = `
            ${avatarHTML}
            <div class="message-bubble">${formatText(content)}</div>
        `;
        return div;
    }

    function addMessageToChat(role, content) {
        const el = createMessageElement(role, content);
        chatMessages.appendChild(el);
        scrollToBottom();
    }

    function formatText(text) {
        // Convert newlines to <br> and sanitize basic tags if needed
        if (!text) return "";
        return text.replace(/\n/g, '<br>');
    }

    function scrollToBottom() {
        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // SSE Parser
    function consumeSseEvents(buffer) {
        let normalized = buffer.replace(/\r/g, "");
        const events = [];
        let eventEndIndex;
        while ((eventEndIndex = normalized.indexOf("\n\n")) !== -1) {
            const rawEvent = normalized.slice(0, eventEndIndex);
            normalized = normalized.slice(eventEndIndex + 2);
            const lines = rawEvent.split("\n");
            const dataLines = [];
            for (const line of lines) {
                if (line.startsWith("data:")) dataLines.push(line.slice("data:".length).trimStart());
            }
            if (dataLines.length > 0) events.push(dataLines.join("\n"));
        }
        return { events, buffer: normalized };
    }
});
