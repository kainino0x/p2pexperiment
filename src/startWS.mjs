import { WebSocketServer } from 'ws';
import { kWSPort, kWSProtocol, sendKeyedMessage } from '../static/common.mjs';

export function startWS() {
  const server = new WebSocketServer({ port: kWSPort });
  console.log('WS on port:', kWSPort);

  const peerMap = new Map();
  let nextPeerId = 1001;

  function sendPeerList(self) {
    const peerList = [];
    for (const peer of peerMap.values()) {
      if (peer !== self) {
        peerList.push(peer.broadcast);
      }
    }

    sendKeyedMessage(self.conn, 'peerlist', {
      you: self.broadcast.id,
      peers: peerList,
    });
  }

  function sendAllPeerLists() {
    console.log('current peers:', Array.from(peerMap.keys()));
    for (const peer of peerMap.values()) {
      sendPeerList(peer);
    }
  }

  server.on('connection', conn => {
    if (conn.protocol !== kWSProtocol) {
      console.warn('WS wrong protocol:', conn.protocol);
      conn.close();
      return;
    }

    const selfId = nextPeerId++;
    const self = {
      conn,
      broadcast: {
        id: selfId,
      },
    };
    peerMap.set(selfId, self);
    sendAllPeerLists();

    conn.on('close', () => {
      peerMap.delete(selfId);
      sendAllPeerLists();
    });
    conn.on('error', () => {
      conn.close();
    });

    conn.on('message', data => {
      const msg = JSON.parse(data.toString());
      for (const [k, v] of Object.entries(msg)) {
        if (k in c2sHandlers) {
          c2sHandlers[k](v);
        } else {
          console.warn('c2s unknown key');
        }
      }
    });

    const c2sHandlers = {
      peersignal(v) {
        const peer = peerMap.get(v.to);
        if (!peer) {
          return;
        }
        sendKeyedMessage(peer.conn, 'peersignal', {
          from: selfId,
          data: v.data,
        });
      },
    };
  });
}
