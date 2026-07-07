const firebaseConfig = {
  apiKey: "AIzaSyDTzY8CPFIbtnxqnL65N6pgUWWVkwRzsCA",
  authDomain: "smart-chat-1a55c.firebaseapp.com",
  databaseURL: "https://smart-chat-1a55c-default-rtdb.firebaseio.com",
  projectId: "smart-chat-1a55c",
  storageBucket: "smart-chat-1a55c.firebasestorage.app",
  messagingSenderId: "1017792002938",
  appId: "1:1017792002938:web:a92fa79d11531ca48ff4c3"
};

// Inisyalize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

const loginScreen = document.getElementById('loginScreen');
const signupScreen = document.getElementById('signupScreen');
const chatScreen = document.getElementById('chatScreen');
const toSignUp = document.getElementById('toSignUp');
const toLogin = document.getElementById('toLogin');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const connectBtn = document.getElementById('connectBtn');
const sendBtn = document.getElementById('sendBtn');
const messageInput = document.getElementById('messageInput');
const chatMessages = document.getElementById('chatMessages');
const menuBtn = document.getElementById('menuBtn');
const menuDropdown = document.getElementById('menuDropdown');

let currentUser = null;
let activeChatRoomId = null;
let isEditMode = false;
let isDeleteMode = false;

// Navigasyon ant ekran yo
toSignUp.addEventListener('click', () => { loginScreen.classList.remove('active'); signupScreen.classList.add('active'); });
toLogin.addEventListener('click', () => { signupScreen.classList.remove('active'); loginScreen.classList.add('active'); });

// Meni Dropdown
menuBtn.addEventListener('click', (e) => { 
    e.stopPropagation(); 
    menuDropdown.style.display = menuDropdown.style.display === 'block' ? 'none' : 'block'; 
});
document.addEventListener('click', () => { menuDropdown.style.display = 'none'; });

function formatEmail(username) { return `${username.toLowerCase().replace(/\s+/g, '')}@smartchat.com`; }
  
function getCleanUsername(email) { return email.split('@')[0]; }

function dirijeSouPajChat() {
    loginScreen.classList.remove('active');
    signupScreen.classList.remove('active');
    chatScreen.classList.add('active');
    if (Notification.permission !== "granted") { Notification.requestPermission(); }
}

// Aksyon Kreye Kont (KORÈK: Li sèlman transfere si pa gen erè)
signupBtn.addEventListener('click', function() {
    const user = document.getElementById('signupUsername').value.trim().toLowerCase().replace(/\s+/g, '');
    const pass = document.getElementById('signupPassword').value.trim();
    if (!user || pass.length < 6) { alert("Modpas la dwe gen omwen 6 karaktè!"); return; }

    auth.createUserWithEmailAndPassword(formatEmail(user), pass)
        .then(() => {
            database.ref('users/' + user).set({ exists: true });
            alert("Kont kreye ak siksè!");
            dirijeSouPajChat(); // Transfere SÈLMAN si sa mache
        })
        .catch((err) => { 
            alert("Erè kreyasyon: " + err.message); 
            // Pa gen transfè si gen erè!
        });
});

// Aksyon Login (KORÈK: Li bloke transfè a si kòd la oswa ID a pa bon)
loginBtn.addEventListener('click', function() {
    const user = document.getElementById('loginUsername').value.trim().toLowerCase().replace(/\s+/g, '');
    const pass = document.getElementById('loginPassword').value.trim();
    if (!user || !pass) { alert("Ranpli tout chan yo!"); return; }

    auth.signInWithEmailAndPassword(formatEmail(user), pass)
        .then(() => { 
            dirijeSouPajChat(); // Transfere SÈLMAN si modpas la bon
        })
        .catch((err) => { 
            alert("Koneksyon pa kapab fèt: ID oswa modpas ou an pa bon! ❌"); 
            // Paj la ap rete la nèt, li p ap deplase si gen erè!
        });
});

// Detekte otomatikman si itilizatè a te DEJA konekte anvan
auth.onAuthStateChanged((user) => { 
    if (user) { 
        currentUser = user; 
        dirijeSouPajChat(); 
    } 
});

// KONEKSYON AK LÒT ITILIZATÈ
connectBtn.addEventListener('click', () => {
    const peerId = document.getElementById('peerId').value.trim().toLowerCase().replace(/\s+/g, '');
    if (!peerId) return;
    
    const myId = getCleanUsername(currentUser.email);
    if (peerId === myId) { alert("Ou pa ka konekte ak pwòp tèt ou!"); return; }

    database.ref('users/' + peerId).once('value', (snapshot) => {
        if (snapshot.exists()) {
            activeChatRoomId = myId < peerId ? `${myId}_${peerId}` : `${peerId}_${myId}`;
            alert(`Koneksyon sekirize etabli ak: ${peerId} 🔒`);
            chatMessages.innerHTML = '';
            listenForMessages();
        } else {
            alert(`Erè: Itilizatè "${peerId}" sa a pa egziste nan SmartChat! ❌`);
        }
    });
});

function listenForMessages() {
    const myId = getCleanUsername(currentUser.email);
    const messagesRef = database.ref('chats/' + activeChatRoomId);
    
    messagesRef.off();
    messagesRef.on('child_added', (snapshot) => {
        const data = snapshot.val();
        const msgId = snapshot.key;
        displayMessage(msgId, data.text, data.sender === myId, data.time);
        
        if (data.sender !== myId) {
            if (Notification.permission === "granted") {
                new Notification("SmartChat 💬", { body: `Nouvo mesaj: "${data.text}"` });
            }
        }
    });

    messagesRef.on('child_changed', (snapshot) => {
        const msgId = snapshot.key;
        const data = snapshot.val();
        const msgEl = document.querySelector(`[data-id="${msgId}"]`);
        if (msgEl) {
            msgEl.innerHTML = `${data.text} <span class="msg-time">${data.time}</span>`;
        }
    });

    messagesRef.on('child_removed', (snapshot) => {
        const msgId = snapshot.key;
        const msgEl = document.querySelector(`[data-id="${msgId}"]`);
        if (msgEl) msgEl.remove();
    });
}

function displayMessage(msgId, text, isMe, time) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', isMe ? 'msg-me' : 'msg-them');
    msgDiv.setAttribute('data-id', msgId);
    msgDiv.innerHTML = `${text} <span class="msg-time">${time}</span>`;
    
    if (isMe) {
        msgDiv.addEventListener('click', () => handleMessageAction(msgId, text));
    }
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Voye Mesaj
sendBtn.addEventListener('click', () => {
    const text = messageInput.value.trim(); if (!text || !activeChatRoomId) return;
    const myId = getCleanUsername(currentUser.email);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    database.ref('chats/' + activeChatRoomId).push({ sender: myId, text: text, time: time });
    messageInput.value = '';
});

// MODIFIER / DELETE LOJIK
document.getElementById('editMsgBtn').addEventListener('click', () => { isEditMode = true; isDeleteMode = false; alert("Mòd Modifier aktive! Klike sou yon mesaj pa w."); });
document.getElementById('deleteMsgBtn').addEventListener('click', () => { isDeleteMode = true; isEditMode = false; alert("Mòd Delete aktive! Klike sou yon mesaj pa w."); });

function handleMessageAction(msgId, oldText) {
    if (isDeleteMode) {
        if (confirm("Efase mesaj sa a?")) {
            database.ref(`chats/${activeChatRoomId}/${msgId}`).remove();
            isDeleteMode = false;
        }
    } else if (isEditMode) {
        const newText = prompt("Modifier mesaj la:", oldText);
        if (newText && newText.trim() !== oldText) {
            database.ref(`chats/${activeChatRoomId}/${msgId}`).update({ text: newText.trim() + " (modifye)" });
            isEditMode = false;
        }
    }
}

// AKSYON POU DEKONEKTE
document.getElementById('logoutBtn').addEventListener('click', function() {
    if (confirm("Èske ou vle dekonekte kont sa a?")) {
        auth.signOut().then(() => {
            alert("Ou dekonekte! 🔓");
            location.reload();
        }).catch((err) => {
            alert("Erè: " + err.message);
        });
    }
});
