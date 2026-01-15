
/* app.js
   Firebase-based starter for:
   - Google Sign-In
   - Users collection with role (player/gm)
   - Rooms (real-time)
   - Character sheets stored in Firestore
   - Combat flows inside rooms with real-time updates
   NOTE: Replace firebaseConfig with your project config below.
*/

/*const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  // ...other fields
};*/


  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyBrV3SPT-88wSS6lnXGj0mp-sSqXDaNPFU",
    authDomain: "panteaoragnarok.firebaseapp.com",
    projectId: "panteaoragnarok",
    storageBucket: "panteaoragnarok.firebasestorage.app",
    messagingSenderId: "390343228960",
    appId: "1:390343228960:web:f245ad911d97e49e310645"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);


// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// UI refs
const loginCard = document.getElementById('login-card');
const btnGoogle = document.getElementById('btn-google');
const loginMsg = document.getElementById('login-msg');
const appUi = document.getElementById('app-ui');
const userArea = document.getElementById('user-area');
const displayName = document.getElementById('display-name');
const displayRole = document.getElementById('display-role');
const btnSignout = document.getElementById('btn-signout');

const navHome = document.getElementById('nav-home');
const navCharacter = document.getElementById('nav-character');
const navCombat = document.getElementById('nav-combat');
const navRoom = document.getElementById('nav-room');
const gmControls = document.getElementById('gm-controls');

const homeView = document.getElementById('home-view');
const sheetView = document.getElementById('sheet-view');
const roomView = document.getElementById('room-view');
const combatView = document.getElementById('combat-view');

const btnCreateRoom = document.getElementById('btn-create-room');
const btnJoinRoom = document.getElementById('btn-join-room');
const roomJoinId = document.getElementById('room-join-id');
const roomArea = document.getElementById('room-area');
const roomIdDisplay = document.getElementById('room-id-display');
const playerList = document.getElementById('player-list');
const roomCount = document.getElementById('room-count');
const roomGM = document.getElementById('room-gm');
const inviteLink = document.getElementById('invite-link');
const btnCopyInvite = document.getElementById('btn-copy-invite');
const roomControls = document.getElementById('room-controls');
const roomCombatState = document.getElementById('room-combat-state');

const sheetTabs = document.querySelectorAll('.tab');
const tabPanels = document.querySelectorAll('.tab-panel');
const btnEditSheet = document.getElementById('btn-edit-sheet');
const btnSaveSheet = document.getElementById('btn-save-sheet');
const fieldInputs = document.querySelectorAll('[data-field]');
const statusRadios = document.querySelectorAll('input[name="status"]');

const xpChoose = document.getElementById('xp-choose');
const xpAmount = document.getElementById('xp-amount');
const btnApplyXp = document.getElementById('btn-apply-xp');

const combatAttacker = document.getElementById('combat-attacker');
const rollD20 = document.getElementById('combat-roll-d20');
const insertD20 = document.getElementById('combat-insert-d20');
const manualD20 = document.getElementById('combat-manual-d20');
const d20Display = document.getElementById('combat-d20');
const elemCheckbox = document.getElementById('combat-elem');
const multDisplay = document.getElementById('combat-mult');
const rawDisplay = document.getElementById('combat-raw');
const calcRawBtn = document.getElementById('combat-calc-raw');

const evasionInput = document.getElementById('combat-evasion');
const hpInput = document.getElementById('combat-hp');
const rollD100 = document.getElementById('combat-roll-d100');
const insertD100 = document.getElementById('combat-insert-d100');
const manualD100 = document.getElementById('combat-manual-d100');
const d100Display = document.getElementById('combat-d100');
const resultDisplay = document.getElementById('combat-result');
const evalBtn = document.getElementById('combat-eval');
const combatLog = document.getElementById('combat-log');

// GM Dodge panel
const gmPanel = document.getElementById('combat-gm');
const gmAttackVal = document.getElementById('gm-attack-val');
const gmRollDodge = document.getElementById('gm-roll-dodge');
const gmRollVal = document.getElementById('gm-roll-val');
const gmOut = document.getElementById('gm-out');
const gmClose = document.getElementById('gm-close');

// App state
let currentUser = null;     // firebase.User
let currentUserDoc = null;  // user's Firestore doc {uid, name, role}
let currentRoom = null;     // room id string
let roomUnsubscribe = null;
let pendingGM = null;       // pending dodge test object

// Random helper
const randInt = (min,max) => Math.floor(Math.random()*(max-min+1))+min;

/* -----------------------
   Authentication flows
   ----------------------- */
btnGoogle.addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const res = await auth.signInWithPopup(provider);
    // user signed in, onAuthStateChanged will handle the rest
  } catch (err) {
    loginMsg.textContent = 'Sign-in failed: ' + err.message;
  }
});

auth.onAuthStateChanged(async (user) => {
  if(!user){
    // show login
    currentUser = null;
    currentUserDoc = null;
    loginCard.classList.remove('hidden');
    appUi.classList.add('hidden');
    return;
  }
  currentUser = user;
  loginCard.classList.add('hidden');
  appUi.classList.remove('hidden');

  // ensure users collection doc exists with role
  const udocRef = db.collection('users').doc(user.uid);
  const udoc = await udocRef.get();
  if(!udoc.exists){
    // first time: ask for role (simple prompt for starter — replace with better UI later)
    let role = prompt('Choose role for your account: "player" or "gm" (type exactly):', 'player');
    if(role !== 'gm') role = 'player';
    const userDoc = {
      uid: user.uid,
      displayName: user.displayName || user.email,
      role,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await udocRef.set(userDoc);
    currentUserDoc = userDoc;
  } else {
    currentUserDoc = udoc.data();
  }

  // update UI
  displayName.textContent = currentUserDoc.displayName || user.displayName;
  displayRole.textContent = currentUserDoc.role;
  userArea.innerHTML = `${currentUserDoc.displayName} (${currentUserDoc.role})`;
  if(currentUserDoc.role === 'gm') gmControls.classList.remove('hidden'); else gmControls.classList.add('hidden');

  // prepare home
  showView('home-view');
  populateAttackerSelect();
});

/* Sign out */
btnSignout.addEventListener('click', async () => {
  await auth.signOut();
  currentUser = null;
  currentUserDoc = null;
});

/* -----------------------
   Navigation helpers
   ----------------------- */
const views = document.querySelectorAll('.view');
function showView(id){
  views.forEach(v => v.id === id ? v.classList.remove('hidden') : v.classList.add('hidden'));
}

/* top nav */
navHome.addEventListener('click', ()=> showView('home-view'));
navCharacter.addEventListener('click', ()=> { showView('sheet-view'); loadCharacterForUser(); });
navRoom.addEventListener('click', ()=> { showView('room-view'); });
navCombat.addEventListener('click', ()=> { showView('combat-view'); populateAttackerSelect(); });

/*--------------------------
  Character sheet: loading & saving
---------------------------*/
async function loadCharacterForUser(uid = null){
  if(!currentUserDoc) return;
  const ownerUid = uid || currentUser.uid;
  const charRef = db.collection('characters').doc(ownerUid);
  const doc = await charRef.get();
  let char;
  if(!doc.exists){
    // create default
    char = defaultCharacter(ownerUid, currentUserDoc.displayName || 'Player');
    await charRef.set(char);
  } else {
    char = doc.data();
  }
  renderCharacter(char);
}

function defaultCharacter(ownerUid, playerName){
  return {
    ownerUid,
    name: playerName + "'s Champion",
    playerName,
    age: 18,
    title: '',
    background: '',
    alignment: '',
    weakness: '',
    talents: '',
    redeemer: '',
    valkyrieName: '',
    valkyrieForm: '',
    valkyrieElement: '',
    blessingText: '',
    status: 'alive',
    baseDamage: 5,
    defense: 0,
    evasion: 40,
    maxHealth: 50,
    currentHealth: 50,
    xp: { baseDamage:0, defense:0, evasion:0, health:0 },
    valkyrie: {1:'',2:'',3:'',4:'',5:''},
    stolen: { common:['','',''], ult:[{name:'',desc:''},{name:'',desc:''}] },
    mainElement: '',
    collectedElements: '',
    deaths: 0,
    seals: 0,
    inventory: '',
    armor: '',
    destiny: '',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
}

function renderCharacter(char){
  // fill fields
  fieldInputs.forEach(inp => {
    const key = inp.dataset.field;
    inp.value = char[key] ?? '';
    inp.disabled = true;
  });
  statusRadios.forEach(r => r.checked = (char.status === r.value));
  // attributes
  document.getElementById('show-baseDamage').textContent = char.baseDamage.toFixed(2);
  document.getElementById('show-defense').textContent = char.defense.toFixed(2);
  document.getElementById('show-evasion').textContent = char.evasion.toFixed(2);
  document.getElementById('show-health').textContent = char.maxHealth.toFixed(0);
  document.getElementById('show-currentHealth').textContent = char.currentHealth.toFixed(0);

  document.getElementById('xp-baseDamage').textContent = char.xp.baseDamage;
  document.getElementById('xp-defense').textContent = char.xp.defense;
  document.getElementById('xp-evasion').textContent = char.xp.evasion;
  document.getElementById('xp-health').textContent = char.xp.health;

  // levels simple formula
  document.getElementById('lvl-baseDamage').textContent = 1 + Math.floor(char.xp.baseDamage / 10);
  document.getElementById('lvl-defense').textContent = 1 + Math.floor(char.xp.defense / 10);
  document.getElementById('lvl-evasion').textContent = 1 + Math.floor(char.xp.evasion / 10);
  document.getElementById('lvl-health').textContent = 1 + Math.floor(char.xp.health / 10);
}

/* Edit / Save handlers */
btnEditSheet.addEventListener('click', ()=> {
  fieldInputs.forEach(i => i.disabled = false);
  statusRadios.forEach(r => r.disabled = false);
  btnSaveSheet.classList.remove('hidden');
  btnEditSheet.classList.add('hidden');
});
btnSaveSheet.addEventListener('click', async ()=> {
  // collect values
  const data = {};
  fieldInputs.forEach(i => data[i.dataset.field] = i.value);
  // status
  statusRadios.forEach(r => { if(r.checked) data.status = r.value; });
  // write to Firestore doc
  const charRef = db.collection('characters').doc(currentUser.uid);
  await charRef.set(data, { merge: true });
  // reload for display
  const doc = await charRef.get();
  renderCharacter(doc.data());
  btnSaveSheet.classList.add('hidden');
  btnEditSheet.classList.remove('hidden');
});

/* --------------------------
   XP allocation (automatic recalculations)
   -------------------------- */
btnApplyXp.addEventListener('click', async () => {
  const attr = xpChoose.value;
  const amount = Number(xpAmount.value) || 0;
  if(amount <= 0) return alert('Enter XP > 0');

  const charRef = db.collection('characters').doc(currentUser.uid);

  // Use transaction to update XP and derived stats atomically
  await db.runTransaction(async (t) => {
    const snap = await t.get(charRef);
    let char = snap.exists ? snap.data() : defaultCharacter(currentUser.uid, currentUserDoc.displayName);
    // apply based on conversion rules
    if(attr === 'health'){
      char.maxHealth = (char.maxHealth || 0) + amount * 1;
      char.currentHealth = (char.currentHealth || 0) + amount * 1;
      char.xp = char.xp || {}; char.xp.health = (char.xp.health || 0) + amount;
    } else if(attr === 'baseDamage'){
      char.baseDamage = (char.baseDamage || 0) + amount * 1;
      char.xp = char.xp || {}; char.xp.baseDamage = (char.xp.baseDamage || 0) + amount;
    } else if(attr === 'defense'){
      char.defense = (char.defense || 0) + amount * 0.2;
      char.xp = char.xp || {}; char.xp.defense = (char.xp.defense || 0) + amount;
    } else if(attr === 'evasion'){
      char.evasion = (char.evasion || 0) + amount * 0.05;
      char.xp = char.xp || {}; char.xp.evasion = (char.xp.evasion || 0) + amount;
    }
    t.set(charRef, char, { merge: true });
  });

  const updated = await db.collection('characters').doc(currentUser.uid).get();
  renderCharacter(updated.data());
});

/* --------------------------
   Room system
   -------------------------- */
btnCreateRoom.addEventListener('click', async () => {
  // GM-only: allow any role to create for now; you can require gm role
  const roomRef = db.collection('rooms').doc();
  const roomData = {
    roomId: roomRef.id,
    gmUid: currentUser.uid,
    gmName: currentUserDoc.displayName,
    players: {},
    combatState: {},
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  await roomRef.set(roomData);
  joinRoom(roomRef.id);
});

btnJoinRoom.addEventListener('click', async () => {
  const raw = roomJoinId.value.trim();
  if(!raw) return;
  // allow full URL or ID
  let roomId = raw;
  try {
    const u = new URL(raw);
    // assume last path segment is id
    const segs = u.pathname.split('/').filter(Boolean);
    roomId = segs[segs.length - 1];
  } catch(e){}
  // join
  joinRoom(roomId);
});

async function joinRoom(roomId){
  // add self to room.players with presence timestamp
  const roomRef = db.collection('rooms').doc(roomId);
  const roomSnap = await roomRef.get();
  if(!roomSnap.exists) return alert('Room not found');

  const update = {};
  update[`players.${currentUser.uid}`] = {
    uid: currentUser.uid,
    name: currentUserDoc.displayName,
    joinedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  await roomRef.set(update, { merge: true });

  // set local state & subscribe
  currentRoom = roomId;
  subscribeToRoom(roomId);
  // show room area
  document.getElementById('room-area').classList.remove('hidden');
  roomIdDisplay.textContent = roomId;
  inviteLink.value = `${location.origin}${location.pathname}?room=${roomId}`;
}

function subscribeToRoom(roomId){
  if(roomUnsubscribe) roomUnsubscribe();
  const roomRef = db.collection('rooms').doc(roomId);
  roomUnsubscribe = roomRef.onSnapshot(doc => {
    if(!doc.exists) return;
    const data = doc.data();
    roomGM.textContent = data.gmName || data.gmUid;
    const players = data.players || {};
    playerList.innerHTML = '';
    const keys = Object.keys(players);
    roomCount.textContent = keys.length;
    keys.forEach(k => {
      const li = document.createElement('li');
      li.textContent = players[k].name + (k === data.gmUid ? ' (GM)' : '');
      playerList.appendChild(li);
    });
    roomCombatState.textContent = JSON.stringify(data.combatState || {}, null, 2);
    // if current user is GM, show controls
    if(currentUser.uid === data.gmUid){
      roomControls.innerHTML = `
        <button id="btn-kick" class="btn secondary">Kick Player</button>
        <button id="btn-reset-combat" class="btn">Reset Combat</button>
      `;
      // add handlers (example)
      document.getElementById('btn-reset-combat').addEventListener('click', ()=> roomRef.update({ combatState: {} }));
    } else {
      roomControls.innerHTML = `<div class="muted">You are a player in this room.</div>`;
    }
  });
}

btnCopyInvite.addEventListener('click', async () => {
  inviteLink.select(); inviteLink.setSelectionRange(0, 99999);
  await navigator.clipboard.writeText(inviteLink.value);
  alert('Invite copied');
});

/* --------------------------
   Combat flows (local + room-level)
   -------------------------- */
function populateAttackerSelect(){
  // list characters: players own char and (if gm) other characters
  db.collection('characters').get().then(snapshot=>{
    combatAttacker.innerHTML = '';
    snapshot.forEach(doc=>{
      const c = doc.data();
      const opt = document.createElement('option');
      opt.value = doc.id;
      opt.textContent = `${c.name} — ${c.playerName}`;
      combatAttacker.appendChild(opt);
    });
  });
}

/* Rolling d20 */
rollD20.addEventListener('click', ()=>{
  rollD20.disabled = true; d20Display.textContent = '...';
  const v = randInt(1,20);
  setTimeout(()=>{ d20Display.textContent = v; rollD20.disabled=false; }, 350);
});
insertD20.addEventListener('click', ()=> {
  const v = Number(manualD20.value);
  if(!v || v < 1 || v > 20) return alert('1-20');
  d20Display.textContent = v;
});

elemCheckbox.addEventListener('change', ()=> multDisplay.textContent = elemCheckbox.checked ? '2.5' : '1.5');

calcRawBtn.addEventListener('click', async ()=> {
  const die = Number(d20Display.textContent);
  if(!die) return alert('Roll or insert d20 first');
  const charId = combatAttacker.value;
  const charDoc = await db.collection('characters').doc(charId).get();
  if(!charDoc.exists) return alert('Attacker char not found');
  const char = charDoc.data();
  const mult = elemCheckbox.checked ? 2.5 : 1.5;
  const raw = (die * mult) + (char.baseDamage || 0);
  rawDisplay.textContent = raw.toFixed(2);
  combatLog.textContent = `Raw damage: (Die ${die} × ${mult}) + Base ${char.baseDamage} = ${raw.toFixed(2)}`;
});

/* Roll 1d100 */
rollD100.addEventListener('click', ()=>{
  rollD100.disabled = true; d100Display.textContent = '...';
  const v = randInt(1,100);
  setTimeout(()=>{ d100Display.textContent = v; rollD100.disabled=false; }, 300);
});
insertD100.addEventListener('click', ()=> {
  const v = Number(manualD100.value);
  if(!v || v < 1 || v > 100) return alert('1-100');
  d100Display.textContent = v;
});

/* Evaluate hit */
evalBtn.addEventListener('click', async ()=>{
  const attackRoll = Number(d100Display.textContent);
  const raw = Number(rawDisplay.textContent);
  if(!Number.isFinite(attackRoll)) return alert('Roll/insert 1d100');
  if(!Number.isFinite(raw)) return alert('Calculate raw damage first');

  let enemyEvasion = Number(evasionInput.value) || 0;
  if(enemyEvasion < 40) enemyEvasion = 40; // minimum

  const result = attackRoll - enemyEvasion;
  resultDisplay.textContent = result.toFixed(2);

  if(result < 40){
    combatLog.textContent = 'You missed.';
    return;
  }

  const pct = result;
  if(pct >= 40 && pct <= 70){
    // GM dodge test flow — if in room, publish pendingGM to room doc; open GM panel locally
    pendingGM = { attackValue: pct, raw, attacker: combatAttacker.value, elem: elemCheckbox.checked };
    // if in a room, push pending to room.combatState.pending
    if(currentRoom){
      const roomRef = db.collection('rooms').doc(currentRoom);
      await roomRef.update({ 'combatState.pendingDodge': pendingGM });
    }
    // notify players; open GM panel if user is GM
    if(currentUser.uid === (await db.collection('rooms').doc(currentRoom).get()).data().gmUid){
      gmPanel.classList.remove('hidden');
      gmAttackVal.textContent = pct.toFixed(2);
    }
    combatLog.textContent = 'Between 40–70: GM dodge test required.';
    return;
  }

  if(pct >= 71 && pct <= 90){
    const final = Math.round(raw);
    applyDamageToEnemy(final);
    combatLog.textContent = `Guaranteed hit. ${final} damage applied.`;
    return;
  }
  if(pct >= 91 && pct <= 95){
    const final = Math.round(raw * 2);
    applyDamageToEnemy(final);
    combatLog.textContent = `Critical Hit! ×2 => ${final} damage.`;
    return;
  }
  if(pct >= 96 && pct <= 100){
    const final = Math.round(raw * 5);
    applyDamageToEnemy(final);
    combatLog.textContent = `Ultra Critical! ×5 => ${final} damage.`;
    return;
  }
  if(pct > 100){
    const cur = Number(hpInput.value) || 0;
    const dmg = Math.round(cur * 0.9);
    applyDamageToEnemy(dmg);
    combatLog.textContent = `Absolute Hit! Removes 90% of current HP => ${dmg}.`;
    // variation hitkill
    if(elemCheckbox.checked && Math.round(raw) >= dmg){
      applyDamageToEnemy(1e9); // instant kill
      combatLog.textContent += ' Hitkill!';
    }
  }
});

/* applyDamageToEnemy affects local enemy HP input and, if in room, publishes to room combatState */
function applyDamageToEnemy(dmg){
  let hp = Number(hpInput.value) || 0;
  hp = Math.max(0, hp - dmg);
  hpInput.value = hp;
  // publish to room state if applicable
  if(currentRoom){
    const roomRef = db.collection('rooms').doc(currentRoom);
    roomRef.update({ 'combatState.lastDamage': dmg, 'combatState.enemyHP': hp });
  }
}

/* GM dodge roll */
gmRollDodge.addEventListener('click', async ()=>{
  const roll = randInt(1,100);
  gmRollVal.textContent = roll;
  const pending = pendingGM || (await db.collection('rooms').doc(currentRoom).get()).data().combatState?.pendingDodge;
  if(!pending) return gmOut.textContent = 'No pending dodge';
  if(roll > pending.attackValue){
    gmOut.textContent = `Dodge successful (GM ${roll} > Attack ${pending.attackValue.toFixed(2)})`;
    combatLog.textContent = 'Enemy narrowly missed.';
    // update room combat state
    if(currentRoom) db.collection('rooms').doc(currentRoom).update({ 'combatState.pendingDodge': firebase.firestore.FieldValue.delete() });
  } else {
    const final = Math.round(pending.raw);
    gmOut.textContent = `Dodge failed. Target takes ${final} damage.`;
    combatLog.textContent = `Dodge failed. ${final} damage.`;
    applyDamageToEnemy(final);
    if(currentRoom) db.collection('rooms').doc(currentRoom).update({ 'combatState.pendingDodge': firebase.firestore.FieldValue.delete() });
  }
});

gmClose.addEventListener('click', ()=> gmPanel.classList.add('hidden'));

/* react to room combat state changes (optional): listen to room doc updates to open GM panel when pendingDodge appears */
function watchRoomForPending(roomId){
  const ref = db.collection('rooms').doc(roomId);
  return ref.onSnapshot(doc=>{
    const data = doc.data();
    const pending = data?.combatState?.pendingDodge;
    if(pending){
      pendingGM = pending;
      // if current user is gm, show panel
      if(currentUser.uid === data.gmUid){
        gmPanel.classList.remove('hidden');
        gmAttackVal.textContent = pending.attackValue.toFixed(2);
      } else {
        // non-GM players get notified in their combat log
        combatLog.textContent = 'GM dodge test required. Waiting for GM.';
      }
    } else {
      pendingGM = null;
      gmPanel.classList.add('hidden');
    }
  });
}

/* When joining a room, set up the watch */
async function joinRoomAndWatch(roomId){
  await joinRoom(roomId);
  if(currentRoom) watchRoomForPending(currentRoom);
}

/* --------------------------
   Utility: simple helper to extract ?room= from url on load
---------------------------*/
(function autoJoinFromUrl(){
  const params = new URLSearchParams(location.search);
  const room = params.get('room');
  if(room){
    roomJoinId.value = room;
  }
})();

/* --------------------------
   End of file
---------------------------*/