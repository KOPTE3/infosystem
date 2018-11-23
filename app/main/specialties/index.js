import config from '../config';
import db from '../db';


const { ipcMain, shell } = require('electron');
const fse = require('fs-extra');
const path = require('path');
const XlsxTemplate = require('xlsx-template');
const log = require('electron-log');

ipcMain.on('generate-1', async (event, arg) => {
	try {

		let specialty = {};
		await db.specialties.findOne({ _id: arg }, function(err, doc) {
			specialty = doc;
		});

		const templateContent = await fse.readFile(path.resolve(config.templatesRoot, 'AcademyCurriculum1.xlsx'));

		const template = new XlsxTemplate(templateContent);

		const sheetName = 'Учебный план академии 1';

		template.substitute(sheetName, specialty);

		const data = template.generate();

		const destination = path.resolve(config.distRoot, `${specialty.code_fgos}_AcademyCurriculum1.xlsx`);
		await fse.ensureFile(destination);

		await fse.writeFile(destination, data, 'binary');

		shell.openExternal(`file://${destination}`);
	} catch (err) {
		log.error(err);
	}
});
