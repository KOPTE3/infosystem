import { competenciesTypeMap, kp, lessonTypes } from '../../store/common';
import TimeBudget from './time-budget';


const config = require('../config');
const jsdom = require('jsdom');
const fse = require('fs-extra');
const path = require('path');
const os = require('os');
const HTML5ToPDF = require('html5-to-pdf');
const puppeteer = require('puppeteer');
const HummusRecipe = require('hummus-recipe');

const { JSDOM } = jsdom;

/**
 * @param {string} string
 * @return {string}
 */
function capitalizeFirstLetter (string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * @param {string} text
 * @param {Document} document
 * @return {HTMLParagraphElement[]}
 */
function wrapLines (text, document) {
	return text
		.split('\n')
		.map(l => l.trim())
		.filter(l => !!l)
		.map(l => {
			const p = document.createElement('p');
			p.textContent = l;
			return p;
		});
}

/**
 * @return {string}
 */
function getChromiumExecPath () {
	const p = puppeteer.executablePath();
	const rep = 'app.asar.unpacked';
	if (p.indexOf(rep) !== -1) {
		return p;
	}
	return p.replace('app.asar', rep);
}

const testTypes = Object.assign({}, lessonTypes, { kp });
Object.keys(testTypes).forEach(key => {
	if (testTypes[ key ].hidden) {
		delete testTypes[ key ];
	}
});

module.exports = class Generator {
	constructor (source, results) {
		this.source = source;
		this.results = results;

		this.academicBegin = null;
		this.academicMiddle = null;
		this.academicEnd = null;
		this.thematic = null;
	}

	async initDoms () {
		const academic_plan_begin_template = await fse.readFile(path.resolve(config.templatesRoot, 'academic_plan_begin_template.html'));
		const academic_plan_middle_template = await fse.readFile(path.resolve(config.templatesRoot, 'academic_plan_middle_template.html'));
		const academic_plan_end_template = await fse.readFile(path.resolve(config.templatesRoot, 'academic_plan_end_template.html'));
		const thematic_plan_template = await fse.readFile(path.resolve(config.templatesRoot, 'thematic_plan_template.html'));

		this.academicBegin = new JSDOM(academic_plan_begin_template);
		this.academicMiddle = new JSDOM(academic_plan_middle_template);
		this.academicEnd = new JSDOM(academic_plan_end_template);
		this.thematic = new JSDOM(thematic_plan_template);
	}

	async init () {
		await this.initDoms();
		this.initBegin();
		this.initMiddle();
		this.initEnd();
		this.initThematic();
		this.initStructure();
	}

	initStructure () {
		const documentA = this.academicMiddle.window.document;
		const documentAe = this.academicEnd.window.document;
		const documentT = this.thematic.window.document;

		let els = null;
		const { semesters } = this.source.constraints;
		const { conclusion, introduction, sections, topics, lessons, exams } = this.results.structure;

		const complexity = semesters.reduce((summ, cur) => summ + cur.time, 0);

		els = documentA.querySelectorAll('[data-id="complexity"]');
		for (const el of els) {
			el.textContent = complexity.toFixed(1);
		}

		els = documentA.querySelectorAll('[data-id="complexity_hours"]');
		for (const el of els) {
			el.textContent = complexity * 36;
		}

		const structureTable = documentA.querySelector('[data-id="structure-table"]');
		const shortStructureTable = documentT.querySelector('[data-id="short-structure-table"]');
		const thematicTable = documentT.querySelector('[data-id="thematic-table"]');
		let contentOfDiscipline = documentAe.querySelector('[data-id="content-of-discipline"]');
		const contentOfDisciplineParent = documentAe.querySelector('[data-id="content-of-discipline-parent"]');


		const summaryTimeBudget = new TimeBudget;

		for (const semester of semesters) {
			const semesterNumber = semester.number;
			const semesterTimeBudget = new TimeBudget;

			const row1 = documentA.createElement('tr');
			row1.innerHTML = `
	<td colspan='16' class='center'><strong>${semesterNumber} семестр</strong></td>
`;
			structureTable.appendChild(row1);

			const row2 = documentT.createElement('tr');
			row2.innerHTML = `
	<td colspan='7' class='center'><strong>${semesterNumber} семестр</strong></td>
`;
			thematicTable.appendChild(row2);

			// введение
			if (semesters[ 0 ].number === semesterNumber) {
				// первый семестр изучения дисциплины, добавляем введение
				const introductionTimeBudget = new TimeBudget();

				// добавляем секцию введения в тематический план
				{
					const document = documentT;

					const introductionLessons = lessons.filter(l => l.topic === 'introduction');
					const { rows, timeBudget } = this.makeLessons(introductionLessons);
					introductionTimeBudget.Add(timeBudget);

					const introductionTr = document.createElement('tr');
					let td = null;

					introductionTr.appendChild(document.createElement('td'));
					introductionTr.appendChild(document.createElement('td'));

					td = document.createElement('td');
					td.textContent = introductionTimeBudget.teacher_time || '-';
					introductionTr.appendChild(td);

					td = document.createElement('td');
					td.textContent = 'Введение';
					td.classList.add('strong');
					introductionTr.appendChild(td);

					introductionTr.appendChild(document.createElement('td'));
					introductionTr.appendChild(document.createElement('td'));

					td = document.createElement('td');
					td.textContent = introductionTimeBudget.self_time || '-';
					introductionTr.appendChild(td);

					thematicTable.appendChild(introductionTr);
					for (const r of rows) {
						thematicTable.appendChild(r);
					}
				}


				const fragment = documentAe.createDocumentFragment();
				const p = documentAe.createElement('p');
				const strong = documentAe.createElement('strong');
				strong.textContent = 'Введение';

				fragment.appendChild(p);
				p.appendChild(strong);
				if (introductionTimeBudget.all === 0) {
					structureTable.appendChild(
						introductionTimeBudget.getRow({ name: 'Введение (в рамках темы 1)', document: documentA }),
					);

					p.appendChild(documentAe.createTextNode(' (в рамках темы 1)'));
				} else {
					structureTable.appendChild(
						introductionTimeBudget.getRow({ name: 'Введение', document: documentA }),
					);

					p.appendChild(documentAe.createTextNode(` (${introductionTimeBudget.teacher_time} часов)`));
				}

				if (introduction.description) {
					const ps = wrapLines(introduction.description, documentAe);
					for (const p1 of ps) {
						fragment.appendChild(p1);
					}
				}

				contentOfDiscipline.appendChild(fragment);

				semesterTimeBudget.Add(introductionTimeBudget);
			}

			// содержимое
			for (const section of sections) {
				if (section.semester !== semesterNumber) {
					continue;
				}

				const sectionNumber = section.order;
				const sectionTimeBudget = new TimeBudget;

				const sectionThematicFragment = documentT.createDocumentFragment();
				const sectionTopicsFragments = [];

				const sectionStructureFragment = documentA.createDocumentFragment();
				const sectionTopicsStructureFragments = [];

				const sectionTopicsContentFragments = [];

				for (const topic of topics) {
					if (topic.section !== sectionNumber) {
						continue;
					}

					const topicNumber = topic.order;

					const topicLessons = lessons.filter(l => l.topic === topicNumber);
					const { rows: topicLessonRows, timeBudget: topicTimeBudget } = this.makeLessons(topicLessons);

					const topicThematicFragment = documentT.createDocumentFragment();
					const topicContentFragment = documentAe.createDocumentFragment();

					{
						const document = documentT;
						const tr = document.createElement('tr');
						let td = null;

						tr.appendChild(document.createElement('td'));
						tr.appendChild(document.createElement('td'));

						td = document.createElement('td');
						td.textContent = topicTimeBudget.teacher_time || '-';
						tr.appendChild(td);

						td = document.createElement('td');
						td.textContent = `Тема ${topicNumber}. ${topic.description}`;
						td.classList.add('strong');
						tr.appendChild(td);

						tr.appendChild(document.createElement('td'));
						tr.appendChild(document.createElement('td'));

						td = document.createElement('td');
						td.textContent = topicTimeBudget.self_time || '-';
						tr.appendChild(td);

						topicThematicFragment.appendChild(tr);
						for (const r of topicLessonRows) {
							topicThematicFragment.appendChild(r);
						}
					}

					{
						const document = documentAe;

						const pTopic = document.createElement('p');
						const strongTopic = document.createElement('strong');
						strongTopic.textContent = `Тема ${topicNumber}`;
						pTopic.appendChild(strongTopic);
						pTopic.appendChild(document.createTextNode(` ${topic.description} (${topicTimeBudget.teacher_time} часов)`));

						topicContentFragment.appendChild(pTopic);
						if (topic.didactic_units) {
							const ps = wrapLines(topic.didactic_units, document);
							for (const p1 of ps) {
								topicContentFragment.appendChild(p1);
							}
						}
					}

					sectionTopicsFragments.push(topicThematicFragment);
					sectionTopicsStructureFragments.push(
						topicTimeBudget.getRow({
							name: `Тема ${topicNumber}. ${topic.description}`,
							document: documentA,
						}),
					);
					sectionTopicsContentFragments.push(topicContentFragment);

					sectionTimeBudget.Add(topicTimeBudget);
				}

				{
					const document = documentT;
					const tr = document.createElement('tr');
					let td = null;

					tr.appendChild(document.createElement('td'));
					tr.appendChild(document.createElement('td'));

					td = document.createElement('td');
					td.textContent = sectionTimeBudget.teacher_time || '-';
					tr.appendChild(td);

					td = document.createElement('td');
					td.textContent = `Раздел ${sectionNumber}. ${section.description}`;
					td.classList.add('strong');
					tr.appendChild(td);

					tr.appendChild(document.createElement('td'));
					tr.appendChild(document.createElement('td'));

					td = document.createElement('td');
					td.textContent = sectionTimeBudget.self_time || '-';
					tr.appendChild(td);

					sectionThematicFragment.appendChild(tr);
					for (const f of sectionTopicsFragments) {
						sectionThematicFragment.appendChild(f);
					}
				}

				thematicTable.appendChild(sectionThematicFragment);

				sectionStructureFragment.appendChild(
					sectionTimeBudget.getRow({
						name: `Раздел ${sectionNumber}. ${section.description}`,
						strong: true,
						document: documentA,
					}),
				);
				for (const f of sectionTopicsStructureFragments) {
					sectionStructureFragment.appendChild(f);
				}

				{
					const p = documentAe.createElement('p');
					p.classList.add('strong');

					p.textContent = `Раздел ${sectionNumber}. ${section.description} (${sectionTimeBudget.teacher_time} часов)`;

					contentOfDiscipline.appendChild(p);
					for (const f of sectionTopicsContentFragments) {
						contentOfDiscipline.appendChild(f);
					}
				}

				structureTable.appendChild(sectionStructureFragment);

				semesterTimeBudget.Add(sectionTimeBudget);
			}

			// заключение
			if (semesters[ semesters.length - 1 ].number === semesterNumber) {
				// последний семестр изучения дисциплины, добавляем заключение
				const conclusionTimeBudget = new TimeBudget();

				// добавляем секцию заключения в тематический план
				{
					const document = documentT;

					const conclusionLessons = lessons.filter(l => l.topic === 'conclusion');
					const { rows, timeBudget } = this.makeLessons(conclusionLessons);
					conclusionTimeBudget.Add(timeBudget);

					const conclusionTr = document.createElement('tr');
					conclusionTr.appendChild(document.createElement('td'));
					conclusionTr.appendChild(document.createElement('td'));
					let td = null;

					td = document.createElement('td');
					td.textContent = conclusionTimeBudget.teacher_time || '-';
					conclusionTr.appendChild(td);

					td = document.createElement('td');
					td.textContent = 'Заключение';
					td.classList.add('strong');
					conclusionTr.appendChild(td);

					conclusionTr.appendChild(document.createElement('td'));
					conclusionTr.appendChild(document.createElement('td'));

					td = document.createElement('td');
					td.textContent = conclusionTimeBudget.self_time || '-';
					conclusionTr.appendChild(td);

					thematicTable.appendChild(conclusionTr);
					for (const r of rows) {
						thematicTable.appendChild(r);
					}
				}

				const fragment = documentAe.createDocumentFragment();
				const p = documentAe.createElement('p');
				const strong = documentAe.createElement('strong');
				strong.textContent = 'Заключение';

				fragment.appendChild(p);
				p.appendChild(strong);
				if (conclusionTimeBudget.all === 0) {
					let lastTopic = 0;
					topics.forEach(t => {
						if (t.order > lastTopic) {
							lastTopic = t.order;
						}
					});
					structureTable.appendChild(
						conclusionTimeBudget.getRow({
							name: `Заключение (в рамках темы ${lastTopic})`,
							document: documentA,
						}),
					);

					p.appendChild(documentAe.createTextNode(` (в рамках темы ${lastTopic})`));
				} else {
					structureTable.appendChild(
						conclusionTimeBudget.getRow({ name: 'Введение', document: documentA }),
					);

					p.appendChild(documentAe.createTextNode(` (${conclusionTimeBudget.teacher_time} часов)`));
				}

				if (conclusion.description) {
					const ps = wrapLines(conclusion.description, documentAe);
					for (const p1 of ps) {
						fragment.appendChild(p1);
					}
				}

				contentOfDiscipline.appendChild(fragment);

				semesterTimeBudget.Add(conclusionTimeBudget);
			}

			// экзамены
			const exam = exams.find(e => e.semester === semesterNumber);
			if (exam) {
				const examTimeBudget = new TimeBudget;
				examTimeBudget.AddLesson(exam);
				const strType = capitalizeFirstLetter(lessonTypes[ exam.type ].full);

				{
					const fragment = documentAe.createDocumentFragment();
					const p = documentAe.createElement('p');
					const strong = documentAe.createElement('strong');
					strong.textContent = strType;

					fragment.appendChild(p);
					p.appendChild(strong);
					structureTable.appendChild(
						examTimeBudget.getRow({ name: strType, document: documentA, strong: true }),
					);

					p.appendChild(documentAe.createTextNode(` (${examTimeBudget.teacher_time} часов)`));
					contentOfDiscipline.appendChild(fragment);
				}

				{
					const document = documentT;
					const tr = document.createElement('tr');
					let td = null;

					tr.appendChild(document.createElement('td'));
					tr.appendChild(document.createElement('td'));

					td = document.createElement('td');
					td.textContent = examTimeBudget.teacher_time || '-';
					tr.appendChild(td);

					td = document.createElement('td');
					td.textContent = strType;
					td.classList.add('strong');
					tr.appendChild(td);

					tr.appendChild(document.createElement('td'));
					tr.appendChild(document.createElement('td'));

					td = document.createElement('td');
					td.textContent = examTimeBudget.self_time || '-';
					tr.appendChild(td);

					thematicTable.appendChild(tr);
				}

				semesterTimeBudget.Add(examTimeBudget);
			}

			// добавляем итоги по семестру
			{
				const semesterTimeBudgetRow = semesterTimeBudget.getRow({
					name: semesterNumber,
					document: documentT,
				});

				const td = documentT.createElement('td');
				td.textContent = '';
				if (exam) {
					td.textContent = capitalizeFirstLetter(lessonTypes[ exam.type ].full);
				}

				semesterTimeBudgetRow.appendChild(td);
				shortStructureTable.appendChild(semesterTimeBudgetRow);
			}

			{
				const document = documentT;

				const summaryTr = document.createElement('tr');
				summaryTr.classList.add('strong');
				let td = null;

				summaryTr.appendChild(document.createElement('td'));

				td = document.createElement('td');
				td.textContent = 'Итого:';
				summaryTr.appendChild(td);

				td = document.createElement('td');
				td.textContent = semesterTimeBudget.teacher_time || '-';
				summaryTr.appendChild(td);

				summaryTr.appendChild(document.createElement('td'));
				summaryTr.appendChild(document.createElement('td'));
				summaryTr.appendChild(document.createElement('td'));

				td = document.createElement('td');
				td.textContent = semesterTimeBudget.self_time || '-';
				summaryTr.appendChild(td);

				thematicTable.appendChild(summaryTr);
			}

			structureTable.appendChild(
				semesterTimeBudget.getRow({
					name: `Всего по ${semesterNumber} семестру`,
					strong: true,
					document: documentA,
				}),
			);

			summaryTimeBudget.Add(semesterTimeBudget);
		}

		{
			const summaryTimeBudgetRow = summaryTimeBudget.getRow({
				name: 'Всего',
				document: documentT,
				strong: true,
			});

			summaryTimeBudgetRow.appendChild(documentT.createElement('td'));
			shortStructureTable.appendChild(summaryTimeBudgetRow);
		}

		{
			const document = documentT;

			const summaryTr = document.createElement('tr');
			summaryTr.classList.add('strong');
			let td = null;

			summaryTr.appendChild(document.createElement('td'));

			td = document.createElement('td');
			td.textContent = 'Всего:';
			summaryTr.appendChild(td);

			td = document.createElement('td');
			td.textContent = summaryTimeBudget.teacher_time || '-';
			summaryTr.appendChild(td);

			summaryTr.appendChild(document.createElement('td'));
			summaryTr.appendChild(document.createElement('td'));
			summaryTr.appendChild(document.createElement('td'));

			td = document.createElement('td');
			td.textContent = summaryTimeBudget.self_time || '-';
			summaryTr.appendChild(td);

			thematicTable.appendChild(summaryTr);
		}

		structureTable.appendChild(
			summaryTimeBudget.getRow({
				name: 'Всего по дисциплине',
				strong: true,
				document: documentA,
			}),
		);


		while (contentOfDiscipline.firstChild) {
			contentOfDisciplineParent.appendChild(contentOfDiscipline.firstChild);
		}
		contentOfDiscipline.remove();
		contentOfDiscipline = null;

		els = documentA.querySelectorAll('[data-id="teacher_time_all"]');
		for (const el of els) {
			el.textContent = summaryTimeBudget.teacher_time;
		}
	}

	/**
	 * @param {{description: string, literature: string, name: string, order: number, provision: string, self_time: number, suborder: number, teacher_time: number, topic: number, type: string}[]} lessons
	 * @return {{rows: HTMLElement[], timeBudget: TimeBudget}}
	 */
	makeLessons (lessons) {
		const document = this.thematic.window.document;
		const rows = [];
		const tb = new TimeBudget;

		for (const lesson of lessons) {
			tb.AddLesson(lesson);

			const row = document.createElement('tr');
			let td = null;

			td = document.createElement('td');
			td.textContent = lesson.order;
			row.appendChild(td);

			td = document.createElement('td');
			td.textContent = `${lessonTypes[ lesson.type ].full} №${lesson.suborder}`;
			row.appendChild(td);

			td = document.createElement('td');
			td.textContent = lesson.teacher_time || '-';
			row.appendChild(td);

			td = document.createElement('td');
			const strong = document.createElement('strong');
			const div = document.createElement('div');
			strong.textContent = lesson.name;
			div.textContent = lesson.description;
			td.appendChild(strong);
			td.appendChild(div);
			row.appendChild(td);

			td = document.createElement('td');
			td.textContent = lesson.provision;
			row.appendChild(td);

			td = document.createElement('td');
			td.textContent = lesson.literature;
			row.appendChild(td);

			td = document.createElement('td');
			td.textContent = lesson.self_time || '-';
			row.appendChild(td);

			rows.push(row);
		}

		return {
			rows,
			timeBudget: tb,
		};
	}

	initBegin () {
		const document = this.academicBegin.window.document;

		let els = null;

		els = document.querySelectorAll('[data-id="name"]');
		for (const el of els) {
			el.textContent = this.source.name;
		}

		els = document.querySelectorAll('[data-id="code"]');
		for (const el of els) {
			el.textContent = this.source.code;
		}

		els = document.querySelectorAll('[data-id="direction.qualification"]');
		for (const el of els) {
			el.textContent = `${this.source.direction.qualification}а`;
		}

		let period_of_study = '';
		const semesters = this.source.constraints.semesters.map(s => s.number);
		if (semesters.length === 1) {
			period_of_study = `${semesters[ 0 ]} семестре`;
		} else {
			period_of_study = `${semesters.join(', ')} семестрах`;
		}

		els = document.querySelectorAll('[data-id="period_of_study"]');
		for (const el of els) {
			el.textContent = period_of_study;
		}

		const competenciesTable = document.querySelector('[data-id="competencies-table"]');

		for (const competency of this.source.constraints.competencies) {
			const rowFragment = document.createDocumentFragment();
			const rows = [
				document.createElement('tr'),
				document.createElement('tr'),
				document.createElement('tr'),
			];

			const first = document.createElement('td');
			const last = document.createElement('td');
			let rowSpan = 0;
			const p = document.createElement('p');
			p.textContent = `${competency.description} `;

			const strong = document.createElement('strong');
			strong.textContent = `(${competency.code})`;
			p.appendChild(strong);
			first.appendChild(p);

			last.textContent = (competency.common_disciplines || []).join(', ');

			rows[ 0 ].appendChild(first);

			[ 'know', 'able_to', 'own' ].forEach((type, position) => {
				if (competency[ type ].length === 0) {
					return;
				}

				rowSpan++;

				const td = document.createElement('td');
				const strong = document.createElement('strong');
				strong.textContent = capitalizeFirstLetter(`${competenciesTypeMap[ type ]}:`);
				td.appendChild(strong);
				competency[ type ].forEach((text, pos) => {
					const p = document.createElement('p');
					const end = (competency[ type ].length - 1 === pos) ? '.' : ';';
					p.textContent = `${text}${end}`;
					td.appendChild(p);
				});

				rows[ position ].appendChild(td);
			});

			first.rowSpan = rowSpan;
			last.rowSpan = rowSpan;

			rows[ 0 ].appendChild(last);

			rowFragment.appendChild(rows[ 0 ]);
			rowFragment.appendChild(rows[ 1 ]);
			rowFragment.appendChild(rows[ 2 ]);

			competenciesTable.appendChild(rowFragment);
		}

		let el = document.querySelector('[data-id="intro-text"]');
		el.insertAdjacentHTML('afterend', this.results.introText);
		el.remove();
		el = null;
	}

	initMiddle () {
		const document = this.academicMiddle.window.document;

		const td = document.querySelector('[data-id="tests-table-header-helper"]');
		const r1 = document.querySelector('[data-id="tests-table-header"]');
		const r2 = document.querySelector('[data-id="tests-table-first-row"]');
		const r3 = document.querySelector('[data-id="tests-table-second-row"]');

		const { topics } = this.results.structure;

		td.colSpan = topics.length;

		for (const topic of topics) {
			const td1 = document.createElement('td');
			const td2 = document.createElement('td');
			const td3 = document.createElement('td');
			r1.appendChild(td1);
			r2.appendChild(td2);
			r3.appendChild(td3);

			td1.textContent = topic.order;

			if (topic.test) {
				td2.textContent = testTypes[ topic.test.type ].short;
				td3.textContent = topic.test.time;
			}
		}

		const legend = document.querySelector('[data-id="tests-legend-table"]');

		for (const { short, full } of Object.values(testTypes)) {
			const row = document.createElement('tr');
			const td1 = document.createElement('td');
			const td2 = document.createElement('td');

			td1.textContent = full;
			td2.textContent = short;
			row.appendChild(td1);
			row.appendChild(td2);

			legend.appendChild(row);
		}
	}

	initEnd () {
		const document = this.academicEnd.window.document;

		[ '4_1', '4_2', '4_3', '5', '6', '7', '8_1', '8_1_1', '8_1_2', '8_2', '8_2_1', '8_2_2' ].forEach((part) => {
			let el = document.querySelector(`[data-id='${part}']`);
			el.insertAdjacentHTML('afterend', this.results.sections[ part ]);
			el.remove();
			el = null;
		});

		let els = document.querySelectorAll('[data-id="department_name"]');
		for (const el of els) {
			el.textContent = this.source.department_name;
		}
	}

	initThematic () {
		const document = this.thematic.window.document;

		let els = null;
		let el = null;

		els = document.querySelectorAll('[data-id="name"]');
		for (const el of els) {
			el.textContent = this.source.name;
		}

		els = document.querySelectorAll('[data-id="code"]');
		for (const el of els) {
			el.textContent = this.source.code;
		}

		els = document.querySelectorAll('[data-id="department_name"]');
		for (const el of els) {
			el.textContent = this.source.department_name;
		}

		els = document.querySelectorAll('[data-id="direction.code"]');
		for (const el of els) {
			el.textContent = this.source.direction.code;
		}

		els = document.querySelectorAll('[data-id="direction.name"]');
		for (const el of els) {
			el.textContent = this.source.direction.name;
		}

		els = document.querySelectorAll('[data-id="specialty.name"]');
		for (const el of els) {
			el.textContent = this.source.specialty.name;
		}

		els = document.querySelectorAll('[data-id="approver"]');
		for (const el of els) {
			el.textContent = this.source.specialty.approver;
		}

		el = document.querySelector('[data-id="literature"]');
		el.insertAdjacentHTML('afterend', this.results.sections[ '4_1' ]);
		el.remove();

		el = document.querySelector('[data-id="themes_plan_iv"]');
		el.insertAdjacentHTML('afterend', this.results.sections.themes_plan_iv);
		el.remove();
		el = null;
	}

	async saveHTML () {
		const academicBegin = this.academicBegin.serialize();
		const academicMiddle = this.academicMiddle.serialize();
		const academicEnd = this.academicEnd.serialize();
		const thematic = this.thematic.serialize();

		await fse.writeFile(path.resolve(config.distRoot, 'academic_plan_begin.html'), academicBegin);
		await fse.writeFile(path.resolve(config.distRoot, 'academic_plan_middle.html'), academicMiddle);
		await fse.writeFile(path.resolve(config.distRoot, 'academic_plan_end.html'), academicEnd);
		await fse.writeFile(path.resolve(config.distRoot, 'thematic_plan.html'), thematic);
	}

	async generatePDFs (directory) {
		[ this.academicBegin, this.academicMiddle, this.academicEnd, this.thematic ]
			.forEach(function(dom) {
				const document = dom.window.document;
				const links = document.querySelectorAll('link');
				for (const link of links) {
					link.remove();
				}
			});

		const { name } = this.results;

		const pdf = {
			format: 'A4',
			margin: {
				top: '2cm',
				right: '1cm',
				bottom: '2cm',
				left: '2.5cm',
			},
		};

		const academicOutput = path.resolve(directory, `${name} - учебная программа.pdf`);
		const academicBeginOutput = path.resolve(os.tmpdir(), `${name} - учебная программа begin.pdf`);
		const academicMiddleOutput = path.resolve(os.tmpdir(), `${name} - учебная программа middle.pdf`);
		const academicEndOutput = path.resolve(os.tmpdir(), `${name} - учебная программа end.pdf`);
		const thematicOutput = path.resolve(directory, `${name} - тематический план.pdf`);

		const ps = [
			this.generatePDF(
				this.academicBegin.serialize(),
				academicBeginOutput,
				{
					...pdf,
					landscape: false,
				},
			),
			this.generatePDF(
				this.academicMiddle.serialize(),
				academicMiddleOutput,
				{
					...pdf,
					landscape: true,
				},
			),
			this.generatePDF(
				this.academicEnd.serialize(),
				academicEndOutput,
				{
					...pdf,
					landscape: false,
				},
			),
			this.generatePDF(
				this.thematic.serialize(),
				thematicOutput,
				{
					...pdf,
					landscape: true,
				},
			),
		];

		await Promise.all(ps);

		const pdfDoc = new HummusRecipe(academicBeginOutput, academicOutput);

		pdfDoc
			.appendPage(academicMiddleOutput)
			.appendPage(academicEndOutput)
			.endPDF();

		return {
			academic: academicOutput,
			thematic: thematicOutput,
		};
	}

	/**
	 * @private
	 * @param {string} raw_html
	 * @param {string} name
	 * @param {*} pdf
	 * @return {Promise<void>}
	 */
	async generatePDF (raw_html, name, pdf) {
		const html5ToPDF = new HTML5ToPDF({
			inputBody: raw_html,
			outputPath: name,
			include: [
				path.resolve(config.templatesRoot, 'base_academic_plan.css'),
			],
			renderDelay: 2000,
			pdf,
			launchOptions: {
				executablePath: getChromiumExecPath(),
			},
		});

		await html5ToPDF.start();
		await html5ToPDF.build();
		await html5ToPDF.close();
	}
};
