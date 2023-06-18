export const kWSPort = 47700;
export const kWSProtocol = 'something';

export function sendKeyedMessage(conn, key, value) {
  conn.send(JSON.stringify({ [key]: value }));
}
