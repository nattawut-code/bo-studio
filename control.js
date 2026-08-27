import { stateRef, presetsRef, getDoc, setDoc } from "./firestore.js";

// บีบอัด/ย่อขนาดรูปก่อนแปลงเป็น base64 เก็บใน Firestore
// กันไม่ให้รูปจากมือถือ (มักหลาย MB) ทำให้ document ใหญ่จนเสี่ยงชน 1MB limit ของ Firestore
function loadImageEl(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(img.src); resolve(img); };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}
async function fileToCompressedDataURL(file, maxDim = 480, maxBytes = 350 * 1024) {
    const okTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!okTypes.includes(file.type)) throw new Error('รองรับเฉพาะไฟล์ PNG, JPEG หรือ WEBP');
    const img = await loadImageEl(file);
    let { width, height } = img;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
    const isPng = file.type === 'image/png';
    let quality = 0.85;
    let dataUrl = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality);
    // ถ้าเป็น JPEG/WEBP และยังใหญ่เกิน ลดคุณภาพลงเรื่อยๆ (PNG โปร่งใสลดคุณภาพไม่ได้ ลดได้แค่ขนาดมิติ)
    while (!isPng && dataUrl.length > maxBytes * 1.37 && quality > 0.4) {
        quality -= 0.15;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
    }
    if (dataUrl.length > maxBytes * 1.37) {
        throw new Error('ไฟล์ยังใหญ่เกินไปหลังบีบอัดแล้ว ลองเลือกรูปที่มีขนาดเล็กลง หรือพื้นหลังโปร่งใสน้อยลง');
    }
    return dataUrl;
}
const grid = document.querySelector('#slotsGrid');
const scaleInput = document.querySelector('#scale'), opacityInput = document.querySelector('#opacity'), positionInput = document.querySelector('#position'), verticalInput = document.querySelector('#vertical'), backgroundColorInput = document.querySelector('#backgroundColor'), textColorInput = document.querySelector('#textColor'), graphicStyleInput = document.querySelector('#graphicStyle'), effectStyleInput = document.querySelector('#effectStyle');
const timerMinutes = document.querySelector('#timerMinutes'), timerDisplay = document.querySelector('#timerDisplay'), timerToggle = document.querySelector('#timerToggle'), timerScale = document.querySelector('#timerScale'), timerFullScreen = document.querySelector('#timerFullScreen');
const clockScale = document.querySelector('#clockScale'), clockPosition = document.querySelector('#clockPosition'), clockVertical = document.querySelector('#clockVertical'), clockToggle = document.querySelector('#clockToggle');
const presetSelect = document.querySelector('#presetSelect'), presetApplyBtn = document.querySelector('#presetApply'), presetDeleteBtn = document.querySelector('#presetDelete'), presetNameInput = document.querySelector('#presetName'), presetSaveBtn = document.querySelector('#presetSave');
const tickerTextInput = document.querySelector('#tickerText'), tickerSpeedInput = document.querySelector('#tickerSpeed'), tickerScaleInput = document.querySelector('#tickerScale'), tickerToggleBtn = document.querySelector('#tickerToggle');
const qrUrlInput = document.querySelector('#qrUrl'), qrScale = document.querySelector('#qrScale'), qrPosition = document.querySelector('#qrPosition'), qrVertical = document.querySelector('#qrVertical'), qrToggleBtn = document.querySelector('#qrToggle'), qrFullScreen = document.querySelector('#qrFullScreen');
const watermarkFile = document.querySelector('#watermarkFile'), watermarkScale = document.querySelector('#watermarkScale'), watermarkPosition = document.querySelector('#watermarkPosition'), watermarkToggleBtn = document.querySelector('#watermarkToggle');
const qtClock = document.querySelector('#qtClock'), qtTimer = document.querySelector('#qtTimer'), qtTicker = document.querySelector('#qtTicker'), qtLowerThird = document.querySelector('#qtLowerThird'), qtQr = document.querySelector('#qtQr'), qtWatermark = document.querySelector('#qtWatermark');
const syncStatusEl = document.querySelector('#syncStatus');
const previewToggleBtn = document.querySelector('#togglePreview'), livePreviewBox = document.querySelector('#livePreview');
let slots = [], currentVisible = false, saveTimer, timer = { duration:900, remaining:900, running:false, startedAt:null, visible:true }, clockState = { visible:true }, tickerState = { visible:true }, qrState = { visible:true }, watermarkState = { visible:true, logo:'' }, activeSlotIndex = -1;
function defaults() { return Array.from({ length:10 }, (_, index) => ({ id:index+1, name:`ชื่อ-นามสกุล คนที่ ${index+1}`, role:'ตำแหน่ง / รายละเอียด', logo:'' })); }
function remainingTimer() { return timer.running ? Math.max(0, timer.remaining - Math.floor((Date.now() - timer.startedAt) / 1000)) : timer.remaining; }
function renderTimer() { const value = remainingTimer(); timerDisplay.textContent = `${String(Math.floor(value / 60)).padStart(2,'0')}:${String(value % 60).padStart(2,'0')}`; }
function setQtState(input, on) { if (!input) return; input.checked = on; input.parentElement.classList.toggle('is-on', on); }
function setSyncStatus(state) {
    if (!syncStatusEl) return;
    syncStatusEl.classList.remove('sync-saving', 'sync-saved', 'sync-error', 'sync-offline');
    if (state === 'saving') { syncStatusEl.textContent = '● กำลังบันทึก...'; syncStatusEl.classList.add('sync-saving'); }
    else if (state === 'error') { syncStatusEl.textContent = '⚠ บันทึกไม่สำเร็จ'; syncStatusEl.classList.add('sync-error'); }
    else if (state === 'offline') { syncStatusEl.textContent = '⚠ ออฟไลน์ / ไม่มีเน็ต'; syncStatusEl.classList.add('sync-offline'); }
    else { syncStatusEl.textContent = '● บันทึกแล้ว'; syncStatusEl.classList.add('sync-saved'); }
}
window.addEventListener('online', () => setSyncStatus('saved'));
window.addEventListener('offline', () => setSyncStatus('offline'));
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
        effectStyle: effectStyleInput.value,
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

    if (!navigator.onLine) {
        setSyncStatus('offline');
        currentVisible = visible;
        syncQuickToggles();
        return;
    }

    setSyncStatus('saving');
    try {
        await setDoc(stateRef, body);
        setSyncStatus('saved');
    } catch (err) {
        console.error('บันทึกไม่สำเร็จ:', err);
        setSyncStatus('error');
    }

    currentVisible = visible;
    syncQuickToggles();
}

function render() { grid.replaceChildren(); slots.forEach((slot,index) => { const card = document.createElement('section'); card.className='slot-card'; card.innerHTML=`<div class="slot-title"><strong>♟ ข้อมูลคนที่ ${index+1}</strong><button type="button" class="go-live">▶ เอาขึ้นจอ</button></div><div class="slot-body"><label class="logo-picker"><input type="file" accept="image/png,image/jpeg,image/webp"><span class="logo-preview"><img alt=""><b>LOGO</b></span><em>เปลี่ยนโลโก้</em></label><div class="slot-fields"><input class="slot-name" maxlength="60" aria-label="ชื่อ"><input class="slot-role" maxlength="80" aria-label="ตำแหน่ง"></div></div>`; const image=card.querySelector('img'), placeholder=card.querySelector('b'), file=card.querySelector('input[type=file]'), name=card.querySelector('.slot-name'), role=card.querySelector('.slot-role'); image.src=slot.logo||''; image.hidden=!slot.logo; placeholder.hidden=Boolean(slot.logo); name.value=slot.name; role.value=slot.role; name.addEventListener('input',()=>{slot.name=name.value;queueSave();}); role.addEventListener('input',()=>{slot.role=role.value;queueSave();}); file.addEventListener('change',async event=>{const picked=event.target.files[0];if(!picked)return;const originalLabel=placeholder.textContent;placeholder.textContent='กำลังประมวลผล...';placeholder.hidden=false;try{const dataUrl=await fileToCompressedDataURL(picked);slot.logo=dataUrl;image.src=slot.logo;image.hidden=false;placeholder.hidden=true;queueSave();}catch(err){placeholder.textContent=originalLabel;alert('ไม่สามารถใช้รูปนี้ได้: '+err.message);}}); card.querySelector('.go-live').addEventListener('click',()=>{activeSlotIndex=index;saveSlots(true,slot);}); grid.append(card); }); }
function bindDisplayControl(input, output) { input.addEventListener('input',()=>{output.textContent=`${input.value}%`;queueSave();}); }
document.querySelector('#hideAll').addEventListener('click',()=>saveSlots(false)); bindDisplayControl(scaleInput,document.querySelector('#scaleValue')); bindDisplayControl(opacityInput,document.querySelector('#opacityValue')); bindDisplayControl(verticalInput,document.querySelector('#verticalValue'));
[positionInput,backgroundColorInput,textColorInput,graphicStyleInput,effectStyleInput].forEach(input=>input.addEventListener('input',queueSave)); document.querySelector('#resetColors').addEventListener('click',()=>{backgroundColorInput.value='#ffffff';textColorInput.value='#17191d';saveSlots();});
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
watermarkFile.addEventListener('change',async event=>{const picked=event.target.files[0];if(!picked)return;watermarkFile.disabled=true;try{watermarkState.logo=await fileToCompressedDataURL(picked);saveSlots();}catch(err){alert('ไม่สามารถใช้รูปนี้ได้: '+err.message);}finally{watermarkFile.disabled=false;}});

qtClock.addEventListener('change',()=>{clockState.visible=qtClock.checked;renderClockToggle();saveSlots();});
qtTimer.addEventListener('change',()=>{timer.visible=qtTimer.checked;renderTimerToggle();saveSlots();});
qtTicker.addEventListener('change',()=>{tickerState.visible=qtTicker.checked;renderTickerToggle();saveSlots();});
qtLowerThird.addEventListener('change',()=>{
    if (qtLowerThird.checked && activeSlotIndex === -1) {
        showTab('people');
        qtLowerThird.checked = false;
        alert('ยังไม่เคยกด "เอาขึ้นจอ" ให้ใครเลย — เลือกคนในแท็บ "รายชื่อคน" แล้วกด "เอาขึ้นจอ" ก่อน');
        return;
    }
    saveSlots(qtLowerThird.checked);
});
qtQr.addEventListener('change',()=>{
    if (qtQr.checked && !qrUrlInput.value.trim()) {
        showTab('qr');
        qrUrlInput.focus();
        qtQr.checked = false;
        alert('ยังไม่ได้ใส่ลิงก์ / ข้อความ QR — กรอกในแท็บ "QR Code" ก่อน');
        return;
    }
    qrState.visible=qtQr.checked;renderQrToggle();saveSlots();
});
qtWatermark.addEventListener('change',()=>{
    if (qtWatermark.checked && !watermarkState.logo) {
        showTab('watermark');
        qtWatermark.checked = false;
        alert('ยังไม่ได้อัปโหลดโลโก้ — เลือกไฟล์ในแท็บ "Watermark" ก่อน');
        return;
    }
    watermarkState.visible=qtWatermark.checked;renderWatermarkToggle();saveSlots();
});

let presetList = [];
async function loadPresetsFromCloud() {
    try {
        const snap = await getDoc(presetsRef);
        if (snap.exists() && Array.isArray(snap.data().list)) {
            presetList = snap.data().list;
            return;
        }
    } catch (err) {
        console.error('โหลด preset จาก Firestore ไม่สำเร็จ:', err);
    }
    // ยังไม่มี preset บน Firestore — ลองย้ายจาก localStorage เดิม (ทำครั้งเดียว)
    try {
        const legacy = JSON.parse(localStorage.getItem('boStudioPresets')) || [];
        if (legacy.length) {
            presetList = legacy;
            await setDoc(presetsRef, { list: presetList });
        }
    } catch { /* ไม่มีของเดิมก็ไม่เป็นไร */ }
}
function renderPresetOptions(){ presetSelect.innerHTML = '<option value="">— เลือก Preset —</option>' + presetList.map((p,i)=>`<option value="${i}">${p.name}</option>`).join(''); }
async function savePresetList() {
    try { await setDoc(presetsRef, { list: presetList }); }
    catch (err) { alert('บันทึก Preset ไม่สำเร็จ: ' + err.message); }
}
presetSaveBtn.addEventListener('click', async () => {
    const name = presetNameInput.value.trim();
    if (!name) return;
    presetList.push({
        name,
        scale:Number(scaleInput.value), opacity:Number(opacityInput.value), position:positionInput.value, vertical:Number(verticalInput.value),
        backgroundColor:backgroundColorInput.value, textColor:textColorInput.value, graphicStyle:graphicStyleInput.value, effectStyle:effectStyleInput.value,
        timerVisible: timer.visible, clockVisible: clockState.visible, tickerVisible: tickerState.visible, qrVisible: qrState.visible, watermarkVisible: watermarkState.visible
    });
    presetNameInput.value = '';
    renderPresetOptions();
    await savePresetList();
});
presetApplyBtn.addEventListener('click', async () => {
    if (presetSelect.value === '') return;
    const preset = presetList[Number(presetSelect.value)];
    if (!preset) return;
    scaleInput.value = preset.scale; opacityInput.value = preset.opacity; positionInput.value = preset.position; verticalInput.value = preset.vertical; backgroundColorInput.value = preset.backgroundColor; textColorInput.value = preset.textColor; graphicStyleInput.value = preset.graphicStyle; effectStyleInput.value = preset.effectStyle ?? "none";
    document.querySelector('#scaleValue').textContent = `${scaleInput.value}%`;
    document.querySelector('#opacityValue').textContent = `${opacityInput.value}%`;
    document.querySelector('#verticalValue').textContent = `${verticalInput.value}%`;
    if (preset.timerVisible !== undefined) { timer.visible = preset.timerVisible; renderTimerToggle(); }
    if (preset.clockVisible !== undefined) { clockState.visible = preset.clockVisible; renderClockToggle(); }
    if (preset.tickerVisible !== undefined) { tickerState.visible = preset.tickerVisible; renderTickerToggle(); }
    if (preset.qrVisible !== undefined) { qrState.visible = preset.qrVisible; renderQrToggle(); }
    if (preset.watermarkVisible !== undefined) { watermarkState.visible = preset.watermarkVisible; renderWatermarkToggle(); }
    saveSlots();
});
presetDeleteBtn.addEventListener('click', async () => {
    if (presetSelect.value === '') return;
    presetList.splice(Number(presetSelect.value), 1);
    renderPresetOptions();
    await savePresetList();
});
loadPresetsFromCloud().then(renderPresetOptions);

const navItems = document.querySelectorAll('.dashboard-nav [data-tab]');
const tabPanels = Array.prototype.filter.call(document.querySelectorAll('[data-tab]'), el => !el.closest('.dashboard-nav'));
function showTab(tab) {
    navItems.forEach(item => item.classList.toggle('active', item.dataset.tab === tab));
    tabPanels.forEach(panel => { panel.style.display = panel.dataset.tab === tab ? '' : 'none'; });
}
navItems.forEach(item => item.addEventListener('click', () => showTab(item.dataset.tab)));
showTab('system');

if (previewToggleBtn && livePreviewBox) {
    previewToggleBtn.addEventListener('click', () => {
        const hidden = livePreviewBox.classList.toggle('collapsed');
        previewToggleBtn.textContent = hidden ? 'แสดง' : 'ซ่อน';
    });
}

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
        effectStyleInput.value = state.effectStyle ?? "none";

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