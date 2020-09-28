interface Entries {
    filename: string,
    pack_size: number,
    length_aligned: number,
    real_size: number,
    type: number,
    offset: number,
}

export class GRF {
    entries: Entries[];

    search(filename: string): number;
    getFile(filename: string): Promise<Buffer>;
}
