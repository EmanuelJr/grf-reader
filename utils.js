const zlib = require('zlib');

const inflateAsync = (data) => {
  return new Promise((resolve, reject) => {
    const cb = (err, buff) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(buff);
    };

    zlib.inflate(data, cb);
  });
};

module.exports = {
  inflateAsync,
};