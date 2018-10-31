const GRFReader = require('./GRF');
const grf = new GRFReader('./data.grf');

(async () => {
  const clientInfo = await grf.getFile('data\\clientinfo.xml');
  if (clientInfo) {
    console.log(clientInfo.toString('utf8'));
  }
})();