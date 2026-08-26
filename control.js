import { stateRef, getDoc, setDoc } from "./firestore.js";
const grid = document.querySelector('#slotsGrid');
const scaleInput = document.querySelector('#scale'), opacityInput = document.querySelector('#opacity'), positionInput = document.querySelector('#position'), verticalInput = document.querySelector('#vertical'), backgroundColorInput = document.querySelector('#backgroundColor'), textColorInput = document.querySelector('#textColor'), graphicStyleInput = document.querySelector('#graphicStyle');
const timerMinutes = document.querySelector('#timerMinutes'), timerDisplay = document.querySelector('#timerDisplay'), timerToggle = document.querySelector('#timerToggle'), timerScale = document.querySelector('#timerScale'), timerFullScreen = document.querySelector('#timerFullScreen');
const clockScale = document.querySelector('#clockScale'), clockPosition = document.querySelector('#clockPosition'), clockVertical = document.querySelector('#clockVertical'), clockToggle = document.querySelector('#clockToggle');
const presetSelect = document.querySelector('#presetSelect'), presetApplyBtn = document.querySelector('#presetApply'), presetDeleteBtn = document.querySelector('#presetDelete'), presetNameInput = document.querySelector('#presetName'), presetSaveBtn = document.querySelector('#presetSave');
const tickerTextInput = document.querySelector('#tickerText'), tickerSpeedInput = document.querySelector('#tickerSpeed'), tickerScaleInput = document.querySelector('#tickerScale'), tickerToggleBtn = document.querySelector('#tickerToggle');
const qrUrlInput = document.querySelector('#qrUrl'), qrScale = document.querySelector('#qrScale'), qrPosition = document.querySelector('#qrPosition'), qrVertical = document.querySelector('#qrVertical'), qrToggleBtn = document.querySelector('#qrToggle'), qrFullScreen = document.querySelector('#qrFullScreen');
const watermarkFile = document.querySelector('#watermarkFile'), watermarkScale = document.querySelector('#watermarkScale'), watermarkPosition = document.querySelector('#watermarkPosition'), watermarkToggleBtn = document.querySelector('#watermarkToggle');
const qtClock = document.querySelector('#qtClock'), qtTimer = document.querySelector('#qtTimer'), qtTicker = document.querySelector('#qtTicker'), qtLowerThird = document.querySelector('#qtLowerThird'), qtQr = document.querySelector('#qtQr'), qtWatermark = document.querySelector('#qtWatermark');
let slots = [], currentVisible = false, saveTimer, timer = { duration:900, remaining:900, running:false, startedAt:null, visible:true }, clockState = { visible:true }, tickerState = { visible:true }, qrState = { visible:true }, watermarkState = { visible:true, logo:'' }, activeSlotIndex = -1;
function defaults() { return Array.from({ length:10 }, (_, index) => ({ id:index+1, name:`ชื่อ-นามสกุล คนที่ ${index+1}`, role:'ตำแหน่ง / รายละเอียด', logo:'' })); }
function remainingTimer() { return timer.running ? Math.max(0, timer.remaining - Math.floor((Date.now() - timer.startedAt) / 1000)) : timer.remaining; }
function renderTimer() { const value = remainingTimer(); timerDisplay.textContent = `${String(Math.floor(value / 60)).padStart(2,'0')}:${String(value % 60).padStart(2,'0')}`; }
function setQtState(input, on) { if (!input) return; input.checked = on; input.parentElement.classList.toggle('is-on', on); }
function syncQuickToggles() {
    setQtState(qtClock, clockState.visible);
    setQtState(qtTimer, timer.visible);
    setQtState(qtTicker, tickerState.visible);
    setQtState(qtLowerThird, currentVisible);
    setQtState(qtQr, qrState.visible);
    setQtState(qtWatermark, watermarkState.visible);
}
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
        timerFullScreen: timerFullScreen.checked,
        clockVisible: clockState.visible,
        clockScale: Number(clockScale.value),
        clockPosition: clockPosition.value,
        clockVertical: Number(clockVertical.value),
        tickerVisible: tickerState.visible,
        tickerText: tickerTextInput.value,
        tickerSpeed: Number(tickerSpeedInput.value),
        tickerScale: Number(tickerScaleInput.value),
        qrVisible: qrState.visible,
        qrUrl: qrUrlInput.value,
        qrScale: Number(qrScale.value),
        qrPosition: qrPosition.value,
        qrVertical: Number(qrVertical.value),
        qrFullScreen: qrFullScreen.checked,
        watermarkVisible: watermarkState.visible,
        watermarkLogo: watermarkState.logo,
        watermarkScale: Number(watermarkScale.value),
        watermarkPosition: watermarkPosition.value
    };

    if (activeSlot) {
        body.name = activeSlot.name;
        body.role = activeSlot.role;
        body.logo = activeSlot.logo;
        body.tag = "งานประชาสัมพันธ์ โรงเรียนเบญจมราชูทิศ";
    }

    await setDoc(stateRef, body);

    currentVisible = visible;
    syncQuickToggles();
}

function render() { grid.replaceChildren(); slots.forEach((slot,index) => { const card = document.createElement('section'); card.className='slot-card'; card.innerHTML=`<div class="slot-title"><strong>♟ ข้อมูลคนที่ ${index+1}</strong><button type="button" class="go-live">▶ เอาขึ้นจอ</button></div><div class="slot-body"><label class="logo-picker"><input type="file" accept="image/png,image/jpeg,image/webp"><span class="logo-preview"><img alt=""><b>LOGO</b></span><em>เปลี่ยนโลโก้</em></label><div class="slot-fields"><input class="slot-name" maxlength="60" aria-label="ชื่อ"><input class="slot-role" maxlength="80" aria-label="ตำแหน่ง"></div></div>`; const image=card.querySelector('img'), placeholder=card.querySelector('b'), file=card.querySelector('input[type=file]'), name=card.querySelector('.slot-name'), role=card.querySelector('.slot-role'); image.src=slot.logo||''; image.hidden=!slot.logo; placeholder.hidden=Boolean(slot.logo); name.value=slot.name; role.value=slot.role; name.addEventListener('input',()=>{slot.name=name.value;queueSave();}); role.addEventListener('input',()=>{slot.role=role.value;queueSave();}); file.addEventListener('change',event=>{const picked=event.target.files[0];if(!picked)return;const reader=new FileReader();reader.onload=()=>{slot.logo=reader.result;image.src=slot.logo;image.hidden=false;placeholder.hidden=true;queueSave();};reader.readAsDataURL(picked);}); card.querySelector('.go-live').addEventListener('click',()=>{activeSlotIndex=index;saveSlots(true,slot);}); grid.append(card); }); }
function bindDisplayControl(input, output) { input.addEventListener('input',()=>{output.textContent=`${input.value}%`;queueSave();}); }
document.querySelector('#hideAll').addEventListener('click',()=>saveSlots(false)); bindDisplayControl(scaleInput,document.querySelector('#scaleValue')); bindDisplayControl(opacityInput,document.querySelector('#opacityValue')); bindDisplayControl(verticalInput,document.querySelector('#verticalValue'));
[positionInput,backgroundColorInput,textColorInput,graphicStyleInput].forEach(input=>input.addEventListener('input',queueSave)); document.querySelector('#resetColors').addEventListener('click',()=>{backgroundColorInput.value='#ffffff';textColorInput.value='#17191d';saveSlots();});
timerMinutes.addEventListener('change',()=>{if(timer.running)return;timer.duration=Math.max(1,Number(timerMinutes.value)||1)*60;timer.remaining=timer.duration;renderTimer();queueSave();}); timerToggle.addEventListener('click',()=>{timer.visible=!timer.visible;renderTimerToggle();saveSlots();}); timerScale.addEventListener('input',()=>{document.querySelector('#timerScaleValue').textContent=`${timerScale.value}%`;queueSave();}); timerFullScreen.addEventListener('change',queueSave); document.querySelector('#timerStart').addEventListener('click',()=>{if(!timer.running){timer.remaining=remainingTimer();timer.running=true;timer.startedAt=Date.now();saveSlots();}}); document.querySelector('#timerPause').addEventListener('click',()=>{if(timer.running){timer.remaining=remainingTimer();timer.running=false;timer.startedAt=null;saveSlots();renderTimer();}}); document.querySelector('#timerReset').addEventListener('click',()=>{timer.duration=Math.max(1,Number(timerMinutes.value)||1)*60;timer.remaining=timer.duration;timer.running=false;timer.startedAt=null;saveSlots();renderTimer();});
function renderTimerToggle(){timerToggle.textContent=timer.visible?'ปิด Countdown':'เปิด Countdown';timerToggle.classList.toggle('is-off',!timer.visible);syncQuickToggles();}
function renderClockToggle(){clockToggle.textContent=clockState.visible?'ปิด Clock':'เปิด Clock';clockToggle.classList.toggle('is-off',!clockState.visible);syncQuickToggles();}
bindDisplayControl(clockScale,document.querySelector('#clockScaleValue'));
bindDisplayControl(clockVertical,document.querySelector('#clockVerticalValue'));
clockPosition.addEventListener('input',queueSave);
clockToggle.addEventListener('click',()=>{clockState.visible=!clockState.visible;renderClockToggle();saveSlots();});

function renderTickerToggle(){tickerToggleBtn.textContent=tickerState.visible?'ปิด Ticker':'เปิด Ticker';tickerToggleBtn.classList.toggle('is-off',!tickerState.visible);syncQuickToggles();}
tickerTextInput.addEventListener('input',queueSave);
tickerSpeedInput.addEventListener('input',()=>{document.querySelector('#tickerSpeedValue').textContent=tickerSpeedInput.value;queueSave();});
bindDisplayControl(tickerScaleInput,document.querySelector('#tickerScaleValue'));
tickerToggleBtn.addEventListener('click',()=>{tickerState.visible=!tickerState.visible;renderTickerToggle();saveSlots();});

function renderQrToggle(){qrToggleBtn.textContent=qrState.visible?'ปิด QR':'เปิด QR';qrToggleBtn.classList.toggle('is-off',!qrState.visible);syncQuickToggles();}
bindDisplayControl(qrScale,document.querySelector('#qrScaleValue'));
bindDisplayControl(qrVertical,document.querySelector('#qrVerticalValue'));
qrUrlInput.addEventListener('input',queueSave);
qrPosition.addEventListener('input',queueSave);
qrFullScreen.addEventListener('change',queueSave);
qrToggleBtn.addEventListener('click',()=>{qrState.visible=!qrState.visible;renderQrToggle();saveSlots();});

function renderWatermarkToggle(){watermarkToggleBtn.textContent=watermarkState.visible?'ปิด Watermark':'เปิด Watermark';watermarkToggleBtn.classList.toggle('is-off',!watermarkState.visible);syncQuickToggles();}
bindDisplayControl(watermarkScale,document.querySelector('#watermarkScaleValue'));
watermarkPosition.addEventListener('input',queueSave);
watermarkToggleBtn.addEventListener('click',()=>{watermarkState.visible=!watermarkState.visible;renderWatermarkToggle();saveSlots();});
watermarkFile.addEventListener('change',event=>{const picked=event.target.files[0];if(!picked)return;const reader=new FileReader();reader.onload=()=>{watermarkState.logo=reader.result;saveSlots();};reader.readAsDataURL(picked);});

qtClock.addEventListener('change',()=>{clockState.visible=qtClock.checked;renderClockToggle();saveSlots();});
qtTimer.addEventListener('change',()=>{timer.visible=qtTimer.checked;renderTimerToggle();saveSlots();});
qtTicker.addEventListener('change',()=>{tickerState.visible=qtTicker.checked;renderTickerToggle();saveSlots();});
qtLowerThird.addEventListener('change',()=>{saveSlots(qtLowerThird.checked);});
qtQr.addEventListener('change',()=>{qrState.visible=qtQr.checked;renderQrToggle();saveSlots();});
qtWatermark.addEventListener('change',()=>{watermarkState.visible=qtWatermark.checked;renderWatermarkToggle();saveSlots();});

const PRESET_KEY = 'boStudioPresets';
function loadPresets(){ try { return JSON.parse(localStorage.getItem(PRESET_KEY)) || []; } catch { return []; } }
function savePresets(list){ localStorage.setItem(PRESET_KEY, JSON.stringify(list)); }
function renderPresetOptions(){ const list = loadPresets(); presetSelect.innerHTML = '<option value="">— เลือก Preset —</option>' + list.map((p,i)=>`<option value="${i}">${p.name}</option>`).join(''); }
presetSaveBtn.addEventListener('click', () => {
    const name = presetNameInput.value.trim();
    if (!name) return;
    const list = loadPresets();
    list.push({ name, scale:Number(scaleInput.value), opacity:Number(opacityInput.value), position:positionInput.value, vertical:Number(verticalInput.value), backgroundColor:backgroundColorInput.value, textColor:textColorInput.value, graphicStyle:graphicStyleInput.value });
    savePresets(list);
    presetNameInput.value = '';
    renderPresetOptions();
});
presetApplyBtn.addEventListener('click', () => {
    if (presetSelect.value === '') return;
    const preset = loadPresets()[Number(presetSelect.value)];
    if (!preset) return;
    scaleInput.value = preset.scale; opacityInput.value = preset.opacity; positionInput.value = preset.position; verticalInput.value = preset.vertical; backgroundColorInput.value = preset.backgroundColor; textColorInput.value = preset.textColor; graphicStyleInput.value = preset.graphicStyle;
    document.querySelector('#scaleValue').textContent = `${scaleInput.value}%`;
    document.querySelector('#opacityValue').textContent = `${opacityInput.value}%`;
    document.querySelector('#verticalValue').textContent = `${verticalInput.value}%`;
    saveSlots();
});
presetDeleteBtn.addEventListener('click', () => {
    if (presetSelect.value === '') return;
    const list = loadPresets();
    list.splice(Number(presetSelect.value), 1);
    savePresets(list);
    renderPresetOptions();
});
renderPresetOptions();

const navItems = document.querySelectorAll('.dashboard-nav [data-tab]');
const tabPanels = Array.prototype.filter.call(document.querySelectorAll('[data-tab]'), el => !el.closest('.dashboard-nav'));
function showTab(tab) {
    navItems.forEach(item => item.classList.toggle('active', item.dataset.tab === tab));
    tabPanels.forEach(panel => { panel.style.display = panel.dataset.tab === tab ? '' : 'none'; });
}
navItems.forEach(item => item.addEventListener('click', () => showTab(item.dataset.tab)));
showTab('system');

function goLiveNext() {
    if (!slots.length) return;
    activeSlotIndex = (activeSlotIndex + 1) % slots.length;
    saveSlots(true, slots[activeSlotIndex]);
}
function goLiveIndex(index) {
    if (!slots[index]) return;
    activeSlotIndex = index;
    saveSlots(true, slots[index]);
}
document.addEventListener('keydown', (event) => {
    const tag = (event.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    if (event.code === 'Space') { event.preventDefault(); goLiveNext(); return; }
    if (event.key === 'Escape') { event.preventDefault(); saveSlots(false); return; }
    if (/^[0-9]$/.test(event.key)) { const n = event.key === '0' ? 10 : Number(event.key); goLiveIndex(n - 1); }
});
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

        clockState = { visible: state.clockVisible !== false };
        clockScale.value = state.clockScale ?? 100;
        clockPosition.value = state.clockPosition ?? "center";
        clockVertical.value = state.clockVertical ?? 4;

        document.querySelector("#clockScaleValue").textContent = `${clockScale.value}%`;
        document.querySelector("#clockVerticalValue").textContent = `${clockVertical.value}%`;

        tickerState = { visible: state.tickerVisible !== false };
        tickerTextInput.value = state.tickerText ?? '';
        tickerSpeedInput.value = state.tickerSpeed ?? 140;
        tickerScaleInput.value = state.tickerScale ?? 100;
        document.querySelector("#tickerSpeedValue").textContent = tickerSpeedInput.value;
        document.querySelector("#tickerScaleValue").textContent = `${tickerScaleInput.value}%`;

        qrState = { visible: state.qrVisible !== false };
        qrUrlInput.value = state.qrUrl ?? '';
        qrScale.value = state.qrScale ?? 100;
        qrPosition.value = state.qrPosition ?? 'right';
        qrVertical.value = state.qrVertical ?? 6;
        qrFullScreen.checked = Boolean(state.qrFullScreen);
        document.querySelector("#qrScaleValue").textContent = `${qrScale.value}%`;
        document.querySelector("#qrVerticalValue").textContent = `${qrVertical.value}%`;

        watermarkState = { visible: state.watermarkVisible !== false, logo: state.watermarkLogo ?? '' };
        watermarkScale.value = state.watermarkScale ?? 100;
        watermarkPosition.value = state.watermarkPosition ?? 'top-right';
        document.querySelector("#watermarkScaleValue").textContent = `${watermarkScale.value}%`;

        renderTimerToggle();
        renderClockToggle();
        renderTickerToggle();
        renderQrToggle();
        renderWatermarkToggle();
        renderTimer();
        render();

    } else {

        slots = defaults();
        renderClockToggle();
        renderTickerToggle();
        renderQrToggle();
        renderWatermarkToggle();
        render();

    }

})
.catch(() => {

    slots = defaults();
    render();

});

setInterval(renderTimer, 250);