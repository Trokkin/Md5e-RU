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
	label: /[^#а-яёa-z\n]+/.source,
	sent: /[а-яА-ЯёЁa-zA-Z ]+/.source,
	num: /\d+/.source,
};

// Sensitive to CRLF. All .md files should be LF
const MARKDOWN_PREPROCESSORS = [
	/** Page indexation **/
	[/\n([A-ZЁА-Я ]+)\n([^a-zA-Zа-яА-ЯёЁ\n]+)\n([A-ZЁА-Я ]+)(?=\n)/g, LOG("\n$3 $2 $1")],
	[/\f(?=\f)/g, "\n\\page\n"],
	[`\\f(${x.num})\\n(${x.label})(?=\\n)`, "\n\\page $1, \"$2\""],
	[`\\f(${x.label})\\n(${x.num})(?=\\n)`, "\n\\page $2, \"$1\""],
	[`\\f(${x.num})(?=\\n)`, "\n\\page $1"],
	[`\\f`, "\n\\page\n"],
	[/\n([^a-zA-Zа-яА-ЯёЁ\n]+)(?=\n)/g, LOG("\n[$1]")], // Table conservation
	[/\nСИЛ ЛОВ ТЕЛ ИНТ МДР ХАР(?=\n)/g, "\n[\"Сил\", \"Лов\", \"Тел\", \"Инт\", \"Мдр\", \"Хар\"]"],
	/** Paragraph labels **/
	[`\\n(${x.label})(?=\\n)`, (g, ...args) => `\n\n### ${args[0][0]}${args[0].substring(1).toLowerCase()}`],
	[/\n+(\\page.*\n)((?:.*\n)*?)#/g, "\n$2$1#"], // move \page at paragraph end
	[/\n### Часть (\d+): (.+)/g, LOG((g, ...args) => `\n\\part ${args[0]}, "${args[1][0].toUpperCase()}${args[1].substring(1)}"`)],
	[/\n### Глава (\d+): (.+)/g, LOG((g, ...args) => `\n\\chapter ${args[0]}, "${args[1][0].toUpperCase()}${args[1].substring(1)}"\n## ${args[1][0].toUpperCase()}${args[1].substring(1)}`)],
	[/\n### Приложение ([а-яёa-z]): (.+)/g, LOG((g, ...args) => `\n\\appendix "${args[0]}"\n# ${args[1][0].toUpperCase()}${args[1].substring(1)}`)],
	/** Text reconcatenation */
	[/([а-яё])-\n/g, "$1"], // remove hyphenation
	[/([а-яА-ЯёЁa-zA-Z ][^:!.?\n]?)\n([а-яa-z])/g, "$1 $2"], // concatenate sentences
	// [/\n/g, "\n\n"], // double all line breaks
	// [`\n([^::.\\\\{\\}\\n]+?): ([А-ЯЁA-Z])`, "\n##### $1\n$2"], // concatenate sentences
];

export default async function mdPreprocess (text) {
	let i = 0;
	for (let preproc of MARKDOWN_PREPROCESSORS) {
		if (typeof (preproc[0]) === "string") {
			preproc[0] = new RegExp(preproc[0], "g");
		}
		text = text.replace(...preproc);
		await fs.writeFile(`./raw/temp/debug-${i++}.md`, text);
	}
	return text.trim();
}

export async function processFile (path) {
	let text = await fs.readFile(path, "utf-8");
	text = await mdPreprocess(text);
	await fs.writeFile(`${path.substring(0, path.length - 4)}.out.md`, text);
}

for (let file of await fs.readdir("./raw")) {
	if (file.endsWith(".txt")) {
		processFile(`./raw/${file}`);
	}
}
