export const competenciesTypeMap = {
	know: 'знать',
	able_to: 'уметь',
	own: 'владеть',
};

export const lessonGroups = {
	'lectures': {
		name: 'лекции',
		types: [ 'l' ],
	},
	'seminars': {
		name: 'семинары',
		types: [ 'sz' ],
	},
	'laboratory_works': {
		name: 'лабораторные работы',
		types: [ 'lr' ],
	},
	'practical_lessons': {
		name: 'практические занятия',
		types: [ 'pz' ],
	},
	'group_exercises': {
		name: 'групповые упражнения',
		types: [ 'gu' ],
	},
	'group_lessons': {
		name: 'групповые занятия',
		types: [ 'gz' ],
	},
	'tactical_exercises': {
		name: 'тактические и тактико-специальные занятия и учения',
		types: [ 'tz', 'tu', 'tsz', 'tsu' ],
	},
	'military_games': {
		name: 'КШУ, военные (военно-специальные) игры, конференции',
		types: [ 'ksu', 'vi', 'npk' ],
	},
	'tests': {
		name: 'контрольные работы',
		types: [ 'kr', 'zr' ],
	},
	'coursework': {
		name: 'курсовые работы (проекты, задачи)',
		types: [ 'zkr', 'zkp', 'zkz' ],
	},
	'independent_work': {
		name: 'самостоятельная работа под руководством преподавателя',
		types: [ 'sr' ],
	},
	'exams': {
		name: 'экзамен, зачеты',
		types: [ 'credit', 'credit_with_mark', 'exam' ],
	},
};

export const lessonTypes = {
	'l': {
		short: 'Л',
		full: 'Лекция',
	},
	'sz': {
		short: 'СЗ',
		full: 'Семинарское занятие',
	},
	'lr': {
		short: 'ЛР',
		full: 'Лабораторная работа',
	},
	'pz': {
		short: 'ПЗ',
		full: 'Практическое занятие',
	},
	'gu': {
		short: 'ГУ',
		full: 'Групповое упражнение',
	},
	'gz': {
		short: 'ГЗ',
		full: 'Групповое занятие',
	},
	'tz': {
		short: 'ТЗ',
		full: 'Тактическое занятие',
	},
	'tu': {
		short: 'ТУ',
		full: 'Тактическое учение',
	},
	'tsz': {
		short: 'ТСЗ',
		full: 'Тактико-специальное занятие',
	},
	'tsu': {
		short: 'ТСУ',
		full: 'Тактико-специальное учение',
	},
	'ksu': {
		short: 'КШУ',
		full: 'Командно-штабное учение',
	},
	'vi': {
		short: 'ВИ',
		full: 'Военная (военно-специальная) игра',
	},
	'npk': {
		short: 'НПК',
		full: 'Научно-практическая конференция',
	},
	'kr': {
		short: 'КР',
		full: 'Контрольная работа',
	},
	'zr': {
		short: 'ЗР',
		full: 'Защита реферата',
	},
	'zkr': {
		short: 'ЗКР',
		full: 'Защита курсовой работы',
	},
	'zkp': {
		short: 'ЗКП',
		full: 'Защита курсового проекта',
	},
	'zkz': {
		short: 'ЗКЗ',
		full: 'Защита курсовой задачи',
	},
	'sr': {
		short: 'СР',
		full: 'Cамостоятельная работа под руководством преподавателя',
	},
	'credit': {
		short: 'СР',
		full: 'Зачёт',
		hidden: true,
	},
	'credit_with_mark': {
		short: 'СР',
		full: 'Зачёт с оценкой',
		hidden: true,
	},
	'exam': {
		short: 'СР',
		full: 'Экзамен',
		hidden: true,
	},
};

export const partTypeMap = {
	basic: [ 'базовая', 'базовой' ],
	practice: [ 'практика', 'практической' ],
	variative: [ 'вариативная', 'вариативной' ],
	gia: [ 'ГИА' ],
};

export const kp = {
	short: 'КП',
	full: 'Контрольная проверка (планируется и проводится как часть планового аудиторного занятия в форме письменного опроса, тестирования и др.)',
};
