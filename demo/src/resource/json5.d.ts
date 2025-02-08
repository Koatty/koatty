// declarations.d.ts

declare module '*.json5' {
  const value: Record<string, any>; // Adjust the type as needed
  export default value;
}