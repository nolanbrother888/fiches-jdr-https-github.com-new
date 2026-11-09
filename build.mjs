import { build } from "esbuild";
import { mkdirSync, copyFileSync, existsSync, cpSync } from "fs";
mkdirSync("www", { recursive: true });
await build({ entryPoints: ["src/app.js"], bundle: true, format: "esm", minify: true, target: ["chrome90"], outfile: "www/app.js" });
for (const f of ["index.html", "style.css", "seed.json", "sorts-srd.json"]) if (existsSync("src/" + f)) copyFileSync("src/" + f, "www/" + f);
if (existsSync("src/img")) cpSync("src/img", "www/img", { recursive: true });
console.log("www/ prêt");
