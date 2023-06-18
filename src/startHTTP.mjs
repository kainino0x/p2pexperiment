import express from 'express';

const kHTTPPort = 47780;

export function startHTTP() {
  const app = express();
  app.use(express.static('./static'));
  app.listen(kHTTPPort, () => {
    console.log('HTTP on port:', kHTTPPort);
  });
}
