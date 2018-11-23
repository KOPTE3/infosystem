// направление подготовки way
// - специальность specialty
//   - специализация (пока откладываем)

// типы компетенций  of competences

export default {
	competencies: {
		table: 'competencies',
		fields: [
			{
				name: 'type',
				description: 'Вид компетенции',
				type: 'competencies-type',
			},
			{
				name: 'activity_kind',
				description: 'Вид деятельности',
				type: 'activity_kind-type',
			},
			{
				name: 'description',
				description: 'Описание компетенции',
				type: 'string',
			},
			{
				name: 'code',
				description: 'Код компетенции',
				examples: [ 'ОК-1', 'ВПК.ПК-15' ],
				type: 'string',
				uniq: true,
			},
			{
				name: 'common',
				description: 'Общая компетенция для данного направления подготовки',
				type: 'boolean',
			},
			{
				name: 'direction_id',
				type: 'hidden',
			},
		],
	},
	directions: {
		table: 'directions',
		fields: [
			{
				name: 'name',
				description: 'Название направления подготовки',
				type: 'string',
			},
			{
				name: 'code',
				description: 'Код направления подготовки',
				type: 'string',
			},
			{
				name: 'note',
				description: 'Комментарий',
				type: 'string',
				optional: true,
			},
			{
				name: 'qualification',
				description: 'Квалификация выпускника',
				type: 'string',
				suggests: true,
			},
			{
				name: 'education_duration',
				description: 'Срок освоения ОПОП (лет)',
				type: 'number',
			},
			{
				name: 'complexity',
				description: 'Трудоёмкость ОПОП (зач. ед.)',
				type: 'number',
			},
		],
	},
	specialties: {
		table: 'specialties',
		fields: [
			{
				name: 'name',
				description: 'Название специальности',
				type: 'string',
			},
			{
				name: 'graduate_destinations',
				description: 'Предназначение выпускников',
				type: 'string',
			},
			{
				name: 'approver',
				description: 'Утверждающее лицо',
				type: 'string',
				helperText: 'Напр.: "Начальник 1 кафедры п-к И.Иванов"',
			},
			{
				name: 'competencies',
				description: 'Формируемые компетенции',
				type: 'foreign',
				table: 'competencies',
				multiple: true,
			},
			{
				name: 'disciplines',
				description: 'Дисциплины',
				type: 'foreign',
				table: 'disciplines',
				multiple: true,
			},
			{
				name: 'direction_id',
				type: 'hidden',
			},
		],
	},
	disciplines: {
		table: 'disciplines',
		fields: [
			{
				name: 'name',
				description: 'Название дисциплины',
				type: 'string',
			},
			{
				name: 'note',
				description: 'Примечание',
				type: 'string',
				optional: true,
			},
			{
				name: 'code',
				description: 'Индекс дисциплины',
				type: 'string',
			},
			{
				name: 'cipher',
				description: 'Шифр дисциплины',
				type: 'string',
			},
			{
				name: 'additional_complexity',
				description: 'Не учитывать трудоёмкость данной дисциплины в общей трудоёмкости ОПОП',
				type: 'boolean',
			},
			{
				name: 'part_type',
				description: 'Базовая/вариативная часть',
				type: 'part_type',
			},
			{
				name: 'department_name',
				description: 'Название кафедры',
				type: 'string',
				helperText: 'Введите название кафедры без приставки "кафедра", напр.: "оперативного искусства"',
			},
			{
				name: 'competencies',
				description: 'Формируемые компетенции',
				type: 'competencies',
				multiple: true,
			},
			{
				name: 'direction_id',
				type: 'hidden',
			},
		],
	},
};
