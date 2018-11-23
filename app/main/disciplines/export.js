import { dialog } from 'electron';
import promiseIpc from 'electron-promise-ipc';
import config from '../config';
import db from '../db';


const fse = require('fs-extra');
const path = require('path');
const log = require('electron-log');

export function common (competency, specialty, discipline, disciplines) {
	const cid = competency._id;
	log.debug('common', cid);
	const currentDisciplines = disciplines
		.filter(d => {
			return specialty.disciplines.includes(d._id) || d.part_type !== 'variative';
		})
		.filter(d => discipline._id !== d._id);

	log.debug('common', currentDisciplines.length);

	return currentDisciplines
		.map(d => {
			if (d.competencies.some(c => c._id === cid)) {
				return d.name;
			}
		})
		.filter(name => !!name)
		.sort();
}

promiseIpc.on('export-discipline', async function({ _id }) {
	log.info('export-discipline', _id);

	const toExport = {};
	const discipline = await db.disciplines.findOne({ _id });
	log.debug(discipline);
	if (!discipline) {
		const e = new Error(`Не удалось найти discipline с id = ${_id}`);
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

	let specialties = await db.specialties.find();
	log.debug(specialties);
	if (discipline.part_type === 'variative') {
		specialties = specialties.filter(s => (s.disciplines || []).includes(discipline._id));
	} else {
		specialties = [ specialties[ 0 ] ];
	}

	if (specialties.length !== 1) {
		const e = new Error(`Дисциплина привязана к нескольким специальностями: ${specialties.map(s => s.name).join(', ')}`);
		log.error(e);
		throw e;
	}

	const specialty = specialties[ 0 ];
	toExport.specialty = {
		name: specialty.name,
		approver: specialty.approver,
	};

	const direction = await db.directions.findOne({ _id: specialty.direction_id });
	if (!direction) {
		const e = new Error(`Не удалось найти direction с id = ${specialty.direction_id}`);
		log.error(e);
		throw e;
	}

	toExport.direction = {
		name: direction.name,
		code: direction.code,
		qualification: direction.qualification,
	};

	log.debug(toExport);

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


	const content = JSON.stringify(toExport, null, ' ');
	const filename = `${toExport.cipher} - ${toExport.name}.json`;

	const filepath = dialog.showSaveDialog(config.mainWindow, {
		title: 'Сохранить',
		defaultPath: filename,
		buttonLabel: 'Сохранить',
		filters: [
			{
				name: 'JSON Files', extensions: [ 'json' ],
			},
		],
	});

	if (filepath) {
		await fse.writeFile(path.resolve(config.distRoot, filepath), content, 'utf8');
	}
});
