import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Runtime Pyodide lấy nguyên bản từ cdn.jsdelivr.net, không phải code của
    // dự án. Lint nó cho 13 lỗi + ~4.480 cảnh báo vô nghĩa. Bỏ qua ở ĐÂY chứ
    // không chèn `eslint-disable` vào file vendor: file vendor phải giữ đúng
    // từng byte như bản gốc thì sau này mới đối chiếu và nâng cấp được.
    "public/pyodide/**",
  ]),
]);

export default eslintConfig;
