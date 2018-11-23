import { lessonGroups } from '../../store/common';


const KEYS = [
	'lectures', 'seminars', 'laboratory_works', 'practical_lessons', 'group_exercises', 'group_lessons', 'tactical_exercises', 'military_games', 'tests', 'coursework', 'independent_work', 'exams',
];

export default class TimeBudget {
	constructor () {
		this._lectures = 0; // лекции
		this._seminars = 0; // семинары
		this._laboratory_works = 0; // лабораторные работы
		this._practical_lessons = 0; // практические занятия
		this._group_exercises = 0; // групповые упражнения
		this._group_lessons = 0; // групповые занятия
		this._tactical_exercises = 0; // тактические и тактико-специальные занятия и учения
		this._military_games = 0; // КШУ, военные (военно-специальные) игры, конференции
		this._tests = 0; // контрольные работы
		this._coursework = 0; // курсовые работы (проекты, задачи)
		this._independent_work = 0; // самостоятельная работа под руководством преподавателя
		this._exams = 0; // экзамен, зачеты
		this._self_independent_work = 0; // время, отводимое на самостоятельную работу
	}

	get teacher_time () {
		return this._lectures + this._seminars + this._laboratory_works + this._practical_lessons + this._group_exercises + this._group_lessons + this._tactical_exercises + this._military_games + this._tests + this._coursework + this._independent_work + this._exams;
	}

	get self_time () {
		return this._self_independent_work;
	}

	get all () {
		return this.teacher_time + this.self_time;
	}

	/**
	 * @param {TimeBudget} tb
	 * @return {TimeBudget}
	 */
	Add (tb) {
		this._lectures += tb._lectures;
		this._seminars += tb._seminars;
		this._laboratory_works += tb._laboratory_works;
		this._practical_lessons += tb._practical_lessons;
		this._group_exercises += tb._group_exercises;
		this._group_lessons += tb._group_lessons;
		this._tactical_exercises += tb._tactical_exercises;
		this._military_games += tb._military_games;
		this._tests += tb._tests;
		this._coursework += tb._coursework;
		this._independent_work += tb._independent_work;
		this._exams += tb._exams;

		this._self_independent_work += tb._self_independent_work;

		return this;
	}

	/**
	 * @param {{self_time: number, teacher_time: number, type: string}} lesson
	 * @return {TimeBudget}
	 */
	AddLesson (lesson) {
		for (let [ group, { types } ] of Object.entries(lessonGroups)) {
			if (types.includes(lesson.type)) {
				this[ `_${group}` ] += lesson.teacher_time;
			}
		}

		this._self_independent_work += lesson.self_time;

		return this;
	}

	/**
	 * @param {{name: string, strong: boolean, document: Document}} opts
	 * @return {HTMLTableRowElement}
	 */
	getRow({name, strong, document}) {
		const tr = document.createElement('tr');

		if (strong) {
			tr.classList.add('strong');
		}

		const tdName = document.createElement('td');
		tdName.textContent = name;

		const tdAll = document.createElement('td');
		tdAll.textContent = this.all || '';

		const tdTeacherAll = document.createElement('td');
		tdTeacherAll.textContent = this.teacher_time || '';

		const tdSelfAll = document.createElement('td');
		tdSelfAll.textContent = this.self_time || '';

		const parts = KEYS.map((key) => {
			const td = document.createElement('td');
			td.textContent = this[ `_${key}` ] || '';
			return td;
		});

		for (const td of [ tdName, tdAll, tdTeacherAll, ...parts, tdSelfAll ]) {
			tr.appendChild(td);
		}

		return tr;
	}
}
