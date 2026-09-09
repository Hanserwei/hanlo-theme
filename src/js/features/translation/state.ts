export type ChineseEncoding = 1 | 2;
export type TextConversion = (text: string) => string;
export type ConversionLoader = (source: ChineseEncoding) => Promise<TextConversion>;

export const TRANSLATION_EVENT = "hanlo:translation:change";
export const TRANSLATION_STORAGE_KEY = "translate-chn-cht";
const identity: TextConversion = (text) => text;

export async function loadChineseConversion(source: ChineseEncoding): Promise<TextConversion> {
  // Dictionary data stays on the same origin and is loaded only when conversion is requested.
  const { convert } = source === 2 ? await import("./traditional") : await import("./simplified");
  return convert;
}

export class ChineseTranslation {
  readonly sourceEncoding: ChineseEncoding;
  targetEncoding: ChineseEncoding;
  requestedEncoding: ChineseEncoding;
  ready: Promise<void> = Promise.resolve();
  #converter: TextConversion = identity;
  #loading?: Promise<TextConversion>;
  #revision = 0;
  #disposed = false;
  readonly #load: ConversionLoader;

  constructor(source: ChineseEncoding, load: ConversionLoader = loadChineseConversion) {
    this.sourceEncoding = source;
    this.targetEncoding = source;
    this.requestedEncoding = source;
    this.#load = load;
  }

  convert(text: string): string {
    return this.#converter(text);
  }

  async setTarget(target: ChineseEncoding): Promise<boolean> {
    if (this.#disposed) return false;
    const revision = ++this.#revision;
    this.requestedEncoding = target;
    let convert = identity;
    if (target !== this.sourceEncoding) {
      this.#loading ??= this.#load(this.sourceEncoding).catch((error: unknown) => {
        this.#loading = undefined;
        throw error;
      });
      try {
        convert = await this.#loading;
      } catch (error) {
        if (revision === this.#revision) this.requestedEncoding = this.targetEncoding;
        throw error;
      }
    }
    if (this.#disposed || revision !== this.#revision) return false;
    this.#converter = convert;
    this.targetEncoding = target;
    return true;
  }

  dispose(): void {
    this.#disposed = true;
    this.#revision += 1;
  }
}

const pageTranslations = new WeakMap<Document, ChineseTranslation>();
export function getPageTranslation(documentObject: Document): ChineseTranslation | undefined {
  return pageTranslations.get(documentObject);
}
export function setPageTranslation(
  documentObject: Document,
  translation?: ChineseTranslation,
): void {
  if (translation) pageTranslations.set(documentObject, translation);
  else pageTranslations.delete(documentObject);
}
