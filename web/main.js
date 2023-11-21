// import { parseLinkHeader } from './parse-link-header.js';

const video = document.querySelector('video');

/** @param {string} message */
function pageError(message) {
    video.outerHTML = `<h1>${message}</h1>`;
}

/** @param {string} key */
async function pagePublish(key) {
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

    // TODO: should instead use "REACT_APP_API_PATH"
    const response = await fetch(`/api/whip`, {
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

    const peerConnection = new RTCPeerConnection();

    peerConnection.addEventListener('track', event => {
        video.srcObject = event.streams[0];
    });

    peerConnection.addTransceiver('audio', { direction: 'recvonly' });
    peerConnection.addTransceiver('video', { direction: 'recvonly' });

    const offer = await peerConnection.createOffer();
    peerConnection.setLocalDescription(offer);

    // TODO: should instead use "REACT_APP_API_PATH"
    const response = await fetch(`/api/whep`, {
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
