/**
 * Lightweight, zero-dependency schema builder with strict typing and Zod-compatible .safeParse() interface.
 * Matches AGENTS.md principle: "Small before abstract. Reusable only when reuse is real. No unnecessary dependencies."
 */

export interface ValidationContext {
  path: Array<string | number>;
  issues: Array<{ path: Array<string | number>; message: string }>;
}

export abstract class Schema<T> {
  abstract parseValue(value: unknown, ctx: ValidationContext): T;

  safeParse(value: unknown): { success: true; data: T } | { success: false; error: { issues: Array<{ path: Array<string | number>; message: string }> } } {
    const ctx: ValidationContext = { path: [], issues: [] };
    const data = this.parseValue(value, ctx);
    if (ctx.issues.length > 0) {
      return { success: false, error: { issues: ctx.issues } };
    }
    return { success: true, data };
  }

  optional(): Schema<T | undefined> {
    return new OptionalSchema(this);
  }

  nullable(): Schema<T | null> {
    return new NullableSchema(this);
  }
}

class OptionalSchema<T> extends Schema<T | undefined> {
  constructor(private inner: Schema<T>) {
    super();
  }
  parseValue(value: unknown, ctx: ValidationContext): T | undefined {
    if (value === undefined) return undefined;
    return this.inner.parseValue(value, ctx);
  }
}

class NullableSchema<T> extends Schema<T | null> {
  constructor(private inner: Schema<T>) {
    super();
  }
  parseValue(value: unknown, ctx: ValidationContext): T | null {
    if (value === null) return null;
    return this.inner.parseValue(value, ctx);
  }
}

export class StringSchema extends Schema<string> {
  private minLen?: number;
  private maxLen?: number;
  private regexPattern?: RegExp;
  private customMessage?: string;

  min(len: number, msg?: string): this {
    this.minLen = len;
    if (msg) this.customMessage = msg;
    return this;
  }

  max(len: number, msg?: string): this {
    this.maxLen = len;
    if (msg) this.customMessage = msg;
    return this;
  }

  regex(pattern: RegExp, msg?: string): this {
    this.regexPattern = pattern;
    if (msg) this.customMessage = msg;
    return this;
  }

  parseValue(value: unknown, ctx: ValidationContext): string {
    if (typeof value !== "string") {
      ctx.issues.push({ path: [...ctx.path], message: "Expected string" });
      return "";
    }
    const val = value;
    if (this.minLen !== undefined && val.length < this.minLen) {
      ctx.issues.push({
        path: [...ctx.path],
        message: this.customMessage || `Must be at least ${this.minLen} characters`,
      });
    }
    if (this.maxLen !== undefined && val.length > this.maxLen) {
      ctx.issues.push({
        path: [...ctx.path],
        message: this.customMessage || `Must be at most ${this.maxLen} characters`,
      });
    }
    if (this.regexPattern !== undefined && !this.regexPattern.test(val)) {
      ctx.issues.push({
        path: [...ctx.path],
        message: this.customMessage || "Invalid format",
      });
    }
    return val;
  }
}

export class NumberSchema extends Schema<number> {
  private minVal?: number;
  private maxVal?: number;
  private isInt = false;
  private coerce = false;
  private customMessage?: string;

  int(msg?: string): this {
    this.isInt = true;
    if (msg) this.customMessage = msg;
    return this;
  }

  min(min: number): this {
    this.minVal = min;
    return this;
  }

  max(max: number): this {
    this.maxVal = max;
    return this;
  }

  coerceNumber(): this {
    this.coerce = true;
    return this;
  }

  parseValue(value: unknown, ctx: ValidationContext): number {
    let num = value;
    if (this.coerce && typeof value === "string") {
      num = Number(value);
    }
    if (typeof num !== "number" || Number.isNaN(num) || !Number.isFinite(num)) {
      ctx.issues.push({ path: [...ctx.path], message: "Expected valid number" });
      return 0;
    }
    if (this.isInt && !Number.isInteger(num)) {
      ctx.issues.push({
        path: [...ctx.path],
        message: this.customMessage || "Expected integer",
      });
    }
    if (this.minVal !== undefined && num < this.minVal) {
      ctx.issues.push({ path: [...ctx.path], message: `Must be >= ${this.minVal}` });
    }
    if (this.maxVal !== undefined && num > this.maxVal) {
      ctx.issues.push({ path: [...ctx.path], message: `Must be <= ${this.maxVal}` });
    }
    return num;
  }
}

export class BooleanSchema extends Schema<boolean> {
  parseValue(value: unknown, ctx: ValidationContext): boolean {
    if (typeof value !== "boolean") {
      ctx.issues.push({ path: [...ctx.path], message: "Expected boolean" });
      return false;
    }
    return value;
  }
}

export class EnumSchema<T extends string> extends Schema<T> {
  constructor(private values: readonly T[]) {
    super();
  }
  parseValue(value: unknown, ctx: ValidationContext): T {
    if (typeof value !== "string" || !this.values.includes(value as T)) {
      ctx.issues.push({
        path: [...ctx.path],
        message: `Expected one of: ${this.values.join(", ")}`,
      });
      return this.values[0];
    }
    return value as T;
  }
}

export class ArraySchema<T> extends Schema<T[]> {
  constructor(private itemSchema: Schema<T>) {
    super();
  }
  parseValue(value: unknown, ctx: ValidationContext): T[] {
    if (!Array.isArray(value)) {
      ctx.issues.push({ path: [...ctx.path], message: "Expected array" });
      return [];
    }
    return value.map((item, index) => {
      ctx.path.push(index);
      const res = this.itemSchema.parseValue(item, ctx);
      ctx.path.pop();
      return res;
    });
  }
}

export class ObjectSchema<T extends Record<string, unknown>> extends Schema<T> {
  constructor(private shape: { [K in keyof T]: Schema<T[K]> }) {
    super();
  }

  parseValue(value: unknown, ctx: ValidationContext): T {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      ctx.issues.push({ path: [...ctx.path], message: "Expected object" });
      return {} as T;
    }

    const rec = value as Record<string, unknown>;
    const result = {} as T;

    for (const [key, schema] of Object.entries(this.shape)) {
      ctx.path.push(key);
      result[key as keyof T] = (schema as Schema<unknown>).parseValue(rec[key], ctx) as T[keyof T];
      ctx.path.pop();
    }

    return result;
  }
}

export const z = {
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  boolean: () => new BooleanSchema(),
  enum: <T extends string>(values: readonly T[]) => new EnumSchema(values),
  array: <T>(item: Schema<T>) => new ArraySchema(item),
  object: <T extends Record<string, unknown>>(shape: { [K in keyof T]: Schema<T[K]> }) =>
    new ObjectSchema(shape),
};
