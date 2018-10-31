# GRF Reader
GRF reader made in Javascript.

## Basic usage
The method `getFile` can be used to get the `Buffer` of the target file, if it exists. `null` is returned otherwise.

```js
const GRFReader = require('./GRF');
const grf = new GRFReader('./data.grf');

(async () => {
  const clientInfo = await grf.getFile('data\\clientinfo.xml');
  if (clientInfo) {
    console.log(clientInfo.toString('utf8'));
  }
})();
```
