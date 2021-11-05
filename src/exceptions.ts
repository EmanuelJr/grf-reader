export class GRFHeaderException extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class GRFFileException extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}
