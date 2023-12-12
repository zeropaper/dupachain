import { mkdirSync, mkdtempSync } from "fs";
import { rimraf } from "rimraf";
import { readFile, writeFile, mkdtemp, mkdir } from "fs/promises";
import { resolve, sep } from "path";
import { tmpdir } from "os";
import CacheInterface from "./type";

export default class FileSystemCache<T extends {}>
  implements CacheInterface<T>
{
  constructor({
    path,
    debug = () => {},
  }: {
    path?: string;
    debug?: (...args: any[]) => void;
  } = {}) {
    this.#debug = debug;
    this.#setPath = path ? resolve(process.cwd(), path) : undefined;
    if (this.#setPath) {
      mkdirSync(this.#setPath, { recursive: true });
      debug(`Cache path: ${this.#setPath}`);
    }
    this.#path = path ? path : mkdtempSync(`${tmpdir()}${sep}`);
  }
  #debug = (...args: any[]) => {};
  #setPath?: string;
  #path: string;
  get path() {
    return this.#path;
  }
  get absPath() {
    return resolve(process.cwd(), this.#path);
  }
  async clear() {
    this.#debug(`Clearing cache at ${this.#path}`);
    await this.destroy();
    if (this.#setPath) {
      await mkdir(this.#setPath, { recursive: true });
      this.#path = this.#setPath;
    } else {
      this.#path = await mkdtemp(`${tmpdir()}${sep}`);
    }
    this.#debug(`Cache path: ${this.#path}`);
  }
  async set(key: string, value: T): Promise<T> {
    await writeFile(resolve(this.#path, `${key}.json`), JSON.stringify(value));
    return value;
  }
  async get(key: string): Promise<T | null> {
    try {
      const result = JSON.parse(
        await readFile(resolve(this.#path, `${key}.json`), "utf-8"),
      );
      this.#debug(`Cache hit for ${key}`);
      return result;
    } catch (e) {
      this.#debug(`Cache miss for ${key}`);
      return null;
    }
  }
  async destroy(): Promise<void> {
    await rimraf(this.#path);
  }
}
