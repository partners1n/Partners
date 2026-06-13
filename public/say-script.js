/**
 * Core Engine V6 - White Theme, Fullscreen, Auto-Clear Chat & Persistent Wake Listening
 */

// ==========================================
// 1. ระบบ PWA & ดักจับเหตุการณ์ติดตั้ง
// ==========================================
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.error(err));
    });
}

const installPopup = document.getElementById('install-popup');
const btnConfirmInstall = document.getElementById('confirm-install-btn');
const btnCancelInstall = document.getElementById('cancel-install-btn');

function showInstallModal() { installPopup.classList.remove('hidden'); }
function hideInstallModal() { installPopup.classList.add('hidden'); }

if(btnCancelInstall) btnCancelInstall.addEventListener('click', hideInstallModal);
if(btnConfirmInstall) {
    btnConfirmInstall.addEventListener('click', async () => {
        hideInstallModal();
        if (deferredInstallPrompt) {
            deferredInstallPrompt.prompt();
            await deferredInstallPrompt.userChoice;
            deferredInstallPrompt = null;
        } else {
            alert('ไม่สามารถติดตั้งได้ในขณะนี้ครับ');
        }
    });
}

// ==========================================
// 2. ระบบฟิสิกส์สำหรับเรนเดอร์กราฟิก
// ==========================================
class PhysicsWaveEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.time = 0;
        this.intensity = 0.5;
        this.targetIntensity = 0.5;
        
        this.waves = [
            { amplitude: 40, frequency: 0.01, speed: 0.02, phase: 0 },
            { amplitude: 25, frequency: 0.02, speed: 0.03, phase: Math.PI / 4 },
            { amplitude: 15, frequency: 0.03, speed: 0.04, phase: Math.PI / 2 }
        ];

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.animate();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    setListeningState(state) {
        if (state === 'active') this.targetIntensity = 2.5;
        else if (state === 'processing') this.targetIntensity = 4.0;
        else this.targetIntensity = 0.5;
    }

    animate() {
        this.intensity += (this.targetIntensity - this.intensity) * 0.05;
        
        // ปรับพื้นหลังแคนวาสเป็นสีขาว ให้เข้ากับ Light Mode
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.lineWidth = 2;
        this.ctx.lineJoin = 'round';

        const centerY = this.height / 2;

        for (let j = 0; j < 3; j++) {
            this.ctx.beginPath();
            // ปรับสีคลื่นให้อ่อนลงเล็กน้อยสำหรับพื้นขาว
            this.ctx.strokeStyle = j === 0 ? 'rgba(0, 184, 148, 0.5)' : 
                                   j === 1 ? 'rgba(108, 92, 231, 0.4)' : 
                                             'rgba(0, 206, 201, 0.5)';

            for (let i = 0; i <= this.width; i += 5) {
                let y = centerY;
                for (let w = 0; w < this.waves.length; w++) {
                    const wave = this.waves[w];
                    y += Math.sin((i * wave.frequency) + this.time * wave.speed + wave.phase + (j * 0.5)) 
                         * wave.amplitude * this.intensity;
                }
                if (i === 0) this.ctx.moveTo(i, y);
                else this.ctx.lineTo(i, y);
            }
            this.ctx.stroke();
        }

        this.time += 1;
        requestAnimationFrame(() => this.animate());
    }
}

// ==========================================
// 3. คลาสเชื่อมต่อ Gemini API (บุคลิก: ฟรายเดย์)
// ==========================================
class GeminiService {
    constructor() {
        this.apiKey = "AIzaSyCgx1Ww0gSua3gnswuTP7JJnUgdAUK7k2M";
        this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`;
        this.chatHistory = []; 
        this.systemInstruction = {
            parts: [{ text: "คุณคือเพื่อนผู้หญิงชื่อ 'ฟรายเดย์' นิสัยเป็นกันเอง คุยเล่นเรื่อยเปื่อย ให้ตอบกลับแบบสั้นๆ กระชับ เป็นธรรมชาติเหมือนเพื่อนสนิทคุยกัน ไม่ต้องทางการ และห้ามตอบยาวเด็ดขาด" }]
        };
    }
    resetHistory() { this.chatHistory = []; }
    async sendMessage(text) {
        this.chatHistory.push({ role: "user", parts: [{ text: text }] });
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-goog-api-key': this.apiKey },
                body: JSON.stringify({
                    system_instruction: this.systemInstruction,
                    contents: this.chatHistory,
                    generationConfig: { temperature: 0.9, maxOutputTokens: 150 }
                })
            });
            if (!response.ok) throw new Error('API request failed');
            const data = await response.json();
            const botReply = data.candidates[0].content.parts[0].text;
            this.chatHistory.push({ role: "model", parts: [{ text: botReply }] });
            return botReply.trim();
        } catch (error) {
            return `เอ่อ... ฟรายเดย์มีปัญหาตอนเชื่อมต่ออ่ะ มันบอกว่า ${error.message}`;
        }
    }
}

// ==========================================
// 4. ระบบจัดการเสียง และระบบเคลียร์แชทอัตโนมัติ
// ==========================================
class VoiceAssistant {
    constructor(physicsEngine) {
        this.physicsEngine = physicsEngine;
        this.gemini = new GeminiService();
        
        this.btn = document.getElementById('voice-btn');
        this.chatContainer = document.getElementById('chat-container');
        this.statusText = document.getElementById('system-status');
        
        this.isSystemEnabled = false; 
        this.isSpeaking = false;      
        this.state = 'WAITING_WAKE_WORD'; 
        
        this.timer20 = null;
        this.timer40 = null;
        this.timer60 = null;        

        this.initSpeechRecognition();
        this.setupEventListeners();
    }

    initSpeechRecognition() {
        window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!window.SpeechRecognition) return;

        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'th-TH';
        this.recognition.interimResults = false;
        this.recognition.continuous = false; 

        this.recognition.onstart = () => {
            // สำคัญ: ให้ปุ่มมีไฟเขียวตลอดเวลาตราบใดที่ระบบยังถูกเปิดใช้งาน (แม้จะอยู่ในสถานะสแตนด์บายรอคำปลุก)
            if (this.isSystemEnabled) {
                this.btn.classList.add('listening');
            }
        };

        this.recognition.onresult = async (event) => {
            if (this.isSpeaking) return; 

            const transcript = event.results[0][0].transcript.trim();
            console.log("🗣️ ได้ยิน:", transcript);

            if (this.state === 'WAITING_WAKE_WORD') {
                const wakeWords = ['ไง', 'งาย', 'ฟรายเดย์', 'ฟายเด', 'ฟาร์ยเดย์'];
                if (wakeWords.some(word => transcript.includes(word))) {
                    this.activateConversation();
                }
            } else if (this.state === 'ACTIVE_CONVERSATION') {
                this.clearIdleTimers(); 
                this.addMessage(transcript, 'user');

                if (transcript.includes('ติดตั้ง')) {
                    const reply = "ได้เลยค่ะ เดี๋ยวฟรายเดย์เปิดหน้าต่างติดตั้งให้นะ";
                    this.addMessage(reply, 'system');
                    this.speakText(reply);
                    showInstallModal(); 
                    this.startIdleTimers();
                    return; 
                }

                await this.processGemini(transcript);
            }
        };

        this.recognition.onerror = (e) => { if (e.error !== 'no-speech') console.warn(e.error); };
        this.recognition.onend = () => {
            if (this.isSystemEnabled && !this.isSpeaking) {
                setTimeout(() => { try { this.recognition.start(); } catch(e) {} }, 300);
            }
        };
    }

    activateConversation() {
        this.state = 'ACTIVE_CONVERSATION';
        this.gemini.resetHistory();
        this.statusText.textContent = "เชื่อมต่อกับฟรายเดย์แล้ว • พูดต่อได้เลย";
        this.physicsEngine.setListeningState('active');
        
        const welcomeText = "ว่าไง มีอะไรให้ช่วย";
        this.addMessage(welcomeText, 'system');
        this.speakText(welcomeText);
        
        this.startIdleTimers();
    }

    async processGemini(text) {
        this.physicsEngine.setListeningState('processing');
        this.statusText.textContent = "ฟรายเดย์กำลังคิด...";
        
        const reply = await this.gemini.sendMessage(text);
        
        this.addMessage(reply, 'system');
        this.speakText(reply);
        
        this.physicsEngine.setListeningState('active');
        this.statusText.textContent = "กำลังฟัง...";
        this.startIdleTimers(); 
    }

    startIdleTimers() {
        this.clearIdleTimers();
        
        this.timer20 = setTimeout(() => {
            if (this.state === 'ACTIVE_CONVERSATION') {
                const msg = "มีอะไรก็พูดๆมา";
                this.addMessage(msg, 'system');
                this.speakText(msg);
            }
        }, 20000);

        this.timer40 = setTimeout(() => {
            if (this.state === 'ACTIVE_CONVERSATION') {
                const msg = "งั้นจะไปนอนละนะ";
                this.addMessage(msg, 'system');
                this.speakText(msg);
            }
        }, 40000);

        // การทำงานหลักที่ 60 วินาที: กล่าวลา -> กลับโหมดรอ -> ล้างแชท (แต่คงไฟเขียวไว้)
        this.timer60 = setTimeout(() => {
            if (this.state === 'ACTIVE_CONVERSATION') {
                const msg = "ถ้ามีอะไรให้ช่วยทักมาใหม่นะแล้ว..ไปละบัย !";
                this.addMessage(msg, 'system');
                this.speakText(msg);
                
                // คืนค่ากลับสู่โหมดสแตนด์บาย (รอคำปลุก)
                this.state = 'WAITING_WAKE_WORD';
                this.statusText.textContent = "เปิดไมค์ทิ้งไว้ • พูด 'ฟรายเดย์' เพื่อเรียก";
                this.physicsEngine.setListeningState('idle');
                // หมายเหตุ: เราไม่เอา this.btn.classList.remove('listening') ออก เพื่อให้ไฟเขียวยังติดอยู่

                // รอ 4 วินาทีให้บอทพูดจบ แล้วลบแชทรีเซ็ตระบบ
                setTimeout(() => {
                    this.chatContainer.innerHTML = ''; // ลบแชทหน้าจอ
                    this.gemini.resetHistory(); // ลบความจำ AI
                    this.addMessage('รีเซ็ตระบบเรียบร้อย... พร้อมรับคำสั่งใหม่', 'system');
                }, 4000);
            }
        }, 60000); 
    }

    clearIdleTimers() {
        if (this.timer20) clearTimeout(this.timer20);
        if (this.timer40) clearTimeout(this.timer40);
        if (this.timer60) clearTimeout(this.timer60);
    }

    speakText(text) {
        if (!window.speechSynthesis) return;
        this.isSpeaking = true;
        this.recognition.stop(); 

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'th-TH';
        utterance.rate = 1.15; utterance.pitch = 1.2; 

        const voices = window.speechSynthesis.getVoices();
        const thaiVoice = voices.find(v => v.lang === 'th-TH' && (v.name.includes('หญิง') || v.name.includes('Female')));
        if (thaiVoice) utterance.voice = thaiVoice;

        utterance.onend = () => {
            this.isSpeaking = false;
            if (this.isSystemEnabled) { try { this.recognition.start(); } catch(e) {} }
        };
        window.speechSynthesis.speak(utterance);
    }

    // ฟังก์ชันขอใช้งานเต็มหน้าจอ (Fullscreen API)
    requestFullScreen() {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) docEl.requestFullscreen().catch(e => console.warn(e));
        else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen().catch(e => console.warn(e)); // สำหรับ Safari
    }

    setupEventListeners() {
        this.btn.addEventListener('click', () => {
            if (!this.isSystemEnabled) {
                // ขยายเต็มหน้าจอเมื่อผู้ใช้กดเปิดไมค์ครั้งแรก
                this.requestFullScreen();

                this.isSystemEnabled = true;
                this.statusText.textContent = "เปิดไมค์ทิ้งไว้ • พูด 'ฟรายเดย์' เพื่อเรียก";
                this.btn.classList.add('listening'); // เปิดไฟเขียวทันที
                
                try { this.recognition.start(); } catch(e) {}
                if (window.speechSynthesis) window.speechSynthesis.getVoices();
            } else {
                // ปิดระบบ
                this.isSystemEnabled = false;
                this.state = 'WAITING_WAKE_WORD';
                this.clearIdleTimers();
                this.recognition.stop();
                this.btn.classList.remove('listening'); // ปิดไฟเขียว
                this.statusText.textContent = "ระบบปิดอยู่ • กดปุ่มเพื่อเปิดไมค์";
                this.physicsEngine.setListeningState('idle');
                
                // ออกจากโหมดเต็มหน้าจอ
                if (document.fullscreenElement || document.webkitFullscreenElement) {
                    if (document.exitFullscreen) document.exitFullscreen();
                    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                }
            }
        });
    }

    addMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}-message`;
        msgDiv.textContent = text;
        this.chatContainer.appendChild(msgDiv);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const physics = new PhysicsWaveEngine('physics-canvas');
    const ai = new VoiceAssistant(physics);
});