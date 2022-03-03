import lineReader from 'line-reader';

type Reader = {
  hasNextLine: () => any;
  nextLine: (arg0: (err: any, line: any) => void) => void;
  close: (arg0: { (err: any): void; (err: any): void }) => void;
};

export class Book {
  filePath: string;

  private reader$: Promise<Reader>;

  private title$: Promise<string>;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.reader$ = this.getReader();
    this.title$ = this.readLine(); // 第一行作为标题
  }

  getTitle(): Promise<string> {
    return this.title$;
  }

  private async getReader(): Promise<Reader> {
    return new Promise((resolve, reject) => {
      lineReader.open(this.filePath, (err: any, reader: Reader) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(reader);
      });
    });
  }

  private async readLine(): Promise<string> {
    const reader = await this.reader$;
    return new Promise((resolve, reject) => {
      if (reader.hasNextLine()) {
        reader.nextLine((err: any, line: string) => {
          try {
            if (err) throw err;
            resolve(line);
          } finally {
            reader.close((err: any) => {
              reject(err);
            });
          }
        });
      } else {
        reader.close((err: any) => {
          reject(err);
        });
      }
    });
  }

  async loadPage(lineCount = 50) {
    await this.title$;
    const lines: string[] = [];
    for (let i = 0; i < lineCount; i += 1) {
      const line = await this.readLine();
      lines.push(line);
    }
    return lines;
  }
}
