const fse = require('fs-extra');
const Generator = require('./index');
const path = require('path');

(async function() {
	const input = await fse.readFile(path.resolve(__dirname, '../../../input.json'));
	const output = await fse.readFile(path.resolve(__dirname, '../../../output.json'));

	const source = JSON.parse(input);
	const results = JSON.parse(output);

	const g = new Generator(source, results);

	await g.init();
	await g.saveHTML();

	// await g.generatePDFs();

	console.log('Done');
})()
	.catch(console.error);
