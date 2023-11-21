// import { parseLinkHeader } from './parse-link-header.js';

const video = document.querySelector('video');
const nav = document.querySelector('nav');
const navUl = nav.querySelector('ul');
const navProgress = nav.querySelector('progress');

let statusTimer;

function apiUrl(url) {
    // TODO: should instead use "REACT_APP_API_PATH"
    return `/api/${url}`;
}

nav.addEventListener('click', () => {
    statusRefresh();
});

function setNav(visible) {
    setStatusTimer(visible);
    if (visible) {
        nav.classList.remove('hide');
    } else {
        nav.classList.add('hide');
    }
}
setNav(true);

function autoHideNav() {
    setNav(false);
    video.addEventListener('mousemove', event => {
        setNav(event.clientX <= 120 && event.clientY <= 120);
    });
    document.documentElement.addEventListener('mouseleave', event => {
        setNav(false);
    });
}

async function fetchStatus() {
    let currentStream = location.pathname.split(/\//g);
    currentStream = currentStream[currentStream.length - 1];
    const currentKey = `Bearer ${currentStream}`;
    const response = await fetch(apiUrl('status'));
    const json = await response.json();
    if (currentKey && !json.some(stream => stream.streamKey === currentKey)) {
        json.push({ streamKey: currentKey });
    }
    const body = [];
    for (const stream of json.sort((a, b) => a.streamKey.localeCompare(b.streamKey))) {
        const streamName = stream.streamKey.substring("Bearer ".length);
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.innerText = streamName;
        if (streamName === currentStream) {
            a.innerText = `→ ${a.innerText} ←`;
        }
        a.href = `/${encodeURIComponent(streamName)}`;
        li.appendChild(a);
        body.push(li);
    }
    navUl.replaceChildren(...body);
}

function setStatusTimer(running) {
    running = running ?? !nav.classList.contains('hide');
    if (running) {
        clearInterval(statusTimer);
        statusTimer = setInterval(() => {
            tickStatusTimer();
        }, 75);
    } else {
        clearInterval(statusTimer);
        statusTimer = undefined;
    }
}

async function tickStatusTimer() {
    navProgress.value += 1;
    if (navProgress.value >= navProgress.max) {
        await statusRefresh();
    }
}

async function statusRefresh() {
    if (statusTimer === undefined) {
        return;
    }
    navProgress.value = 0;
    setStatusTimer(false);
    await fetchStatus();
    setStatusTimer();
}

/** @param {string} message */
function pageError(message) {
    video.outerHTML = `<h1>${message}</h1>`;
}

/** @param {string} key */
async function pagePublish(key) {
    autoHideNav();
    if (!key) {
        pageError("No stream key specified in URL.");
        return;
    }

    const dialog = document.querySelector('dialog.publish');
    dialog.showModal();
    await new Promise(res => {
        dialog.addEventListener('close', event => {
            res();
        });
    });

    let stream;
    if (dialog.returnValue === 'webcam') {
        stream = navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
        });
    } else if (dialog.returnValue === 'screenshare') {
        stream = navigator.mediaDevices.getDisplayMedia({
            audio: true,
            video: true,
        });
    } else {
        pageError("Publish cancelled.");
        return;
    }

    const peerConnection = new RTCPeerConnection();
    stream = await stream;
    if (peerConnection.connectionState === "closed") {
        stream.getTracks().forEach(t => t.stop())
        return;
    }
    video.srcObject = stream;
    stream.getTracks().forEach(t => {
        if (t.kind === 'audio') {
            peerConnection.addTransceiver(t, { direction: 'sendonly' })
        } else {
            peerConnection.addTransceiver(t, {
                direction: 'sendonly',
                sendEncodings: [
                    {
                        rid: 'high'
                    },
                    {
                        rid: 'med',
                        scaleResolutionDownBy: 2.0
                    },
                    {
                        rid: 'low',
                        scaleResolutionDownBy: 4.0
                    }
                ]
            })
        }
    });

    const offer = await peerConnection.createOffer();
    peerConnection.setLocalDescription(offer);

    const response = await fetch(apiUrl(`whip`), {
        method: 'POST',
        body: offer.sdp,
        headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/sdp'
        }
    });

    const answer = await response.text();
    peerConnection.setRemoteDescription({
        sdp: answer,
        type: 'answer'
    });
}

/** @param {string} key */
async function pageStream(key) {
    if (!key) {
        pageError("No stream key specified in URL.");
        return;
    }

    autoHideNav();
    const peerConnection = new RTCPeerConnection();

    peerConnection.addEventListener('track', event => {
        video.srcObject = event.streams[0];
    });

    peerConnection.addTransceiver('audio', { direction: 'recvonly' });
    peerConnection.addTransceiver('video', { direction: 'recvonly' });

    const offer = await peerConnection.createOffer();
    peerConnection.setLocalDescription(offer);

    const response = await fetch(apiUrl(`whep`), {
        method: 'POST',
        body: offer.sdp,
        headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/sdp'
        }
    });

    /*
    TODO: for selecting from multiple video layers:

    const parsedLinkHeader = parseLinkHeader(r.headers.get('Link'));
    setLayerEndpoint(`${window.location.protocol}//${parsedLinkHeader['urn:ietf:params:whep:ext:core:layer'].url}`);

    const evtSource = new EventSource(`${window.location.protocol}//${parsedLinkHeader['urn:ietf:params:whep:ext:core:server-sent-events'].url}`);
    evtSource.onerror = err => evtSource.close();

    evtSource.addEventListener("layers", event => {
        const parsed = JSON.parse(event.data)
        setVideoLayers(parsed['1']['layers'].map(l => l.encodingId))
    });
    */

    const answer = await response.text();
    peerConnection.setRemoteDescription({
        sdp: answer,
        type: 'answer'
    });
}

function handleRoute() {
    const url = location.pathname;
    if (url.startsWith('/publish')) {
        pagePublish(url.substring('/publish/'.length));
    } else {
        pageStream(url.substring('/'.length));
    }
}
handleRoute();
