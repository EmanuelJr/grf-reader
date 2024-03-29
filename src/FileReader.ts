import * as fs from 'fs';
import * as util from 'util';

const fsRead = util.promisify(fs.read);

class FileReader {
  private fd: number;
  private position: number;
  private size: number;

  constructor(path: string) {
    this.fd = fs.openSync(path, 'r');
    this.size = fs.fstatSync(this.fd).size;
    this.position = 0;
  }

  getSize() {
    return this.size;
  }

  getMany(type: string, size: number) {
    const values = new Array(size);
    const func = `get${type}`;

    for (let i = 0; i < size; i += 1) {
      values[i] = this[func]();
    }
    return values;
  }

  getInt8() {
    const buffer = Buffer.alloc(1);
    fs.readSync(this.fd, buffer, 0, 1, this.position);
    this.position += 1;

    return buffer.readInt8(0);
  }

  getUInt8() {
    const buffer = Buffer.alloc(1);
    fs.readSync(this.fd, buffer, 0, 1, this.position);
    this.position += 1;

    return buffer.readUInt8(0);
  }

  getInt16() {
    const buffer = Buffer.alloc(2);
    fs.readSync(this.fd, buffer, 0, 2, this.position);
    this.position += 2;

    return buffer.readInt16LE(0);
  }

  getUInt16() {
    const buffer = Buffer.alloc(2);
    fs.readSync(this.fd, buffer, 0, 2, this.position);
    this.position += 2;

    return buffer.readUInt16LE(0);
  }

  getInt32() {
    const buffer = Buffer.alloc(4);
    fs.readSync(this.fd, buffer, 0, 4, this.position);
    this.position += 4;

    return buffer.readInt32LE(0);
  }

  getUInt32() {
    const buffer = Buffer.alloc(4);
    fs.readSync(this.fd, buffer, 0, 4, this.position);
    this.position += 4;

    return buffer.readUInt32LE(0);
  }

  getFloat() {
    const buffer = Buffer.alloc(4);
    fs.readSync(this.fd, buffer, 0, 4, this.position);
    this.position += 4;

    return buffer.readFloatLE(0);
  }

  getDouble() {
    const buffer = Buffer.alloc(8);
    fs.readSync(this.fd, buffer, 0, 8, this.position);
    this.position += 8;

    return buffer.readDoubleLE(0);
  }

  getString(length: number) {
    const buffer = Buffer.alloc(length);
    fs.readSync(this.fd, buffer, 0, length, this.position);
    this.position += length;

    return buffer.toString('utf8');
  }

  getBinaryString(length: number) {
    let out = '';

    for (let i = 0; i < length; i += 1) {
      const char = this.getUInt8();
      if (!char) {
        break;
      }

      out += String.fromCharCode(char);
    }

    this.position += length;
    return out;
  }

  async getBuffer(start: number, end: number, setPos = true) {
    const length = end - start;
    const buffer = Buffer.alloc(length);
    await fsRead(this.fd, buffer, 0, length, start);

    if (setPos) {
      this.position += length;
    }

    return buffer;
  }

  getBufferSync(start: number, end: number, setPos = true) {
    const length = end - start;
    const buffer = Buffer.alloc(length);

    fs.readSync(this.fd, buffer, 0, length, start);

    if (setPos) {
      this.position += length;
    }

    return buffer;
  }

  setPos(pos: number) {
    this.position = pos;
  }
}

export default FileReader;
