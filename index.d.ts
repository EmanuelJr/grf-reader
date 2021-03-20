interface Entries {
    filename: string,
    packSize: number,
    lengthAligned: number,
    realSize: number,
    type: number,
    offset: number,
}

export class GRF {
    entries: Entries[];

    search(filename: string): number;
    getFile(filename: string): Promise<Buffer>;
}
