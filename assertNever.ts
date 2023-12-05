/**
 * assertNever helps with exhaustiveness checking. For example:
 * 
 * type X = "a" | "b" | "c";
 * declare const x: X;
 * if (x === "a") {
 *   // ...
 * } else if (x === "b") {
 *   // ...
 * }
 * // The line below results in a compile-time error due to unhandled case "c".
 * assertNever(x);
 */
export function assertNever(x: never, errorMsg?: string): never {
  throw new Error(errorMsg);
}
