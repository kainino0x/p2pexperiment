export const kWSPort = 47700; // client uses this if accessing by http://
export const kWSSPort = 47701; // client uses this if accessing by https://
export const kWSProtocol = 'something';

export function sendKeyedMessage(conn, key, value) {
  conn.send(JSON.stringify({ [key]: value }));
}
