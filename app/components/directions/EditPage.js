import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import IconButton from '@material-ui/core/IconButton';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import ArrowBack from '@material-ui/icons/ArrowBack';
import promiseIpc from 'electron-promise-ipc';
import React, { Component } from 'react';
import scheme from '../../scheme';
import styles from './directions.scss';


type Props = {};

const errorsTexts = {
	required: 'Заполните обязательное поле',
};

export default class DirectionsListPage extends Component<Props> {
	props: Props;
	handleChange = name => event => {
		this.setState({
			formdata: {
				...this.state.formdata,
				[ name ]: event.target.value,
			},
		});
	};

	constructor (props) {
		super(props);

		let mode = 'new', id = null;
		if (this.props.match.path !== '/directions/add') {
			mode = 'edit';
			id = this.props.match.params.dir_id;
		}

		this.state = {
			loading: mode === 'edit',
			direction: null,
			formdata: {},
			errors: {},
			mode,
			id,
			disabled: false,
		};

		this.onSubmit = this.onSubmit.bind(this);
	}

	async loadData (_id) {
		const directions = await promiseIpc.send('query-directions', { _id });
		if (!directions) {
			throw new Error('directions.length === 0');
		}
		this.setState({
			loading: false,
			direction: directions[ 0 ],
			formdata: directions[ 0 ],
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

		scheme.directions.fields.forEach(function({ name, description, type, optional, uniq }) {
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

		const saveResult = await promiseIpc.send('save-direction', data);
		console.log('saved', { saveResult });

		if (data._id) {
			this.props.history.push(`/directions/${data._id}`);
			return;
		}
		this.props.history.push('/directions');
	}

	getBar () {
		const { mode, id } = this.state;
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
						<IconButton onClick={() => {
							if (id) {
								this.props.history.push(`/directions/${id}`);
								return;
							}
							this.props.history.push('/directions');
						}}>
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

		return scheme.directions.fields.map(({ name, description, type }) => {
				const error = errors[ name ];

				return (
					<TextField
						type={type}
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

						<Button variant="contained" color="primary" type="submit" disabled={!!disabled}>
							Сохранить
						</Button>
					</form>
				</Paper>
			</div>
		);
	}

	getColumns () {
		return scheme.directions.fields.map(({ name, description }) => ({
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
