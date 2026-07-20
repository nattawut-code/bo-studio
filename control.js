import { stateRef, getDoc, setDoc } from "./firestore.js";
const grid = document.querySelector('#slotsGrid');
const scaleInput = document.querySelector('#scale'), opacityInput = document.querySelector('#opacity'), positionInput = document.querySelector('#position'), verticalInput = document.querySelector('#vertical'), backgroundColorInput = document.querySelector('#backgroundColor'), textColorInput = document.querySelector('#textColor'), graphicStyleInput = document.querySelector('#graphicStyle');
const timerMinutes = document.querySelector('#timerMinutes'), timerDisplay = document.querySelector('#timerDisplay'), timerToggle = document.querySelector('#timerToggle'), timerScale = document.querySelector('#timerScale'), timerFullScreen = document.querySelector('#timerFullScreen');
let slots = [], currentVisible = false, saveTimer, timer = { duration:900, remaining:900, running:false, startedAt:null, visible:true };
function defaults() { return Array.from({ length:10 }, (_, index) => ({ id:index+1, name:`ชื่อ-นามสกุล คนที่ ${index+1}`, role:'ตำแหน่ง / รายละเอียด', logo:'' })); }
function remainingTimer() { return timer.running ? Math.max(0, timer.remaining - Math.floor((Date.now() - timer.startedAt) / 1000)) : timer.remaining; }
function renderTimer() { const value = remainingTimer(); timerDisplay.textContent = `${String(Math.floor(value / 60)).padStart(2,'0')}:${String(value % 60).padStart(2,'0')}`; }
function queueSave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => saveSlots(), 450); }
async function saveSlots(visible = currentVisible, activeSlot = null) {

    const body = {
        slots,
        visible,
        scale: Number(scaleInput.value),
        opacity: Number(opacityInput.value),
        position: positionInput.value,
        vertical: Number(verticalInput.value),
        backgroundColor: backgroundColorInput.value,
        textColor: textColorInput.value,
        graphicStyle: graphicStyleInput.value,
        timerDuration: timer.duration,
        timerRemaining: timer.remaining,
        timerRunning: timer.running,
        timerStartedAt: timer.startedAt,
        timerVisible: timer.visible,
        timerScale: Number(timerScale.value),
        timerFullScreen: timerFullScreen.checked
    };

    if (activeSlot) {
        body.name = activeSlot.name;
        body.role = activeSlot.role;
        body.logo = activeSlot.logo;
        body.tag = "งานประชาสัมพันธ์ โรงเรียนเบญจมราชูทิศ";
    }

    await setDoc(stateRef, body);

    currentVisible = visible;
}

function render() { grid.replaceChildren(); slots.forEach((slot,index) => { const card = document.createElement('section'); card.className='slot-card'; card.innerHTML=`<div class="slot-title"><strong>♟ ข้อมูลคนที่ ${index+1}</strong><button type="button" class="go-live">▶ เอาขึ้นจอ</button></div><div class="slot-body"><label class="logo-picker"><input type="file" accept="image/png,image/jpeg,image/webp"><span class="logo-preview"><img alt=""><b>LOGO</b></span><em>เปลี่ยนโลโก้</em></label><div class="slot-fields"><input class="slot-name" maxlength="60" aria-label="ชื่อ"><input class="slot-role" maxlength="80" aria-label="ตำแหน่ง"></div></div>`; const image=card.querySelector('img'), placeholder=card.querySelector('b'), file=card.querySelector('input[type=file]'), name=card.querySelector('.slot-name'), role=card.querySelector('.slot-role'); image.src=slot.logo||''; image.hidden=!slot.logo; placeholder.hidden=Boolean(slot.logo); name.value=slot.name; role.value=slot.role; name.addEventListener('input',()=>{slot.name=name.value;queueSave();}); role.addEventListener('input',()=>{slot.role=role.value;queueSave();}); file.addEventListener('change',event=>{const picked=event.target.files[0];if(!picked)return;const reader=new FileReader();reader.onload=()=>{slot.logo=reader.result;image.src=slot.logo;image.hidden=false;placeholder.hidden=true;queueSave();};reader.readAsDataURL(picked);}); card.querySelector('.go-live').addEventListener('click',()=>saveSlots(true,slot)); grid.append(card); }); }
function bindDisplayControl(input, output) { input.addEventListener('input',()=>{output.textContent=`${input.value}%`;queueSave();}); }
document.querySelector('#hideAll').addEventListener('click',()=>saveSlots(false)); bindDisplayControl(scaleInput,document.querySelector('#scaleValue')); bindDisplayControl(opacityInput,document.querySelector('#opacityValue')); bindDisplayControl(verticalInput,document.querySelector('#verticalValue'));
[positionInput,backgroundColorInput,textColorInput,graphicStyleInput].forEach(input=>input.addEventListener('input',queueSave)); document.querySelector('#resetColors').addEventListener('click',()=>{backgroundColorInput.value='#ffffff';textColorInput.value='#17191d';saveSlots();});
timerMinutes.addEventListener('change',()=>{if(timer.running)return;timer.duration=Math.max(1,Number(timerMinutes.value)||1)*60;timer.remaining=timer.duration;renderTimer();queueSave();}); timerToggle.addEventListener('click',()=>{timer.visible=!timer.visible;renderTimerToggle();saveSlots();}); timerScale.addEventListener('input',()=>{document.querySelector('#timerScaleValue').textContent=`${timerScale.value}%`;queueSave();}); timerFullScreen.addEventListener('change',queueSave); document.querySelector('#timerStart').addEventListener('click',()=>{if(!timer.running){timer.remaining=remainingTimer();timer.running=true;timer.startedAt=Date.now();saveSlots();}}); document.querySelector('#timerPause').addEventListener('click',()=>{if(timer.running){timer.remaining=remainingTimer();timer.running=false;timer.startedAt=null;saveSlots();renderTimer();}}); document.querySelector('#timerReset').addEventListener('click',()=>{timer.duration=Math.max(1,Number(timerMinutes.value)||1)*60;timer.remaining=timer.duration;timer.running=false;timer.startedAt=null;saveSlots();renderTimer();});
function renderTimerToggle(){timerToggle.textContent=timer.visible?'ปิด Countdown':'เปิด Countdown';timerToggle.classList.toggle('is-off',!timer.visible);}
getDoc(stateRef)
.then((docSnap) => {

    if (docSnap.exists()) {

        const state = docSnap.data();

        slots = Array.isArray(state.slots) && state.slots.length === 10
            ? state.slots
            : defaults();

        currentVisible = Boolean(state.visible);

        scaleInput.value = state.scale ?? 75;
        opacityInput.value = state.opacity ?? 100;
        positionInput.value = state.position ?? "left";
        verticalInput.value = state.vertical ?? 8;

        backgroundColorInput.value = state.backgroundColor ?? "#ffffff";
        textColorInput.value = state.textColor ?? "#17191d";
        graphicStyleInput.value = state.graphicStyle ?? "classic";

        document.querySelector("#scaleValue").textContent = `${scaleInput.value}%`;
        document.querySelector("#opacityValue").textContent = `${opacityInput.value}%`;
        document.querySelector("#verticalValue").textContent = `${verticalInput.value}%`;

        timer = {
            duration: Number(state.timerDuration ?? 900),
            remaining: Number(state.timerRemaining ?? 900),
            running: Boolean(state.timerRunning),
            startedAt: state.timerStartedAt ? Number(state.timerStartedAt) : null,
            visible: state.timerVisible !== false
        };

        timerMinutes.value = Math.max(1, Math.ceil(timer.duration / 60));

        timerScale.value = state.timerScale ?? 100;
        timerFullScreen.checked = Boolean(state.timerFullScreen);

        document.querySelector("#timerScaleValue").textContent = `${timerScale.value}%`;

        renderTimerToggle();
        renderTimer();
        render();

    } else {

        slots = defaults();
        render();

    }

})
.catch(() => {

    slots = defaults();
    render();

});

setInterval(renderTimer, 250);