import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import CircularProgress from '@material-ui/core/CircularProgress';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import IconButton from '@material-ui/core/IconButton';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import ListItemText from '@material-ui/core/ListItemText';
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
import styles from './specialties.scss';


type Props = {};

const errorsTexts = {
	required: 'Заполните обязательное поле',
};

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
	PaperProps: {
		style: {
			maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
			width: 250,
		},
	},
};

export default class SpecialtiesEditPage extends Component<Props> {
	props: Props;
	handleChange = name => event => {
		this.setState({
			formdata: {
				...this.state.formdata,
				[ name ]: event.target.value,
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

		const { dir_id, spec_id } = this.props.match.params;
		let mode = 'new';
		if (dir_id && spec_id) {
			mode = 'edit';
		}

		this.state = {
			loading: mode === 'edit',
			specialty: null,
			formdata: {
				direction_id: dir_id,
			},
			errors: {},
			mode,
			id: spec_id,
			direction_id: dir_id,
			disabled: false,
			all_competencies: {},
			all_disciplines: {},
		};

		this.onSubmit = this.onSubmit.bind(this);
	}

	async loadData () {
		const { mode, _id, formdata } = this.state;
		let specialty = null;
		if (mode === 'edit') {
			const specialties = await promiseIpc.send('query-specialties', { _id });

			if (!specialties.length) {
				throw new Error('specialties.length === 0');
			}

			specialty = specialties[ 0 ];
		}

		specialty = specialty || formdata;
		specialty.competencies = specialty.competencies || [];
		specialty.disciplines = specialty.disciplines || [];

		const competencies = await promiseIpc.send('query-competencies', { direction_id: this.state.direction_id });
		const disciplines = await promiseIpc.send('query-disciplines');


		const helper = (all, item) => {
			all[ item._id ] = item;
			return all;
		};

		this.setState({
			loading: false,
			specialty,
			formdata: specialty,
			all_competencies: competencies.filter(({common}) => !common).reduce(helper, {}),
			all_disciplines: disciplines.filter(({part_type}) => part_type === 'variative').reduce(helper, {}),
		});
	}

	componentDidMount () {
		this.loadData()
			.catch(console.error);
	}

	validate () {
		const { formdata, id } = this.state;
		const errors = {};
		const data = {};
		let invalid = false;

		scheme.specialties.fields.forEach(function({ name, description, type, optional }) {
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

		const saveResult = await promiseIpc.send('save-specialty', data);
		console.log('saved', { saveResult });

		this.props.history.goBack();
	}

	getBar () {
		const { mode } = this.state;
		let header = '';
		switch (true) {
			case mode === 'new':
				header = <React.Fragment>Формируемые специальности &mdash; добавление</React.Fragment>;
				break;
			case mode === 'edit':
				header = <React.Fragment>Формируемые специальности &mdash; редактирование</React.Fragment>;
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

		return scheme.specialties.fields.map(({ name, description, type, helperText }) => {
				const error = errors[ name ];

				if (type === 'hidden') {
					return (
						<input type="hidden" name={name} value={formdata[ name ]} id={name} key={name}/>
					);
				}

				if (type === 'boolean') {
					return (
						<FormControlLabel
							id={name}
							key={name}
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

				if (type === 'foreign') {
					const all = this.state[ `all_${name}` ];
					const renderValue = selected => selected
						.map(_id => all[_id].code)
						.join(', ');
					return (
						<FormControl id={name} key={name} fullWidth>
							<InputLabel htmlFor={`select-multiple-${name}`}>{description}</InputLabel>
							<Select
								multiple
								value={formdata[ name ]}
								onChange={this.handleChange(name)}
								input={<Input id={`select-multiple-${name}`}/>}
								renderValue={renderValue}
								MenuProps={MenuProps}
							>
								{Object.values(all).map(item => (
									<MenuItem key={item._id} value={item._id}>
										<Checkbox checked={formdata[ name ].includes(item._id)}/>
										<ListItemText primary={item.code}/>
									</MenuItem>
								))}
							</Select>
						</FormControl>
					);
				}

				return (
					<TextField
						error={!!error}
						disabled={!!disabled}
						helperText={errorsTexts[ error ] || helperText}
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
		return scheme.specialties.fields.map(({ name, description }) => ({
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

