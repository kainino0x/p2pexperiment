import { kWSProtocol, kWSPort, sendKeyedMessage } from './common.mjs';

const ws = new WebSocket(`ws://${window.location.hostname}:${kWSPort}`, kWSProtocol);

let selfId;
const peerMap = new Map();

function p2pBroadcast(k, v) {
  for (const peer of peerMap.values()) {
    sendKeyedMessage(peer.simplePeer, k, v);
  }
}

// HTML stuff

function updateHTMLPeerList() {
  htmlPeerList.innerText = `You are: ${selfId}. Connected to peers: ${Array.from(peerMap.keys()).join(', ')}.`;
}
function addHTMLChatLog(from, msg) {
  const htmlMsg = document.createElement('span')
  htmlMsg.innerText = msg;
  const htmlLi = document.createElement('li');
  htmlLi.innerText = `${from}: `;
  htmlLi.appendChild(htmlMsg);
  htmlChatLog.appendChild(htmlLi);
}

htmlForm.onsubmit = ev => {
  ev.preventDefault();

  const msg = htmlMsgBox.value;
  if (msg) {
    htmlMsgBox.value = '';
    addHTMLChatLog(selfId, msg);
    p2pBroadcast('chatmsg', msg);
  }
};

// Canvas stuff

const kCanvasWidth = 60, kCanvasHeight = 30;
htmlCanvas.width = kCanvasWidth;
htmlCanvas.height = kCanvasHeight;
const ctx = htmlCanvas.getContext('2d');
htmlCanvas.ondblclick = ev => {
  // prevent double tap zoom on mobile
  ev.preventDefault();
};
htmlCanvas.onclick = ev => {
  const bound = ev.target.getBoundingClientRect();
  const x = Math.floor((ev.clientX - bound.x) / bound.width * kCanvasWidth);
  const y = Math.floor((ev.clientY - bound.y) / bound.height * kCanvasHeight);
  addCanvasDot(selfId, { x, y });
  p2pBroadcast('draw', { x, y });
};

function addCanvasDot(id, { x, y }) {
  if (!id) return;
  const hue = (id * 0.61803399) % 1.0;
  ctx.fillStyle = `oklch(50% 0.15 ${hue}turn)`;
  ctx.fillRect(x, y, 1, 1);
}

// Networking

ws.onopen = evOpen => {
  htmlMsgBox.disabled = false;

  // WebSocket (client-server) stuff

  ws.onmessage = evMessage => {
    const msg = JSON.parse(evMessage.data);
    for (const [k, v] of Object.entries(msg)) {
      if (k in s2cHandlers) {
        s2cHandlers[k](v);
      } else {
        console.warn('s2c unknown key');
      }
    }
  };

  const s2cHandlers = {
    peerlist(v) {
      if (selfId && selfId !== v.you) {
        throw Error('self id changed');
      }
      selfId = v.you;

      const latestPeers = new Set();
      for (const { id } of v.peers) {
        latestPeers.add(id);
        if (!peerMap.has(id)) {
          const simplePeer = initSimplePeer(id);
          peerMap.set(id, {
            simplePeer,
          });
        }
      }
      for (const id of peerMap.keys()) {
        if (!latestPeers.has(id)) {
          peerMap.delete(id);
        }
      }
      updateHTMLPeerList();
    },
    peersignal(v) {
      const peer = peerMap.get(v.from);
      if (!peer) {
        return;
      }
      peer.simplePeer.signal(v.data);
    },
  };

  // SimplePeer (P2P) stuff

  function initSimplePeer(id) {
    const sp = new SimplePeer({
      initiator: selfId < id,
      trickle: false, // ?
    });
    sp.on('error', err => console.log('SimplePeer error', err));
    sp.on('signal', data => {
      sendKeyedMessage(ws, 'peersignal', {
        to: id,
        data,
      });
    });
    sp.on('connect', () => {
    });
    sp.on('close', () => {
    });
    sp.on('data', data => {
      const msg = JSON.parse(data);
      for (const [k, v] of Object.entries(msg)) {
        if (k in p2pHandlers) {
          p2pHandlers[k](id, v);
        } else {
          console.warn('p2p unknown key');
        }
      }
    });
    return sp;
  }

  const p2pHandlers = {
    chatmsg(from, v) {
      addHTMLChatLog(from, v);
    },
    draw(from, v) {
      addCanvasDot(from, v);
    },
  };
};
