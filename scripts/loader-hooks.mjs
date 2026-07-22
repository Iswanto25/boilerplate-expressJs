import { resolve as pathResolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const rootDir = pathResolve(import.meta.dirname, "..");
const srcDir = pathResolve(rootDir, "src");

export async function resolve(specifier, context, nextResolve) {
	if (specifier.startsWith("@/")) {
		const newSpecifier = pathResolve(srcDir, specifier.slice(2));
		return nextResolve(newSpecifier, context);
	}

	if ((specifier.startsWith("./") || specifier.startsWith("../")) && specifier.endsWith(".js")) {
		const parentUrl = context.parentURL;
		if (parentUrl) {
			const resolvedPath = fileURLToPath(new URL(specifier, parentUrl));
			if (!existsSync(resolvedPath)) {
				const tsPath = resolvedPath.replace(/\.js$/, ".ts");
				if (existsSync(tsPath)) {
					return nextResolve(new URL(pathResolve(tsPath), "file://").href, context);
				}
			}
		}
	}

	return nextResolve(specifier, context);
}
