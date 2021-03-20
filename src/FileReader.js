const fs = require('fs');
const util = require('util');

const fsRead = util.promisify(fs.read);

class FileReader {
  constructor(path) {
    this.fd = fs.openSync(path, 'r');
    this.position = 0;
  }

  getMany(type, size) {
    const values = new Array(size);
    const func = `get${type}`;

    for (let i = 0; i < size; i += 1) {
      values[i] = this[func]();
    }
    return values;
  }

  getInt8() {
    const buffer = new Buffer.alloc(1);
    fs.readSync(this.fd, buffer, 0, 1, this.position);
    this.position += 1;

    return buffer.readInt8(0);
  }

  getUInt8() {
    const buffer = new Buffer.alloc(1);
    fs.readSync(this.fd, buffer, 0, 1, this.position);
    this.position += 1;

    return buffer.readUInt8(0);
  }

  getInt16() {
    const buffer = new Buffer.alloc(2);
    fs.readSync(this.fd, buffer, 0, 2, this.position);
    this.position += 2;

    return buffer.readInt16LE(0);
  }

  getUInt16() {
    const buffer = new Buffer.alloc(2);
    fs.readSync(this.fd, buffer, 0, 2, this.position);
    this.position += 2;

    return buffer.readUInt16LE(0);
  }

  getInt32() {
    const buffer = new Buffer.alloc(4);
    fs.readSync(this.fd, buffer, 0, 4, this.position);
    this.position += 4;

    return buffer.readInt32LE(0);
  }

  getUInt32() {
    const buffer = new Buffer.alloc(4);
    fs.readSync(this.fd, buffer, 0, 4, this.position);
    this.position += 4;

    return buffer.readUInt32LE(0);
  }

  getFloat() {
    const buffer = new Buffer.alloc(4);
    fs.readSync(this.fd, buffer, 0, 4, this.position);
    this.position += 4;

    return buffer.readFloatLE(0);
  }

  getDouble() {
    const buffer = new Buffer.alloc(8);
    fs.readSync(this.fd, buffer, 0, 8, this.position);
    this.position += 8;

    return buffer.readDoubleLE(0);
  }

  getString(length) {
    const buffer = new Buffer.alloc(length);
    fs.readSync(this.fd, buffer, 0, length, this.position);
    this.position += length;

    return buffer.toString('utf8');
  }

  getBinaryString(length) {
    let out = '';

    for (let i = 0; i < length; i += 1) {
      const uInt8 = this.getUInt8();
      if (!uInt8) {
        break;
      }
      out += String.fromCharCode(uInt8);
    }

    this.position += length;
    return out;
  }

  readStruct(struct) {
    const { list } = struct;
    const keys = Object.keys(list);
    const out = {};

    for (let i = 0; i < keys.length; i += 1) {
      const name = keys[i];
      const current = list[name];

      if (current.count > 1) {
        out[name] = new Array(current.count);

        for (let j = 0; j < current.count; j += 1) {
          out[name][j] = this[current.function]();
        }
      } else {
        out[name] = this[current.function]();
      }
    }

    return out;
  }

  async getBuffer(start, end, setPos = true) {
    const length = end - start;
    const buffer = new Buffer.alloc(length);
    await fsRead(this.fd, buffer, 0, length, start);

    if (setPos) {
      this.position += length;
    }

    return buffer;
  }

  getBufferSync(start, end, setPos = true) {
    const length = end - start;
    const buffer = new Buffer.alloc(length);

    fs.readSync(this.fd, buffer, 0, length, start);

    if (setPos) {
      this.position += length;
    }

    return buffer;
  }

  setPos(pos) {
    this.position = pos;
  }
}

module.exports = FileReader;
