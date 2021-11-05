import * as zlib from 'zlib';
import * as util from 'util';

import FileReader from './FileReader';
import * as DES from './DES';
import {
  GRFHeaderException,
  GRFFileException,
} from './exceptions';

interface Header {
  signature: string;
  key: number[];
  fileTableOffset: number;
  skip: number;
  fileCount: number;
  version: number;
}

interface Entry {
  filename: string;
  packSize: number;
  lengthAligned: number;
  realSize: number;
  type: number;
  offset: number;
}

const inflate = util.promisify(zlib.inflate);

class GRF {
  private static FILELIST_TYPE_FILE = 0x01;
  private static FILELIST_TYPE_ENCRYPT_MIXED = 0x02;
  private static FILELIST_TYPE_ENCRYPT_HEADER = 0x04;

  private fr: FileReader;
  public entries: Entry[];
  public header: Header;

  constructor(filepath: string) {
    this.fr = new FileReader(filepath);

    const signature = this.fr.getMany('UInt8', 15);

    const header: Header = {
      signature: String.fromCharCode(...signature),
      key: this.fr.getMany('UInt8', 15),
      fileTableOffset: this.fr.getUInt32(),
      skip: this.fr.getUInt32(),
      fileCount: this.fr.getUInt32(),
      version: this.fr.getUInt32(),
    };

    header.fileCount -= header.skip + 7;
    this.header = header;

    if (header.signature !== 'Master of Magic') {
      const error = `Incorrect header signature: "${header.signature}", must be "Master of Magic"`;
      throw new GRFHeaderException(error);
    }

    if (header.version !== 0x200) {
      const error = `Incorrect header version "0x${header.version.toString(16)}", must be "0x200"`;
      throw new GRFHeaderException(error);
    }

    const fileSize = this.fr.getSize();
    if (header.fileTableOffset + 46 > fileSize || header.fileTableOffset < 0) {
      const error = `Can not jump to ${header.fileTableOffset} in table list, file length: ${fileSize}`;
      throw new GRFHeaderException(error);
    }

    const tableBuffer = this.fr.getBufferSync(header.fileTableOffset + 46, header.fileTableOffset + 46 + 8);
    const table = {
      packSize: tableBuffer.readUInt32LE(0),
      realSize: tableBuffer.readUInt32LE(4),
    };

    const buffer = this.fr.getBufferSync(header.fileTableOffset + 46 + 8, header.fileTableOffset + 46 + 8 + table.packSize);
    const out = zlib.inflateSync(buffer);

    const entries = this.loadEntries(out, header.fileCount);

    for (let i = 0; i < entries.length; i += 1) {
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

    this.entries = entries;
  }

  private loadEntries(out, count) {
    const entries: Entry[] = new Array(count);

    for (let i = 0, pos = 0; i < count; i += 1) {
      let str = '';
      while (out[pos]) {
        str += String.fromCharCode(out[pos++]);
      }
      pos += 1;

      entries[i] = {
        filename: str,
        packSize: out[pos++] | out[pos++] << 8 | out[pos++] << 16 | out[pos++] << 24,
        lengthAligned: out[pos++] | out[pos++] << 8 | out[pos++] << 16 | out[pos++] << 24,
        realSize: out[pos++] | out[pos++] << 8 | out[pos++] << 16 | out[pos++] << 24,
        type: out[pos++],
        offset: out[pos++] | out[pos++] << 8 | out[pos++] << 16 | out[pos++] << 24,
      };
    }

    return entries;
  }

  private async decodeEntry(data, entry) {
    if (entry.type & GRF.FILELIST_TYPE_ENCRYPT_MIXED) {
      DES.decodeFull(data, entry.lengthAligned, entry.packSize);
    } else if (entry.type & GRF.FILELIST_TYPE_ENCRYPT_HEADER) {
      DES.decodeHeader(data, entry.lengthAligned);
    }

    return inflate(data);
  }

  /**
   * Returns the file position in the GRF
   *
   * @param filename - The file full path inside the GRF
   * @returns The file position, if not found returns `-1`
   */
  public search(filename: string) {
    const entries = this.entries;
    const range = new Uint32Array([entries.length - 1, 0]);

    while (range[1] < range[0]) {
      const middle = range[1] + ((range[0] - range[1]) >> 1);
      const v = (entries[middle].filename < filename) ? 1 : 0;
      range[v] = middle + v;
    }

    if (range[1] < entries.length && entries[range[1]].filename === filename) {
      return range[1];
    }

    return -1;
  }

  /**
   * Returns the file buffer from the GRF file
   *
   * @param filename - The file full path inside the GRF
   * @returns File `Buffer`
   */
  public async getFile(filename: string) {
    const path = filename.toLowerCase();
    const pos = this.search(path);

    if (pos !== -1) {
      const entry = this.entries[pos];

      if (!(entry.type & GRF.FILELIST_TYPE_FILE)) {
        throw new GRFFileException('The file path must be a regular file, it is probably a folder');
      }

      const buffer = await this.fr.getBuffer(entry.offset + 46, entry.lengthAligned + entry.offset + 46);

      if (entry.realSize === entry.packSize) {
        return buffer;
      }

      return this.decodeEntry(buffer, entry);
    }

    throw new GRFFileException('This file does not exist');
  }
}

export default GRF;
