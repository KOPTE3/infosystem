import config from '../config';
import db from '../db';
import { dialog, ipcMain, shell } from 'electron';
import promiseIpc from 'electron-promise-ipc';


const fse = require('fs-extra');
const path = require('path');
const log = require('electron-log');

promiseIpc.on('import-discipline', async function({ _id }) {
	log.info('import-discipline', _id);

	const discipline = await db.disciplines.findOne({ _id });
	if (!discipline) {
		const e = new Error(`Не удалось найти discipline с id = ${_id}`);
		log.error(e);
		throw e;
	}

	const filenames = dialog.showOpenDialog(config.mainWindow, {
		title: 'Открыть',
		buttonLabel: 'Открыть',
		filters: [
			{
				name: 'JSON Files', extensions: [ 'json' ],
			},
		],
	});

	if (filenames.length !== 1) {
		const e = new Error(`Необходимо выбрать один файл`);
		log.error(e);
		throw e;
	}

	const [ filename ] = filenames;
	const source = await fse.readFile(path.resolve(filename), 'utf8');
	let parsed = null;
	try {
		parsed = JSON.parse(source);
	} catch (e) {
		// ignore
	}

	if (!parsed) {
		const e = new Error(`Некорректный формат файла`);
		log.error(e);
		throw e;
	}

	discipline.introText = parsed.introText;
	discipline.sections = parsed.sections;
	discipline.structure = parsed.structure;

	log.debug('update discipline', _id);

	await db.disciplines.update({ _id }, discipline, {});
	log.debug('updated discipline', _id);
});
