const zlib = require('zlib');
const util = require('util');
const FileReader = require('./FileReader');
const DES = require('./DES');

const inflate = util.promisify(zlib.inflate);

class GRF {
  constructor(file) {
    this.fr = new FileReader(file);

    const header = {
      signature: this.fr.getMany('UInt8', 15),
      key: this.fr.getMany('UInt8', 15),
      file_table_offset: this.fr.getUInt32(),
      skip: this.fr.getUInt32(),
      filecount: this.fr.getUInt32(),
      version: this.fr.getUInt32(),
    };

    header.signature = String.fromCharCode(...header.signature);
    header.filecount -= header.skip + 7;

    if (header.signature !== 'Master of Magic') {
      const error = `Incorrect header signature: "${header.signature}", should be "Master of Magic"`;
      throw error;
    }

    if (parseInt(header.version, 10) !== 0x200) {
      const error = `Incorrect header version "0x${parseInt(header.version, 10).toString(16)}", should be "0x200"`;
      throw error;
    }

    if (header.file_table_offset + 46 > file.size || header.file_table_offset < 0) {
      const error = `Can not jump to table list (${header.file_table_offset}), file length: ${file.size}`;
      throw error;
    }

    const tableBuffer = this.fr.getBuffer(header.file_table_offset + 46, header.file_table_offset + 46 + 8);
    const table = {
      pack_size: tableBuffer.readUInt32LE(0),
      real_size: tableBuffer.readUInt32LE(4),
      data: '',
    };

    const buffer = this.fr.getBuffer(header.file_table_offset + 46 + 8, header.file_table_offset + 46 + 8 + table.pack_size);
    const out = zlib.inflateSync(buffer);

    const entries = this.loadEntries(out, header.filecount);

    for (let i = 0; i < entries.length; i += 1) {
      table.data += `${entries[i].filename}\0`;
      entries[i].filename = entries[i].filename.toLowerCase();
    }

    entries.sort((a, b) => {
      if (a.filename > b.filename) {
        return 1;
      }

      if (a.filename < b.filename) {
        return -1;
      }

      return 0;
    });

    this.header = header;
    this.entries = entries;
    this.table = table;
  }

  loadEntries(out, count) {
    const entries = new Array(count);

    for (let i = 0, pos = 0; i < count; i += 1) {
      let str = '';
      while (out[pos]) {
        str += String.fromCharCode(out[pos++]);
      }
      pos += 1;

      entries[i] = {
        filename: str,
        pack_size: out[pos++] | out[pos++] << 8 | out[pos++] << 16 | out[pos++] << 24,
        length_aligned: out[pos++] | out[pos++] << 8 | out[pos++] << 16 | out[pos++] << 24,
        real_size: out[pos++] | out[pos++] << 8 | out[pos++] << 16 | out[pos++] << 24,
        type: out[pos++],
        offset: out[pos++] | out[pos++] << 8 | out[pos++] << 16 | out[pos++] << 24,
      };
    }

    return entries;
  }

  async decodeEntry(buffer, entry) {
    const data = new Uint8Array(buffer);

    if (entry.type & GRF.FILELIST_TYPE_ENCRYPT_MIXED) {
      DES.decodeFull(data, entry.length_aligned, entry.pack_size);
    } else if (entry.type & GRF.FILELIST_TYPE_ENCRYPT_HEADER) {
      DES.decodeHeader(data, entry.length_aligned);
    }

    return inflate(data);
  }

  search(filename) {
    const entries = this.entries;
    const range = new Uint32Array([entries.length - 1, 0]);

    while (range[1] < range[0]) {
      const middle = range[1] + ((range[0] - range[1]) >> 1);
      const v = (entries[middle].filename < filename ? 1 : 0);
      range[v] = middle + v;
    }

    if (range[1] < entries.length && entries[range[1]].filename === filename) {
      return range[1];
    }

    return -1;
  }

  async getFile(filename) {
    const path = filename.toLowerCase();
    const pos = this.search(path);

    if (pos !== -1) {
      const entry = this.entries[pos];

      if (!(entry.type & GRF.FILELIST_TYPE_FILE)) {
        throw 'Probably it is a folder';
      }

      const buffer = this.fr.getBuffer(entry.offset + 46, entry.length_aligned + entry.offset + 46);

      if (entry.real_size === entry.pack_size) {
        return buffer;
      }

      return this.decodeEntry(buffer, entry);
    }

    throw 'File does not exist';
  }
}

GRF.FILELIST_TYPE_FILE = 0x01;
GRF.FILELIST_TYPE_ENCRYPT_MIXED = 0x02;
GRF.FILELIST_TYPE_ENCRYPT_HEADER = 0x04;

module.exports = GRF;
