const GROQ_API_KEY = "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";

// Initialize Supabase Client
const SUPABASE_URL = 'https://bosbrcprqkldkyzuenyd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvc2JyY3BycWtsZGt5enVlbnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4Mzk4MzAsImV4cCI6MjEwNjQxNTgzMH0.yCCJNSI78_IQzPb64eqr5dxT8gl2ahdhhROxpXs9bfc';

let supabaseClient = null;
try {
    if (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) {
    console.error('Supabase initialization error:', e);
}

// Global UI State variables
let selectedStance = 'Pro';
let currentChatHistory = [];

// ==========================================
// 2. AUTHENTICATION
// ==========================================
async function handleLogin() {
    const emailEl = document.getElementById('login-email');
    const passwordEl = document.getElementById('login-password');
    if (!emailEl || !passwordEl) return;
    
    const email = emailEl.value.trim();
    const password = passwordEl.value.trim();

    if (!email || !password) {
        alert('Please enter your email and password.');
        return;
    }

    if (!supabaseClient) {
        alert('Supabase not initialized.');
        return;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        alert(error.message);
    } else {
        window.location.href = 'dashboard.html';
    }
}

async function handleSignup() {
    const emailEl = document.getElementById('signup-email');
    const passwordEl = document.getElementById('signup-password');
    if (!emailEl || !passwordEl) return;
    
    const email = emailEl.value.trim();
    const password = passwordEl.value.trim();

    if (!email || !password) {
        alert('Please fill out all fields.');
        return;
    }

    if (!supabaseClient) {
        alert('Supabase not initialized.');
        return;
    }

    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) {
        alert(error.message);
    } else {
        alert('Account created successfully! You can now log in.');
        window.location.href = 'index.html';
    }
}

async function logout() {
    if (supabaseClient) await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

// ==========================================
// 3. DEBATE ARENA LOGIC
// ==========================================
function selectStance(stance) {
    selectedStance = stance;
    const proBtn = document.getElementById('stance-pro');
    const conBtn = document.getElementById('stance-con');
    if (!proBtn || !conBtn) return;

    if (stance === 'Pro') {
        proBtn.className = "p-2.5 border border-slate-800 bg-indigo-950/40 text-indigo-300 rounded-lg text-sm font-medium transition cursor-pointer";
        conBtn.className = "p-2.5 border border-slate-800 bg-slate-950 text-slate-400 rounded-lg text-sm font-medium transition cursor-pointer";
    } else {
        conBtn.className = "p-2.5 border border-slate-800 bg-indigo-950/40 text-indigo-300 rounded-lg text-sm font-medium transition cursor-pointer";
        proBtn.className = "p-2.5 border border-slate-800 bg-slate-950 text-slate-400 rounded-lg text-sm font-medium transition cursor-pointer";
    }
}

async function callGroqAI(topic, userStance, userMessage) {
    const aiStance = userStance.toLowerCase() === 'pro' ? 'Con (Against)' : 'Pro (In favor of)';
    const systemPrompt = `You are a sharp debater in a debate arena. Topic: "${topic}". User stance: "${userStance}". Your stance: "${aiStance}". Argue sharply against the user in 1 short paragraph.`;

    const apiEndpoint = "https://api.groq.com/openai/v1/chat/completions";
    const messagesArray = [{ role: "system", content: systemPrompt }];

    if (Array.isArray(currentChatHistory)) {
        currentChatHistory.forEach(turn => {
            if (turn.user && turn.ai) {
                messagesArray.push({ role: "user", content: turn.user });
                messagesArray.push({ role: "assistant", content: turn.ai });
            }
        });
    }

    messagesArray.push({ role: "user", content: userMessage });

    try {
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-versatile",
                messages: messagesArray,
                temperature: 0.7,
                max_tokens: 150
            })
        });

        const data = await response.json();
        let aiReply = "";
        
        if (data.error) {
            console.error("Groq API Error Details:", data.error);
            aiReply = "Error generating response: " + data.error.message;
        } else {
            aiReply = data.choices?.[0]?.message?.content?.trim() || "No response generated.";
        }

        currentChatHistory.push({ user: userMessage, ai: aiReply });
        return aiReply;

    } catch (err) {
        console.error("Network error:", err);
        const fallbackReply = "Network connection error. Let's continue the debate.";
        currentChatHistory.push({ user: userMessage, ai: fallbackReply });
        return fallbackReply;
    }
}

async function sendChatMessage() {
    const topicInput = document.getElementById('debate-topic');
    const userArgInput = document.getElementById('user-argument');
    const stream = document.getElementById('chat-stream');

    if (!topicInput || !userArgInput || !stream) return;

    const topic = topicInput.value.trim();
    const userArg = userArgInput.value.trim();

    if (!topic || !userArg) {
        alert('Please enter a debate topic and your argument.');
        return;
    }

    stream.innerHTML += `
        <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <span class="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">You (${selectedStance})</span>
            <p class="text-xs text-slate-200 leading-relaxed">${userArg}</p>
        </div>
        <div id="ai-loading" class="bg-indigo-950/20 p-3 rounded-xl border border-indigo-900/40 space-y-1 animate-pulse">
            <span class="text-[10px] text-rose-400 uppercase font-bold tracking-wider">AI Opponent is thinking...</span>
        </div>
    `;
    userArgInput.value = '';
    stream.scrollTop = stream.scrollHeight;

    const aiReply = await callGroqAI(topic, selectedStance, userArg);

    const loadingEl = document.getElementById('ai-loading');
    if (loadingEl) loadingEl.remove();

    stream.innerHTML += `
        <div class="bg-indigo-950/20 p-3 rounded-xl border border-indigo-900/40 space-y-1">
            <span class="text-[10px] text-rose-400 uppercase font-bold tracking-wider">AI Opponent (${selectedStance === 'Pro' ? 'Con' : 'Pro'})</span>
            <p class="text-xs text-slate-300 leading-relaxed">${aiReply}</p>
        </div>
    `;

    stream.scrollTop = stream.scrollHeight;
}

// ==========================================
// 4. SAVING DEBATE TRANSCRIPTS (MULTI-TURN)
// ==========================================
async function endAndSaveDebate() {
    const topicInput = document.getElementById('debate-topic');
    
    if (!topicInput || !topicInput.value.trim()) {
        alert("Please enter a debate topic before saving.");
        return;
    }

    if (!currentChatHistory || currentChatHistory.length === 0) {
        alert("No active debate messages to save.");
        return;
    }

    const topic = topicInput.value.trim();
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Save the entire multi-turn array into the `messages` JSONB column and use `email`
    const { error } = await supabaseClient.from('debates').insert([
        {
            email: user.email,
            topic: topic,
            stance: selectedStance || 'Pro',
            messages: currentChatHistory // 👈 Stores all turns permanently
        }
    ]);

    if (error) {
        console.error("Supabase Save Error:", error.message);
        alert("Failed to save debate: " + error.message);
        return;
    }

    alert("Debate session saved successfully!");
    currentChatHistory = [];
    window.location.href = 'history.html';
}

// Backward compatibility alias if called as endDebate
async function endDebate() {
    await endAndSaveDebate();
}

// ==========================================
// 5. HISTORY & PROFILE LOADERS
// ==========================================
let cachedDebates = [];

async function loadDebateHistory() {
    const container = document.getElementById('history-container');
    if (!container) return;

    if (!supabaseClient) {
        container.innerHTML = `<div class="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center text-xs text-rose-400">Supabase client not initialized.</div>`;
        return;
    }

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Query by email to avoid user_id column mismatches
    const { data: debates, error } = await supabaseClient
        .from('debates')
        .select('*')
        .eq('email', user.email)
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = `<div class="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center text-xs text-rose-400">Error loading history: ${error.message}</div>`;
        return;
    }

    if (!debates || debates.length === 0) {
        container.innerHTML = `<div class="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center text-xs text-slate-400">No past debates found. Head to the Arena to start one!</div>`;
        return;
    }

    cachedDebates = debates;
    container.innerHTML = '';

    debates.forEach((debate, index) => {
        const dateFormatted = new Date(debate.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const userStance = debate.stance || debate.user_stance || 'Pro';
        
        container.innerHTML += `
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
                <div class="space-y-1">
                    <span class="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-medium">Stance: ${userStance}</span>
                    <h3 class="text-sm font-semibold text-white">${debate.topic}</h3>
                    <p class="text-xs text-slate-400">Session Date: ${dateFormatted}</p>
                </div>
                
                <button onclick="openFullDebateModalByIndex(${index})" class="p-2.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-xl transition cursor-pointer flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        `;
    });
}

// Open modal via index lookup and render full multi-turn messages array
function openFullDebateModalByIndex(index) {
    const debate = cachedDebates[index];
    if (!debate) return;

    const modal = document.getElementById('debate-modal');
    const titleEl = document.getElementById('modal-topic-title');
    const stanceEl = document.getElementById('modal-stance-info');
    const container = document.getElementById('modal-transcript-container');

    if (!modal) return;

    const userStance = debate.stance || debate.user_stance || 'Pro';
    titleEl.innerText = debate.topic;
    stanceEl.innerText = `User Stance: ${userStance}`;

    container.innerHTML = '';

    // Loop through the multi-turn JSONB messages array
    const messages = debate.messages || [];
    if (Array.isArray(messages) && messages.length > 0) {
        messages.forEach(turn => {
            container.innerHTML += `
                <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span class="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">You (${userStance})</span>
                    <p class="text-slate-200 leading-relaxed">${turn.user}</p>
                </div>
                <div class="bg-indigo-950/20 p-3 rounded-xl border border-indigo-900/40 space-y-1">
                    <span class="text-[10px] text-rose-400 uppercase font-bold tracking-wider">AI Opponent (${userStance.toLowerCase() === 'pro' ? 'Con' : 'Pro'})</span>
                    <p class="text-slate-300 leading-relaxed">${turn.ai}</p>
                </div>
            `;
        });
    } else {
        container.innerHTML = `<p class="text-xs text-slate-400 text-center">No transcript messages found.</p>`;
    }

    modal.classList.remove('hidden');
}

function closeFullDebateModal() {
    const modal = document.getElementById('debate-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function loadUserProfile() {
    if (!supabaseClient) return;
    const { data: { user } } = await supabaseClient.auth.getUser();
    const emailDisplay = document.getElementById('user-email-display');
    if (user && emailDisplay) {
        emailDisplay.innerText = user.email;
    } else if (emailDisplay) {
        emailDisplay.innerText = 'Guest / Unauthenticated';
    }
}

async function deleteAllData() {
    if (!confirm('Are you sure you want to delete all your debate history?')) return;
    if (!supabaseClient) return;
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    await supabaseClient.from('debates').delete().eq('email', user.email);
    alert('All history cleared.');
    location.reload();
}

// Auto-executors based on page
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById('history-container')) {
        loadDebateHistory();
    }
    if (document.getElementById('user-email-display')) {
        loadUserProfile();
    }
});

// Global Password Visibility Toggle
window.togglePasswordVisibility = function(fieldId, iconId) {
    const passwordInput = document.getElementById(fieldId);
    const eyeIcon = document.getElementById(iconId);
    
    if (!passwordInput || !eyeIcon) return;

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.057 10.057 0 012.235-3.32m2.462-2.463A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        `;
    } else {
        passwordInput.type = 'password';
        eyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        `;
    }
};