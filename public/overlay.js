import { stateRef, onSnapshot } from "./firestore.js";
const lowerThird = document.querySelector('#lowerThird');
const countdown = document.querySelector('#countdown');
const timerValue = document.querySelector('#timerValue');
let revision = -1, contentSignature = '', switching = false, pendingState = null, timer = null;

function applyContent(state) { document.querySelector('#tag').textContent = state.tag || ''; document.querySelector('#name').textContent = state.name || ''; document.querySelector('#role').textContent = state.role || ''; document.querySelector('#logo').src = state.logo || ''; document.querySelector('#logoWrap').classList.toggle('has-logo', Boolean(state.logo)); }
function applyPresentation(state) { lowerThird.style.setProperty('--lower-third-scale', `${Number(state.scale || 75) / 100}`); lowerThird.style.setProperty('--display-opacity', `${Number(state.opacity ?? 100) / 100}`); lowerThird.style.setProperty('--lower-third-bottom', `${Number(state.vertical ?? 8)}%`); lowerThird.style.setProperty('--panel-bg', state.backgroundColor || '#ffffff'); lowerThird.style.setProperty('--text-color', state.textColor || '#17191d'); lowerThird.classList.remove('position-left', 'position-center', 'position-right', 'style-classic', 'style-rounded', 'style-minimal'); lowerThird.classList.add(`position-${state.position || 'left'}`, `style-${state.graphicStyle || 'classic'}`); }
function applyTimer(state) { timer = { duration:Number(state.timerDuration ?? 900), remaining:Number(state.timerRemaining ?? 900), running:Boolean(state.timerRunning), startedAt:Number(state.timerStartedAt || 0), visible:state.timerVisible !== false, scale:Number(state.timerScale ?? 100), fullscreen:Boolean(state.timerFullScreen) }; countdown.style.setProperty('--countdown-scale', `${timer.scale / 100}`); countdown.classList.toggle('fullscreen', timer.fullscreen); lowerThird.classList.toggle('suppressed', timer.fullscreen && timer.visible); renderTimer(); }
function renderTimer() { if (!timer) return; const remaining = timer.running ? Math.max(0, timer.remaining - Math.floor((Date.now() - timer.startedAt) / 1000)) : timer.remaining; timerValue.textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`; countdown.classList.toggle('visible', timer.visible); }
function switchToLatest() { const state = pendingState; if (!state) return; applyContent(state); applyPresentation(state); applyTimer(state); lowerThird.classList.toggle('visible', Boolean(state.visible)); switching = false; }
setInterval(renderTimer, 250);
onSnapshot(stateRef, (docSnap) => {

    if (!docSnap.exists()) {
        lowerThird.classList.remove("visible");
        return;
    }

    const state = docSnap.data();

    const nextSignature = [
        state.tag,
        state.name,
        state.role,
        state.logo
    ].join("|");

    const changedPerson =
        contentSignature &&
        nextSignature !== contentSignature;

    contentSignature = nextSignature;

    pendingState = state;

    if (
        switching ||
        (state.visible &&
            changedPerson &&
            lowerThird.classList.contains("visible"))
    ) {

        switching = true;

        lowerThird.classList.remove("visible");

        window.setTimeout(switchToLatest,620);

        return;

    }

    applyContent(state);
    applyPresentation(state);
    applyTimer(state);

    lowerThird.classList.toggle(
        "visible",
        Boolean(state.visible)
    );

});