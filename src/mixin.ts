/** Any class used as a mixin: its prototype getters and methods get copied. */
export type MixinClass = abstract new (...args: any[]) => object;

/**
 * Copies each mixin's own prototype getters and methods onto `target`.
 * A member that already exists on the target (or came from an earlier mixin) throws instead of being overwritten.
 */
export function mixInto(decorator: string, targetKind: string, target: abstract new (...args: any[]) => object, mixins: MixinClass[]): void {
  for (const mixin of mixins) {
    for (const key of Object.getOwnPropertyNames(mixin.prototype)) {
      if (key === 'constructor') continue;
      if (key in target.prototype) {
        throw new Error(`@${decorator}(${mixin.name}) on ${target.name}: "${key}" already exists on the ${targetKind} — rename one of them`);
      }
      Object.defineProperty(target.prototype, key, Object.getOwnPropertyDescriptor(mixin.prototype, key)!);
    }
  }
}
