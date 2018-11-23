import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormHelperText from '@material-ui/core/FormHelperText';
import IconButton from '@material-ui/core/IconButton';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import Select from '@material-ui/core/Select';
import Switch from '@material-ui/core/Switch';
import TextField from '@material-ui/core/TextField';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import ArrowBack from '@material-ui/icons/ArrowBack';
import promiseIpc from 'electron-promise-ipc';
import React, { Component } from 'react';
import scheme from '../../scheme';
import styles from './competencies.scss';


type Props = {};

const errorsTexts = {
	required: 'Заполните обязательное поле',
};

export default class CompetenciesEditPage extends Component<Props> {
	props: Props;
	handleChange = name => event => {
		this.setState({
			formdata: {
				...this.state.formdata,
				[ name ]: event.target.value,
			},
		});
	};

	handleChangeCb = cb => event => {
		const { formdata } = this.state;
		let value = event.target.value;
		if (event.target.type === 'checkbox') {
			value = event.target.checked;
		}
		const changed = cb(formdata, value);
		this.setState({
			formdata: {
				...changed,
			},
		});
	};

	handleCheck = name => event => {
		this.setState({
			formdata: {
				...this.state.formdata,
				[ name ]: event.target.checked,
			},
		});
	};

	constructor (props) {
		super(props);

		const { dir_id, comp_id } = this.props.match.params;
		let mode = 'new';
		if (dir_id && comp_id) {
			mode = 'edit';
		}

		this.state = {
			loading: mode === 'edit',
			competency: null,
			formdata: {
				direction_id: dir_id,
			},
			errors: {},
			mode,
			id: comp_id,
			direction_id: dir_id,
			disabled: false,
		};

		this.onSubmit = this.onSubmit.bind(this);
	}

	async loadData (_id) {
		const competencies = await promiseIpc.send('query-competencies', { _id });
		if (!competencies) {
			throw new Error('competencies.length === 0');
		}
		const [ competency ] = competencies;
		console.log({ competency });

		this.setState({
			loading: false,
			competency,
			formdata: competency,
		});
	}

	componentDidMount () {
		const { mode, id } = this.state;
		if (mode === 'edit') {
			this.loadData(id)
				.catch(console.error);
		}
	}

	validate () {
		const { formdata, id } = this.state;
		const errors = {};
		const data = {};
		let invalid = false;

		scheme.competencies.fields.forEach(function({ name, description, type, optional, uniq }) {
			let value = formdata[ name ];

			if (typeof value === 'string') {
				value = value.trim();
			}

			if (type === 'number') {
				value = parseFloat(value) || 0;
			}

			if (type === 'boolean') {
				data[ name ] = !!value;
				return;
			}

			if (!optional && !value) {
				errors[ name ] = 'required';
				invalid = true;
			}

			data[ name ] = value;
		});

		if (id) {
			data._id = id;
		}

		return { errors, data, invalid };
	}

	async onSubmit (evt) {
		evt.preventDefault();

		const { errors, data, invalid } = this.validate();
		console.log({ errors, data, invalid });
		if (invalid) {
			this.setState({ errors });
			return;
		}

		this.setState({ errors: {}, disabled: true });

		const saveResult = await promiseIpc.send('save-competency', data);
		console.log('saved', { saveResult });

		this.props.history.goBack();
	}

	getBar () {
		const { mode, competency } = this.state;
		let header = '';
		switch (true) {
			case mode === 'new':
				header = <React.Fragment>Формируемые компетенции &mdash; добавление</React.Fragment>;
				break;
			case mode === 'edit':
				header = <React.Fragment>Формируемые компетенции &mdash; редактирование</React.Fragment>;
				break;
		}

		return (
			<AppBar position="static">
				<Toolbar>
					<Typography variant="title" color="inherit">
						<IconButton onClick={() => this.props.history.goBack()}>
							<ArrowBack/>
						</IconButton>
						{header}
					</Typography>
				</Toolbar>
			</AppBar>
		);
	}

	fields () {
		const { formdata, errors, disabled } = this.state;

		return scheme.competencies.fields.map(({ name, description, type }) => {
				const error = errors[ name ];

				if (type === 'hidden') {
					return (
						<input type="hidden" name={name} value={formdata[ name ]} id={name}/>
					);
				}

				if (type === 'boolean') {
					return (
						<FormControlLabel
							control={
								<Switch
									checked={!!formdata[ name ]}
									onChange={this.handleCheck(name)}
									value={name}
								/>
							}
							label={description}
						/>
					);
				}

				if (type === 'competencies-type') {
					return (
						<FormControl fullWidth key={name} margin="normal">
							<InputLabel htmlFor={name}>{description}</InputLabel>
							<Select
								id={name}
								value={formdata[ name ] || 'общекультурные компетенции'}
								onChange={this.handleChangeCb((initial, value) => {
									initial[ name ] = value || 'общекультурные компетенции';
									return initial;
								})}
								input={<Input name={name} id={name}/>}
							>
								<MenuItem value="общекультурные компетенции">Общекультурные компетенции</MenuItem>
								<MenuItem value="общепрофессиональные компетенции">Общепрофессиональные компетенции</MenuItem>
								<MenuItem value="профессиональные компетенции">Профессиональные компетенции</MenuItem>
								<MenuItem value="военно-профессиональные компетенции">Военно-профессиональные компетенции</MenuItem>
								<MenuItem value="универсальные компетенции">Универсальные компетенции</MenuItem>
							</Select>
							<FormHelperText>Тип компетенции</FormHelperText>
						</FormControl>
					);
				}

				if (type === 'activity_kind-type') {
					return (
						<FormControl fullWidth key={name} margin="normal">
							<InputLabel htmlFor={name}>{description}</InputLabel>
							<Select
								id={name}
								value={formdata[ name ] || ''}
								onChange={this.handleChangeCb((initial, value) => {
									initial[ name ] = value || '';
									return initial;
								})}
								input={<Input name={name} id={name}/>}
							>
								<MenuItem value=""><em>Нет</em></MenuItem>
								<MenuItem value="военно-управленческая деятельность">Военно-управленческая деятельность</MenuItem>
								<MenuItem value="научно-исследовательская деятельность">Научно-исследовательская деятельность</MenuItem>
								<MenuItem value="военно-техническая деятельность">Военно-техническая деятельность</MenuItem>
							</Select>
							<FormHelperText>Выберите тип деятельности (необязательное поле)</FormHelperText>
						</FormControl>
					);
				}

				return (
					<TextField
						error={!!error}
						disabled={!!disabled}
						helperText={errorsTexts[ error ]}
						id={name}
						key={name}
						label={description}
						InputLabelProps={{
							shrink: true,
						}}
						value={formdata[ name ]}
						fullWidth
						margin="normal"
						onChange={this.handleChange(name)}
					/>
				);
			},
		);
	}

	getContent () {
		const { disabled } = this.state;
		return (
			<div className={[ styles.contentWrapper, styles.contentWrapperMargin ].join(' ')}>
				<Paper classes={{ root: styles.content }}>
					<form onSubmit={this.onSubmit}>
						<Typography variant="headline">Заполните данные формы</Typography>
						{this.fields()}

						<br/>

						<Button variant="contained" color="primary" type="submit" disabled={!!disabled}>
							Сохранить
						</Button>
					</form>
				</Paper>
			</div>
		);
	}

	getColumns () {
		return scheme.competencies.fields.map(({ name, description }) => ({
			Header: description,
			accessor: name,
		}));
	}

	render () {
		const { loading } = this.state;
		if (loading) {
			return (
				<div>
					{this.getBar()}
					<div className={styles.progressWrapper}>
						<div className={styles.progress}>
							<CircularProgress color="white"/>
						</div>
					</div>
				</div>
			);
		}

		return (
			<div>
				{this.getBar()}
				{this.getContent()}
			</div>
		);
	}
}
