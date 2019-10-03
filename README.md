# GRF Reader [![npm version](https://badge.fury.io/js/grf-reader.svg)](https://www.npmjs.com/package/grf-reader)
GRF Reader is a library for read GRF files, based in Promise functions.

## Basic usage
The method `getFile` can be used to get the `Buffer` of the target file.
You can get the file list on `entries` field.

```js
const GRFReader = require('grf-reader');
const grf = new GRFReader('./data.grf');

(async () => {
  try {
    const clientInfo = await grf.getFile('data\\clientinfo.xml');
    console.log(clientInfo.toString('utf8'));
  } catch (e) {
    console.log(e);
  }
})();
```

