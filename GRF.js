const zlib = require('zlib');
const FileReader = require('./FileReader');
const DES = require('./DES');

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

    header.signature = String.fromCharCode.apply(null, header.signature);
    header.filecount -= header.skip + 7;

    if (header.signature !== 'Master of Magic') {
      const error = `Incorrect header signature: "${header.signature}", must be "Master of Magic"`;
      throw new Error(error);
    }

    if (parseInt(header.version, 10) !== 0x200) {
      const error = `Incorrect header version "0x${parseInt(header.version, 10).toString(16)}", must be "0x200"`;
      throw new Error(error);
    }

    if (header.file_table_offset + 46 > file.size || header.file_table_offset < 0) {
      const error = `Can't jump to table list (${header.file_table_offset}), file length: ${file.size}`;
      throw new Error(error);
    }

    const table = {
      pack_size: this.fr.getUInt32(),
      real_size: this.fr.getUInt32(),
    };
    
    const buffer = this.fr.getBuffer(header.file_table_offset + 46 + 8, table.pack_size);
    const data = new Uint8Array(buffer);
    const out = zlib.inflateSync(data);

    const entries = this.loadEntries(out, header.filecount);

    table.data = '';
    for (let i = 0, count = entries.length; i < count; i += 1) {
      table.data += entries[i].filename + '\0';
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

  decodeEntry(buffer, entry, callback) {
    const data = new Uint8Array(buffer);

    if (entry.type & GRF.FILELIST_TYPE_ENCRYPT_MIXED) {
      DES.decodeFull(data, entry.length_aligned, entry.pack_size);
    } else if (entry.type & GRF.FILELIST_TYPE_ENCRYPT_HEADER) {
      DES.decodeHeader(data, entry.length_aligned);
    }

    zlib.inflate(data, callback);
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

  getFile(filename) {
    const path = filename.toLowerCase();
    const pos = this.search(path);

    return new Promise((resolve, reject) => {
      if (pos !== -1) {
        const entry = this.entries[pos];

        if (!(entry.type & GRF.FILELIST_TYPE_FILE)) {
          reject('There is a problem in this file');
          return;
        }
  
        const buffer = this.fr.getBuffer(entry.offset + 46, entry.length_aligned + entry.offset + 46);

        this.decodeEntry(buffer, entry, (error, buff) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(buff);
        });
        return;
      }
  
      reject('File doesn\'t exist');
    });
  }
}

GRF.FILELIST_TYPE_FILE = 0x01;
GRF.FILELIST_TYPE_ENCRYPT_MIXED = 0x02;
GRF.FILELIST_TYPE_ENCRYPT_HEADER = 0x04;

module.exports = GRF;