import promiseIpc from 'electron-promise-ipc';
import config from '../config';
import db from '../db';
import { shell, dialog } from 'electron';
import { common } from '../disciplines/export';
import Generator from '../generator';


const log = require('electron-log');

const LOG = log.debug.bind(log, '[print-plans]');
LOG('init');

promiseIpc.on('print-plans', async ({ discipline_id, specialty_id }) => {
	try {
		const directories = dialog.showOpenDialog(config.mainWindow, {
			title: 'Выберите директорию для сохранения',
			properties: [ 'openDirectory', 'createDirectory', 'promptToCreate' ],
		});

		if (directories.length !== 1) {
			throw new Error('Не выбрана директория');
		}

		const [ directory ] = directories;

		// const directory = config.distRoot;

		const toExport = {};

		const specialty = await db.specialties.findOne({ _id: specialty_id });
		const direction = await db.directions.findOne({ _id: specialty.direction_id });
		const discipline = await db.disciplines.findOne({ _id: discipline_id });

		if (!discipline || !direction || !specialty) {
			const e = new Error(`Не удалось информацию`);
			log.error(e);
			throw e;
		}

		const competencies = await db.competencies.find();
		const cMap = new Map(competencies.map(c => [ c._id, c ]));

		toExport.name = discipline.name;
		toExport.department_name = discipline.department_name;
		toExport.code = discipline.code;
		toExport.cipher = discipline.cipher;
		toExport.part_type = discipline.part_type;
		toExport.additional_complexity = discipline.additional_complexity;
		toExport.introText = discipline.introText || null;
		toExport.sections = discipline.sections || null;
		toExport.structure = discipline.structure || null;

		toExport.specialty = {
			name: specialty.name,
			approver: specialty.approver,
		};

		toExport.direction = {
			name: direction.name,
			code: direction.code,
			qualification: direction.qualification,
		};

		const disciplines = await db.disciplines.find({ direction_id: specialty.direction_id });

		toExport.constraints = {
			semesters: discipline.constraints.semesters,
			competencies: discipline.competencies.map(({ _id, know, able_to, own }) => {
				const { code, description } = cMap.get(_id);
				return {
					_id,
					code,
					description,
					know,
					able_to,
					own,
					common_disciplines: common(cMap.get(_id), specialty, discipline, disciplines),
				};
			}),
		};

		const g = new Generator(toExport, toExport);

		await g.init();
		await g.generatePDFs(directory);

		LOG(directory);

		shell.openExternal(`file://${directory}`);
	} catch (err) {
		log.error(err);
		throw err;
	}
});
