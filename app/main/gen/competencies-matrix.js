import { dialog, shell } from 'electron';
import promiseIpc from 'electron-promise-ipc';
import xl from 'excel4node';
import config from '../config';
import db from '../db';


const fse = require('fs-extra');
const path = require('path');
const log = require('electron-log');

const LOG = log.debug.bind(log, '[generate-competencies-matrix]');
LOG('init');


const OK = 'общекультурные компетенции';
const OPK = 'общепрофессиональные компетенции';
const PK = 'профессиональные компетенции';
const VUD = 'военно-управленческая деятельность';
const VTD = 'военно-техническая деятельность';
const NID = 'научно-исследовательская деятельность';

const typeWeight = {
	[ OK ]: 0,
	[ OPK ]: 1,
	[ PK ]: 2,
};

const partTypeWeight = {
	basic: 0,
	variative: 1,
	practice: 2,
	gia: 3,
};

const activityKindWeight = {
	[ VUD ]: 0,
	[ VTD ]: 1,
	[ NID ]: 2,
};

const centerStyles = {
	alignment: {
		horizontal: 'center',
		vertical: 'center',
		wrapText: true,
	},
};

function competenciesGroupSort (competencies, map) {
	const header = {
		order: [],
		length: 0,
		[ OK ]: {
			order: [],
			length: 0,
		},
		[ OPK ]: {
			order: [],
			length: 0,
		},
		[ PK ]: {
			order: [],
			length: 0,
			[ VUD ]: {
				order: [],
				length: 0,
			},
			[ VTD ]: {
				order: [],
				length: 0,
			},
			[ NID ]: {
				order: [],
				length: 0,
			},
		},
	};

	competencies.forEach(function({ type, activity_kind, code, _id }) {
		header.order.push(_id);
		header.length++;
		switch (type) {
			case PK:
				header[ type ][ activity_kind ].order.push(_id);
				header[ type ][ activity_kind ].length++;

			case OK:
			case OPK:
				header[ type ].order.push(_id);
				header[ type ].length++;
				break;

		}
	});

	const comparator = function(left_id, right_id) {
		const left = map[ left_id ];
		const right = map[ right_id ];

		if (left.type !== right.type) {
			return typeWeight[ left.type ] - typeWeight[ right.type ];
		}

		if (left.activity_kind !== right.activity_kind) {
			return activityKindWeight[ left.activity_kind ] - activityKindWeight[ right.activity_kind ];
		}

		if (left.common !== right.common) {
			return (right.common | 0) - (left.common | 0);
		}

		if (left.code !== right.code) {
			return left.code.localeCompare(right.code);
		}

		return left.name.localeCompare(right.name);
	};

	header.order.sort(comparator);
	header[ OK ].order.sort(comparator);
	header[ OPK ].order.sort(comparator);
	header[ PK ].order.sort(comparator);
	header[ PK ][ VUD ].order.sort(comparator);
	header[ PK ][ VTD ].order.sort(comparator);
	header[ PK ][ NID ].order.sort(comparator);

	return header;
}

function printHeader (ws, header, map, specialty) {
	const verticalStyle = {
		alignment: {
			textRotation: 90,
		},
	};
	ws.cell(1, 1, 1, 3 + header.order.length - 1, true)
		.string('Матрица компетенций')
		.style(centerStyles);

	ws.cell(2, 1, 5, 1, true)
		.string('Индекс')
		.style(centerStyles);

	ws.cell(2, 2, 5, 2, true)
		.string('Наименование учебных циклов, дисциплин (модулей), разделов')
		.style(centerStyles);

	ws.cell(2, 3, 2, 3 + header.order.length - 1, true)
		.string(`Формируемые компетенции в соответствии с ФГОС ВО и КТ по военной специальности ${specialty.name}`)
		.style(centerStyles);

	let start = 3;
	[ OK, OPK, PK ].forEach(function(type) {
		if (!header[ type ].order.length) {
			return;
		}
		ws.cell(3, start, 3, start + header[ type ].order.length - 1, true)
			.string(type)
			.style(centerStyles);

		start += header[ type ].order.length;
	});

	start = 3 + header[ OK ].order.length + header[ OPK ].order.length;
	[ VUD, VTD, NID ].forEach(function(activity_kind) {
		if (!header[ PK ][ activity_kind ].order.length) {
			return;
		}
		ws.cell(4, start, 4, start + header[ PK ][ activity_kind ].order.length - 1, true)
			.string(activity_kind)
			.style(centerStyles);

		start += header[ PK ][ activity_kind ].order.length;
	});

	header.order.forEach(function(_id, pos) {
		const { type, code } = map[ _id ];
		let height = 2;
		if (type === PK) {
			height = 1;
		}

		ws.column(3 + pos).setWidth(5);
		ws.cell(5 - height + 1, 3 + pos, 5, 3 + pos, true)
			.string(code)
			.style(centerStyles)
			.style(verticalStyle);
	});

	ws.column(1).setWidth(10);
	ws.column(2).setWidth(50);
	ws.row(1).setHeight(20);
	ws.row(2).setHeight(16);
	ws.row(3).setHeight(32);
	ws.row(4).setHeight(32);
	ws.row(5).setHeight(64);
}

function printRows (ws, specialty, header) {
	const wrapStyles = {
		alignment: {
			vertical: 'center',
			wrapText: true,
		},
	};

	const summary = {};

	specialty.disciplines.forEach(function(discipline, pos) {
		const row = 6 + pos;
		ws.cell(row, 1).string(discipline.code).style(centerStyles);
		ws.cell(row, 2).string(discipline.name).style(wrapStyles);
		if (discipline.name.length > 50) {
			ws.row(row).setHeight(32);
		}
		header.order.forEach(function(competency_id, pos) {
			if (discipline.competencies.some(c => c._id === competency_id)) {
				summary[ competency_id ] = (summary[ competency_id ] | 0) + 1;
				ws.cell(row, 3 + pos).string('X').style(centerStyles);
			}
		});
	});

	const row = 6 + specialty.disciplines.length;
	ws.cell(row, 2).string('Перекрытие');
	header.order.forEach(function(competency_id, pos) {
		ws.cell(row, 3 + pos).number(summary[ competency_id ] | 0).style(centerStyles);
	});
}


promiseIpc.on('generate-competencies-matrix', async (arg) => {
	try {
		const directories = dialog.showOpenDialog(config.mainWindow, {
			title: 'Выберите директорию для сохранения',
			properties: [ 'openDirectory', 'createDirectory', 'promptToCreate' ],
		});

		if (directories.length !== 1) {
			throw new Error('Не выбрана директория');
		}

		const [ directory ] = directories;


		const [ specialty ] = await db.specialties.find({ _id: arg });
		const { direction_id } = specialty;
		const competencies = await db.competencies.find({ direction_id });
		const disciplines = await db.disciplines.find({ direction_id });

		specialty.competencies = competencies
			.filter(competency => specialty.competencies.includes(competency._id) || competency.common);
		specialty.disciplines = disciplines
			.filter(discipline => specialty.disciplines.includes(discipline._id) || discipline.part_type !== 'variative')
			.sort((ld, rd) => {
				if (ld.part_type === rd.part_type) {
					return ld.code.localeCompare(rd.code);
				}

				return partTypeWeight[ ld.part_type ] - partTypeWeight[ rd.part_type ];
			});


		const wb = new xl.Workbook();
		const ws = wb.addWorksheet('Матрица компетенций');


		const map = specialty.competencies.reduce(function(all, item) {
			all[ item._id ] = item;
			return all;
		}, {});


		const header = competenciesGroupSort(specialty.competencies, map);

		printHeader(ws, header, map, specialty);

		printRows(ws, specialty, header);

		const buffer = await wb.writeToBuffer();

		const filename = `${specialty.name} - матрица компетенций.xlsx`;
		const destination = path.resolve(directory, filename);

		await fse.ensureFile(destination);
		await fse.writeFile(destination, buffer, 'binary');

		LOG(destination);

		shell.openExternal(`file://${directory}`);
	} catch (err) {
		log.error(err);
		throw err;
	}
});
