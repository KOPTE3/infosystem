import { dialog } from 'electron';
import promiseIpc from 'electron-promise-ipc';
import { lessonGroups } from '../../store/common';
import config from '../config';
import db from '../db';
import xl from 'excel4node';
import TimeBudget from '../generator/time-budget';


const { shell } = require('electron');
const fse = require('fs-extra');
const path = require('path');
const log = require('electron-log');

const LOG = log.debug.bind(log, '[generate-academic-table]');
LOG('init');

const partTypeWeight = {
	basic: 0,
	variative: 1,
	practice: 2,
	gia: 3,
};

function printDiscipline ({ specialty, ws, centerStyle, leftStyle, boldStyle, rowsLength, integerFormat, floatFormat, semesters }, discipline, currentRow) {
	ws.cell(currentRow, 1)
		.string(discipline.order.toString())
		.style(centerStyle);

	ws.cell(currentRow, 2)
		.string(discipline.code)
		.style(centerStyle);

	ws.cell(currentRow, 3)
		.string(discipline.name)
		.style(centerStyle)
		.style(leftStyle);

	if (discipline.name.length > 60) {
		ws.row(currentRow).setHeight(32);
	}

	ws.cell(currentRow, 4)
		.string(discipline.cipher)
		.style(centerStyle);

	const complexityParts = [];
	const exam = [];
	const credit = [];
	const credit_with_mark = [];
	let examsTime = 0;

	for (let s = 1; s <= semesters; s++) {
		const col = 23 + (s - 1) * 3;
		complexityParts.push(xl.getExcelCellRef(currentRow, col));
	}

	for (const semester of discipline.constraints.semesters) {
		const col = 23 + (semester.number - 1) * 3;

		ws.cell(currentRow, col)
			.number(semester.time)
			.style(centerStyle)
			.style(floatFormat);

		ws.cell(currentRow, col + 1)
			.number(semester.teacher_time)
			.style(centerStyle)
			.style(integerFormat);

		ws.cell(currentRow, col + 2)
			.number(semester.self_time)
			.style(centerStyle)
			.style(integerFormat);

		if (semester.exam === 'exam') {
			exam.push(semester.number);
		}

		if (semester.exam === 'credit') {
			credit.push(semester.number);
		}

		if (semester.exam === 'credit_with_mark') {
			credit_with_mark.push(semester.number);
		}

		if (semester.exam_time) {
			examsTime += semester.exam_time;
		}
	}

	const complexity = discipline.constraints.semesters.reduce((sum, s) => sum + s.time, 0);

	if (discipline.part_type === 'basic') {
		ws.cell(currentRow, 5)
			.formula(complexityParts.join(' + '))
			.style(centerStyle)
			.style(floatFormat);
		ws.cell(currentRow, 7)
			.formula(`${xl.getExcelCellRef(currentRow, 5)} * 36.0`)
			.style(centerStyle)
			.style(integerFormat);
	} else {
		ws.cell(currentRow, 6)
			.formula(complexityParts.join(' + '))
			.style(centerStyle)
			.style(floatFormat);
		ws.cell(currentRow, 7)
			.formula(`${xl.getExcelCellRef(currentRow, 6)} * 36.0`)
			.style(centerStyle)
			.style(integerFormat);
	}

	ws.cell(currentRow, rowsLength - 3)
		.string(exam.join(', '))
		.style(centerStyle);

	ws.cell(currentRow, rowsLength - 2)
		.string(credit_with_mark.join(', '))
		.style(centerStyle);

	ws.cell(currentRow, rowsLength - 1)
		.string(credit.join(', '))
		.style(centerStyle);

	const budget = new TimeBudget;

	discipline.structure = discipline.structure || {};
	discipline.structure.lessons = discipline.structure.lessons || [];
	discipline.structure.exams = discipline.structure.exams || [];

	const { lessons, exams } = discipline.structure;

	for (const l of [ ...lessons, ...exams ]) {
		budget.AddLesson(l);
	}

	const groups = Object.keys(lessonGroups);
	const teacher_time = [];

	groups.forEach((name, pos) => {
		const col = 9 + pos;
		teacher_time.push(xl.getExcelCellRef(currentRow, col));
		if (budget[ `_${name}` ] > 0) {
			ws.cell(currentRow, col)
				.number(budget[ `_${name}` ])
				.style(centerStyle)
				.style(integerFormat);
		}
	});

	ws.cell(currentRow, 8)
		.formula(teacher_time.join(' + '))
		.style(centerStyle)
		.style(integerFormat);

	ws.cell(currentRow, 21)
		.number(budget.self_time)
		.style(centerStyle)
		.style(integerFormat);

	if (examsTime > 0) {
		ws.cell(currentRow, 22)
			.number(examsTime)
			.style(centerStyle)
			.style(integerFormat);
	}

	if (complexity * 36 !== budget.all && discipline.part_type !== 'gia') {
		ws.cell(currentRow, 7)
			.style({
				fill: {
					type: 'pattern', // the only one implemented so far.
					patternType: 'solid', // most common.
					fgColor: 'AA0000', // you can add two extra characters to serve as alpha, i.e. '2172d7aa'.
				},
			});
	}
}


promiseIpc.on('generate-academic-table', async (arg) => {
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


		const [ specialty ] = await db.specialties.find({ _id: arg });
		const { direction_id } = specialty;
		const direction = await db.directions.findOne({ _id: direction_id });
		const competencies = await db.competencies.find({ direction_id });
		const disciplines = await db.disciplines.find({ direction_id });

		specialty.direction = direction;
		specialty.competencies = competencies
			.filter(competency => specialty.competencies.includes(competency._id) || competency.common);
		specialty.disciplines = disciplines
			.filter(discipline => specialty.disciplines.includes(discipline._id) || discipline.part_type !== 'variative')
			.sort((ld, rd) => {
				if (ld.part_type === rd.part_type) {
					if (ld.code !== rd.code) {
						return ld.code.localeCompare(rd.code);
					}
					return ld.name.localeCompare(rd.name);
				}

				return partTypeWeight[ ld.part_type ] - partTypeWeight[ rd.part_type ];
			})
			.map((d, pos) => {
				d.order = pos + 1;
				return d;
			});

		const semesters = specialty.direction.education_duration * 2;
		const rowsLength = 26 + semesters * 3;


		const wb = new xl.Workbook();
		const ws = wb.addWorksheet('План учебного процесса', {
			sheetView: {
				zoomScale: 70,
			},
		});

		const centerStyle = wb.createStyle({
			alignment: {
				horizontal: 'center',
				vertical: 'center',
				wrapText: true,
			},
		});

		const leftStyle = wb.createStyle({
			alignment: {
				horizontal: 'left',
			},
		});

		const verticalStyle = wb.createStyle({
			alignment: {
				textRotation: 90,
			},
		});

		const boldStyle = wb.createStyle({
			font: {
				bold: true,
			},
		});

		const integerFormat = wb.createStyle({
			numberFormat: '0',
		});

		const floatFormat = wb.createStyle({
			numberFormat: '0.0',
		});

		ws.row(1).setHeight(16);
		ws.row(2).setHeight(32);
		ws.row(3).setHeight(16);
		ws.row(4).setHeight(32);
		ws.row(5).setHeight(140);

		ws.cell(1, 1, 1, rowsLength, true)
			.string('План учебного процесса')
			.style(centerStyle)
			.style(boldStyle);

		ws.cell(2, 1, 5, 1, true)
			.string('№ п.п.')
			.style(centerStyle)
			.style(verticalStyle);
		ws.column(1).setWidth(6);

		ws.cell(2, 2, 5, 2, true)
			.string('Индекс')
			.style(centerStyle);
		ws.column(2).setWidth(13);

		ws.cell(2, 3, 5, 3, true)
			.string('Наименование учебных циклов, дисциплин')
			.style(centerStyle);
		ws.column(3).setWidth(60);

		ws.cell(2, 4, 5, 4, true)
			.string('Шифр учебной дисциплины')
			.style(centerStyle)
			.style(verticalStyle);
		ws.column(4).setWidth(13);


		ws.cell(2, 5, 4, 6, true)
			.string('Трудоём-кость ОПОП (в зачётных единицах)')
			.style(centerStyle);
		ws.cell(5, 5, 5, 5, true)
			.string('Базовая часть')
			.style(centerStyle)
			.style(verticalStyle);
		ws.cell(5, 6, 5, 6, true)
			.string('Вариативная часть')
			.style(centerStyle)
			.style(verticalStyle);
		ws.column(5).setWidth(6);
		ws.column(6).setWidth(6);


		ws.cell(2, 7, 5, 7, true)
			.string('Всего, в часах')
			.style(centerStyle)
			.style(verticalStyle);
		ws.column(7).setWidth(6);


		ws.cell(2, 8, 5, 8, true)
			.string('Учебных занятий с преподавателем, в часах')
			.style(centerStyle)
			.style(verticalStyle);
		ws.column(8).setWidth(6);

		const groups = Object.values(lessonGroups);

		ws.cell(2, 9, 2, 9 + groups.length - 1, true)
			.string('Распределение учебного времени по видам учебных занятий')
			.style(centerStyle);

		groups.forEach(({ name }, pos) => {
			const col = 9 + pos;
			ws.cell(3, col, 5, col, true)
				.string(name)
				.style(centerStyle)
				.style(verticalStyle);
			ws.column(col).setWidth(6);
		});


		ws.cell(2, 21, 5, 21, true)
			.string('Время, отводимое на самостоятельную работу')
			.style(centerStyle)
			.style(verticalStyle);
		ws.column(21).setWidth(6);

		ws.cell(2, 22, 5, 22, true)
			.string('Время, отводимое на зкзамены и зачены (выносимые на сессию)')
			.style(centerStyle)
			.style(verticalStyle);
		ws.column(22).setWidth(6);


		ws.cell(2, 23, 2, 23 + semesters * 3 - 1, true)
			.string('Распределение учебного времени по курсам и семестрам')
			.style(centerStyle);

		for (let year = 1; year <= specialty.direction.education_duration; year++) {
			const col = 23 + (year - 1) * 6;
			ws.cell(3, col, 3, col + 5, true)
				.string(`${year} курс`)
				.style(centerStyle);
		}

		for (let semester = 1; semester <= semesters; semester++) {
			const col = 23 + (semester - 1) * 3;
			ws.cell(4, col, 4, col + 2, true)
				.string(`${semester} семестр`)
				.style(centerStyle);

			ws.cell(5, col, 5, col, true)
				.string('зачетные единицы')
				.style(centerStyle)
				.style(verticalStyle);
			ws.column(col).setWidth(6);

			ws.cell(5, col + 1, 5, col + 1, true)
				.string('часы учебных занятий')
				.style(centerStyle)
				.style(verticalStyle);
			ws.column(col + 1).setWidth(6);

			ws.cell(5, col + 2, 5, col + 2, true)
				.string('часы на сам. работу')
				.style(centerStyle)
				.style(verticalStyle);
			ws.column(col + 2).setWidth(6);
		}

		ws.column(rowsLength - 3).setWidth(6);
		ws.column(rowsLength - 2).setWidth(6);
		ws.column(rowsLength - 1).setWidth(6);
		ws.column(rowsLength).setWidth(6);

		ws.cell(2, rowsLength - 3, 2, rowsLength, true)
			.string('Формы промежуточного и итогового контроля')
			.style(centerStyle);

		ws.cell(3, rowsLength - 2, 3, rowsLength, true)
			.string('зачеты')
			.style(centerStyle);

		ws.cell(4, rowsLength - 2, 4, rowsLength - 1, true)
			.string('по дисциплинам (практикам)')
			.style(centerStyle);

		ws.cell(3, rowsLength - 3, 5, rowsLength - 3, true)
			.string('экзамены')
			.style(centerStyle)
			.style(verticalStyle);

		ws.cell(5, rowsLength - 2, 5, rowsLength - 2, true)
			.string('с оценкой')
			.style(centerStyle)
			.style(verticalStyle);

		ws.cell(5, rowsLength - 1, 5, rowsLength - 1, true)
			.string('без оценки')
			.style(centerStyle)
			.style(verticalStyle);

		ws.cell(4, rowsLength, 5, rowsLength, true)
			.string('по курсовым работам (проектам, зачетам)')
			.style(centerStyle)
			.style(verticalStyle);


		let currentRow = 6;
		let sectionStartRow = 0;
		let sectionEndRow = 0;
		let summarySection1Row = 0;
		let summarySection2Row = 0;
		let bigSummarySection1Row = 0;
		let bigSummarySection2Row = 0;
		let bigSummarySection3Row = 0;
		const print = printDiscipline.bind(null, {
			specialty,
			ws,
			centerStyle,
			leftStyle,
			boldStyle,
			rowsLength,
			integerFormat,
			floatFormat,
			semesters,
		});

		ws.cell(currentRow, 3)
			.string('Блок 1 "Дисциплины (модули)"')
			.style(centerStyle)
			.style(leftStyle)
			.style(boldStyle);
		currentRow++;

		ws.cell(currentRow, 2)
			.string('Б.1.1')
			.style(centerStyle)
			.style(boldStyle);

		ws.cell(currentRow, 3)
			.string('Базовая часть')
			.style(centerStyle)
			.style(leftStyle)
			.style(boldStyle);
		currentRow++;

		sectionStartRow = currentRow;

		const basicDisciplines = specialty.disciplines.filter(d => d.part_type === 'basic');

		for (const discipline of basicDisciplines) {
			print(discipline, currentRow);
			currentRow++;
		}

		sectionEndRow = currentRow - 1;
		summarySection1Row = currentRow;

		ws.cell(currentRow, 3)
			.string('Итого за базовую часть блока 1')
			.style(centerStyle)
			.style(leftStyle)
			.style(boldStyle);

		for (let col = 5; col <= rowsLength - 4; col++) {
			if (col === 6) {
				continue;
			}

			const parts = [];
			for (let row = sectionStartRow; row <= sectionEndRow; row++) {
				parts.push(xl.getExcelCellRef(row, col));
			}

			ws.cell(currentRow, col)
				.formula(parts.join(' + '))
				.style(centerStyle)
				.style(boldStyle)
				.style(floatFormat);
		}

		currentRow++;


		ws.cell(currentRow, 2)
			.string('Б.1.2')
			.style(centerStyle)
			.style(boldStyle);

		ws.cell(currentRow, 3)
			.string('Вариативная часть')
			.style(centerStyle)
			.style(leftStyle)
			.style(boldStyle);
		currentRow++;


		sectionStartRow = currentRow;

		const variativeDisciplines = specialty.disciplines.filter(d => d.part_type === 'variative');

		for (const discipline of variativeDisciplines) {
			print(discipline, currentRow);
			currentRow++;
		}

		sectionEndRow = currentRow - 1;
		summarySection2Row = currentRow;

		ws.cell(currentRow, 3)
			.string('Итого за вариативную часть блока 1')
			.style(centerStyle)
			.style(leftStyle)
			.style(boldStyle);

		for (let col = 5; col <= rowsLength - 4; col++) {
			if (col === 5) {
				continue;
			}

			const parts = [];
			for (let row = sectionStartRow; row <= sectionEndRow; row++) {
				parts.push(xl.getExcelCellRef(row, col));
			}

			ws.cell(currentRow, col)
				.formula(parts.join(' + '))
				.style(centerStyle)
				.style(boldStyle)
				.style(floatFormat);
		}

		currentRow++;

		bigSummarySection1Row = currentRow;

		ws.cell(currentRow, 3)
			.string('Всего по блоку 1')
			.style(centerStyle)
			.style(leftStyle)
			.style(boldStyle);

		for (let col = 5; col <= rowsLength - 4; col++) {

			ws.cell(currentRow, col)
				.formula(`${xl.getExcelCellRef(summarySection1Row, col)} + ${xl.getExcelCellRef(summarySection2Row, col)}`)
				.style(centerStyle)
				.style(boldStyle)
				.style(floatFormat);
		}

		currentRow++;

		ws.cell(currentRow, 2)
			.string('Б.2')
			.style(centerStyle)
			.style(boldStyle);

		ws.cell(currentRow, 3)
			.string('Блок 2. Практики, в том числе научно-исследовательская работа (НИР)')
			.style(centerStyle)
			.style(leftStyle)
			.style(boldStyle);
		ws.row(currentRow).setHeight(32);
		currentRow++;


		sectionStartRow = currentRow;

		const practiceDisciplines = specialty.disciplines.filter(d => d.part_type === 'practice');

		for (const discipline of practiceDisciplines) {
			print(discipline, currentRow);
			currentRow++;
		}

		sectionEndRow = currentRow - 1;
		bigSummarySection2Row = currentRow;

		ws.cell(currentRow, 3)
			.string('Всего по блоку 2')
			.style(centerStyle)
			.style(leftStyle)
			.style(boldStyle);

		for (let col = 5; col <= rowsLength - 4; col++) {
			if (col === 5) {
				continue;
			}

			const parts = [];
			for (let row = sectionStartRow; row <= sectionEndRow; row++) {
				parts.push(xl.getExcelCellRef(row, col));
			}

			ws.cell(currentRow, col)
				.formula(parts.join(' + '))
				.style(centerStyle)
				.style(boldStyle)
				.style(floatFormat);
		}

		currentRow++;

		ws.cell(currentRow, 1, currentRow, 3, true)
			.string('Всего по блокам 1 и 2')
			.style(centerStyle)
			.style(boldStyle);

		for (let col = 5; col <= rowsLength - 4; col++) {

			ws.cell(currentRow, col)
				.formula(`${xl.getExcelCellRef(bigSummarySection1Row, col)} + ${xl.getExcelCellRef(bigSummarySection2Row, col)}`)
				.style(centerStyle)
				.style(boldStyle)
				.style(floatFormat);
		}

		currentRow++;

		ws.cell(currentRow, 2)
			.string('Б.3')
			.style(centerStyle)
			.style(boldStyle);

		ws.cell(currentRow, 3)
			.string('Блок 3. Государственная итоговая аттестация')
			.style(centerStyle)
			.style(leftStyle)
			.style(boldStyle);
		ws.row(currentRow).setHeight(32);
		currentRow++;


		sectionStartRow = currentRow;

		const giaDisciplines = specialty.disciplines.filter(d => d.part_type === 'gia');

		for (const discipline of giaDisciplines) {
			print(discipline, currentRow);
			currentRow++;
		}

		sectionEndRow = currentRow - 1;
		bigSummarySection3Row = currentRow;

		ws.cell(currentRow, 3)
			.string('Всего по блоку 3')
			.style(centerStyle)
			.style(leftStyle)
			.style(boldStyle);

		for (let col = 5; col <= rowsLength - 4; col++) {
			if (col === 5) {
				continue;
			}

			const parts = [];
			for (let row = sectionStartRow; row <= sectionEndRow; row++) {
				parts.push(xl.getExcelCellRef(row, col));
			}

			ws.cell(currentRow, col)
				.formula(parts.join(' + '))
				.style(centerStyle)
				.style(boldStyle)
				.style(floatFormat);
		}

		currentRow++;

		ws.cell(currentRow, 1, currentRow, 3, true)
			.string('Трудоемкость основной профессиональной образовательной программы')
			.style(centerStyle)
			.style(leftStyle)
			.style(boldStyle);
		ws.row(currentRow).setHeight(32);

		ws.cell(currentRow, 5, currentRow, 6, true)
			.formula(`${xl.getExcelCellRef(bigSummarySection1Row, 5)} + ${xl.getExcelCellRef(bigSummarySection2Row, 5)} + ${xl.getExcelCellRef(bigSummarySection3Row, 5)} + ${xl.getExcelCellRef(bigSummarySection1Row, 6)} + ${xl.getExcelCellRef(bigSummarySection2Row, 6)} + ${xl.getExcelCellRef(bigSummarySection3Row, 6)}`)
			.style(centerStyle)
			.style(boldStyle)
			.style(floatFormat);

		for (let col = 7; col <= rowsLength - 4; col++) {

			ws.cell(currentRow, col)
				.formula(`${xl.getExcelCellRef(bigSummarySection1Row, col)} + ${xl.getExcelCellRef(bigSummarySection2Row, col)} + ${xl.getExcelCellRef(bigSummarySection3Row, col)}`)
				.style(centerStyle)
				.style(boldStyle)
				.style(floatFormat);
		}

		currentRow++;

		ws.cell(currentRow, 1, currentRow, 3, true)
			.string('КОЛИЧЕСТВО:')
			.style(centerStyle)
			.style(leftStyle)
			.style(boldStyle);
		currentRow++;

		let parts = [];

		ws.cell(currentRow, 1, currentRow, 3, true)
			.string('Дисциплин и модулей')
			.style(centerStyle)
			.style(leftStyle);

		for (let semester = 1; semester <= semesters; semester++) {
			const col = 23 + (semester - 1) * 3;
			const count = specialty.disciplines
				.filter(d => d.part_type !== 'practice')
				.reduce((sum, d) => {
					const has = d.constraints.semesters.some(s => s.number === semester);
					return sum + (has ? 1 : 0);
				}, 0);
			ws.cell(currentRow, col + 1)
				.number(count)
				.style(centerStyle)
				.style(integerFormat);
		}

		currentRow++;

		ws.cell(currentRow, 1, currentRow, 3, true)
			.string('Экзаменов')
			.style(centerStyle)
			.style(leftStyle);

		parts = [];
		for (let semester = 1; semester <= semesters; semester++) {
			const col = 23 + (semester - 1) * 3;
			const count = specialty.disciplines
				.reduce((sum, d) => {
					const has = d.constraints.semesters.some(s => s.number === semester && s.exam === 'exam');
					return sum + (has ? 1 : 0);
				}, 0);
			ws.cell(currentRow, col + 1)
				.number(count)
				.style(centerStyle)
				.style(integerFormat);

			parts.push(xl.getExcelCellRef(currentRow, col + 1));
		}

		ws.cell(currentRow, rowsLength - 3)
			.formula(parts.join(' + '))
			.style(centerStyle)
			.style(integerFormat);

		currentRow++;

		ws.cell(currentRow, 1, currentRow, 3, true)
			.string('Зачётов с оценкой')
			.style(centerStyle)
			.style(leftStyle);

		parts = [];
		for (let semester = 1; semester <= semesters; semester++) {
			const col = 23 + (semester - 1) * 3;
			const count = specialty.disciplines
				.reduce((sum, d) => {
					const has = d.constraints.semesters.some(s => s.number === semester && s.exam === 'credit_with_mark');
					return sum + (has ? 1 : 0);
				}, 0);
			ws.cell(currentRow, col + 1)
				.number(count)
				.style(centerStyle)
				.style(integerFormat);

			parts.push(xl.getExcelCellRef(currentRow, col + 1));
		}

		ws.cell(currentRow, rowsLength - 2)
			.formula(parts.join(' + '))
			.style(centerStyle)
			.style(integerFormat);

		currentRow++;

		ws.cell(currentRow, 1, currentRow, 3, true)
			.string('Зачётов без оценки')
			.style(centerStyle)
			.style(leftStyle);

		parts = [];
		for (let semester = 1; semester <= semesters; semester++) {
			const col = 23 + (semester - 1) * 3;
			const count = specialty.disciplines
				.reduce((sum, d) => {
					const has = d.constraints.semesters.some(s => s.number === semester && s.exam === 'credit');
					return sum + (has ? 1 : 0);
				}, 0);
			ws.cell(currentRow, col + 1)
				.number(count)
				.style(centerStyle)
				.style(integerFormat);

			parts.push(xl.getExcelCellRef(currentRow, col + 1));
		}

		ws.cell(currentRow, rowsLength - 1)
			.formula(parts.join(' + '))
			.style(centerStyle)
			.style(integerFormat);

		currentRow++;

		ws.cell(currentRow, 1, currentRow, 3, true)
			.string('Курсовых работ (проектов, задач)')
			.style(centerStyle)
			.style(leftStyle);
		currentRow++;


		const buffer = await wb.writeToBuffer();

		const filename = `${specialty.name} - план учебного процесса.xlsx`;
		const destination = path.resolve(directory, filename);

		await fse.ensureFile(destination);
		await fse.writeFile(destination, buffer, 'binary');

		LOG(destination);

		shell.openExternal(`file://${destination}`);
	} catch (err) {
		log.error(err);
		throw err;
	}
});
