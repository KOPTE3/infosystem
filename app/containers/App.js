import * as React from 'react';


type Props = {
	children: React.Node
};

export default class App extends React.Component<Props> {
	props: Props;

	componentDidMount () {
		setTimeout(function() {
			const event = document.createEvent('UIEvents');
			event.initUIEvent('resize', true, false, window, 0);
			window.dispatchEvent(event);
		}, 1000);
	}

	render () {
		return <div>{this.props.children}</div>;
	}
}
