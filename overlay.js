import { stateRef, onSnapshot } from "./firestore.js";
const lowerThird = document.querySelector('#lowerThird');
const countdown = document.querySelector('#countdown');
const timerValue = document.querySelector('#timerValue');
const clock = document.querySelector('#clock');
const clockValue = document.querySelector('#clockValue');
const ticker = document.querySelector('#ticker');
const tickerTrack = document.querySelector('#tickerTrack');
const qr = document.querySelector('#qr');
const qrImage = document.querySelector('#qrImage');
const watermark = document.querySelector('#watermark');
const watermarkImage = document.querySelector('#watermarkImage');
let revision = -1, contentSignature = '', switching = false, pendingState = null, timer = null, tickerAnim = null, tickerSignature = '', qrFullscreenActive = false;

function updateSuppression() { const timerBlocking = Boolean(timer && timer.fullscreen && timer.visible); lowerThird.classList.toggle('suppressed', timerBlocking || qrFullscreenActive); }

function applyClock(state) { clock.style.setProperty('--clock-scale', `${Number(state.clockScale ?? 100) / 100}`); clock.style.setProperty('--clock-top', `${Number(state.clockVertical ?? 4)}%`); clock.classList.remove('position-left', 'position-center', 'position-right'); clock.classList.add(`position-${state.clockPosition || 'center'}`); clock.classList.toggle('visible', state.clockVisible !== false); }
function renderClock() { const now = new Date(); const pad = (value) => String(value).padStart(2, '0'); clockValue.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`; }
setInterval(renderClock, 1000);
renderClock();

function applyTicker(state) {
    const text = (state.tickerText || '').trim();
    const visible = Boolean(state.tickerVisible) && text.length > 0;
    const scale = Number(state.tickerScale ?? 100);
    const signature = `${text}|${state.tickerSpeed}|${scale}|${visible}`;
    ticker.classList.toggle('visible', visible);
    if (!visible) { if (tickerAnim) { tickerAnim.cancel(); tickerAnim = null; } tickerSignature = signature; return; }
    if (signature === tickerSignature) return;
    tickerSignature = signature;
    tickerTrack.textContent = text;
    tickerTrack.style.fontSize = `${27 * (scale / 100)}px`;
    if (tickerAnim) tickerAnim.cancel();
    requestAnimationFrame(() => {
        const textWidth = tickerTrack.scrollWidth;
        const startX = window.innerWidth;
        const endX = -textWidth;
        const distance = startX - endX;
        const speed = Math.max(20, Number(state.tickerSpeed || 140));
        const duration = Math.max(6000, (distance / speed) * 1000);
        tickerAnim = tickerTrack.animate(
            [{ transform: `translate(${startX}px,-50%)` }, { transform: `translate(${endX}px,-50%)` }],
            { duration, iterations: Infinity, easing: 'linear' }
        );
    });
}

function applyQr(state) {
    const url = (state.qrUrl || '').trim();
    const visible = Boolean(state.qrVisible) && url.length > 0;
    const fullscreen = Boolean(state.qrFullScreen);
    qr.classList.toggle('visible', visible);
    qr.classList.toggle('fullscreen', visible && fullscreen);
    qrFullscreenActive = visible && fullscreen;
    updateSuppression();
    if (!visible) return;
    const size = fullscreen ? 480 : 260;
    const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
    if (qrImage.dataset.src !== src) { qrImage.src = src; qrImage.dataset.src = src; }
    qr.style.setProperty('--qr-scale', `${Number(state.qrScale ?? 100) / 100}`);
    qr.style.setProperty('--qr-top', `${Number(state.qrVertical ?? 6)}%`);
    qr.classList.remove('position-left', 'position-center', 'position-right');
    qr.classList.add(`position-${state.qrPosition || 'right'}`);
}

function applyWatermark(state) {
    const visible = Boolean(state.watermarkVisible) && Boolean(state.watermarkLogo);
    watermark.classList.toggle('visible', visible);
    if (!visible) return;
    if (watermarkImage.dataset.src !== state.watermarkLogo) { watermarkImage.src = state.watermarkLogo; watermarkImage.dataset.src = state.watermarkLogo; }
    watermark.classList.remove('corner-top-left', 'corner-top-right', 'corner-bottom-left', 'corner-bottom-right');
    watermark.classList.add(`corner-${state.watermarkPosition || 'top-right'}`);
    watermark.style.setProperty('--watermark-scale', `${Number(state.watermarkScale ?? 100) / 100}`);
}

function applyContent(state) { document.querySelector('#tag').textContent = state.tag || ''; document.querySelector('#name').textContent = state.name || ''; document.querySelector('#role').textContent = state.role || ''; document.querySelector('#logo').src = state.logo || ''; document.querySelector('#logoWrap').classList.toggle('has-logo', Boolean(state.logo)); }
function applyPresentation(state) { lowerThird.style.setProperty('--lower-third-scale', `${Number(state.scale || 75) / 100}`); lowerThird.style.setProperty('--display-opacity', `${Number(state.opacity ?? 100) / 100}`); lowerThird.style.setProperty('--lower-third-bottom', `${Number(state.vertical ?? 8)}%`); lowerThird.style.setProperty('--panel-bg', state.backgroundColor || '#ffffff'); lowerThird.style.setProperty('--text-color', state.textColor || '#17191d'); lowerThird.classList.remove('position-left', 'position-center', 'position-right', 'style-classic', 'style-rounded', 'style-minimal'); lowerThird.classList.add(`position-${state.position || 'left'}`, `style-${state.graphicStyle || 'classic'}`); lowerThird.classList.remove('effect-none', 'effect-shine-loop', 'effect-glow', 'effect-sparkle'); lowerThird.classList.add(`effect-${state.effectStyle || 'none'}`); }
function applyTimer(state) { timer = { duration:Number(state.timerDuration ?? 900), remaining:Number(state.timerRemaining ?? 900), running:Boolean(state.timerRunning), startedAt:Number(state.timerStartedAt || 0), visible:state.timerVisible !== false, scale:Number(state.timerScale ?? 100), fullscreen:Boolean(state.timerFullScreen) }; countdown.style.setProperty('--countdown-scale', `${timer.scale / 100}`); countdown.classList.toggle('fullscreen', timer.fullscreen); updateSuppression(); renderTimer(); }
function renderTimer() { if (!timer) return; const remaining = timer.running ? Math.max(0, timer.remaining - Math.floor((Date.now() - timer.startedAt) / 1000)) : timer.remaining; timerValue.textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`; countdown.classList.toggle('visible', timer.visible); }
function switchToLatest() { const state = pendingState; if (!state) return; applyContent(state); applyPresentation(state); applyTimer(state); applyClock(state); lowerThird.classList.toggle('visible', Boolean(state.visible)); switching = false; }
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

    applyTicker(state);
    applyQr(state);
    applyWatermark(state);

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
    applyClock(state);

    lowerThird.classList.toggle(
        "visible",
        Boolean(state.visible)
    );

});