# GRF Reader
GRF reader made in Javascript.

## Basic usage
The method `getFile` can be used to get the `Buffer` of the target file.

```js
const GRFReader = require('./GRF');
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
