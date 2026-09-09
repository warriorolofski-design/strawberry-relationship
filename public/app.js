// =============================
// ✏️ سوال‌ها را اینجا خیلی راحت ویرایش کن
// فقط متن داخل question را تغییر بده.
// ترتیب questions همان ترتیب نمایش است.
// =============================
const questions = [
  { key:"q1", question:"به تصمیمت به اندازه کافی فکر کردی؟" },
  { key:"q2", question:"همه جوانب رو در نظر گرفتی؟" },
  { key:"q3", question:"فکر می‌کنی بهترین تصمیم برات اینه؟" },
  { key:"q4", question:"حس می‌کنی خیلی رابطه خراب و نجات‌نیافتنی شده؟" },
  { key:"q5", question:"به استدلال‌هایی که افکارت بهت دادن اعتماد و باور داری؟" },
  { key:"q6", question:"به نظرت هیچ مسیر دیگه‌ای وجود نداره؟" },
  { key:"q7", question:"به نظرت برای این دوتا بهترین تصمیم جداییه؟" }
];

const app = document.getElementById("app");
const sessionId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
let photos = [];

async function saveAnswer(key, text, answer){
  try{
    await fetch("/api/answer", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({sessionId,questionKey:key,questionText:text,answer})
    });
  }catch(e){ console.warn("Could not save answer",e); }
}

function shell(inner){
  app.innerHTML = `<section class="card">${inner}</section>`;
}

function bubble(label, onClick, cls=""){
  const b=document.createElement("button");
  b.className="bubble "+cls; b.textContent=label; b.onclick=onClick; return b;
}

function home(){
  shell(`
    <div class="strawberry">🍓</div>
    <h1>دوست داری رابطمون تموم بشه؟</h1>
    <div class="answers" id="answers"></div>
    <p class="small">فقط یه سؤال ساده‌ست... فکر کنم 😶</p>
  `);
  const box=document.getElementById("answers");
  box.append(bubble("آره", firstYes));
  box.append(bubble("نه", noPath));
}

async function firstYes(){
  await saveAnswer("main","دوست داری رابطمون تموم بشه؟","آره");
  const box=document.getElementById("answers");
  box.querySelectorAll("button").forEach(b=>b.disabled=true);
  box.querySelector("button").classList.add("selected");
  const n=document.createElement("div");
  n.className="notice";
  n.textContent="اگه مطمئنی از انتخابت، دوباره گزینه «آره» رو فشار بده.";
  box.parentElement.appendChild(n);
  const again=bubble("آره، مطمئنم", ()=>{
    saveAnswer("main_confirm","آیا از انتخاب «آره» مطمئنی؟","آره");
    questionsPage();
  });
  again.className="bubble selected continue";
  box.parentElement.appendChild(again);
}

async function noPath(){
  await saveAnswer("main","دوست داری رابطمون تموم بشه؟","نه");
  shell(`
    <div class="strawberry">🍓</div>
    <h2>گزینه خوبی رو انتخاب کردی 😌</h2>
    <p>اگه از انتخابت اطمینان داری، یه موزیک برام بفرست 🎵</p>
    <p class="small"> ممد دوست داره دیوونه❤️</p>
  `);
}

async function questionsPage(){
  renderQuestion(0);
}

function renderQuestion(index){
  const q=questions[index];
  const percent=Math.round(index/questions.length*100);
  shell(`
    <div class="progress"><div style="width:${percent}%"></div></div>
    <div class="strawberry">🍓</div>
    <div class="small">سؤال ${index+1} از ${questions.length}</div>
    <h2>${escapeHtml(q.question)}</h2>
    <div class="answers" id="qanswers"></div>
    ${index===questions.length-1 ? '<div id="memoryPhotos" class="photos"></div>' : ''}
  `);
  const box=document.getElementById("qanswers");
  box.append(bubble("آره",()=>answerQuestion(index,"آره")));
  box.append(bubble("نه",()=>restartFromNo(q,"نه")));
  if(index===questions.length-1) loadPhotos();
}

async function answerQuestion(index,answer){
  const q=questions[index];
  await saveAnswer(q.key,q.question,answer);
  if(index===questions.length-1){
    shell(`
      <div class="strawberry">🍓</div>
      <h2>خب... ممنون که تا اینجا اومدی.</h2>
      <p>حالا فکر کنم وقتشه بدون تست و بدون بازی، واقعاً حرف بزنیم. ❤️</p>
    `);
  }else renderQuestion(index+1);
}

async function restartFromNo(q,answer){
  await saveAnswer(q.key,q.question,answer);
  shell(`
    <div class="strawberry">🍓</div>
    <h2>به نظر میرسه اطمینان نداری.</h2>
    <p>از اول شروع کن 🙂</p>
    <div class="answers"><button id="restart" class="bubble selected">از اول 🍓</button></div>
  `);
  document.getElementById("restart").onclick=home;
}

async function loadPhotos(){
  try{
    const r=await fetch("/api/photos");
    photos=await r.json();
    const box=document.getElementById("memoryPhotos");
    if(box && photos.length) box.innerHTML=photos.map(src=>`<img src="${src}" alt="خاطره">`).join("");
  }catch(e){}
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

home();
