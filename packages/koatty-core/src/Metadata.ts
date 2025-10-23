/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-07-06 11:21:37
 */

/**
 * A class for managing metadata with key-value pairs storage.
 * Provides methods to set, get, add, remove, merge, and clone metadata.
 * Values are stored as arrays to support multiple values for a single key.
 * Supports Buffer values and handles their cloning appropriately.
 * Can be serialized to JSON and created from plain objects.
 */
export class KoattyMetadata {
  protected _internalRepo = new Map<string, any[]>();
  private _cachedMap: { [key: string]: any } | null = null;

  /**
   * Set the given value for the given key
   */
  set(key: string, value: any): void {
    this._internalRepo.set(key, Array.isArray(value) ? value : [value]);
    this._cachedMap = null; // Invalidate cache
  }

  /**
   * Adds the given value for the given key
   */
  add(key: string, value: any): void {
    const existingValues = this._internalRepo.get(key);
    if (existingValues) {
      if (Array.isArray(value)) {
        existingValues.push(...value);
      } else {
        existingValues.push(value);
      }
    } else {
      this._internalRepo.set(key, Array.isArray(value) ? value : [value]);
    }
    this._cachedMap = null; // Invalidate cache
  }

  /**
   * Gets a list of all values associated with the key
   */
  get(key: string): any[] {
    return this._internalRepo.get(key) || [];
  }

  /**
   * Gets the first value associated with the given key
   */
  getFirst(key: string): any {
    const values = this._internalRepo.get(key);
    return values && values.length > 0 ? values[0] : undefined;
  }

  /**
   * Removes the given key and any associated values
   */
  remove(key: string): void {
    this._internalRepo.delete(key);
    this._cachedMap = null; // Invalidate cache
  }

  /**
   * Gets a plain object mapping each key to the first value associated with it.
   * This reflects the most common way that people will want to see metadata.
   * @return A key/value mapping of the metadata.
   */
  getMap(): {
    [key: string]: any;
  } {
    // Use cached result if available
    if (this._cachedMap) {
      return this._cachedMap;
    }

    const result: { [key: string]: any } = {};

    this._internalRepo.forEach((values, key) => {
      if (values.length > 0) {
        const v = values[0];
        result[key] = v instanceof Buffer ? Buffer.from(v) : v;
      }
    });
    
    // Cache the result for future calls
    this._cachedMap = result;
    return result;
  }

  /**
   * Clones the metadata object.
   * @return The newly cloned object.
   */
  clone(): KoattyMetadata {
    const newMetadata = new KoattyMetadata();
    const newInternalRepr = newMetadata._internalRepo;

    this._internalRepo.forEach((value, key) => {
      const clonedValue: any[] = value.map((v) => {
        if (v instanceof Buffer) {
          return Buffer.from(v);
        } else {
          return v;
        }
      });

      newInternalRepr.set(key, clonedValue);
    });

    return newMetadata;
  }

  /**
   * Merges the given metadata into this metadata
   */
  merge(other: KoattyMetadata): void {
    other._internalRepo.forEach((values, key) => {
      const existingValues = this._internalRepo.get(key);
      if (existingValues) {
        existingValues.push(...values);
      } else {
        this._internalRepo.set(key, [...values]);
      }
    });
    this._cachedMap = null; // Invalidate cache
  }

  /**
   * Creates a KoattyMetadata object from a plain object
   */
  static from(obj: { [key: string]: any }): KoattyMetadata {
    const metadata = new KoattyMetadata();
    Object.keys(obj).forEach(key => {
      metadata.set(key, obj[key]);
    });
    return metadata;
  }

  /**
   * Converts the metadata to a JSON object
   */
  toJSON(): { [key: string]: any } {
    return this.getMap();
  }

  /**
   * Gets the number of key-value pairs
   */
  get size(): number {
    return this._internalRepo.size;
  }

  /**
   * Checks if the metadata is empty
   */
  isEmpty(): boolean {
    return this._internalRepo.size === 0;
  }

  /**
   * Clears all metadata
   */
  clear(): void {
    this._internalRepo.clear();
    this._cachedMap = null;
  }
}
