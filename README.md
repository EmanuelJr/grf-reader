# GRF Reader
GRF Reader is a Javascript library to read Ragnarok GRF files.

## Basic usage
The method `getFile` can be used to get the `Buffer` of the target file.
You can get the file list on `entries` field.

```js
const GRFReader = require('grf-reader');

const grf = new GRFReader('./data.grf');

const getClientInfo = async () => {
  const clientInfo = await grf.getFile('data\\clientinfo.xml');
  return clientInfo.toString('utf8');
};

getClientInfo()
  .then(console.log)
  .catch(console.error);
```
