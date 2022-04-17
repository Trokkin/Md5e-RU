/* eslint-disable no-control-regex */
/* eslint-disable no-console */
import * as fs from "fs/promises";

const LOG = (replace) => (g, ...args) => {
	let result = replace;
	// console.log([replace, g, args.slice(0, -2)]);
	switch (typeof (replace)) {
		case "string":
			for (let i in args.slice(0, -2)) {
				result = result.replace(`$${parseInt(i) + 1}`, args[i]);
			}
			break;
		case "function":
			result = result(g, ...args);
			break;
		default:
			result = result.toString();
	}
	// console.log(`Replaced: [[[${g}]]] -> [[[${result}]]]`);
	console.log("Replaced:", [g, result]);
	return result;
};

const x = {
	fnl: /(?=\n)/.source,
	nl: /\n/.source,
	np: /\f/.source,
	label: /[^#а-яa-z\n]+/.source,
	num: /\d+/.source,
};

// Sensitive to CRLF. All .md files should be LF
const MARKDOWN_PREPROCESSORS = [
	/** Page indexation **/
	[/\n([A-ZА-Я ]+)\n([^a-zA-Zа-яА-Я\n]+)\n([A-ZА-Я ]+)(?=\n)/g, LOG("\n$3 $2 $1")],
	[/\f(?=\f)/g, "\n\\page\n"],
	[`\\f(${x.num})\\n(${x.label})(?=\\n)`, "\n\\page $1 {$2}"],
	[`\\f(${x.label})\\n(${x.num})(?=\\n)`, "\n\\page $2 {$1}"],
	[`\\f(${x.num})(?=\\n)`, "\n\\page $1"],
	[`\\f`, "\n\\page\n"],
	/* Table conservation */
	// [/\\table(?:\n.+)+/g, (g, ...args) => `${g.replace(/\n/g, "|.\n|")}\n`],
	[/\n([^a-zA-Zа-яА-Я\n]+)(?=\n)/g, LOG("\n\\row [$1]")],
	[/\nСИЛ ЛОВ ТЕЛ ИНТ МДР ХАР(?=\n)/g, "\n\\row [Сил Лов Тел Инт Мдр Хар]"],
	/** Paragraph labels **/
	[`\\n(${x.label})(?=\\n)`, (g, ...args) => `\n\n### ${args[0][0]}${args[0].substring(1).toLowerCase()}`],
	[/\n+(\\page.*\n)((?:.*\n)*?)#/g, "\n$2$1#"], // move \page at paragraph end
	[/\n### Глава (\d+): (.+)/g, LOG((g, ...args) => `\n\n\\chapter ${args[0]}\n# ${args[1][0].toUpperCase()}${args[1].substring(1)}\n\n`)],
	[/\n### Приложение ([а-яa-z]): (.+)/g, LOG((g, ...args) => `\n\n\\appendix ${args[0]}\n# ${args[1][0].toUpperCase()}${args[1].substring(1)}\n\n`)],
	[/([а-я])-\n/g, "$1"], // remove hyphenation
];

export default function mdPreprocess (text) {
	for (let preproc of MARKDOWN_PREPROCESSORS) {
		if (typeof (preproc[0]) === "string") {
			preproc[0] = new RegExp(preproc[0], "g");
		}
		text = text.replace(...preproc);
	}
	return text.trim();
}

export async function processFile (path) {
	let text = await fs.readFile(path, "utf-8");
	await fs.writeFile(`${path.substring(0, path.length - 4)}.out.md`, mdPreprocess(text));
}

for (let file of await fs.readdir("./raw")) {
	if (file.endsWith(".md")) continue;
	processFile(`./raw/${file}`);
}
