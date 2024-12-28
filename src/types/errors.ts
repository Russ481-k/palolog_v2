export class VersionError extends Error {
  constructor(
    message: string,
    public version: string
  ) {
    super(message);
    this.name = 'VersionError';
  }
}
