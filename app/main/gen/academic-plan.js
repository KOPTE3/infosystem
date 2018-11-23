import promiseIpc from 'electron-promise-ipc';
import config from '../config';
import db from '../db';
import { shell, dialog } from 'electron';


const fse = require('fs-extra');
const path = require('path');
const XlsxTemplate = require('xlsx-template');
const log = require('electron-log');

const LOG = log.debug.bind(log, '[generate-academic-plan]');
LOG('init');

promiseIpc.on('generate-academic-plan', async (arg) => {
	try {
		const directories = dialog.showOpenDialog(config.mainWindow, {
			title: 'Выберите директорию для сохранения',
			properties: [ 'openDirectory', 'createDirectory', 'promptToCreate' ],
		});

		if (directories.length !== 1) {
			throw new Error('Не выбрана директория');
		}

		const [ directory ] = directories;

		const specialty = await db.specialties.findOne({ _id: arg });
		const direction = await db.directions.findOne({ _id: specialty.direction_id });
		const {
			name: directionName,
			...directionWithoutName
		} = direction;

		const dbData = Object.assign({}, specialty, directionWithoutName, { directionName });

		const templateContent = await fse.readFile(path.resolve(config.templatesRoot, 'AcademyCurriculum1.xlsx'));

		const template = new XlsxTemplate(templateContent);

		const sheetName = 'Учебный план академии 1';

		template.substitute(sheetName, dbData);

		const data = template.generate();

		const filename = `${dbData.name} - Заглавный лист Учебного плана.xlsx`;
		const destination = path.resolve(directory, filename);

		await fse.ensureFile(destination);
		await fse.writeFile(destination, data, 'binary');

		LOG(destination);

		shell.openExternal(`file://${directory}`);
	} catch (err) {
		log.error(err);
		throw err;
	}
});
