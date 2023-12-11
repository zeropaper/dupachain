import { vi } from "vitest";

/*
If this module wasn't mocked, the error would be:
Error: Module did not self-register: '/home/vale/Repos/visitberlin/node_modules/.pnpm/onnxruntime-node@1.14.0/node_modules/onnxruntime-node/bin/napi-v3/linux/x64/onnxruntime_binding.node'.
 ❯ Object.Module._extensions..node node:internal/modules/cjs/loader:1473:18
 ❯ Module.load node:internal/modules/cjs/loader:1207:32
 ❯ Function.Module._load node:internal/modules/cjs/loader:1023:12
 ❯ Module.require node:internal/modules/cjs/loader:1235:19
 ❯ require node:internal/modules/helpers:176:18
 ❯ Object.<anonymous> ../../node_modules/.pnpm/onnxruntime-node@1.14.0/node_modules/onnxruntime-node/lib/binding.ts:41:5
 ❯ Module._compile node:internal/modules/cjs/loader:1376:14
 ❯ Object.Module._extensions..js node:internal/modules/cjs/loader:1435:10
 ❯ Module.load node:internal/modules/cjs/loader:1207:32
 ❯ Function.Module._load node:internal/modules/cjs/loader:1023:12
*/
export const getHftStore = vi.fn(() => {
  return {
    addDocuments: vi.fn(() => []),
    addVectors: vi.fn(() => {}),
    delete: vi.fn(() => {}),
    similaritySearchVectorWithScore: vi.fn(() => {}),
  };
});

export const getHftEmbedding = vi.fn(() => {
  return [];
});

export const queryHftEmbeddings = vi.fn(() => {
  return [];
});
