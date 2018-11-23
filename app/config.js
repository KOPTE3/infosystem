const config = {};

config.specialtyFields = [
	{
		name: "_id",
		type: "hidden"
	},
	{
		name: "name",
		description: "Название направления подготовки",
		type: "text"
	},
	{
		name: "code_fgos",
		description: "Код направления подготовки по ФГОС",
		type: "text"
	},
	{
		name: "name_fgos",
		description: "Название направления подготовки по ФГОС (без кода)",
		type: "text"
	},
	{
		name: "graduate_destinations",
		description: "Предназначение выпускника",
		type: "textarea"
	},
	{
		name: "qualification",
		description: "Квалификация",
		type: "text"
	},
	{
		name: "education_duration",
		description: "Срок освоения (лет)",
		type: "number"
	},
	{
		name: "complexity",
		description: "Трудоёмкость (зач. ед.)",
		type: "number"
	}
];

export default config;
